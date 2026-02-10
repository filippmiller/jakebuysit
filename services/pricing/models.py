"""
Pydantic models for pricing service.
"""
from pydantic import BaseModel, Field
from typing import Dict, Optional, List
from datetime import datetime


class ComparableSale(BaseModel):
    """Individual comparable sale for pricing reference."""
    source: str = Field(..., description="Source marketplace (ebay, facebook, manual)")
    title: str = Field(..., description="Listing title")
    price: float = Field(..., description="Sold price in USD")
    sold_date: Optional[datetime] = Field(None, description="Date item was sold")
    condition: str = Field(..., description="Item condition")
    url: Optional[str] = Field(None, description="Link to listing")


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
    comparable_sales: List[ComparableSale] = Field(
        default_factory=list,
        description="3-5 comparable sales used in pricing"
    )
    confidence_factors: Dict = Field(
        default_factory=dict,
        description="Breakdown of confidence score factors"
    )

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
                "range": {"low": 95, "high": 140},
                "comparable_sales": [
                    {
                        "source": "ebay",
                        "title": "Apple AirPods Pro 2nd Gen",
                        "price": 118.50,
                        "sold_date": "2026-02-08T14:30:00Z",
                        "condition": "Good",
                        "url": "https://ebay.com/itm/12345"
                    }
                ],
                "confidence_factors": {
                    "data_points": 312,
                    "recency_score": 95,
                    "price_variance": "low",
                    "category_coverage": "high",
                    "explanation": "High confidence: 312 recent sales, low price variance (12%), common item category"
                }
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
    pricing_confidence: Optional[int] = Field(None, ge=0, le=100, description="Confidence in pricing data")
    comparable_sales: List[ComparableSale] = Field(
        default_factory=list,
        description="Comparable sales from FMV calculation"
    )

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
