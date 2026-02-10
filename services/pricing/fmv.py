"""
Fair Market Value (FMV) calculation engine.
Combines weighted data from multiple marketplace sources.
"""
import structlog
from typing import Dict, List
from datetime import datetime, timezone, timedelta
from .models import FMVResponse, ComparableSale

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

        # Extract listings for comparable sales
        raw_listings = marketplace_stats.get("listings", [])

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

        # Extract comparable sales
        comparable_sales = self._extract_comparable_sales(
            raw_listings,
            target_price=fmv,
            max_comps=5
        )

        # Calculate detailed confidence factors
        confidence_factors = self._calculate_confidence_factors(
            listing_count=listing_count,
            std_dev=marketplace_stats.get("std_dev", 0),
            fmv=fmv,
            listings=raw_listings,
            category=category
        )

        # Assess data quality
        data_quality = self._assess_data_quality(listing_count)

        # Extract overall confidence score
        confidence = confidence_factors["score"]

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
            listing_count=listing_count,
            comparable_sales_count=len(comparable_sales)
        )

        return FMVResponse(
            fmv=round(fmv, 2),
            confidence=confidence,
            data_quality=data_quality,
            sources=sources,
            range=price_range,
            comparable_sales=comparable_sales,
            confidence_factors=confidence_factors
        )

    def _assess_data_quality(self, listing_count: int) -> str:
        """Assess data quality based on listing count."""
        if listing_count >= 50:
            return "High"
        elif listing_count >= 20:
            return "Medium"
        else:
            return "Low"

    def _calculate_confidence_factors(
        self,
        listing_count: int,
        std_dev: float,
        fmv: float,
        listings: List,
        category: str
    ) -> Dict:
        """
        Calculate detailed confidence factors for FMV.

        Confidence formula: f(data_points, recency, category_coverage, price_variance)

        High confidence (80-100%): 10+ recent comps, low variance, common item
        Medium confidence (50-79%): 3-9 comps, moderate variance
        Low confidence (<50%): <3 comps, high variance, rare item

        Returns:
            Dict with score, factors, and explanation
        """
        factors = {}

        # Factor 1: Data availability (0-40 points)
        if listing_count >= 50:
            data_points_score = 40
            data_availability = "excellent"
        elif listing_count >= 20:
            data_points_score = 32
            data_availability = "good"
        elif listing_count >= 10:
            data_points_score = 24
            data_availability = "moderate"
        elif listing_count >= 3:
            data_points_score = 16
            data_availability = "limited"
        else:
            data_points_score = 8
            data_availability = "insufficient"

        factors["data_points"] = listing_count
        factors["data_availability"] = data_availability

        # Factor 2: Recency score (0-25 points)
        recency_score, recency_quality = self._calculate_recency_score(listings)
        factors["recency_score"] = recency_score
        factors["recency_quality"] = recency_quality

        # Factor 3: Price variance (0-20 points)
        if fmv > 0:
            cv = std_dev / fmv  # Coefficient of variation
            cv_percent = cv * 100

            if cv < 0.15:  # Low variance
                variance_score = 20
                variance_level = "low"
            elif cv < 0.30:  # Medium variance
                variance_score = 12
                variance_level = "moderate"
            elif cv < 0.50:  # High variance
                variance_score = 5
                variance_level = "high"
            else:  # Very high variance
                variance_score = 0
                variance_level = "very_high"

            factors["price_variance"] = variance_level
            factors["coefficient_of_variation"] = round(cv_percent, 1)
        else:
            variance_score = 0
            factors["price_variance"] = "unknown"
            factors["coefficient_of_variation"] = 0

        # Factor 4: Category coverage (0-15 points)
        common_categories = [
            "Consumer Electronics",
            "Gaming",
            "Phones & Tablets",
            "Tools & Equipment"
        ]
        if category in common_categories:
            category_score = 15
            category_coverage = "high"
        else:
            category_score = 8
            category_coverage = "medium"

        factors["category_coverage"] = category_coverage

        # Calculate total confidence score
        total_score = data_points_score + recency_score + variance_score + category_score

        # Clamp to 0-100
        final_score = max(0, min(100, total_score))
        factors["score"] = final_score

        # Generate human-readable explanation
        if final_score >= 80:
            confidence_level = "High"
        elif final_score >= 50:
            confidence_level = "Medium"
        else:
            confidence_level = "Low"

        explanation_parts = [
            f"{confidence_level} confidence ({final_score}%):",
            f"{listing_count} sales found ({data_availability} data)",
        ]

        if recency_quality != "unknown":
            explanation_parts.append(f"{recency_quality} recency")

        if "coefficient_of_variation" in factors:
            explanation_parts.append(f"{factors['price_variance']} price variance ({factors['coefficient_of_variation']}%)")

        explanation_parts.append(f"{category_coverage} category coverage")

        factors["explanation"] = ", ".join(explanation_parts)

        return factors

    def _calculate_recency_score(self, listings: List) -> tuple:
        """
        Calculate recency score based on how recent the comparable sales are.

        Returns:
            (score, quality_label)
        """
        if not listings:
            return 0, "unknown"

        now = datetime.now(tz=timezone.utc)
        recent_count = 0
        total_with_dates = 0

        for listing in listings:
            # Handle dict or object
            sold_date = None
            if isinstance(listing, dict):
                sold_date = listing.get("sold_date")
            else:
                sold_date = getattr(listing, "sold_date", None)

            if not sold_date:
                continue

            total_with_dates += 1

            # Ensure datetime object
            if isinstance(sold_date, str):
                try:
                    sold_date = datetime.fromisoformat(sold_date.replace("Z", "+00:00"))
                except:
                    continue

            days_ago = (now - sold_date).days

            # Count sales in last 30 days
            if days_ago <= 30:
                recent_count += 1

        if total_with_dates == 0:
            return 10, "unknown"  # Minimal score if no dates available

        recency_ratio = recent_count / total_with_dates

        # Score based on percentage of recent sales
        if recency_ratio >= 0.70:  # 70%+ recent
            return 25, "excellent"
        elif recency_ratio >= 0.50:  # 50-69% recent
            return 20, "good"
        elif recency_ratio >= 0.30:  # 30-49% recent
            return 15, "moderate"
        else:  # <30% recent
            return 10, "dated"

    def _extract_comparable_sales(
        self,
        listings: List,
        target_price: float,
        max_comps: int = 5
    ) -> List[ComparableSale]:
        """
        Extract 3-5 comparable sales closest to the target FMV.

        Args:
            listings: Raw marketplace listings
            target_price: The calculated FMV to compare against
            max_comps: Maximum number of comparables to return

        Returns:
            List of ComparableSale objects
        """
        if not listings:
            return []

        # Score each listing by proximity to target price
        scored_listings = []
        for listing in listings:
            # Handle dict or object
            if isinstance(listing, dict):
                price = listing.get("price", 0)
                title = listing.get("title", "")
                condition = listing.get("condition", "Unknown")
                sold_date = listing.get("sold_date")
                source = listing.get("source", "ebay")
                url = listing.get("url")
            else:
                price = getattr(listing, "price", 0)
                title = getattr(listing, "title", "")
                condition = getattr(listing, "condition", "Unknown")
                sold_date = getattr(listing, "sold_date", None)
                source = getattr(listing, "source", "ebay")
                url = getattr(listing, "url", None)

            if price <= 0:
                continue

            # Calculate price difference score (lower is better)
            price_diff = abs(price - target_price)
            score = price_diff / target_price if target_price > 0 else 999

            scored_listings.append({
                "score": score,
                "price": price,
                "title": title,
                "condition": condition,
                "sold_date": sold_date,
                "source": source,
                "url": url
            })

        # Sort by score (closest to target price first)
        scored_listings.sort(key=lambda x: x["score"])

        # Take top N comparables
        top_comps = scored_listings[:max_comps]

        # Convert to ComparableSale objects
        comparable_sales = []
        for comp in top_comps:
            comparable_sales.append(
                ComparableSale(
                    source=comp["source"],
                    title=comp["title"],
                    price=comp["price"],
                    sold_date=comp["sold_date"],
                    condition=comp["condition"],
                    url=comp["url"]
                )
            )

        return comparable_sales


# Global instance
fmv_engine = FMVEngine()
