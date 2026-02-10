"""
FastAPI router for vision service endpoints.
"""
from fastapi import APIRouter, HTTPException
from .models import IdentifyRequest, IdentifyResponse, VisionError
from .identify import vision_identifier
import structlog

logger = structlog.get_logger()
router = APIRouter()


@router.post("/identify", response_model=IdentifyResponse)
async def identify_item(request: IdentifyRequest):
    """
    Identify an item from photos using AI vision with detailed condition assessment.

    **Process:**
    1. Analyzes provided photos using Claude 3.5 Sonnet Vision
    2. Extracts: category, brand, model, condition, features, damage
    3. Performs detailed condition assessment with defect detection
    4. Returns structured identification with confidence scores

    **Confidence Scoring:**
    - 90-100: Crystal clear, high certainty
    - 70-89: Good identification, minor uncertainties
    - 50-69: Basic category known, details unclear
    - <50: Poor quality photos or unrecognizable item

    **Condition Assessment:**
    - Grades: Excellent / Good / Fair / Poor
    - Detects: scratches, dents, wear, cracks, discoloration, missing parts
    - Severity levels: minor / moderate / severe
    - Includes specific location and description for each defect

    **Notes:**
    - Maximum 6 photos will be analyzed
    - If confidence < 50, consider retaking photos
    - User description can improve accuracy
    - More angles = better condition assessment
    """
    try:
        logger.info(
            "identify_request_received",
            photo_count=len(request.photos),
            has_description=bool(request.user_description)
        )

        # Validate photo URLs
        if not request.photos or len(request.photos) == 0:
            raise HTTPException(
                status_code=400,
                detail="At least one photo URL is required"
            )

        # Call vision identification
        result = await vision_identifier.identify_item(
            photo_urls=request.photos,
            user_description=request.user_description
        )

        # Check if we should recommend retaking photos
        if result.confidence < 50:
            logger.warning(
                "low_confidence_identification",
                confidence=result.confidence,
                brand=result.brand,
                model=result.model
            )
            # Still return result, but frontend should warn user

        return result

    except ValueError as e:
        logger.error("validation_error", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        logger.error("identification_error", error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to identify item. Please try again with clearer photos."
        )


@router.get("/health")
async def health_check():
    """Health check for vision service."""
    return {
        "service": "vision",
        "status": "operational",
        "model": "claude-3-5-sonnet-20241022"
    }
