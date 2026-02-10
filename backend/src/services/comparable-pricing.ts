/**
 * Comparable Pricing Service — fetch similar sold items for pricing transparency.
 *
 * Research: Zillow comparables (30% higher engagement)
 * Task: Phase 2, Task 1 — Market Comparable Pricing API
 *
 * Integration: eBay Finding API (findCompletedItems)
 * Free tier: 5,000 calls/day
 */

import { cache } from '../db/redis.js';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';

interface Comparable {
  title: string;
  price: number;
  imageUrl: string;
  soldDate: Date;
  source: 'ebay' | 'mercari' | 'offerup';
  url: string;
  condition?: string;
}

interface ComparablesResult {
  comparables: Comparable[];
  averagePrice: number;
  count: number;
  cacheHit: boolean;
}

const CACHE_TTL = 86400; // 24 hours (comparables don't change frequently)

/**
 * Build eBay Finding API URL for completed sold listings.
 *
 * Docs: https://developer.ebay.com/devzone/finding/Concepts/FindingAPIGuide.html
 */
function buildEbayUrl(keywords: string, condition?: string): string {
  const baseUrl = 'https://svcs.ebay.com/services/search/FindingService/v1';

  // Build query parameters
  const params = new URLSearchParams({
    'OPERATION-NAME': 'findCompletedItems',
    'SERVICE-VERSION': '1.0.0',
    'SECURITY-APPNAME': config.ebay?.appId || 'PLACEHOLDER', // eBay App ID (set in config)
    'RESPONSE-DATA-FORMAT': 'JSON',
    'REST-PAYLOAD': '',
    'keywords': keywords,
    'paginationInput.entriesPerPage': '10',
    'sortOrder': 'EndTimeSoonest', // Most recent first
  });

  // Filter: Only sold items
  params.append('itemFilter(0).name', 'SoldItemsOnly');
  params.append('itemFilter(0).value', 'true');

  // Filter: Only items with prices (exclude auctions without bids)
  params.append('itemFilter(1).name', 'MinPrice');
  params.append('itemFilter(1).value', '1'); // At least $1

  // Filter: Condition if specified
  if (condition) {
    const conditionMap: Record<string, string> = {
      'New': '1000', // eBay condition ID for New
      'Like New': '2750', // Open box or Like New
      'Good': '3000', // Used
      'Fair': '3000', // Used
      'Poor': '7000', // For parts or not working
    };

    const conditionId = conditionMap[condition] || '3000';
    params.append('itemFilter(2).name', 'Condition');
    params.append('itemFilter(2).value', conditionId);
  }

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Parse eBay Finding API JSON response.
 */
function parseEbayResponse(data: any): Comparable[] {
  try {
    const searchResult = data.findCompletedItemsResponse?.[0]?.searchResult?.[0];

    if (!searchResult || searchResult['@count'] === '0') {
      return [];
    }

    const items = searchResult.item || [];

    return items
      .map((item: any) => {
        const title = item.title?.[0] || 'Unknown Item';
        const priceStr = item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__;
        const price = priceStr ? parseFloat(priceStr) : 0;

        const imageUrl = item.galleryURL?.[0] || item.pictureURLLarge?.[0] || '';
        const soldDateStr = item.listingInfo?.[0]?.endTime?.[0];
        const soldDate = soldDateStr ? new Date(soldDateStr) : new Date();

        const url = item.viewItemURL?.[0] || '';
        const condition = item.condition?.[0]?.conditionDisplayName?.[0];

        // Only include if we have a valid price and title
        if (price > 0 && title !== 'Unknown Item') {
          return {
            title,
            price,
            imageUrl,
            soldDate,
            source: 'ebay' as const,
            url,
            condition,
          };
        }

        return null;
      })
      .filter((comp): comp is Comparable => comp !== null);
  } catch (err) {
    logger.error({ error: (err as Error).message }, 'Failed to parse eBay response');
    return [];
  }
}

export const comparablePricingService = {
  /**
   * Find comparable sold items for pricing transparency.
   *
   * @param category - Item category (e.g., "Consumer Electronics")
   * @param brand - Brand name (e.g., "Apple")
   * @param model - Model name (e.g., "iPhone 14 Pro")
   * @param condition - Condition (e.g., "Good")
   * @returns Top 3 comparable sales
   */
  async findComparables(
    category: string,
    brand: string,
    model: string,
    condition: string,
  ): Promise<ComparablesResult> {
    // Build cache key
    const cacheKey = `comparables:${category}:${brand}:${model}:${condition}`.toLowerCase();

    // Check cache first (24hr TTL)
    const cached = await cache.get<ComparablesResult>(cacheKey);
    if (cached) {
      logger.info({ cacheKey }, 'Comparables cache hit');
      return { ...cached, cacheHit: true };
    }

    logger.info({ category, brand, model, condition }, 'Fetching comparables from eBay API');

    // Build search query
    const keywords = `${brand} ${model}`.trim();

    if (!keywords) {
      logger.warn('No keywords for comparable search');
      return {
        comparables: [],
        averagePrice: 0,
        count: 0,
        cacheHit: false,
      };
    }

    // Check if eBay API is configured
    if (!config.ebay?.appId || config.ebay.appId === 'PLACEHOLDER') {
      logger.warn('eBay API not configured — skipping comparable pricing');
      return {
        comparables: [],
        averagePrice: 0,
        count: 0,
        cacheHit: false,
      };
    }

    try {
      const url = buildEbayUrl(keywords, condition);

      // Fetch from eBay API
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`eBay API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const comparables = parseEbayResponse(data);

      // Sort by most recent and take top 3
      const topComparables = comparables
        .sort((a, b) => b.soldDate.getTime() - a.soldDate.getTime())
        .slice(0, 3);

      // Calculate average price
      const averagePrice = topComparables.length > 0
        ? topComparables.reduce((sum, comp) => sum + comp.price, 0) / topComparables.length
        : 0;

      const result = {
        comparables: topComparables,
        averagePrice: Math.round(averagePrice * 100) / 100, // Round to 2 decimals
        count: topComparables.length,
        cacheHit: false,
      };

      // Cache result for 24 hours
      await cache.set(cacheKey, result, CACHE_TTL);

      logger.info(
        { keywords, count: topComparables.length, averagePrice: result.averagePrice },
        'Comparables fetched and cached'
      );

      return result;
    } catch (err) {
      logger.error({ error: (err as Error).message, keywords }, 'Failed to fetch comparables');

      // Return empty result on error (don't block the pipeline)
      return {
        comparables: [],
        averagePrice: 0,
        count: 0,
        cacheHit: false,
      };
    }
  },
};
