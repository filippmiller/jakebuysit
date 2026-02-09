"""
Pydantic models for marketplace service.
"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime


class MarketplaceListing(BaseModel):
    """Individual marketplace listing."""
    title: str
    price: float
    condition: str
    sold_date: Optional[datetime] = None
    shipping: float = 0.0
    source: str  # 'ebay', 'amazon', 'google'
    url: Optional[str] = None


class MarketplaceStats(BaseModel):
    """Statistical analysis of marketplace data."""
    count: int = Field(..., description="Number of listings found")
    median: float = Field(..., description="Median price")
    mean: float = Field(..., description="Mean (average) price")
    std_dev: float = Field(..., description="Standard deviation")
    percentiles: Dict[str, float] = Field(
        default_factory=dict,
        description="Percentile data (p25, p50, p75)"
    )
    min_price: Optional[float] = None
    max_price: Optional[float] = None


class MarketplaceResearchRequest(BaseModel):
    """Request for marketplace research."""
    product: Dict[str, str] = Field(
        ...,
        description="Product details (brand, model, category, condition)"
    )
    category: str
    condition: Optional[str] = None


class MarketplaceResearchResponse(BaseModel):
    """Response from marketplace research."""
    listings: List[MarketplaceListing]
    stats: MarketplaceStats
    sources_checked: List[str]
    cache_hit: bool = False

    class Config:
        json_schema_extra = {
            "example": {
                "listings": [
                    {
                        "title": "Apple AirPods Pro 2nd Gen",
                        "price": 118.50,
                        "condition": "Pre-Owned",
                        "sold_date": "2026-01-15",
                        "shipping": 0.0,
                        "source": "ebay"
                    }
                ],
                "stats": {
                    "count": 312,
                    "median": 118.00,
                    "mean": 121.30,
                    "std_dev": 14.20,
                    "percentiles": {
                        "p25": 105,
                        "p50": 118,
                        "p75": 132
                    }
                },
                "sources_checked": ["ebay", "amazon", "google"],
                "cache_hit": False
            }
        }


class EBaySearchRequest(BaseModel):
    """Request for eBay sold listings search."""
    query: str
    category: str
    condition: Optional[str] = None
    sold_within_days: int = 90
    limit: int = 50
