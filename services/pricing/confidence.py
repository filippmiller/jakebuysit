"""
Confidence scoring system.
Determines if offer should be auto-priced or escalated for review.
"""
import structlog
from typing import Dict

logger = structlog.get_logger()


class ConfidenceScorer:
    """Scores confidence in identification and pricing."""

    # Confidence weights (sum to 100%)
    WEIGHTS = {
        "vision_certainty": 0.40,
        "text_corroboration": 0.15,
        "database_match": 0.25,
        "condition_reliability": 0.20
    }

    # Action thresholds
    THRESHOLD_AUTO_PRICE = 80  # ≥80: Auto-price
    THRESHOLD_FLAG = 60        # 60-79: Flag if high value
    # <60: Escalate to human

    def score_confidence(
        self,
        vision_confidence: int,
        marketplace_data_count: int,
        condition_clear: bool,
        user_description_match: bool = True,
        offer_value: float = 0.0
    ) -> Dict:
        """
        Calculate overall confidence score.

        Args:
            vision_confidence: AI vision confidence (0-100)
            marketplace_data_count: Number of marketplace listings found
            condition_clear: Whether condition assessment is clear
            user_description_match: Whether user text matches vision
            offer_value: Offer amount (for value-based flagging)

        Returns:
            Dict with overall confidence and recommended action
        """
        logger.info(
            "scoring_confidence",
            vision_conf=vision_confidence,
            marketplace_count=marketplace_data_count
        )

        # Component scores
        scores = {
            "vision_certainty": vision_confidence,
            "text_corroboration": 100 if user_description_match else 50,
            "database_match": self._score_database_match(marketplace_data_count),
            "condition_reliability": 100 if condition_clear else 60
        }

        # Calculate weighted overall confidence
        overall_confidence = sum(
            scores[component] * self.WEIGHTS[component]
            for component in scores
        )

        overall_confidence = int(round(overall_confidence))

        # Determine action
        action = self._determine_action(overall_confidence, offer_value)

        result = {
            "overall_confidence": overall_confidence,
            "action": action,
            "details": {
                "component_scores": scores,
                "weights": self.WEIGHTS,
                "threshold_met": overall_confidence >= self.THRESHOLD_AUTO_PRICE
            }
        }

        logger.info(
            "confidence_scored",
            overall=overall_confidence,
            action=action,
            components=scores
        )

        return result

    def _score_database_match(self, listing_count: int) -> int:
        """Score based on marketplace data availability."""
        if listing_count >= 50:
            return 100
        elif listing_count >= 20:
            return 85
        elif listing_count >= 10:
            return 70
        elif listing_count >= 5:
            return 55
        else:
            return 30

    def _determine_action(self, confidence: int, offer_value: float) -> str:
        """
        Determine recommended action based on confidence.

        Returns:
            - "auto_price": Proceed with automated offer
            - "flag_for_review": Flag for review (medium confidence, high value)
            - "escalate": Escalate to human review (low confidence)
        """
        if confidence >= self.THRESHOLD_AUTO_PRICE:
            return "auto_price"

        elif confidence >= self.THRESHOLD_FLAG:
            # Flag if high value (>$100)
            if offer_value > 100:
                return "flag_for_review"
            else:
                return "auto_price"

        else:
            # Low confidence - always escalate
            return "escalate"


# Global instance
confidence_scorer = ConfidenceScorer()
