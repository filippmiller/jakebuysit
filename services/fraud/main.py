"""
Fraud Detection Service - FastAPI application entry point.
Port: 8004
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import structlog
import uvicorn
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from config.settings import settings

try:
    from .router import router
except ImportError:
    from router import router

# Configure structured logging
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(
        logging_level=settings.log_level.upper()
    ),
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Create FastAPI app
app = FastAPI(
    title="JakeBuysIt Fraud Detection Service",
    description="AI-powered fraud detection and risk scoring",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
if settings.enable_cors:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # In production, restrict to specific origins
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Mount fraud detection router
app.include_router(router, prefix="/api/v1", tags=["fraud"])


@app.on_event("startup")
async def startup_event():
    """Startup tasks."""
    logger.info(
        "fraud_service_starting",
        port=8004,
        environment=settings.app_env,
    )


@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown tasks."""
    logger.info("fraud_service_shutting_down")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "service": "fraud-detection",
        "version": "1.0.0",
        "status": "operational",
        "endpoints": {
            "analyze": "/api/v1/analyze-fraud",
            "health": "/api/v1/health",
            "patterns": "/api/v1/patterns",
            "docs": "/docs",
        },
    }


if __name__ == "__main__":
    # Run with: python -m services.fraud.main
    uvicorn.run(
        "services.fraud.main:app",
        host="0.0.0.0",
        port=8004,
        reload=settings.app_env == "development",
        log_level=settings.log_level.lower(),
    )
