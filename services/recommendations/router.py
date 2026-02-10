"""
Recommendation Service API Router
FastAPI endpoints for recommendation queries
"""
from fastapi import APIRouter, HTTPException, status, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from .models import (
    RecommendationRequest,
    SimilarItemsRequest,
    TrendingRequest,
    RecommendationResponse,
    HealthResponse,
)
from .engine import RecommendationEngine
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/recommendations", tags=["recommendations"])

# Rate limiter
limiter = Limiter(key_func=get_remote_address)


# Global engine instance (set by main.py)
_engine: RecommendationEngine = None


def set_engine(engine: RecommendationEngine):
    """Set the global recommendation engine instance"""
    global _engine
    _engine = engine


@router.post("/for-user", response_model=RecommendationResponse)
@limiter.limit("10/minute")
async def get_user_recommendations(request: RecommendationRequest, http_request: Request):
    """
    Get personalized recommendations for a user
    Uses hybrid approach: collaborative filtering + content-based + trending
    Rate limit: 10 requests per minute per IP
    """
    try:
        logger.info(f"Getting recommendations for user {request.user_id}")

        recommendations = await _engine.get_user_recommendations(
            user_id=request.user_id,
            limit=request.limit,
            exclude_offer_ids=request.exclude_offer_ids
        )

        return RecommendationResponse(
            recommendations=recommendations,
            algorithm="hybrid",
            cached=False  # Cache info is internal to engine
        )

    except Exception as e:
        logger.error(f"Failed to get user recommendations: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate recommendations: {str(e)}"
        )


@router.post("/similar", response_model=RecommendationResponse)
@limiter.limit("20/minute")
async def get_similar_items(request: SimilarItemsRequest, http_request: Request):
    """
    Get items similar to a given offer
    Uses content-based filtering on category, brand, price, condition
    Rate limit: 20 requests per minute per IP
    """
    try:
        logger.info(f"Getting similar items to offer {request.offer_id}")

        recommendations = await _engine.get_similar_items(
            offer_id=request.offer_id,
            limit=request.limit,
            user_id=request.user_id
        )

        if not recommendations:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Offer not found or no similar items available"
            )

        return RecommendationResponse(
            recommendations=recommendations,
            algorithm="content-based",
            cached=False
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get similar items: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to find similar items: {str(e)}"
        )


@router.post("/trending", response_model=RecommendationResponse)
@limiter.limit("20/minute")
async def get_trending_items(request: TrendingRequest, http_request: Request):
    """
    Get trending items based on recent views and accepts
    Trending score = (views * 1.0) + (accepts * 10.0)
    Rate limit: 20 requests per minute per IP
    """
    try:
        logger.info(f"Getting trending items for {request.days} days")

        recommendations = await _engine.get_trending_items(
            days=request.days,
            limit=request.limit,
            category=request.category
        )

        return RecommendationResponse(
            recommendations=recommendations,
            algorithm="trending",
            cached=False
        )

    except Exception as e:
        logger.error(f"Failed to get trending items: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get trending items: {str(e)}"
        )


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        db_connected = False
        cache_connected = False

        if _engine and _engine.db:
            try:
                await _engine.db.fetchval("SELECT 1")
                db_connected = True
            except Exception as e:
                logger.error(f"Database health check failed: {e}")

        if _engine and _engine.cache:
            try:
                await _engine.cache.ping()
                cache_connected = True
            except Exception as e:
                logger.error(f"Cache health check failed: {e}")

        status_value = "healthy" if (db_connected and cache_connected) else \
                      "degraded" if (db_connected or cache_connected) else \
                      "unhealthy"

        return HealthResponse(
            status=status_value,
            timestamp=datetime.utcnow(),
            database_connected=db_connected,
            cache_connected=cache_connected
        )

    except Exception as e:
        logger.error(f"Health check failed: {e}", exc_info=True)
        return HealthResponse(
            status="unhealthy",
            timestamp=datetime.utcnow(),
            database_connected=False,
            cache_connected=False
        )
