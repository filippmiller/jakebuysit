"""
Quick test script for recommendation service
"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

async def test_engine():
    """Test recommendation engine with mock data"""
    print("Testing Recommendation Engine...")

    # Would need actual database connection to test
    # For now, just verify imports work
    from recommendations.models import RecommendationRequest, TrendingRequest
    from recommendations.engine import RecommendationEngine

    print("[OK] Imports successful")
    print("[OK] Models loaded")
    print("[OK] Engine class loaded")

    # Test model validation
    req = RecommendationRequest(user_id="test-uuid", limit=10)
    print(f"[OK] RecommendationRequest validation: {req.model_dump()}")

    trend_req = TrendingRequest(days=7, limit=5)
    print(f"[OK] TrendingRequest validation: {trend_req.model_dump()}")

    print("\n[SUCCESS] All tests passed!")
    print("\nTo start the service:")
    print("  cd services/recommendations")
    print("  python -m recommendations.main")

if __name__ == "__main__":
    asyncio.run(test_engine())
