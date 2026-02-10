"""
FastAPI router for fraud detection endpoints.
"""
from fastapi import APIRouter, HTTPException
import structlog

try:
    from .models import FraudAnalysisRequest, FraudAnalysisResponse
    from .detector import fraud_detector
except ImportError:
    from models import FraudAnalysisRequest, FraudAnalysisResponse
    from detector import fraud_detector

logger = structlog.get_logger()
router = APIRouter()


@router.post("/analyze-fraud", response_model=FraudAnalysisResponse)
async def analyze_fraud(request: FraudAnalysisRequest):
    """
    Analyze offer for fraud risk.

    Returns risk score (0-100), fraud flags, and recommended action.
    """
    try:
        logger.info(
            "fraud_analysis_request",
            offer_id=request.offer_id,
            offer_amount=request.offer_amount,
        )

        # Perform fraud analysis
        result = await fraud_detector.analyze(request)

        return result

    except Exception as e:
        logger.error("fraud_analysis_failed", error=str(e), offer_id=request.offer_id)
        raise HTTPException(status_code=500, detail=f"Fraud analysis failed: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "service": "fraud-detection",
        "status": "operational",
        "version": "1.0.0",
    }


@router.get("/patterns")
async def get_patterns():
    """
    Get current fraud detection patterns and thresholds.
    For admin/debugging purposes.
    """
    from .patterns import FraudPatterns

    return {
        "velocity_limits": FraudPatterns.VELOCITY_LIMITS,
        "price_thresholds": FraudPatterns.PRICE_ANOMALY_THRESHOLDS,
        "high_risk_categories": list(FraudPatterns.HIGH_RISK_CATEGORIES.keys()),
        "new_account_days": FraudPatterns.NEW_ACCOUNT_DAYS,
        "new_account_max_offer": FraudPatterns.NEW_ACCOUNT_MAX_OFFER_VALUE,
    }
