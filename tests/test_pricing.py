"""
Tests for pricing service.
"""
import pytest
from services.pricing.offer import offer_engine
from services.pricing.fmv import fmv_engine


def test_offer_calculation_basic():
    """Test basic offer calculation."""
    result = offer_engine.calculate_offer(
        fmv=100.0,
        condition="Good",
        category="Consumer Electronics",
        inventory_count=0
    )

    # FMV 100 * condition 0.8 * margin 0.6 = 48
    assert result["offer_amount"] == pytest.approx(48.0, rel=0.01)
    assert result["base_calculation"]["fmv"] == 100.0
    assert result["base_calculation"]["condition_multiplier"] == 0.8
    assert result["base_calculation"]["category_margin"] == 0.6


def test_offer_calculation_with_inventory_saturation():
    """Test offer reduction with inventory saturation."""
    result = offer_engine.calculate_offer(
        fmv=100.0,
        condition="Good",
        category="Consumer Electronics",
        inventory_count=10  # High inventory
    )

    # Should have inventory saturation penalty
    assert result["offer_amount"] < 48.0
    assert "inventory_saturation" in result["adjustments"]
    assert result["adjustments"]["inventory_saturation"] < 0


def test_offer_minimum_floor():
    """Test minimum offer floor."""
    result = offer_engine.calculate_offer(
        fmv=5.0,  # Very low FMV
        condition="Poor",
        category="Books & Media"
    )

    # Should not go below $5 minimum
    assert result["offer_amount"] >= 5.0


def test_fmv_confidence_calculation():
    """Test FMV confidence scoring."""
    marketplace_stats = {
        "count": 100,
        "median": 118.0,
        "mean": 121.0,
        "std_dev": 10.0
    }

    result = fmv_engine.calculate_fmv(
        marketplace_stats=marketplace_stats,
        category="Consumer Electronics",
        condition="Good"
    )

    assert result.confidence >= 80  # High confidence with 100 listings
    assert result.data_quality == "High"


def test_fmv_low_confidence():
    """Test FMV with low data quality."""
    marketplace_stats = {
        "count": 5,  # Low count
        "median": 50.0,
        "mean": 55.0,
        "std_dev": 20.0  # High variance
    }

    result = fmv_engine.calculate_fmv(
        marketplace_stats=marketplace_stats,
        category="Collectibles & Vintage",
        condition="Fair"
    )

    assert result.confidence < 70  # Lower confidence
    assert result.data_quality == "Low"
