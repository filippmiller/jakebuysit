"""
Test script for condition assessment feature.

Tests the enhanced vision identification with defect detection
using sample images.
"""
import asyncio
import json
from identify import vision_identifier


async def test_condition_assessment():
    """Test condition assessment with various sample images."""

    # Test cases with different condition levels
    test_cases = [
        {
            "name": "Excellent - New iPhone",
            "photos": [
                "https://images.unsplash.com/photo-1592286927505-f0743f4e8b42?w=800",  # New iPhone in box
            ],
            "description": "Brand new iPhone, never used, in original packaging"
        },
        {
            "name": "Good - Used Apple Watch",
            "photos": [
                "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=800",  # Apple Watch
            ],
            "description": "Used Apple Watch, light wear, works perfectly"
        },
        {
            "name": "Fair - Worn Headphones",
            "photos": [
                "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",  # Headphones
            ],
            "description": "Well-used headphones with visible wear"
        }
    ]

    print("=" * 80)
    print("CONDITION ASSESSMENT TEST SUITE")
    print("=" * 80)
    print()

    for i, test_case in enumerate(test_cases, 1):
        print(f"Test {i}/{len(test_cases)}: {test_case['name']}")
        print("-" * 80)

        try:
            # Call vision identifier
            result = await vision_identifier.identify_item(
                photo_urls=test_case["photos"],
                user_description=test_case["description"]
            )

            # Display results
            print(f"✓ Identification successful")
            print(f"  Category: {result.category}")
            print(f"  Brand: {result.brand}")
            print(f"  Model: {result.model}")
            print(f"  Legacy Condition: {result.condition}")
            print(f"  Confidence: {result.confidence}%")
            print()

            if result.condition_assessment:
                ca = result.condition_assessment
                print(f"  CONDITION ASSESSMENT:")
                print(f"    Grade: {ca.grade}")
                print(f"    Confidence: {ca.confidence}%")
                print(f"    Notes: {ca.notes}")
                print(f"    Defects Found: {len(ca.defects)}")

                if ca.defects:
                    print()
                    for j, defect in enumerate(ca.defects, 1):
                        print(f"    Defect {j}:")
                        print(f"      Type: {defect.type}")
                        print(f"      Severity: {defect.severity}")
                        print(f"      Location: {defect.location}")
                        if defect.description:
                            print(f"      Description: {defect.description}")
            else:
                print("  ⚠ No condition assessment returned")

            print()

            # Show full JSON for debugging
            result_dict = result.model_dump()
            print("  Full JSON Response:")
            print("  " + json.dumps(result_dict, indent=2).replace("\n", "\n  "))

        except Exception as e:
            print(f"✗ Test failed: {str(e)}")
            import traceback
            traceback.print_exc()

        print()
        print("=" * 80)
        print()

    print("Test suite completed!")


if __name__ == "__main__":
    asyncio.run(test_condition_assessment())
