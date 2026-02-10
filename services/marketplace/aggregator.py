"""
Marketplace data aggregator - combines data from multiple sources.
Computes statistics and filters outliers.

Features:
- Live data fetching from eBay + Facebook
- Fallback to cached data on errors
- Data freshness tracking
"""
import structlog
import numpy as np
from typing import List, Dict, Optional
from .models import MarketplaceListing, MarketplaceStats
from .ebay import ebay_client
from .facebook import facebook_client

logger = structlog.get_logger()


class MarketplaceAggregator:
    """Aggregates and analyzes marketplace data from multiple sources."""

    async def research_product(
        self,
        brand: str,
        model: str,
        category: str,
        condition: str = None,
        use_live_data: bool = True
    ) -> Dict:
        """
        Research a product across multiple marketplaces.

        Args:
            brand: Brand name
            model: Model name/number
            category: Product category
            condition: Item condition
            use_live_data: If True, fetch live data; if False, use cached only

        Returns:
            Dict with listings, stats, and data freshness indicator
        """
        logger.info(
            "researching_product",
            brand=brand,
            model=model,
            category=category,
            use_live_data=use_live_data
        )

        # Build search query
        query = f"{brand} {model}".strip()

        # Track data freshness
        data_freshness = "live"
        sources_checked = []

        # Fetch from eBay (primary source for sold data)
        ebay_listings = []
        try:
            ebay_listings = await ebay_client.search_sold_listings(
                query=query,
                category=category,
                condition=condition,
                sold_within_days=90,  # 90 days for broader dataset
                limit=100,
                real_time=use_live_data
            )
            sources_checked.append("ebay")
            logger.info("ebay_research_completed", count=len(ebay_listings))
        except Exception as e:
            logger.error("ebay_research_failed", error=str(e))
            data_freshness = "stale"

        # Fetch from Facebook Marketplace (for current market prices)
        facebook_listings = []
        if use_live_data:
            try:
                facebook_listings = await facebook_client.search_listings(
                    query=query,
                    category=category,
                    limit=30
                )
                sources_checked.append("facebook")
                logger.info("facebook_research_completed", count=len(facebook_listings))
            except Exception as e:
                logger.error("facebook_research_failed", error=str(e))
                # Don't mark as stale if eBay succeeded

        # TODO: Fetch from Amazon
        # amazon_listings = await amazon_client.search(...)

        # TODO: Fetch from Google Shopping
        # google_listings = await google_client.search(...)

        # Combine all listings
        all_listings = ebay_listings + facebook_listings
        # all_listings.extend(amazon_listings)
        # all_listings.extend(google_listings)

        # Check if we got any data
        if not all_listings:
            logger.warning("no_marketplace_data", query=query)
            data_freshness = "stale"

        # Filter outliers
        filtered_listings = self._filter_outliers(all_listings)

        # Compute recency weights (without corrupting actual prices)
        recency_weights = self._compute_recency_weights(filtered_listings)

        # Compute statistics with recency-weighted mean
        stats = self._compute_statistics(filtered_listings, weights=recency_weights)

        logger.info(
            "product_research_completed",
            total_listings=len(all_listings),
            filtered_listings=len(filtered_listings),
            median_price=stats.median,
            data_freshness=data_freshness
        )

        # Convert stats to dict and add listings
        stats_dict = stats.dict()
        stats_dict["listings"] = [
            {
                "title": l.title,
                "price": l.price,
                "condition": l.condition,
                "sold_date": l.sold_date.isoformat() if l.sold_date else None,
                "source": l.source,
                "url": l.url
            }
            for l in filtered_listings
        ]

        return {
            "listings": filtered_listings,
            "stats": stats_dict,
            "sources_checked": sources_checked,
            "data_freshness": data_freshness,
            "cache_hit": False
        }

    def _filter_outliers(self, listings: List[MarketplaceListing]) -> List[MarketplaceListing]:
        """
        Filter outliers using IQR (Interquartile Range) method.

        Removes listings with prices outside 1.5x IQR.
        """
        if len(listings) < 4:
            return listings  # Not enough data to filter

        # Extract prices
        prices = np.array([l.price for l in listings])

        # Calculate IQR
        q1 = np.percentile(prices, 25)
        q3 = np.percentile(prices, 75)
        iqr = q3 - q1

        # Define bounds
        lower_bound = q1 - (1.5 * iqr)
        upper_bound = q3 + (1.5 * iqr)

        # Filter listings
        filtered = [
            listing for listing in listings
            if lower_bound <= listing.price <= upper_bound
        ]

        removed_count = len(listings) - len(filtered)
        if removed_count > 0:
            logger.info(
                "outliers_filtered",
                total=len(listings),
                removed=removed_count,
                lower_bound=lower_bound,
                upper_bound=upper_bound
            )

        return filtered

    def _compute_recency_weights(
        self,
        listings: List[MarketplaceListing]
    ) -> List[float]:
        """
        Compute recency weights for listings without modifying prices.

        Sales <30 days: weight 1.0
        30-60 days: weight 0.8
        60-90 days: weight 0.5
        """
        from datetime import datetime, timezone

        now = datetime.now(tz=timezone.utc)
        weights = []

        for listing in listings:
            if not listing.sold_date:
                weights.append(1.0)
                continue

            days_ago = (now - listing.sold_date).days

            if days_ago < 30:
                weights.append(1.0)
            elif days_ago < 60:
                weights.append(0.8)
            else:
                weights.append(0.5)

        return weights

    def _compute_statistics(self, listings: List[MarketplaceListing], weights: List[float] = None) -> MarketplaceStats:
        """Compute statistical metrics for listings, using recency weights for the mean."""
        if not listings:
            return MarketplaceStats(
                count=0,
                median=0.0,
                mean=0.0,
                std_dev=0.0,
                percentiles={}
            )

        prices = np.array([l.price for l in listings])

        # Use recency weights for mean calculation (gives recent sales more influence)
        # Median and percentiles use unweighted prices to stay robust against outliers
        if weights is not None:
            w = np.array(weights)
            weighted_mean = float(np.average(prices, weights=w))
        else:
            weighted_mean = float(np.mean(prices))

        stats = MarketplaceStats(
            count=len(prices),
            median=float(np.median(prices)),
            mean=weighted_mean,
            std_dev=float(np.std(prices)),
            percentiles={
                "p25": float(np.percentile(prices, 25)),
                "p50": float(np.percentile(prices, 50)),
                "p75": float(np.percentile(prices, 75))
            },
            min_price=float(np.min(prices)),
            max_price=float(np.max(prices))
        )

        return stats


# Global instance
marketplace_aggregator = MarketplaceAggregator()
