"""
Fair Market Value (FMV) calculation engine.
Combines weighted data from multiple marketplace sources.
"""
import structlog
from typing import Dict
from .models import FMVResponse

logger = structlog.get_logger()


class FMVEngine:
    """Calculates Fair Market Value using weighted marketplace data."""

    # Source weights (must sum to 1.0)
    WEIGHTS = {
        "ebay_sold_median": 0.45,
        "ebay_sold_mean": 0.10,
        "amazon_used": 0.20,
        "google_shopping": 0.15,
        "other_sold": 0.10
    }

    def calculate_fmv(
        self,
        marketplace_stats: Dict,
        category: str,
        condition: str
    ) -> FMVResponse:
        """
        Calculate Fair Market Value from marketplace data.

        Args:
            marketplace_stats: Statistics from marketplace aggregator
            category: Product category
            condition: Item condition

        Returns:
            FMVResponse with calculated FMV and confidence
        """
        logger.info(
            "calculating_fmv",
            category=category,
            condition=condition,
            listing_count=marketplace_stats.get("count", 0)
        )

        # Extract eBay data (primary source)
        ebay_median = marketplace_stats.get("median", 0)
        ebay_mean = marketplace_stats.get("mean", 0)
        listing_count = marketplace_stats.get("count", 0)

        # Calculate weighted FMV using only available sources
        # Weights are normalized to the available sources so they sum to 1.0
        available_weights = {
            "ebay_sold_median": self.WEIGHTS["ebay_sold_median"],
            "ebay_sold_mean": self.WEIGHTS["ebay_sold_mean"],
        }
        available_values = {
            "ebay_sold_median": ebay_median,
            "ebay_sold_mean": ebay_mean,
        }
        # TODO: Add when APIs are ready:
        # available_weights["amazon_used"] = self.WEIGHTS["amazon_used"]
        # available_values["amazon_used"] = amazon_price

        weight_sum = sum(available_weights.values())
        fmv = sum(
            available_values[k] * (available_weights[k] / weight_sum)
            for k in available_weights
        )

        # Assess data quality
        data_quality = self._assess_data_quality(listing_count)

        # Calculate confidence based on data available
        confidence = self._calculate_confidence(
            listing_count=listing_count,
            std_dev=marketplace_stats.get("std_dev", 0),
            fmv=fmv
        )

        # Calculate price range (±20% typical)
        price_range = {
            "low": fmv * 0.80,
            "high": fmv * 1.20
        }

        # Build sources breakdown
        sources = {
            "ebay_sold": {
                "count": listing_count,
                "median": ebay_median,
                "mean": ebay_mean
            }
            # TODO: Add amazon_used, google_shopping when implemented
        }

        logger.info(
            "fmv_calculated",
            fmv=fmv,
            confidence=confidence,
            data_quality=data_quality,
            listing_count=listing_count
        )

        return FMVResponse(
            fmv=round(fmv, 2),
            confidence=confidence,
            data_quality=data_quality,
            sources=sources,
            range=price_range
        )

    def _assess_data_quality(self, listing_count: int) -> str:
        """Assess data quality based on listing count."""
        if listing_count >= 50:
            return "High"
        elif listing_count >= 20:
            return "Medium"
        else:
            return "Low"

    def _calculate_confidence(
        self,
        listing_count: int,
        std_dev: float,
        fmv: float
    ) -> int:
        """
        Calculate confidence score for FMV.

        Factors:
        - Listing count (more data = higher confidence)
        - Standard deviation (lower variance = higher confidence)
        - Coefficient of variation (std_dev / mean)
        """
        # Base confidence from listing count
        if listing_count >= 100:
            base_confidence = 90
        elif listing_count >= 50:
            base_confidence = 80
        elif listing_count >= 20:
            base_confidence = 70
        elif listing_count >= 10:
            base_confidence = 60
        else:
            base_confidence = 50

        # Adjust for price variance
        if fmv > 0:
            cv = std_dev / fmv  # Coefficient of variation

            if cv < 0.15:  # Low variance
                variance_adjustment = 5
            elif cv < 0.30:  # Medium variance
                variance_adjustment = 0
            else:  # High variance
                variance_adjustment = -10
        else:
            variance_adjustment = -20  # No valid FMV

        final_confidence = base_confidence + variance_adjustment

        # Clamp to 0-100
        return max(0, min(100, final_confidence))


# Global instance
fmv_engine = FMVEngine()
