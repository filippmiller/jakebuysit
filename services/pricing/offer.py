"""
Offer calculation engine.
Applies category margins, condition multipliers, and dynamic adjustments.
"""
import structlog
from typing import Dict
from datetime import datetime, timedelta
from config.settings import settings

logger = structlog.get_logger()


class OfferEngine:
    """Calculates purchase offers based on FMV and business rules."""

    # Category-based margin targets (buy at X% of FMV)
    CATEGORY_MARGINS = {
        "Consumer Electronics": 0.60,
        "Gaming": 0.60,
        "Phones & Tablets": 0.65,
        "Clothing & Fashion": 0.45,
        "Collectibles & Vintage": 0.50,
        "Books & Media": 0.35,
        "Small Appliances": 0.50,
        "Tools & Equipment": 0.55,
        "Unknown": 0.50  # Default
    }

    # Condition multipliers (imported from vision/condition.py logic)
    CONDITION_MULTIPLIERS = {
        "New": 1.0,
        "Like New": 0.925,
        "Good": 0.80,
        "Fair": 0.625,
        "Poor": 0.40,
        "Unknown": 0.50
    }

    def calculate_offer(
        self,
        fmv: float,
        condition: str,
        category: str,
        inventory_count: int = 0,
        user_trust_score: float = 1.0
    ) -> Dict:
        """
        Calculate purchase offer.

        Formula:
        Offer = FMV × Condition_Multiplier × Category_Margin × Dynamic_Adjustments

        Args:
            fmv: Fair Market Value
            condition: Item condition
            category: Product category
            inventory_count: Current inventory of this item
            user_trust_score: User trust score (0.0-1.5)

        Returns:
            Dict with offer breakdown
        """
        logger.info(
            "calculating_offer",
            fmv=fmv,
            condition=condition,
            category=category
        )

        # Get multipliers
        condition_mult = self.CONDITION_MULTIPLIERS.get(condition, 0.50)
        category_margin = self.CATEGORY_MARGINS.get(category, 0.50)

        # Calculate base offer
        base_offer = fmv * condition_mult * category_margin

        # Apply dynamic adjustments
        adjustments = self._calculate_adjustments(
            category=category,
            inventory_count=inventory_count,
            user_trust_score=user_trust_score
        )

        # Apply adjustment multiplier
        total_adjustment = adjustments["multiplier"]
        final_offer = base_offer * total_adjustment

        # Apply safety limits
        final_offer = self._apply_safety_limits(final_offer, category)

        # Round to nearest dollar
        final_offer = round(final_offer, 0)

        # Calculate expiry (24 hours)
        expires_at = (datetime.now() + timedelta(hours=24)).isoformat()

        result = {
            "offer_amount": final_offer,
            "base_calculation": {
                "fmv": fmv,
                "condition_multiplier": condition_mult,
                "category_margin": category_margin,
                "base_offer": round(base_offer, 2)
            },
            "adjustments": adjustments,
            "expires_at": expires_at
        }

        logger.info(
            "offer_calculated",
            fmv=fmv,
            base_offer=base_offer,
            final_offer=final_offer,
            adjustment=total_adjustment
        )

        return result

    def _calculate_adjustments(
        self,
        category: str,
        inventory_count: int,
        user_trust_score: float
    ) -> Dict:
        """Calculate dynamic adjustments to base offer."""
        adjustments = {
            "inventory_saturation": 0.0,
            "user_trust_bonus": 0.0,
            "multiplier": 1.0
        }

        # Inventory saturation penalty
        if inventory_count > 5:
            # Reduce offer if we have too many of same item
            saturation_penalty = min(0.15, (inventory_count - 5) * 0.03)
            adjustments["inventory_saturation"] = -saturation_penalty
            adjustments["multiplier"] *= (1.0 - saturation_penalty)

        # User trust bonus (for repeat sellers)
        if user_trust_score > 1.0:
            trust_bonus = min(0.05, (user_trust_score - 1.0) * 0.10)
            adjustments["user_trust_bonus"] = trust_bonus
            adjustments["multiplier"] *= (1.0 + trust_bonus)

        # TODO: Add seasonal demand adjustments
        # TODO: Add market velocity bonus

        return adjustments

    def _apply_safety_limits(self, offer: float, category: str) -> float:
        """Apply minimum and maximum offer limits."""
        # Minimum floor
        min_offer = settings.min_offer_amount
        offer = max(min_offer, offer)

        # Category-specific maximum
        if category == "Consumer Electronics":
            max_offer = settings.max_electronics_offer
            offer = min(max_offer, offer)

        # TODO: Add daily spending limit check

        return offer


# Global instance
offer_engine = OfferEngine()
