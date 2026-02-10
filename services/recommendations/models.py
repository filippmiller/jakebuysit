"""
Recommendation Engine Models
Pydantic schemas for request/response validation
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import datetime


class RecommendationRequest(BaseModel):
    """Request for user-based recommendations"""
    user_id: str = Field(..., description="UUID of the user")
    limit: int = Field(default=10, ge=1, le=50, description="Number of recommendations to return")
    exclude_offer_ids: List[str] = Field(default=[], description="Offer IDs to exclude from results")


class SimilarItemsRequest(BaseModel):
    """Request for similar items to a given offer"""
    offer_id: str = Field(..., description="UUID of the reference offer")
    limit: int = Field(default=10, ge=1, le=50, description="Number of similar items to return")
    user_id: Optional[str] = Field(None, description="Optional user ID for personalization")


class TrendingRequest(BaseModel):
    """Request for trending items"""
    days: int = Field(default=7, ge=1, le=30, description="Number of days to look back")
    limit: int = Field(default=10, ge=1, le=50, description="Number of trending items to return")
    category: Optional[str] = Field(None, description="Filter by category")


class RecommendationItem(BaseModel):
    """Single recommendation result"""
    offer_id: str
    score: float = Field(..., description="Recommendation score (0-1, higher is better)")
    reason: str = Field(..., description="Why this was recommended")

    # Offer details (for display)
    item_category: Optional[str] = None
    item_brand: Optional[str] = None
    item_model: Optional[str] = None
    item_condition: Optional[str] = None
    offer_amount: Optional[float] = None
    thumbnail_url: Optional[str] = None


class RecommendationResponse(BaseModel):
    """Response containing recommendations"""
    recommendations: List[RecommendationItem]
    algorithm: str = Field(..., description="Algorithm used (collaborative, content, trending, hybrid)")
    cached: bool = Field(default=False, description="Whether results came from cache")


class HealthResponse(BaseModel):
    """Health check response"""
    status: Literal["healthy", "degraded", "unhealthy"]
    service: str = "recommendations"
    timestamp: datetime
    database_connected: bool
    cache_connected: bool
