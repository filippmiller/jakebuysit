"""
Test script for Phase 1 pricing enhancements:
- Confidence scores
- Comparable sales
- Confidence factors
"""
import asyncio
from fmv import fmv_engine
from offer import offer_engine


def test_confidence_calculation():
    """Test confidence calculation with various data scenarios."""

    # High confidence scenario: many recent sales, low variance
    high_conf_stats = {
        "count": 150,
        "median": 118.0,
        "mean": 120.0,
        "std_dev": 12.0,
        "listings": [
            {
                "title": "Apple AirPods Pro 2nd Gen",
                "price": 118.50,
                "condition": "Good",
                "sold_date": "2026-02-08T14:30:00Z",
                "source": "ebay",
                "url": "https://ebay.com/itm/12345"
            },
            {
                "title": "AirPods Pro 2 - Excellent Condition",
                "price": 119.00,
                "condition": "Like New",
                "sold_date": "2026-02-07T10:15:00Z",
                "source": "ebay",
                "url": "https://ebay.com/itm/12346"
            },
            {
                "title": "Apple AirPods Pro Gen 2",
                "price": 117.00,
                "condition": "Good",
                "sold_date": "2026-02-06T16:45:00Z",
                "source": "ebay",
                "url": "https://ebay.com/itm/12347"
            },
            {
                "title": "AirPods Pro 2nd Generation",
                "price": 120.00,
                "condition": "Good",
                "sold_date": "2026-02-05T09:20:00Z",
                "source": "ebay",
                "url": "https://ebay.com/itm/12348"
            },
            {
                "title": "Apple AirPods Pro 2 with Case",
                "price": 116.50,
                "condition": "Good",
                "sold_date": "2026-02-04T14:00:00Z",
                "source": "ebay",
                "url": "https://ebay.com/itm/12349"
            }
        ]
    }

    print("\n=== HIGH CONFIDENCE TEST ===")
    result = fmv_engine.calculate_fmv(
        marketplace_stats=high_conf_stats,
        category="Consumer Electronics",
        condition="Good"
    )

    print(f"FMV: ${result.fmv}")
    print(f"Confidence: {result.confidence}%")
    print(f"Data Quality: {result.data_quality}")
    print(f"\nConfidence Factors:")
    for key, value in result.confidence_factors.items():
        print(f"  {key}: {value}")

    print(f"\nComparable Sales ({len(result.comparable_sales)}):")
    for comp in result.comparable_sales:
        print(f"  - {comp.title[:50]}: ${comp.price} ({comp.condition}, {comp.source})")

    assert result.confidence >= 80, f"Expected high confidence (>=80), got {result.confidence}"
    assert len(result.comparable_sales) >= 3, f"Expected 3+ comps, got {len(result.comparable_sales)}"

    # Medium confidence scenario: moderate data, some variance
    medium_conf_stats = {
        "count": 15,
        "median": 75.0,
        "mean": 78.0,
        "std_dev": 18.0,
        "listings": [
            {
                "title": "Gaming Headset XYZ",
                "price": 75.00,
                "condition": "Good",
                "sold_date": "2026-01-25T12:00:00Z",
                "source": "ebay",
                "url": "https://ebay.com/itm/99999"
            },
            {
                "title": "XYZ Gaming Headset",
                "price": 80.00,
                "condition": "Like New",
                "sold_date": "2026-01-20T10:00:00Z",
                "source": "ebay",
                "url": None
            },
            {
                "title": "Headset Gaming XYZ",
                "price": 72.00,
                "condition": "Good",
                "sold_date": "2026-01-15T14:00:00Z",
                "source": "ebay",
                "url": None
            }
        ]
    }

    print("\n\n=== MEDIUM CONFIDENCE TEST ===")
    result = fmv_engine.calculate_fmv(
        marketplace_stats=medium_conf_stats,
        category="Gaming",
        condition="Good"
    )

    print(f"FMV: ${result.fmv}")
    print(f"Confidence: {result.confidence}%")
    print(f"Data Quality: {result.data_quality}")
    print(f"\nExplanation: {result.confidence_factors['explanation']}")

    assert 50 <= result.confidence < 80, f"Expected medium confidence (50-79), got {result.confidence}"

    # Low confidence scenario: few data points, high variance
    low_conf_stats = {
        "count": 2,
        "median": 45.0,
        "mean": 55.0,
        "std_dev": 30.0,
        "listings": [
            {
                "title": "Rare Collectible Item",
                "price": 40.00,
                "condition": "Fair",
                "sold_date": "2025-12-01T10:00:00Z",
                "source": "ebay",
                "url": None
            },
            {
                "title": "Vintage Rare Item",
                "price": 70.00,
                "condition": "Good",
                "sold_date": "2025-11-15T12:00:00Z",
                "source": "ebay",
                "url": None
            }
        ]
    }

    print("\n\n=== LOW CONFIDENCE TEST ===")
    result = fmv_engine.calculate_fmv(
        marketplace_stats=low_conf_stats,
        category="Collectibles & Vintage",
        condition="Fair"
    )

    print(f"FMV: ${result.fmv}")
    print(f"Confidence: {result.confidence}%")
    print(f"Data Quality: {result.data_quality}")
    print(f"\nExplanation: {result.confidence_factors['explanation']}")

    assert result.confidence < 50, f"Expected low confidence (<50), got {result.confidence}"

    print("\n\n✅ ALL CONFIDENCE TESTS PASSED")


def test_offer_with_confidence():
    """Test that offer calculation includes pricing confidence and comparables."""

    print("\n\n=== OFFER CALCULATION WITH CONFIDENCE ===")

    comparable_sales = [
        {
            "source": "ebay",
            "title": "Test Item A",
            "price": 100.0,
            "sold_date": "2026-02-01",
            "condition": "Good",
            "url": "https://example.com/1"
        }
    ]

    offer_result = offer_engine.calculate_offer(
        fmv=100.0,
        condition="Good",
        category="Consumer Electronics",
        inventory_count=0,
        user_trust_score=1.0,
        pricing_confidence=85,
        comparable_sales=comparable_sales
    )

    print(f"Offer Amount: ${offer_result['offer_amount']}")
    print(f"FMV: ${offer_result['base_calculation']['fmv']}")
    print(f"Pricing Confidence: {offer_result['pricing_confidence']}%")
    print(f"Comparable Sales Count: {len(offer_result['comparable_sales'])}")

    assert offer_result['pricing_confidence'] == 85
    assert len(offer_result['comparable_sales']) == 1

    print("\n✅ OFFER TEST PASSED")


if __name__ == "__main__":
    print("Testing Phase 1 Pricing Enhancements\n")
    print("=" * 60)

    test_confidence_calculation()
    test_offer_with_confidence()

    print("\n" + "=" * 60)
    print("🎉 ALL TESTS PASSED - Phase 1 Implementation Complete!")
