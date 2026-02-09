"""
JakeBuysIt - Agent 2: AI Vision & Pricing Engine
Main FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config.settings import settings
import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer()
    ]
)

logger = structlog.get_logger()

# Initialize FastAPI app
app = FastAPI(
    title="JakeBuysIt Pricing Engine",
    description="AI Vision & Pricing Engine for JakeBuysIt pawn shop platform",
    version=settings.api_version,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
if settings.enable_cors:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Configure appropriately for production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    logger.info("starting_pricing_engine", env=settings.app_env)
    # TODO: Initialize database connections, Redis, etc.


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    logger.info("shutting_down_pricing_engine")
    # TODO: Close database connections, Redis, etc.


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "service": "JakeBuysIt Pricing Engine",
        "status": "operational",
        "version": settings.api_version
    }


@app.get("/health")
async def health_check():
    """Detailed health check."""
    return {
        "status": "healthy",
        "environment": settings.app_env,
        "services": {
            "api": "up",
            # TODO: Add database, Redis, external API health checks
        }
    }


# Import routers
from services.vision.router import router as vision_router
from services.marketplace.router import router as marketplace_router
from services.pricing.router import router as pricing_router

# Include routers
app.include_router(
    vision_router,
    prefix=f"/api/{settings.api_version}/vision",
    tags=["vision"]
)
app.include_router(
    marketplace_router,
    prefix=f"/api/{settings.api_version}/marketplace",
    tags=["marketplace"]
)
app.include_router(
    pricing_router,
    prefix=f"/api/{settings.api_version}/pricing",
    tags=["pricing"]
)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True if settings.app_env == "development" else False,
        log_level=settings.log_level.lower()
    )
