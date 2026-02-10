"""
Pydantic models for fraud detection requests and responses.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime


class FraudAnalysisRequest(BaseModel):
    """Request payload for fraud analysis."""

    offer_id: str = Field(..., description="Unique offer identifier")
    user_id: Optional[str] = Field(None, description="User ID if authenticated")

    # Offer details
    offer_amount: float = Field(..., description="Proposed offer amount")
    fmv: float = Field(..., description="Fair market value")
    category: str = Field(..., description="Product category")
    condition: str = Field(..., description="Item condition")

    # User behavior
    user_created_at: Optional[datetime] = Field(None, description="User account creation date")
    user_offer_count: int = Field(0, description="Total offers by this user")
    user_trust_score: float = Field(50.0, description="User trust score (0-100)")

    # Context
    ip_address: Optional[str] = Field(None, description="Request IP address")
    user_agent: Optional[str] = Field(None, description="Browser user agent")

    # Additional signals
    photo_urls: List[str] = Field(default_factory=list, description="Photo URLs for image analysis")
    description: Optional[str] = Field(None, description="User description")


class FraudFlag(BaseModel):
    """Individual fraud flag detected."""

    type: str = Field(..., description="Flag type identifier")
    severity: str = Field(..., description="low, medium, high, critical")
    score_impact: float = Field(..., description="Impact on risk score (0-100)")
    description: str = Field(..., description="Human-readable explanation")
    evidence: Optional[Dict] = Field(None, description="Supporting evidence")


class FraudAnalysisResponse(BaseModel):
    """Response from fraud analysis."""

    offer_id: str
    risk_score: int = Field(..., description="Overall risk score (0-100)")
    risk_level: str = Field(..., description="low, medium, high, critical")
    confidence: float = Field(..., description="Confidence in assessment (0-1)")

    flags: List[FraudFlag] = Field(default_factory=list, description="Detected fraud indicators")
    explanation: str = Field(..., description="Human-readable summary")

    # Breakdown by signal type
    breakdown: Dict[str, float] = Field(
        default_factory=dict,
        description="Score breakdown by signal type"
    )

    # Recommended actions
    recommended_action: str = Field(
        ...,
        description="approve, review, escalate, reject"
    )

    analyzed_at: datetime = Field(default_factory=datetime.utcnow)


class VelocityPattern(BaseModel):
    """User submission velocity pattern."""

    user_id: str
    offer_count_1h: int
    offer_count_24h: int
    offer_count_7d: int
    total_value_24h: float
    avg_time_between_offers: Optional[float] = None  # seconds
