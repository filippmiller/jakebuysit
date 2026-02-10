"""
Test script for price optimizer.
"""
from datetime import datetime, timedelta
from optimizer import price_optimizer


def test_optimizer():
    """Test price optimization logic."""

    # Test case 1: High velocity offer (should NOT adjust)
    print("\n=== Test 1: High Velocity Offer ===")
    result = price_optimizer.analyze_offer(
        offer_id="test-1",
        current_price=500.0,
        original_offer=450.0,
        created_at=datetime.now() - timedelta(days=10),
        view_count=60,  # 6 views/day = high velocity
        last_optimized=None,
    )
    print(f"Should adjust: {result['should_adjust']}")
    print(f"Reason: {result['reason']}")
    print(f"Velocity: {result['velocity']:.2f} views/day")
    assert result['should_adjust'] == False, "High velocity should not adjust"

    # Test case 2: Low velocity + 7 days old + low views (should adjust -5%)
    print("\n=== Test 2: 7-Day Low Velocity ===")
    result = price_optimizer.analyze_offer(
        offer_id="test-2",
        current_price=600.0,
        original_offer=400.0,  # Price floor will be 480
        created_at=datetime.now() - timedelta(days=10),
        view_count=8,  # Less than 10 views = meets threshold
        last_optimized=None,
    )
    print(f"Should adjust: {result['should_adjust']}")
    print(f"Recommended price: ${result['recommended_price']:.2f}")
    print(f"Reduction: {result['reduction_percent']:.1f}%")
    print(f"Reason: {result['reason']}")
    print(f"Price floor: ${result['price_floor']:.2f}")
    assert result['should_adjust'] == True, "Should apply 5% decay"
    assert 565 <= result['recommended_price'] <= 575, "Should be ~5% reduction"

    # Test case 3: 30+ days old (should adjust -15%)
    print("\n=== Test 3: 30-Day Stale Listing ===")
    result = price_optimizer.analyze_offer(
        offer_id="test-3",
        current_price=600.0,
        original_offer=400.0,
        created_at=datetime.now() - timedelta(days=35),
        view_count=10,  # Low views
        last_optimized=None,
    )
    print(f"Should adjust: {result['should_adjust']}")
    print(f"Recommended price: ${result['recommended_price']:.2f}")
    print(f"Reduction: {result['reduction_percent']:.1f}%")
    assert result['should_adjust'] == True, "Should apply 15% decay"
    assert 505 <= result['recommended_price'] <= 515, "Should be ~15% reduction"

    # Test case 4: Price floor protection
    print("\n=== Test 4: Price Floor Protection ===")
    result = price_optimizer.analyze_offer(
        offer_id="test-4",
        current_price=550.0,  # Already at floor (450 * 1.20 = 540)
        original_offer=450.0,
        created_at=datetime.now() - timedelta(days=35),
        view_count=10,
        last_optimized=None,
    )
    print(f"Should adjust: {result['should_adjust']}")
    print(f"Price floor: ${result['price_floor']:.2f}")
    print(f"Reason: {result['reason']}")
    # Should hit floor at $540

    # Test case 5: Medium velocity (should NOT adjust)
    print("\n=== Test 5: Medium Velocity ===")
    result = price_optimizer.analyze_offer(
        offer_id="test-5",
        current_price=500.0,
        original_offer=450.0,
        created_at=datetime.now() - timedelta(days=10),
        view_count=30,  # 3 views/day = medium
        last_optimized=None,
    )
    print(f"Should adjust: {result['should_adjust']}")
    print(f"Reason: {result['reason']}")
    assert result['should_adjust'] == False, "Medium velocity should not adjust"

    # Test case 6: Batch analysis
    print("\n=== Test 6: Batch Analysis ===")
    offers = [
        {
            "offer_id": "batch-1",
            "current_price": 500,
            "original_offer": 450,
            "created_at": (datetime.now() - timedelta(days=10)).isoformat(),
            "view_count": 5,
            "last_optimized": None,
        },
        {
            "offer_id": "batch-2",
            "current_price": 300,
            "original_offer": 250,
            "created_at": (datetime.now() - timedelta(days=30)).isoformat(),
            "view_count": 8,
            "last_optimized": None,
        },
    ]

    results = price_optimizer.batch_analyze(offers)
    print(f"Analyzed {len(results)} offers")
    for offer_id, result in results.items():
        print(f"  {offer_id}: adjust={result['should_adjust']}, reason={result['reason']}")

    print("\n[SUCCESS] All tests passed!")


if __name__ == "__main__":
    test_optimizer()
