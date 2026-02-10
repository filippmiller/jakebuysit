"""
Unified FastAPI Server for JakeBuysIt Python Services
Mounts all service routers: vision, pricing, marketplace, integration
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import structlog

# Import routers
from integration.router import router as integration_router
from vision.router import router as vision_router
from pricing.router import router as pricing_router
from marketplace.router import router as marketplace_router

# Configure logging
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.JSONRenderer()
    ]
)

logger = structlog.get_logger()

# Create FastAPI app
app = FastAPI(
    title="JakeBuysIt AI Services",
    description="Unified API for vision, pricing, and marketplace intelligence",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(integration_router, prefix="/api/v1/integration", tags=["integration"])
app.include_router(vision_router, prefix="/api/v1/vision", tags=["vision"])
app.include_router(pricing_router, prefix="/api/v1/pricing", tags=["pricing"])
app.include_router(marketplace_router, prefix="/api/v1/marketplace", tags=["marketplace"])

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "jakebuysit-ai-services",
        "version": "1.0.0"
    }

@app.get("/")
async def root():
    """Root endpoint with API info"""
    return {
        "message": "JakeBuysIt AI Services API",
        "docs": "/docs",
        "health": "/health",
        "services": [
            "integration",
            "vision",
            "pricing",
            "marketplace"
        ]
    }

if __name__ == "__main__":
    logger.info("Starting JakeBuysIt AI Services on port 8000")
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
