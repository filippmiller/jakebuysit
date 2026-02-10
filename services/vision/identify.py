"""
Vision identification service using Claude 3.5 Sonnet Vision.
Identifies items from photos with structured output.
"""
import anthropic
import structlog
from typing import List, Optional, Dict, Any
from config.settings import settings
from .models import IdentifyResponse, ProductIdentifiers

logger = structlog.get_logger()


class VisionIdentifier:
    """Handles item identification using multimodal LLMs."""

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-3-5-sonnet-20241022"

    async def identify_item(
        self,
        photo_urls: List[str],
        user_description: Optional[str] = None
    ) -> IdentifyResponse:
        """
        Identify an item from photos using Claude Vision.

        Args:
            photo_urls: List of image URLs
            user_description: Optional user-provided text hint

        Returns:
            IdentifyResponse with structured identification data

        Raises:
            Exception if confidence is too low or API fails
        """
        logger.info("identifying_item", photo_count=len(photo_urls))

        # Build the prompt
        prompt = self._build_identification_prompt(user_description)

        # Prepare image content
        image_content = []
        for url in photo_urls[:6]:  # Limit to 6 photos as per spec
            image_content.append({
                "type": "image",
                "source": {
                    "type": "url",
                    "url": url
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
  }
}

CONDITION ASSESSMENT GUIDELINES:
- **New**: Unopened box, all original packaging, tags attached
- **Like New**: No visible wear, appears unused, may have been opened
- **Good**: Light wear, minor scratches, fully functional, no major damage
- **Fair**: Noticeable wear, scratches, scuffs, or minor damage but still functional
- **Poor**: Heavy damage, major scratches/dents, questionable functionality

CONFIDENCE SCORING:
- 90-100: Crystal clear images, recognizable brand/model, clear condition assessment
- 70-89: Brand and category clear, model somewhat identifiable, condition assessable
- 50-69: Can identify category and general type, but brand/model unclear
- <50: Blurry photos, unrecognizable item, or insufficient information

Be honest about confidence. If you can't identify the item clearly, say so."""

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
            identifiers=ProductIdentifiers(**data.get("identifiers", {}))
        )


# Global instance
vision_identifier = VisionIdentifier()
