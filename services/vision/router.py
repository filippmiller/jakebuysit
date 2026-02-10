"""
FastAPI router for vision service endpoints.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
from .models import IdentifyRequest, IdentifyResponse, VisionError, SerialNumberResult
from .identify import vision_identifier
from .ocr import serial_extractor
import structlog

logger = structlog.get_logger()
router = APIRouter()


class OCRRequest(BaseModel):
    """Request model for serial number extraction."""
    photos: List[str] = Field(..., description="Photo URLs (prioritize images showing labels/serials)")
    product_category: Optional[str] = Field(None, description="Product category hint")
    brand: Optional[str] = Field(None, description="Brand hint for format-specific extraction")


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


@router.post("/ocr/serial", response_model=SerialNumberResult)
async def extract_serial_number(request: OCRRequest):
    """
    Extract serial number from product photos using OCR.

    **Process:**
    1. Uses Claude Vision API for OCR text extraction
    2. Applies brand/category-specific pattern matching
    3. Returns serial number with confidence score

    **Common Serial Formats:**
    - IMEI: 15 digits (phones/tablets)
    - Apple Serial: 12 alphanumeric characters
    - Samsung Serial: R + 14 characters
    - General: 8-20 alphanumeric characters

    **Tips for Best Results:**
    - Include photos showing labels, stickers, or engraved serials
    - Back of device, battery compartment, SIM tray
    - Clear, well-lit photos
    - Provide category/brand hints if available
    """
    try:
        logger.info(
            "ocr_serial_request",
            photo_count=len(request.photos),
            category=request.product_category,
            brand=request.brand
        )

        result = await serial_extractor.extract_serial_number(
            photo_urls=request.photos,
            product_category=request.product_category,
            brand=request.brand
        )

        if result.get("confidence", 0) < 50:
            logger.warning("low_confidence_serial", confidence=result.get("confidence"))

        return SerialNumberResult(**result)

    except Exception as e:
        logger.error("ocr_serial_failed", error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to extract serial number. Please try with clearer photos."
        )


@router.get("/health")
async def health_check():
    """Health check for vision service."""
    return {
        "service": "vision",
        "status": "operational",
        "model": "claude-3-5-sonnet-20241022",
        "features": ["identification", "condition_assessment", "ocr_serial"]
    }
