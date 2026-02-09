"""
Pydantic models for pricing service.
"""
from pydantic import BaseModel, Field
from typing import Dict, Optional


class FMVRequest(BaseModel):
    """Request for Fair Market Value calculation."""
    marketplace_data: Dict = Field(..., description="Marketplace statistics and listings")
    category: str
    condition: str


class FMVResponse(BaseModel):
    """Response with Fair Market Value."""
    fmv: float = Field(..., description="Fair Market Value in USD")
    confidence: int = Field(..., ge=0, le=100, description="Confidence in FMV (0-100)")
    data_quality: str = Field(..., description="High/Medium/Low")
    sources: Dict = Field(default_factory=dict, description="Breakdown by source")
    range: Dict[str, float] = Field(..., description="Price range (low, high)")

    class Config:
        json_schema_extra = {
            "example": {
                "fmv": 118.00,
                "confidence": 85,
                "data_quality": "High",
                "sources": {
                    "ebay_sold": {"count": 312, "median": 118},
                    "amazon_used": {"avg": 125},
                    "google_shopping": {"avg": 122}
                },
                "range": {"low": 95, "high": 140}
            }
        }


class OfferRequest(BaseModel):
    """Request for offer calculation."""
    fmv: float = Field(..., description="Fair Market Value")
    condition: str
    category: str
    user_id: Optional[str] = None
    inventory_count: int = Field(default=0, description="Current inventory of this item")


class OfferResponse(BaseModel):
    """Response with calculated offer."""
    offer_amount: float = Field(..., description="Final offer in USD")
    base_calculation: Dict = Field(..., description="Breakdown of calculation")
    adjustments: Dict = Field(default_factory=dict, description="Dynamic adjustments applied")
    expires_at: Optional[str] = None
    confidence: int = Field(..., ge=0, le=100)

    class Config:
        json_schema_extra = {
            "example": {
                "offer_amount": 59.00,
                "base_calculation": {
                    "fmv": 118.00,
                    "condition_multiplier": 0.80,
                    "category_margin": 0.60,
                    "base_offer": 56.64
                },
                "adjustments": {
                    "velocity_bonus": 1.05,
                    "final_multiplier": 1.05
                },
                "expires_at": "2026-02-10T15:39:00Z",
                "confidence": 85
            }
        }


class ConfidenceRequest(BaseModel):
    """Request for confidence scoring."""
    vision_confidence: int = Field(..., ge=0, le=100)
    marketplace_data_count: int
    condition_clear: bool
    user_description_match: bool = True


class ConfidenceResponse(BaseModel):
    """Response with confidence assessment."""
    overall_confidence: int = Field(..., ge=0, le=100)
    action: str = Field(..., description="auto_price / flag_for_review / escalate")
    details: Dict = Field(default_factory=dict)
