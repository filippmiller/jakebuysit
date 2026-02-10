"""
Recommendation Service
FastAPI application for product recommendations
Port: 8005
"""
import os
import sys
import logging
from contextlib import asynccontextmanager
import asyncpg
import redis.asyncio as redis
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .router import router, set_engine
from .engine import RecommendationEngine

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration from environment
DB_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://postgres:postgres@localhost:5432/jakebuysit'
)
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379')
CORS_ORIGINS = os.getenv('CORS_ORIGINS', '*').split(',')


# Global connections
db_pool: asyncpg.Pool = None
cache_client: redis.Redis = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic"""
    global db_pool, cache_client

    logger.info("Starting Recommendation Service...")

    # Connect to PostgreSQL
    try:
        db_pool = await asyncpg.create_pool(
            DB_URL,
            min_size=2,
            max_size=10,
            command_timeout=30,
        )
        logger.info("Connected to PostgreSQL")
    except Exception as e:
        logger.error(f"Failed to connect to PostgreSQL: {e}")
        sys.exit(1)

    # Connect to Redis
    try:
        cache_client = redis.from_url(
            REDIS_URL,
            encoding="utf-8",
            decode_responses=True
        )
        await cache_client.ping()
        logger.info("Connected to Redis")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        sys.exit(1)

    # Initialize recommendation engine
    engine = RecommendationEngine(db_pool, cache_client)
    set_engine(engine)
    logger.info("Recommendation engine initialized")

    yield

    # Shutdown
    logger.info("Shutting down Recommendation Service...")
    if db_pool:
        await db_pool.close()
    if cache_client:
        await cache_client.close()


# Create FastAPI app
app = FastAPI(
    title="JakeBuysIt Recommendation Service",
    description="Collaborative filtering and content-based recommendation engine",
    version="1.0.0",
    lifespan=lifespan
)

# Add rate limiter state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include router
app.include_router(router)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "recommendations",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/ping")
async def ping():
    """Simple ping endpoint"""
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8005,
        reload=True,
        log_level="info"
    )
