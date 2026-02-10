"""
Dynamic Price Optimizer
Time-based price decay for stale listings with market velocity detection.
"""
import structlog
from typing import Dict, Optional, List
from datetime import datetime, timedelta
from decimal import Decimal

logger = structlog.get_logger()


class PriceOptimizer:
    """
    Optimizes pricing for stale listings based on time and engagement.

    Strategy:
    - High velocity (>5 views/day): No change - market is interested
    - Medium velocity (2-5 views/day): Monitor only
    - Low velocity (<2 views/day): Apply time decay

    Time Decay Schedule:
    - 7-13 days old + low views: -5%
    - 14-29 days old + low views: -10%
    - 30+ days old: -15%

    Price Floor: Never go below original offer + 20% margin
    """

    # Time-based decay thresholds (days since created)
    DECAY_SCHEDULE = [
        {"min_days": 30, "max_days": None, "reduction": 0.15, "min_views": 0},
        {"min_days": 14, "max_days": 29, "reduction": 0.10, "min_views": 20},
        {"min_days": 7, "max_days": 13, "reduction": 0.05, "min_views": 10},
    ]

    # Velocity thresholds (views per day)
    HIGH_VELOCITY = 5.0  # Don't touch - market is hot
    MEDIUM_VELOCITY = 2.0  # Monitor only
    LOW_VELOCITY = 2.0  # Apply decay below this

    # Margin protection (original offer * 1.20 minimum)
    MARGIN_FLOOR_MULTIPLIER = 1.20

    def __init__(self):
        logger.info("price_optimizer_initialized")

    def analyze_offer(
        self,
        offer_id: str,
        current_price: float,
        original_offer: float,
        created_at: datetime,
        view_count: int,
        last_optimized: Optional[datetime] = None,
    ) -> Dict:
        """
        Analyze a single offer and recommend price adjustment.

        Args:
            offer_id: Offer UUID
            current_price: Current offer amount
            original_offer: Initial offer amount
            created_at: When offer was created
            view_count: Total views
            last_optimized: When price was last optimized

        Returns:
            {
                "should_adjust": bool,
                "recommended_price": float,
                "reduction_percent": float,
                "reason": str,
                "velocity": float,
                "days_active": int,
                "price_floor": float
            }
        """
        now = datetime.now()
        days_active = (now - created_at).days

        # Calculate market velocity
        views_per_day = view_count / max(days_active, 1)

        # Calculate price floor (original + 20% margin)
        price_floor = original_offer * self.MARGIN_FLOOR_MULTIPLIER

        logger.info(
            "analyzing_offer",
            offer_id=offer_id,
            days_active=days_active,
            views_per_day=views_per_day,
            current_price=current_price,
            price_floor=price_floor,
        )

        # Velocity-based decision
        if views_per_day >= self.HIGH_VELOCITY:
            return {
                "should_adjust": False,
                "recommended_price": current_price,
                "reduction_percent": 0.0,
                "reason": f"high_velocity_{views_per_day:.1f}_views_per_day",
                "velocity": views_per_day,
                "days_active": days_active,
                "price_floor": price_floor,
            }

        if views_per_day >= self.MEDIUM_VELOCITY:
            return {
                "should_adjust": False,
                "recommended_price": current_price,
                "reduction_percent": 0.0,
                "reason": f"medium_velocity_{views_per_day:.1f}_views_per_day",
                "velocity": views_per_day,
                "days_active": days_active,
                "price_floor": price_floor,
            }

        # Low velocity - apply time decay
        reduction = self._calculate_time_decay(days_active, view_count)

        if reduction == 0:
            return {
                "should_adjust": False,
                "recommended_price": current_price,
                "reduction_percent": 0.0,
                "reason": "no_decay_criteria_met",
                "velocity": views_per_day,
                "days_active": days_active,
                "price_floor": price_floor,
            }

        # Calculate new price
        recommended_price = current_price * (1 - reduction)

        # Enforce price floor
        if recommended_price < price_floor:
            recommended_price = price_floor
            actual_reduction = (current_price - price_floor) / current_price
            reason = f"price_floor_enforced_at_{price_floor:.0f}"
        else:
            actual_reduction = reduction
            reason = f"time_decay_{int(reduction * 100)}pct_{days_active}days_{view_count}views"

        # Only recommend change if meaningful (at least $1 or 1% reduction)
        price_delta = current_price - recommended_price
        if price_delta < 1.0 or price_delta / current_price < 0.01:
            return {
                "should_adjust": False,
                "recommended_price": current_price,
                "reduction_percent": 0.0,
                "reason": "delta_too_small",
                "velocity": views_per_day,
                "days_active": days_active,
                "price_floor": price_floor,
            }

        return {
            "should_adjust": True,
            "recommended_price": round(recommended_price, 2),
            "reduction_percent": actual_reduction * 100,
            "reason": reason,
            "velocity": views_per_day,
            "days_active": days_active,
            "price_floor": price_floor,
        }

    def _calculate_time_decay(self, days_active: int, view_count: int) -> float:
        """
        Calculate time-based price decay percentage.

        Returns:
            Reduction multiplier (e.g., 0.05 = 5% reduction)
        """
        for schedule in self.DECAY_SCHEDULE:
            min_days = schedule["min_days"]
            max_days = schedule["max_days"]
            min_views = schedule["min_views"]

            # Check if offer falls in this time range
            if days_active < min_days:
                continue

            if max_days is not None and days_active > max_days:
                continue

            # Check if views are below threshold
            # Note: for 30+ day listings, min_views=0 means apply to ALL view counts
            if min_views > 0 and view_count >= min_views:
                continue

            # Match found
            return schedule["reduction"]

        return 0.0

    def batch_analyze(
        self,
        offers: List[Dict],
    ) -> Dict[str, Dict]:
        """
        Analyze multiple offers and return recommendations.

        Args:
            offers: List of offer dicts with keys:
                - offer_id
                - current_price
                - original_offer
                - created_at (ISO string or datetime)
                - view_count
                - last_optimized (optional)

        Returns:
            {
                "offer_id": {analysis_result},
                ...
            }
        """
        results = {}

        for offer in offers:
            # Parse created_at if string
            created_at = offer["created_at"]
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))

            # Parse last_optimized if present
            last_optimized = offer.get("last_optimized")
            if last_optimized and isinstance(last_optimized, str):
                last_optimized = datetime.fromisoformat(
                    last_optimized.replace("Z", "+00:00")
                )

            analysis = self.analyze_offer(
                offer_id=offer["offer_id"],
                current_price=float(offer["current_price"]),
                original_offer=float(offer["original_offer"]),
                created_at=created_at,
                view_count=int(offer.get("view_count", 0)),
                last_optimized=last_optimized,
            )

            results[offer["offer_id"]] = analysis

        # Summary stats
        total = len(results)
        should_adjust = sum(1 for r in results.values() if r["should_adjust"])

        logger.info(
            "batch_analysis_complete",
            total_offers=total,
            adjustments_recommended=should_adjust,
        )

        return results


# Global instance
price_optimizer = PriceOptimizer()
