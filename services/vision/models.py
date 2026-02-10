"""
Pydantic models for vision service.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict


class IdentifyRequest(BaseModel):
    """Request model for item identification."""
    photos: List[str] = Field(..., description="Array of photo URLs")
    user_description: Optional[str] = Field(None, description="Optional user text hint")


class Defect(BaseModel):
    """Individual defect or condition issue."""
    type: str = Field(..., description="Type of defect (e.g., 'scratch', 'dent', 'wear', 'crack', 'discoloration')")
    severity: str = Field(..., description="Severity: 'minor', 'moderate', 'severe'")
    location: str = Field(..., description="Location on item (e.g., 'front screen', 'back case', 'corner')")
    description: Optional[str] = Field(None, description="Detailed description of the defect")


class ConditionAssessment(BaseModel):
    """Detailed condition assessment with grading."""
    grade: str = Field(..., description="Overall condition grade: Excellent/Good/Fair/Poor")
    notes: str = Field(..., description="Summary of condition assessment reasoning")
    defects: List[Defect] = Field(default_factory=list, description="List of specific defects found")
    confidence: int = Field(..., ge=0, le=100, description="Confidence in condition assessment")


class ProductIdentifiers(BaseModel):
    """Product identifiers (UPC, model numbers, etc.)."""
    upc: Optional[str] = None
    ean: Optional[str] = None
    model_number: Optional[str] = None
    asin: Optional[str] = None


class IdentifyResponse(BaseModel):
    """Response model for item identification."""
    category: str = Field(..., description="Primary category (e.g., Consumer Electronics)")
    subcategory: str = Field(..., description="Specific subcategory (e.g., Wireless Earbuds)")
    brand: str = Field(..., description="Brand name")
    model: str = Field(..., description="Model name/number")
    condition: str = Field(..., description="Assessed condition (New/Like New/Good/Fair/Poor)")
    features: List[str] = Field(default_factory=list, description="Notable features present")
    damage: List[str] = Field(default_factory=list, description="Damage or issues observed")
    confidence: int = Field(..., ge=0, le=100, description="Confidence score 0-100")
    identifiers: ProductIdentifiers = Field(default_factory=ProductIdentifiers)
    condition_assessment: Optional[ConditionAssessment] = Field(None, description="Detailed condition assessment")

    class Config:
        json_schema_extra = {
            "example": {
                "category": "Consumer Electronics",
                "subcategory": "Wireless Earbuds",
                "brand": "Apple",
                "model": "AirPods Pro 2nd Generation",
                "condition": "Good",
                "features": ["Charging case", "Original tips"],
                "damage": ["Minor scratches on case"],
                "confidence": 87,
                "identifiers": {
                    "upc": "194253397434",
                    "model_number": "MTJV3AM/A"
                }
            }
        }


class ConditionMultipliers(BaseModel):
    """Condition multipliers for pricing."""
    NEW: float = 1.0
    LIKE_NEW: float = 0.925  # 92.5%
    GOOD: float = 0.80
    FAIR: float = 0.625
    POOR: float = 0.40


class VisionError(BaseModel):
    """Error response from vision service."""
    error: str
    details: Optional[str] = None
    retry_with_different_photos: bool = False
