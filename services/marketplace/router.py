"""
FastAPI router for marketplace service endpoints.
"""
from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from .models import MarketplaceResearchRequest, MarketplaceResearchResponse
from .aggregator import marketplace_aggregator
from .ebay import ebay_client
from .facebook import facebook_client
from services.cache.redis_client import redis_cache
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


@router.get("/comparables")
async def get_live_comparables(
    item: str = Query(..., description="Item name (e.g., 'iPhone 13 Pro')"),
    category: str = Query("Consumer Electronics", description="Product category"),
    condition: Optional[str] = Query(None, description="Item condition"),
    force_live: bool = Query(False, description="Force live scraping (bypass cache)")
):
    """
    Get live comparable sales data from eBay and Facebook Marketplace.

    **Process:**
    1. Check cache for recent data (1 hour TTL)
    2. If cache miss or force_live=True:
       - Fetch live data from eBay (sold listings, last 30 days)
       - Fetch live data from Facebook Marketplace
    3. Combine and return results with freshness indicator

    **Returns:**
    - Combined listings from eBay + Facebook
    - Data freshness: "live", "cached", or "stale"
    - Health metrics for each scraper
    - Cache status

    **Rate Limiting:**
    - eBay: 1 req/sec with exponential backoff
    - Facebook: 1 req/sec with anti-bot protection

    **Cache:**
    - Results cached for 1 hour
    - Use force_live=true to bypass cache
    """
    try:
        logger.info(
            "comparables_request",
            item=item,
            category=category,
            force_live=force_live
        )

        # Generate cache key
        cache_key = redis_cache.generate_cache_key(
            "comparables",
            item=item,
            category=category,
            condition=condition or "any"
        )

        # Check cache (unless force_live)
        data_freshness = "live"
        if not force_live:
            cached_data = await redis_cache.get(cache_key)
            if cached_data:
                logger.info("comparables_cache_hit", cache_key=cache_key)
                cached_data["data_freshness"] = "cached"
                cached_data["cache_hit"] = True
                return cached_data

        # Fetch live data from both sources
        ebay_listings = []
        facebook_listings = []

        # Fetch from eBay (sold listings, last 30 days for freshness)
        try:
            ebay_listings = await ebay_client.search_sold_listings(
                query=item,
                category=category,
                condition=condition,
                sold_within_days=30,  # Last 30 days for live comparables
                limit=50,
                real_time=True
            )
            logger.info("ebay_comparables_fetched", count=len(ebay_listings))
        except Exception as e:
            logger.error("ebay_comparables_error", error=str(e))

        # Fetch from Facebook Marketplace
        try:
            facebook_listings = await facebook_client.search_listings(
                query=item,
                category=category,
                limit=20
            )
            logger.info("facebook_comparables_fetched", count=len(facebook_listings))
        except Exception as e:
            logger.error("facebook_comparables_error", error=str(e))

        # Combine listings
        all_listings = ebay_listings + facebook_listings

        # Get health metrics
        ebay_health = ebay_client.get_health_metrics()
        facebook_health = facebook_client.get_health_metrics()

        # Prepare response
        response_data = {
            "listings": [
                {
                    "title": listing.title,
                    "price": listing.price,
                    "condition": listing.condition,
                    "sold_date": listing.sold_date.isoformat() if listing.sold_date else None,
                    "source": listing.source,
                    "url": listing.url,
                    "shipping": listing.shipping
                }
                for listing in all_listings
            ],
            "total_count": len(all_listings),
            "sources": {
                "ebay": {
                    "count": len(ebay_listings),
                    "health": ebay_health
                },
                "facebook": {
                    "count": len(facebook_listings),
                    "health": facebook_health
                }
            },
            "data_freshness": data_freshness,
            "cache_hit": False,
            "query": {
                "item": item,
                "category": category,
                "condition": condition
            }
        }

        # Cache for 1 hour (3600 seconds)
        await redis_cache.set(cache_key, response_data, ttl=3600)

        logger.info(
            "comparables_completed",
            total_listings=len(all_listings),
            ebay_count=len(ebay_listings),
            facebook_count=len(facebook_listings)
        )

        return response_data

    except Exception as e:
        logger.error("comparables_error", error=str(e))
        raise HTTPException(
            status_code=500,
            detail="Failed to fetch live comparables. Please try again."
        )


@router.get("/health")
async def health_check():
    """
    Health check for marketplace service.

    Returns scraper health metrics.
    """
    ebay_health = ebay_client.get_health_metrics()
    facebook_health = facebook_client.get_health_metrics()

    return {
        "service": "marketplace",
        "status": "operational",
        "sources": {
            "ebay": {
                "enabled": True,
                "health": ebay_health
            },
            "facebook": {
                "enabled": True,
                "health": facebook_health
            }
        }
    }
