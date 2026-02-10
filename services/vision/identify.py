"""
Vision identification service using Claude 3.5 Sonnet Vision.
Identifies items from photos with structured output.
"""
import anthropic
import structlog
from typing import List, Optional, Dict, Any
from config.settings import settings
from .models import (
    IdentifyResponse,
    ProductIdentifiers,
    ConditionAssessment,
    Defect,
    ProductMetadata,
    SerialNumberResult
)
from .seo import seo_title_generator
from .ocr import serial_extractor

logger = structlog.get_logger()


class VisionIdentifier:
    """Handles item identification using multimodal LLMs."""

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-3-5-sonnet-20241022"

    async def identify_item(
        self,
        photo_urls: List[str],
        base64_photos: Optional[List[Dict[str, str]]] = None,
        user_description: Optional[str] = None
    ) -> IdentifyResponse:
        """
        Identify an item from photos using Claude Vision.

        Args:
            photo_urls: List of image URLs
            base64_photos: List of base64-encoded photos with mediaType
            user_description: Optional user-provided text hint

        Returns:
            IdentifyResponse with structured identification data

        Raises:
            Exception if confidence is too low or API fails
        """
        total_photos = len(photo_urls) + (len(base64_photos) if base64_photos else 0)
        logger.info("identifying_item", photo_count=total_photos)

        # Build the prompt
        prompt = self._build_identification_prompt(user_description)

        # Prepare image content
        image_content = []

        # Add URL photos
        for url in photo_urls[:6]:  # Limit to 6 photos as per spec
            image_content.append({
                "type": "image",
                "source": {
                    "type": "url",
                    "url": url
                }
            })

        # Add base64 photos
        if base64_photos:
            remaining_slots = 6 - len(image_content)
            for photo in base64_photos[:remaining_slots]:
                image_content.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": photo.get("mediaType", "image/jpeg"),
                        "data": photo["data"]
                    }
                })

        # Add text prompt
        image_content.append({
            "type": "text",
            "text": prompt
        })

        try:
            # Call Claude Vision API
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2048,
                messages=[{
                    "role": "user",
                    "content": image_content
                }],
                temperature=0.3,  # Lower temperature for more consistent extraction
            )

            # Parse response into structured format
            result = self._parse_vision_response(response.content[0].text)

            logger.info(
                "item_identified",
                brand=result.brand,
                model=result.model,
                confidence=result.confidence
            )

            # Check confidence threshold
            if result.confidence < 50:
                logger.warning("low_confidence", confidence=result.confidence)
                # Could retry with different prompt here

            # Generate SEO title
            try:
                seo_title = await seo_title_generator.generate_seo_title(
                    brand=result.brand,
                    model=result.model,
                    category=result.category,
                    condition=result.condition,
                    features=result.features,
                    subcategory=result.subcategory
                )
                result.seo_title = seo_title
            except Exception as e:
                logger.warning("seo_title_generation_failed", error=str(e))
                # Continue without SEO title - it's not critical

            # Extract serial number using OCR (async)
            try:
                # Pass both URL and base64 photos to serial extractor
                all_photo_urls = photo_urls.copy()
                serial_result = await serial_extractor.extract_serial_number(
                    photo_urls=all_photo_urls,
                    base64_photos=base64_photos,
                    product_category=result.category,
                    brand=result.brand
                )

                if serial_result and serial_result.get("serial_number"):
                    result.serial_info = SerialNumberResult(**serial_result)
                    logger.info(
                        "serial_extracted",
                        serial=serial_result["serial_number"],
                        confidence=serial_result["confidence"]
                    )
            except Exception as e:
                logger.warning("serial_extraction_failed", error=str(e))
                # Continue without serial - it's optional

            return result

        except Exception as e:
            logger.error("vision_identification_failed", error=str(e))
            raise

    def _build_identification_prompt(self, user_description: Optional[str] = None) -> str:
        """Build the prompt for Claude Vision."""
        base_prompt = """You are an expert pawn shop appraiser examining items from photos.

Analyze the provided images carefully and provide a detailed assessment in the following JSON format:

{
  "category": "Primary category (e.g., Consumer Electronics, Gaming, Phones & Tablets, Clothing & Fashion, Collectibles & Vintage, Books & Media, Small Appliances, Tools & Equipment)",
  "subcategory": "Specific subcategory",
  "brand": "Brand name",
  "model": "Model name/number",
  "condition": "One of: New, Like New, Good, Fair, Poor",
  "features": ["List of notable features you can see"],
  "damage": ["List of any damage, wear, or issues you observe"],
  "confidence": 85,
  "identifiers": {
    "upc": "UPC code if visible",
    "model_number": "Model number if visible"
  },
  "condition_assessment": {
    "grade": "Excellent/Good/Fair/Poor",
    "notes": "Explain the condition reasoning in 1-2 sentences",
    "defects": [
      {
        "type": "scratch/dent/wear/crack/discoloration/stain/missing_parts",
        "severity": "minor/moderate/severe",
        "location": "Specific location on item",
        "description": "Optional detailed description"
      }
    ],
    "confidence": 85
  },
  "product_metadata": {
    "brand": "Brand name (Apple, Samsung, etc.)",
    "model": "Full model name (iPhone 13 Pro, Galaxy S21 Ultra)",
    "variant": "Variant/edition (Pro, Ultra, Plus, etc.)",
    "storage": "Storage capacity (128GB, 256GB, 512GB, 1TB)",
    "color": "Product color (Sierra Blue, Phantom Black, etc.)",
    "year": 2021,
    "generation": "Generation if applicable (2nd Gen, 3rd Gen)",
    "condition_specifics": {
      "battery_health": "85%" (for electronics with batteries),
      "screen_condition": "pristine/good/scratched" (for devices with screens)
    }
  }
}

CONDITION GRADING SCALE:
- **Excellent**: Like new condition, no visible defects, appears unused or barely used. Minimal to no cosmetic wear. Equivalent to "New" or "Like New" for resale.
- **Good**: Light wear appropriate for age. Minor cosmetic issues (small scratches, light scuffs) that don't affect function. Normal use signs but well-maintained.
- **Fair**: Noticeable wear and cosmetic damage. Multiple scratches, scuffs, or small dents. Fully functional but shows significant use. May have minor missing accessories.
- **Poor**: Heavy damage, major cosmetic issues, or questionable functionality. Deep scratches, dents, cracks, discoloration. Missing important parts or accessories.

DEFECT DETECTION - CRITICAL TASK:
Examine each photo systematically for:
1. **Scratches**: Surface scratches, deep gouges, scuff marks (location: front, back, sides, screen, etc.)
2. **Dents/Dings**: Impact damage, bent corners, deformed surfaces
3. **Wear**: General wear patterns, rubbed edges, fading, peeling
4. **Cracks**: Screen cracks, housing cracks, broken components
5. **Discoloration**: Yellowing, staining, oxidation, rust
6. **Missing Parts**: Missing buttons, ports, covers, accessories
7. **Functional Issues**: Visible non-functionality (if observable in photos)

For EACH defect found:
- Specify exact TYPE from the list above
- Rate SEVERITY (minor = barely noticeable, moderate = clearly visible, severe = major damage)
- Describe precise LOCATION (e.g., "upper right corner of screen", "back panel center", "left side edge")
- Add DESCRIPTION for context if severity is moderate or severe

SEVERITY GUIDELINES:
- **Minor**: Small scratches <5mm, light scuffs, barely visible marks, surface-level only
- **Moderate**: Scratches 5-15mm, noticeable dents, visible wear areas, cosmetic but clear
- **Severe**: Deep scratches >15mm, cracks, significant dents, functional damage, missing parts

CONDITION CONFIDENCE:
- 90-100: Crystal clear photos from multiple angles, all areas visible, excellent lighting
- 70-89: Good photos, most areas visible, some angles missing or lighting suboptimal
- 50-69: Limited photos, some areas obscured, blurry or dark images
- <50: Poor photo quality, item mostly obscured, cannot assess condition reliably

IDENTIFICATION CONFIDENCE (main confidence field):
- 90-100: Crystal clear images, recognizable brand/model, visible identifiers
- 70-89: Brand and category clear, model somewhat identifiable
- 50-69: Can identify category and general type, but brand/model unclear
- <50: Blurry photos, unrecognizable item, or insufficient information

PRODUCT METADATA - CRITICAL FOR PRICING:
Extract granular details for accurate market pricing:
- **Brand**: Exact brand name (Apple, not "apple" or "APPLE")
- **Model**: Full specific model (iPhone 13 Pro, not just "iPhone")
- **Variant**: Pro/Ultra/Plus/Max/Standard (crucial for pricing)
- **Storage**: 64GB/128GB/256GB/512GB/1TB (huge price differentiator)
- **Color**: Exact color name (Sierra Blue, Graphite, Starlight)
- **Year**: Release year if you can determine it
- **Generation**: 2nd Gen, 3rd Gen, etc. if applicable
- **Condition Specifics**: Battery health %, screen condition details

EXAMPLES:
- iPhone 14 Pro Max 512GB in Deep Purple (2022) - variant=Pro Max, storage=512GB, color=Deep Purple, year=2022
- Samsung Galaxy S23 Ultra 256GB Phantom Black (2023) - variant=Ultra, storage=256GB, color=Phantom Black
- AirPods Pro 2nd Generation - generation=2nd Gen

IMPORTANT:
- condition_assessment.defects should be EMPTY ARRAY if no defects found (Excellent condition)
- Be thorough but accurate - don't invent defects that aren't visible
- If photos are unclear in certain areas, note this in condition_assessment.notes
- condition_assessment.grade may differ from the legacy "condition" field - be specific
- Always explain your reasoning in condition_assessment.notes
- **product_metadata is CRITICAL** - extract all granular details for accurate pricing

Be honest about confidence. If you can't assess condition clearly due to photo quality, say so in notes and lower the confidence score."""

        if user_description:
            base_prompt += f"\n\nUSER DESCRIPTION: {user_description}\n(Use this as a hint, but prioritize what you see in the photos)"

        base_prompt += "\n\nProvide ONLY the JSON response, no additional commentary."

        return base_prompt

    @staticmethod
    def _extract_first_json_object(text: str) -> str | None:
        """Extract the first balanced JSON object from text by tracking brace depth."""
        start = text.find('{')
        if start == -1:
            return None
        depth = 0
        in_string = False
        escape_next = False
        for i in range(start, len(text)):
            ch = text[i]
            if escape_next:
                escape_next = False
                continue
            if ch == '\\' and in_string:
                escape_next = True
                continue
            if ch == '"' and not escape_next:
                in_string = not in_string
                continue
            if in_string:
                continue
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    return text[start:i + 1]
        return None

    def _parse_vision_response(self, response_text: str) -> IdentifyResponse:
        """
        Parse Claude's response into structured IdentifyResponse.

        Handles JSON extraction and validation.
        """
        import json
        import re

        # Try to extract JSON from response
        # Sometimes Claude wraps it in markdown code blocks
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
        if json_match:
            json_text = json_match.group(1)
        else:
            # Extract the first balanced JSON object by counting braces
            json_text = self._extract_first_json_object(response_text)
            if not json_text:
                raise ValueError("Could not extract JSON from vision response")

        # Parse JSON
        data = json.loads(json_text)

        # Parse condition assessment if present
        condition_assessment = None
        if "condition_assessment" in data and data["condition_assessment"]:
            ca_data = data["condition_assessment"]
            defects = []
            for defect_data in ca_data.get("defects", []):
                defects.append(Defect(
                    type=defect_data.get("type", "unknown"),
                    severity=defect_data.get("severity", "minor"),
                    location=defect_data.get("location", "unspecified"),
                    description=defect_data.get("description")
                ))

            condition_assessment = ConditionAssessment(
                grade=ca_data.get("grade", "Unknown"),
                notes=ca_data.get("notes", ""),
                defects=defects,
                confidence=ca_data.get("confidence", 0)
            )

        # Parse product metadata if present
        product_metadata = None
        if "product_metadata" in data and data["product_metadata"]:
            pm_data = data["product_metadata"]
            product_metadata = ProductMetadata(
                brand=pm_data.get("brand"),
                model=pm_data.get("model"),
                variant=pm_data.get("variant"),
                storage=pm_data.get("storage"),
                color=pm_data.get("color"),
                year=pm_data.get("year"),
                generation=pm_data.get("generation"),
                condition_specifics=pm_data.get("condition_specifics")
            )

        # Convert to IdentifyResponse with validation
        return IdentifyResponse(
            category=data.get("category", "Unknown"),
            subcategory=data.get("subcategory", "Unknown"),
            brand=data.get("brand", "Unknown"),
            model=data.get("model", "Unknown"),
            condition=data.get("condition", "Unknown"),
            features=data.get("features", []),
            damage=data.get("damage", []),
            confidence=data.get("confidence", 0),
            identifiers=ProductIdentifiers(**data.get("identifiers", {})),
            condition_assessment=condition_assessment,
            product_metadata=product_metadata
        )


# Global instance
vision_identifier = VisionIdentifier()
