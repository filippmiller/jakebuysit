"""
Condition assessment and multiplier calculation.
Maps visual condition to pricing multipliers.
"""
import structlog
from typing import Dict

logger = structlog.get_logger()


class ConditionAssessor:
    """Handles condition assessment and multiplier calculation."""

    # Standard condition multipliers
    CONDITION_MULTIPLIERS: Dict[str, float] = {
        "New": 1.0,          # 100% - unopened, tags
        "Like New": 0.925,   # 92.5% - no wear
        "Good": 0.80,        # 80% - light wear
        "Fair": 0.625,       # 62.5% - noticeable wear
        "Poor": 0.40,        # 40% - heavy damage
        "Unknown": 0.50      # 50% - default if uncertain
    }

    # Category-specific adjustments
    # Some categories naturally show more wear (e.g., books, clothing)
    CATEGORY_ADJUSTMENTS: Dict[str, Dict[str, float]] = {
        "Books & Media": {
            "Good": 0.85,  # Books with slight wear are still very usable
            "Fair": 0.70,  # Well-worn books are common
        },
        "Clothing & Fashion": {
            "Good": 0.75,  # Clothing wear is more visible
            "Fair": 0.55,  # Worn clothing loses value quickly
        },
        "Tools & Equipment": {
            "Good": 0.85,  # Tools with use marks are expected
            "Fair": 0.70,  # Well-used tools are still valuable
        }
    }

    def get_condition_multiplier(
        self,
        condition: str,
        category: str,
        damage_list: list = None
    ) -> float:
        """
        Calculate the condition multiplier for pricing.

        Args:
            condition: Assessed condition (New, Like New, Good, Fair, Poor)
            category: Item category
            damage_list: List of specific damage items

        Returns:
            Float multiplier (0.0 to 1.0)
        """
        # Normalize condition string
        condition = condition.strip().title()

        # Get base multiplier
        base_multiplier = self.CONDITION_MULTIPLIERS.get(
            condition,
            self.CONDITION_MULTIPLIERS["Unknown"]
        )

        # Apply category-specific adjustment if exists
        if category in self.CATEGORY_ADJUSTMENTS:
            category_adj = self.CATEGORY_ADJUSTMENTS[category]
            if condition in category_adj:
                base_multiplier = category_adj[condition]

        # Additional penalty for significant damage
        if damage_list and len(damage_list) > 0:
            # Reduce by 5% if 1-2 damage items
            # Reduce by 10% if 3+ damage items
            damage_penalty = 0.05 if len(damage_list) <= 2 else 0.10
            base_multiplier *= (1.0 - damage_penalty)

        # Ensure we don't go below 30% (minimum viable condition)
        final_multiplier = max(0.30, base_multiplier)

        logger.info(
            "condition_multiplier_calculated",
            condition=condition,
            category=category,
            damage_count=len(damage_list) if damage_list else 0,
            multiplier=final_multiplier
        )

        return final_multiplier

    def assess_from_description(self, description: str) -> str:
        """
        Simple text-based condition assessment from user description.
        Used as fallback or confirmation.

        Args:
            description: User's text description

        Returns:
            Condition string (New, Like New, Good, Fair, Poor)
        """
        description_lower = description.lower()

        # Keywords for each condition
        new_keywords = ["new", "unopened", "sealed", "tags", "never used", "mint"]
        like_new_keywords = ["like new", "barely used", "perfect", "pristine", "flawless"]
        good_keywords = ["good", "light wear", "minor scratches", "works great"]
        fair_keywords = ["fair", "wear", "scratches", "used", "functional"]
        poor_keywords = ["poor", "damaged", "broken", "cracked", "heavy wear"]

        # Check for keywords (order matters - check worst condition first)
        if any(keyword in description_lower for keyword in poor_keywords):
            return "Poor"
        elif any(keyword in description_lower for keyword in fair_keywords):
            return "Fair"
        elif any(keyword in description_lower for keyword in good_keywords):
            return "Good"
        elif any(keyword in description_lower for keyword in like_new_keywords):
            return "Like New"
        elif any(keyword in description_lower for keyword in new_keywords):
            return "New"
        else:
            return "Unknown"


# Global instance
condition_assessor = ConditionAssessor()
