/**
 * eBay Trading API Client
 * Handles listing creation, updates, and management
 */
import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import {
  EbayListingRequest,
  EbayListingResponse,
  EbayApiResponse,
  EBAY_CONDITION_MAP,
  EBAY_CATEGORY_MAP,
} from './types.js';

const EBAY_TRADING_API = config.ebay.sandbox
  ? 'https://api.sandbox.ebay.com/ws/api.dll'
  : 'https://api.ebay.com/ws/api.dll';

const API_VERSION = '1193'; // eBay Trading API version

export interface CreateListingParams {
  title: string;
  description: string;
  category: string;
  condition: string;
  price: number;
  imageUrls: string[];
  postalCode?: string;
}

/**
 * Create an eBay fixed-price listing
 */
export async function createEbayListing(
  accessToken: string,
  params: CreateListingParams
): Promise<{ itemId: string; listingUrl: string; fees: number }> {
  const { title, description, category, condition, price, imageUrls, postalCode = '10001' } = params;

  // Map condition to eBay condition ID
  const conditionId = EBAY_CONDITION_MAP[condition] || 3000; // Default to 'Good'

  // Map category to eBay category ID
  const categoryId = EBAY_CATEGORY_MAP[category] || '293'; // Default to Consumer Electronics

  const requestBody: EbayListingRequest = {
    Item: {
      Title: title.substring(0, 80), // eBay title limit
      Description: description,
      PrimaryCategory: {
        CategoryID: categoryId,
      },
      StartPrice: {
        _value: price,
        currencyID: 'USD',
      },
      ConditionID: conditionId,
      Country: 'US',
      Currency: 'USD',
      DispatchTimeMax: 3, // 3 business days
      ListingDuration: 'GTC', // Good 'Til Cancelled
      ListingType: 'FixedPriceItem',
      PaymentMethods: 'PayPal',
      PayPalEmailAddress: config.ebay.paypalEmail || 'payments@jakebuysit.com',
      PictureDetails: {
        PictureURL: imageUrls.slice(0, 12), // eBay allows max 12 photos
      },
      PostalCode: postalCode,
      Quantity: 1,
      ReturnPolicy: {
        ReturnsAcceptedOption: 'ReturnsAccepted',
        RefundOption: 'MoneyBack',
        ReturnsWithinOption: 'Days_30',
        ShippingCostPaidByOption: 'Buyer',
      },
      ShippingDetails: {
        ShippingType: 'Flat',
        ShippingServiceOptions: [
          {
            ShippingService: 'USPSPriority',
            ShippingServiceCost: {
              _value: 0, // Free shipping
              currencyID: 'USD',
            },
            ShippingServicePriority: 1,
          },
        ],
      },
      Site: 'US',
    },
  };

  const xmlRequest = buildTradingApiXml('AddFixedPriceItem', requestBody);

  try {
    const res = await fetch(EBAY_TRADING_API, {
      method: 'POST',
      headers: {
        'X-EBAY-API-SITEID': '0', // US site
        'X-EBAY-API-COMPATIBILITY-LEVEL': API_VERSION,
        'X-EBAY-API-CALL-NAME': 'AddFixedPriceItem',
        'X-EBAY-API-IAF-TOKEN': accessToken,
        'Content-Type': 'text/xml',
      },
      body: xmlRequest,
    });

    const xmlResponse = await res.text();

    if (!res.ok) {
      throw new Error(`eBay API call failed: ${res.status} ${xmlResponse}`);
    }

    // Parse XML response (simplified - in production use xml2js or similar)
    const response = parseEbayXmlResponse(xmlResponse);

    if (response.Ack === 'Failure' || response.Ack === 'PartialFailure') {
      const errorMsg = response.Errors?.[0]?.LongMessage || 'Unknown eBay error';
      throw new Error(`eBay listing creation failed: ${errorMsg}`);
    }

    const listingData = response.data as EbayListingResponse;
    const itemId = listingData.ItemID;
    const listingUrl = config.ebay.sandbox
      ? `https://www.sandbox.ebay.com/itm/${itemId}`
      : `https://www.ebay.com/itm/${itemId}`;

    // Calculate total fees
    const totalFees = listingData.Fees.Fee.reduce((sum, fee) => sum + fee.Fee._value, 0);

    logger.info({ itemId, listingUrl, totalFees }, 'eBay listing created successfully');

    return {
      itemId,
      listingUrl,
      fees: totalFees,
    };
  } catch (err: any) {
    logger.error({ error: err.message }, 'eBay listing creation error');
    throw err;
  }
}

/**
 * Build XML request for eBay Trading API
 */
function buildTradingApiXml(callName: string, body: any): string {
  // Simplified XML builder - in production use a proper XML library
  const itemXml = buildItemXml(body.Item);

  return `<?xml version="1.0" encoding="utf-8"?>
<${callName}Request xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>TOKEN_PLACEHOLDER</eBayAuthToken>
  </RequesterCredentials>
  ${itemXml}
</${callName}Request>`;
}

/**
 * Build Item XML structure
 */
function buildItemXml(item: any): string {
  const pictureUrls = item.PictureDetails.PictureURL.map((url: string) => `<PictureURL>${url}</PictureURL>`).join('');

  return `<Item>
    <Title>${escapeXml(item.Title)}</Title>
    <Description><![CDATA[${item.Description}]]></Description>
    <PrimaryCategory>
      <CategoryID>${item.PrimaryCategory.CategoryID}</CategoryID>
    </PrimaryCategory>
    <StartPrice currencyID="${item.StartPrice.currencyID}">${item.StartPrice._value}</StartPrice>
    <ConditionID>${item.ConditionID}</ConditionID>
    <Country>${item.Country}</Country>
    <Currency>${item.Currency}</Currency>
    <DispatchTimeMax>${item.DispatchTimeMax}</DispatchTimeMax>
    <ListingDuration>${item.ListingDuration}</ListingDuration>
    <ListingType>${item.ListingType}</ListingType>
    <PaymentMethods>${item.PaymentMethods}</PaymentMethods>
    <PayPalEmailAddress>${item.PayPalEmailAddress}</PayPalEmailAddress>
    <PictureDetails>
      ${pictureUrls}
    </PictureDetails>
    <PostalCode>${item.PostalCode}</PostalCode>
    <Quantity>${item.Quantity}</Quantity>
    <ReturnPolicy>
      <ReturnsAcceptedOption>${item.ReturnPolicy.ReturnsAcceptedOption}</ReturnsAcceptedOption>
      <RefundOption>${item.ReturnPolicy.RefundOption}</RefundOption>
      <ReturnsWithinOption>${item.ReturnPolicy.ReturnsWithinOption}</ReturnsWithinOption>
      <ShippingCostPaidByOption>${item.ReturnPolicy.ShippingCostPaidByOption}</ShippingCostPaidByOption>
    </ReturnPolicy>
    <ShippingDetails>
      <ShippingType>${item.ShippingDetails.ShippingType}</ShippingType>
      <ShippingServiceOptions>
        <ShippingService>${item.ShippingDetails.ShippingServiceOptions[0].ShippingService}</ShippingService>
        <ShippingServiceCost currencyID="${item.ShippingDetails.ShippingServiceOptions[0].ShippingServiceCost.currencyID}">${item.ShippingDetails.ShippingServiceOptions[0].ShippingServiceCost._value}</ShippingServiceCost>
        <ShippingServicePriority>${item.ShippingDetails.ShippingServiceOptions[0].ShippingServicePriority}</ShippingServicePriority>
      </ShippingServiceOptions>
    </ShippingDetails>
    <Site>${item.Site}</Site>
  </Item>`;
}

/**
 * Parse eBay XML response (simplified)
 */
function parseEbayXmlResponse(xml: string): EbayApiResponse<any> {
  // Extract Ack status
  const ackMatch = xml.match(/<Ack>(.*?)<\/Ack>/);
  const ack = ackMatch?.[1] as 'Success' | 'Warning' | 'Failure' | 'PartialFailure' || 'Failure';

  // Extract ItemID
  const itemIdMatch = xml.match(/<ItemID>(.*?)<\/ItemID>/);
  const itemId = itemIdMatch?.[1];

  // Extract fees (simplified)
  const fees: any[] = [];
  const feeMatches = xml.matchAll(/<Fee currencyID="(.*?)">(.*?)<\/Fee>/g);
  for (const match of feeMatches) {
    fees.push({
      Name: 'ListingFee',
      Fee: {
        _value: parseFloat(match[2]),
        currencyID: match[1],
      },
    });
  }

  // Extract errors if any
  const errors: any[] = [];
  const errorMatch = xml.match(/<LongMessage>(.*?)<\/LongMessage>/);
  if (errorMatch) {
    errors.push({
      LongMessage: errorMatch[1],
      ShortMessage: 'Error',
      ErrorCode: '0',
      SeverityCode: 'Error',
    });
  }

  return {
    Ack: ack,
    Errors: errors.length > 0 ? errors : undefined,
    data: itemId ? {
      ItemID: itemId,
      StartTime: new Date().toISOString(),
      EndTime: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      Fees: {
        Fee: fees,
      },
    } : undefined,
  };
}

/**
 * Escape XML special characters
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
