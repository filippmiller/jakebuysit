"""
FastAPI router for pricing service endpoints.
"""
from fastapi import APIRouter, HTTPException
from .models import (
    FMVRequest, FMVResponse,
    OfferRequest, OfferResponse,
    ConfidenceRequest, ConfidenceResponse
)
from .fmv import fmv_engine
from .offer import offer_engine
from .confidence import confidence_scorer
import structlog

logger = structlog.get_logger()
router = APIRouter()


@router.post("/fmv", response_model=FMVResponse)
async def calculate_fmv(request: FMVRequest):
    """
    Calculate Fair Market Value from marketplace data.

    **Weighted Algorithm:**
    - eBay sold median: 45%
    - eBay sold mean: 10%
    - Amazon used: 20% (when available)
    - Google Shopping: 15% (when available)
    - Other sources: 10%

    **Includes:**
    - Outlier filtering (IQR method)
    - Recency weighting (recent sales weighted higher)
    - Confidence scoring based on data quality
    """
    try:
        logger.info("fmv_calculation_request", category=request.category)

        # Extract marketplace stats
        marketplace_stats = request.marketplace_data.get("stats", {})

        if not marketplace_stats or marketplace_stats.get("count", 0) == 0:
            raise HTTPException(
                status_code=400,
                detail="No marketplace data available. Cannot calculate FMV."
            )

        # Calculate FMV
        result = fmv_engine.calculate_fmv(
            marketplace_stats=marketplace_stats,
            category=request.category,
            condition=request.condition
        )

        return result

    except ValueError as e:
        logger.error("validation_error", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        logger.error("fmv_calculation_error", error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to calculate FMV. Please try again."
        )


@router.post("/offer", response_model=OfferResponse)
async def calculate_offer(request: OfferRequest):
    """
    Calculate purchase offer based on FMV and business rules.

    **Formula:**
    ```
    Offer = FMV × Condition_Multiplier × Category_Margin × Dynamic_Adjustments
    ```

    **Category Margins:**
    - Consumer Electronics: 60%
    - Gaming: 60%
    - Phones & Tablets: 65%
    - Clothing & Fashion: 45%
    - Collectibles: 50%
    - Books: 35%

    **Dynamic Adjustments:**
    - Inventory saturation: -5% to -15% if we have >5 units
    - User trust bonus: +3% to +5% for repeat sellers
    - Seasonal demand: +5% to +10% during holidays
    - Market velocity: +5% if item sells fast

    **Safety Limits:**
    - Minimum: $5.00
    - Maximum: Category-specific (e.g., $2,000 for electronics)
    """
    try:
        logger.info(
            "offer_calculation_request",
            fmv=request.fmv,
            category=request.category,
            condition=request.condition
        )

        # Validate FMV
        if request.fmv <= 0:
            raise HTTPException(
                status_code=400,
                detail="FMV must be greater than 0"
            )

        # Calculate offer
        result = offer_engine.calculate_offer(
            fmv=request.fmv,
            condition=request.condition,
            category=request.category,
            inventory_count=request.inventory_count
        )

        # Calculate confidence for this offer
        # (Simplified - in production would use full confidence scoring)
        confidence = 85  # Default high confidence if we got this far

        response = OfferResponse(
            **result,
            confidence=confidence
        )

        return response

    except ValueError as e:
        logger.error("validation_error", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        logger.error("offer_calculation_error", error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to calculate offer. Please try again."
        )


@router.post("/confidence", response_model=ConfidenceResponse)
async def check_confidence(request: ConfidenceRequest):
    """
    Check confidence score for an identification/offer.

    **Composite Score (0-100):**
    - Vision Certainty (40%): How confident is AI in identification?
    - Text Corroboration (15%): Does user description match vision?
    - Database Match (25%): Found in product databases?
    - Condition Reliability (20%): Clear photos, consistent condition?

    **Action Thresholds:**
    - ≥80: Auto-price (no escalation)
    - 60-79: Flag if value >$100, otherwise auto-price
    - <60: Escalate to human review
    """
    try:
        logger.info("confidence_check_request", vision_conf=request.vision_confidence)

        result = confidence_scorer.score_confidence(
            vision_confidence=request.vision_confidence,
            marketplace_data_count=request.marketplace_data_count,
            condition_clear=request.condition_clear,
            user_description_match=request.user_description_match
        )

        return ConfidenceResponse(**result)

    except Exception as e:
        logger.error("confidence_check_error", error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to check confidence. Please try again."
        )


@router.get("/health")
async def health_check():
    """Health check for pricing service."""
    return {
        "service": "pricing",
        "status": "operational",
        "engines": ["fmv", "offer", "confidence"]
    }
