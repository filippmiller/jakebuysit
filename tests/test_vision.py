"""
Tests for vision service.
"""
import pytest
from services.vision.condition import condition_assessor


def test_condition_multiplier_new():
    """Test condition multiplier for New condition."""
    mult = condition_assessor.get_condition_multiplier(
        condition="New",
        category="Consumer Electronics",
        damage_list=[]
    )
    assert mult == 1.0


def test_condition_multiplier_good():
    """Test condition multiplier for Good condition."""
    mult = condition_assessor.get_condition_multiplier(
        condition="Good",
        category="Consumer Electronics",
        damage_list=[]
    )
    assert mult == 0.80


def test_condition_multiplier_with_damage():
    """Test condition multiplier with damage penalty."""
    mult = condition_assessor.get_condition_multiplier(
        condition="Good",
        category="Consumer Electronics",
        damage_list=["Scratch", "Dent"]
    )
    # Should be 0.80 * 0.95 = 0.76
    assert mult == pytest.approx(0.76, rel=0.01)


def test_condition_multiplier_category_specific():
    """Test category-specific multiplier adjustments."""
    # Books have higher multiplier for Good condition
    mult_books = condition_assessor.get_condition_multiplier(
        condition="Good",
        category="Books & Media",
        damage_list=[]
    )
    assert mult_books == 0.85

    # Standard electronics
    mult_electronics = condition_assessor.get_condition_multiplier(
        condition="Good",
        category="Consumer Electronics",
        damage_list=[]
    )
    assert mult_electronics == 0.80


def test_condition_assessment_from_text():
    """Test text-based condition assessment."""
    assert condition_assessor.assess_from_description("Brand new, never opened") == "New"
    assert condition_assessor.assess_from_description("Like new condition") == "Like New"
    assert condition_assessor.assess_from_description("Good condition, works great") == "Good"
    assert condition_assessor.assess_from_description("Fair condition, some wear") == "Fair"
    assert condition_assessor.assess_from_description("Poor condition, damaged") == "Poor"
