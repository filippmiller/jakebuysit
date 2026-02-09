"""
FastAPI router for marketplace service endpoints.
"""
from fastapi import APIRouter, HTTPException
from .models import MarketplaceResearchRequest, MarketplaceResearchResponse
from .aggregator import marketplace_aggregator
import structlog

logger = structlog.get_logger()
router = APIRouter()


@router.post("/research", response_model=MarketplaceResearchResponse)
async def research_product(request: MarketplaceResearchRequest):
    """
    Research marketplace prices for a product.

    **Process:**
    1. Searches eBay sold listings (last 90 days)
    2. Fetches Amazon pricing (if available)
    3. Checks Google Shopping aggregates
    4. Filters outliers using IQR method
    5. Applies recency weighting
    6. Computes statistical analysis

    **Returns:**
    - List of comparable listings
    - Statistics (median, mean, percentiles, std dev)
    - Sources checked

    **Notes:**
    - eBay sold listings are the primary data source
    - Results are cached for 4-24 hours depending on frequency
    - Minimum 10 listings recommended for reliable FMV
    """
    try:
        logger.info(
            "marketplace_research_request",
            product=request.product,
            category=request.category
        )

        # Extract product details
        brand = request.product.get("brand", "")
        model = request.product.get("model", "")

        if not brand or not model:
            raise HTTPException(
                status_code=400,
                detail="Both 'brand' and 'model' are required in product details"
            )

        # Research across marketplaces
        result = await marketplace_aggregator.research_product(
            brand=brand,
            model=model,
            category=request.category,
            condition=request.condition
        )

        # Check if we have enough data
        if result["stats"].count < 5:
            logger.warning(
                "insufficient_marketplace_data",
                count=result["stats"].count,
                brand=brand,
                model=model
            )
            # Still return result, but frontend should warn

        return MarketplaceResearchResponse(**result)

    except ValueError as e:
        logger.error("validation_error", error=str(e))
        raise HTTPException(status_code=400, detail=str(e))

    except Exception as e:
        logger.error("marketplace_research_error", error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to research marketplace data. Please try again."
        )


@router.get("/health")
async def health_check():
    """Health check for marketplace service."""
    return {
        "service": "marketplace",
        "status": "operational",
        "sources": ["ebay"]  # Add more as implemented
    }
