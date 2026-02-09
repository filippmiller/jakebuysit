"""
Marketplace data aggregator - combines data from multiple sources.
Computes statistics and filters outliers.
"""
import structlog
import numpy as np
from typing import List, Dict
from .models import MarketplaceListing, MarketplaceStats
from .ebay import ebay_client

logger = structlog.get_logger()


class MarketplaceAggregator:
    """Aggregates and analyzes marketplace data from multiple sources."""

    async def research_product(
        self,
        brand: str,
        model: str,
        category: str,
        condition: str = None
    ) -> Dict:
        """
        Research a product across multiple marketplaces.

        Args:
            brand: Brand name
            model: Model name/number
            category: Product category
            condition: Item condition

        Returns:
            Dict with listings and stats
        """
        logger.info(
            "researching_product",
            brand=brand,
            model=model,
            category=category
        )

        # Build search query
        query = f"{brand} {model}".strip()

        # Fetch from eBay (primary source)
        ebay_listings = await ebay_client.search_sold_listings(
            query=query,
            category=category,
            condition=condition,
            sold_within_days=90,
            limit=100
        )

        # TODO: Fetch from Amazon
        # amazon_listings = await amazon_client.search(...)

        # TODO: Fetch from Google Shopping
        # google_listings = await google_client.search(...)

        # Combine all listings
        all_listings = ebay_listings
        # all_listings.extend(amazon_listings)
        # all_listings.extend(google_listings)

        # Filter outliers
        filtered_listings = self._filter_outliers(all_listings)

        # Apply recency weighting
        weighted_listings = self._apply_recency_weighting(filtered_listings)

        # Compute statistics
        stats = self._compute_statistics(weighted_listings)

        logger.info(
            "product_research_completed",
            total_listings=len(all_listings),
            filtered_listings=len(filtered_listings),
            median_price=stats.median
        )

        return {
            "listings": filtered_listings,
            "stats": stats,
            "sources_checked": ["ebay"],  # Update when adding more sources
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

    def _apply_recency_weighting(
        self,
        listings: List[MarketplaceListing]
    ) -> List[MarketplaceListing]:
        """
        Apply recency weighting to listings.

        Sales <30 days: weight 1.0
        30-60 days: weight 0.8
        60-90 days: weight 0.5
        """
        from datetime import datetime, timedelta

        now = datetime.now(tz=None)

        for listing in listings:
            if not listing.sold_date:
                # If no date, assume recent
                continue

            # Calculate days ago
            days_ago = (now - listing.sold_date).days

            # Apply weight based on recency
            if days_ago < 30:
                weight = 1.0
            elif days_ago < 60:
                weight = 0.8
            else:
                weight = 0.5

            # Store weight (we'll use this in FMV calculation)
            # For now, we could adjust the price to reflect weight
            # Or store weight as metadata (would need model update)

        return listings

    def _compute_statistics(self, listings: List[MarketplaceListing]) -> MarketplaceStats:
        """Compute statistical metrics for listings."""
        if not listings:
            return MarketplaceStats(
                count=0,
                median=0.0,
                mean=0.0,
                std_dev=0.0,
                percentiles={}
            )

        prices = np.array([l.price for l in listings])

        # Calculate statistics
        stats = MarketplaceStats(
            count=len(prices),
            median=float(np.median(prices)),
            mean=float(np.mean(prices)),
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
