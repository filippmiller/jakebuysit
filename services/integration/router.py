"""
Integration router for Agent 4 Backend.
Provides endpoints matching the contract defined in agent2-client.ts
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import structlog

from services.vision.identify import vision_identifier
from services.marketplace.aggregator import marketplace_aggregator
from services.pricing.fmv import fmv_engine
from services.pricing.offer import offer_engine

logger = structlog.get_logger()
router = APIRouter()


# Request/Response models matching Agent 4's TypeScript interfaces
class IdentifyRequest(BaseModel):
    photo_urls: List[str] = Field(..., description="Array of photo URLs")
    user_description: Optional[str] = None


class VisionResult(BaseModel):
    category: str
    subcategory: str
    brand: str
    model: str
    condition: str
    features: List[str]
    damage: List[str]
    confidence: int
    identifiers: Dict[str, Optional[str]]


class ResearchRequest(BaseModel):
    brand: str
    model: str
    category: str
    condition: Optional[str] = None


class MarketplaceStats(BaseModel):
    count: int
    median: float
    mean: float
    std_dev: float
    percentiles: Dict[str, float]
    min_price: Optional[float] = None
    max_price: Optional[float] = None


class MarketplaceResult(BaseModel):
    listings: List[Dict]
    stats: MarketplaceStats
    sources_checked: List[str]
    cache_hit: bool


class PriceRequest(BaseModel):
    marketplace_stats: Dict
    category: str
    condition: str


class ComparableSale(BaseModel):
    source: str
    title: str
    price: float
    sold_date: Optional[str] = None
    condition: str
    url: Optional[str] = None


class PricingResult(BaseModel):
    fmv: float
    fmv_confidence: int
    offer_amount: float
    offer_to_market_ratio: float
    condition_multiplier: float
    category_margin: float
    data_quality: str
    range: Dict[str, float]
    pricing_confidence: Optional[int] = None
    comparable_sales: List[ComparableSale] = []
    confidence_factors: Optional[Dict] = None


@router.post("/identify", response_model=VisionResult)
async def identify_item(request: IdentifyRequest):
    """
    Identify an item from photos using Claude Vision.

    Agent 4 Integration Endpoint - matches contract in agent2-client.ts
    """
    try:
        logger.info("integration_identify_called", photo_count=len(request.photo_urls))

        # Call internal vision service
        result = await vision_identifier.identify_item(
            photo_urls=request.photo_urls,
            user_description=request.user_description
        )

        # Map to Agent 4's expected format
        return VisionResult(
            category=result.category,
            subcategory=result.subcategory,
            brand=result.brand,
            model=result.model,
            condition=result.condition,
            features=result.features,
            damage=result.damage,
            confidence=result.confidence,
            identifiers={
                "upc": result.identifiers.upc,
                "model_number": result.identifiers.model_number
            }
        )

    except Exception as e:
        logger.error("identify_integration_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/research", response_model=MarketplaceResult)
async def research_marketplace(request: ResearchRequest):
    """
    Research marketplace prices for an identified item.

    Agent 4 Integration Endpoint - matches contract in agent2-client.ts
    """
    try:
        logger.info(
            "integration_research_called",
            brand=request.brand,
            model=request.model,
            category=request.category
        )

        # Call internal marketplace service
        result = await marketplace_aggregator.research_product(
            brand=request.brand,
            model=request.model,
            category=request.category,
            condition=request.condition
        )

        # Map to Agent 4's expected format
        return MarketplaceResult(
            listings=[
                {
                    "source": listing.source,
                    "price": listing.price,
                    "title": listing.title,
                    "sold_date": listing.sold_date.isoformat() if listing.sold_date else None
                }
                for listing in result["listings"]
            ],
            stats=MarketplaceStats(
                count=result["stats"].count,
                median=result["stats"].median,
                mean=result["stats"].mean,
                std_dev=result["stats"].std_dev,
                percentiles=result["stats"].percentiles,
                min_price=result["stats"].min_price,
                max_price=result["stats"].max_price
            ),
            sources_checked=result["sources_checked"],
            cache_hit=result["cache_hit"]
        )

    except Exception as e:
        logger.error("research_integration_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/price", response_model=PricingResult)
async def calculate_price(request: PriceRequest):
    """
    Calculate FMV and generate offer amount in a single call.

    Agent 4 Integration Endpoint - matches contract in agent2-client.ts
    Combines FMV calculation + offer generation into one response.
    """
    try:
        logger.info(
            "integration_price_called",
            category=request.category,
            condition=request.condition
        )

        # Step 1: Calculate FMV
        fmv_result = fmv_engine.calculate_fmv(
            marketplace_stats=request.marketplace_stats,
            category=request.category,
            condition=request.condition
        )

        # Step 2: Calculate offer with pricing confidence and comparable sales
        offer_result = offer_engine.calculate_offer(
            fmv=fmv_result.fmv,
            condition=request.condition,
            category=request.category,
            pricing_confidence=fmv_result.confidence,
            comparable_sales=fmv_result.comparable_sales
        )

        # Step 3: Combine results
        offer_to_market_ratio = (
            offer_result["offer_amount"] / fmv_result.fmv
            if fmv_result.fmv > 0 else 0
        )

        # Map comparable sales to expected format
        comparable_sales_mapped = [
            ComparableSale(
                source=comp.source,
                title=comp.title,
                price=comp.price,
                sold_date=comp.sold_date.isoformat() if comp.sold_date else None,
                condition=comp.condition,
                url=comp.url
            )
            for comp in fmv_result.comparable_sales
        ]

        return PricingResult(
            fmv=fmv_result.fmv,
            fmv_confidence=fmv_result.confidence,
            offer_amount=offer_result["offer_amount"],
            offer_to_market_ratio=round(offer_to_market_ratio, 3),
            condition_multiplier=offer_result["base_calculation"]["condition_multiplier"],
            category_margin=offer_result["base_calculation"]["category_margin"],
            data_quality=fmv_result.data_quality,
            range=fmv_result.range,
            pricing_confidence=fmv_result.confidence,
            comparable_sales=comparable_sales_mapped,
            confidence_factors=fmv_result.confidence_factors
        )

    except Exception as e:
        logger.error("price_integration_failed", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def integration_health():
    """Health check for integration layer."""
    return {
        "service": "agent2-integration",
        "status": "operational",
        "endpoints": ["/identify", "/research", "/price"]
    }
