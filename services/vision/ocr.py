"""
OCR service for serial number extraction from product photos.
Supports Tesseract (local) and Google Vision API (fallback).
"""
import anthropic
import structlog
import re
from typing import List, Optional, Dict, Any
from config.settings import settings

logger = structlog.get_logger()


class SerialNumberExtractor:
    """
    Extracts serial numbers from product photos using OCR.

    Supports multiple methods:
    1. Claude Vision API (primary - best for structured text)
    2. Google Vision API (fallback - if configured)
    3. Pattern matching for common formats
    """

    # Common serial number patterns
    PATTERNS = {
        'imei': re.compile(r'\b\d{15}\b'),  # IMEI: 15 digits
        'serial_alphanum': re.compile(r'\b[A-Z0-9]{8,20}\b'),  # Alphanumeric 8-20 chars
        'apple_serial': re.compile(r'\b[A-Z0-9]{12}\b'),  # Apple: 12 chars
        'samsung_serial': re.compile(r'\bR[A-Z0-9]{14}\b'),  # Samsung: R + 14 chars
        'model_number': re.compile(r'\b[A-Z]{2,4}\d{4,6}[A-Z]{0,3}\b'),  # Common model format
    }

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-sonnet-4-5-20250929"

    async def extract_serial_number(
        self,
        photo_urls: List[str],
        product_category: Optional[str] = None,
        brand: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Extract serial number from product photos.

        Args:
            photo_urls: List of image URLs (prioritize photos showing labels/serials)
            product_category: Optional category hint for better pattern matching
            brand: Optional brand hint for brand-specific serial formats

        Returns:
            {
                "serial_number": "ABC123...",
                "confidence": 85,
                "method": "claude_vision",
                "location": "back panel label",
                "all_detected": ["ABC123...", "XYZ789..."],
                "imei": "123456789012345" (if phone)
            }
        """
        logger.info(
            "extracting_serial_number",
            photo_count=len(photo_urls),
            category=product_category,
            brand=brand
        )

        # Step 1: Try Claude Vision OCR
        result = await self._extract_with_claude_vision(
            photo_urls, product_category, brand
        )

        if result and result.get("confidence", 0) >= 70:
            logger.info(
                "serial_extracted_successfully",
                serial=result.get("serial_number"),
                method=result.get("method"),
                confidence=result.get("confidence")
            )
            return result

        # Step 2: If low confidence, try pattern matching on OCR output
        if result and result.get("all_text"):
            pattern_result = self._extract_with_patterns(
                result["all_text"], product_category, brand
            )
            if pattern_result:
                logger.info("serial_extracted_via_patterns", serial=pattern_result["serial_number"])
                return pattern_result

        # Step 3: Return best effort or empty
        logger.warning("serial_extraction_low_confidence", confidence=result.get("confidence", 0) if result else 0)
        return result or {
            "serial_number": None,
            "confidence": 0,
            "method": "none",
            "all_detected": []
        }

    async def _extract_with_claude_vision(
        self,
        photo_urls: List[str],
        product_category: Optional[str] = None,
        brand: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Extract serial number using Claude Vision API."""

        prompt = self._build_ocr_prompt(product_category, brand)

        # Prepare image content
        image_content = []
        for url in photo_urls[:4]:  # Limit to 4 photos for OCR
            image_content.append({
                "type": "image",
                "source": {
                    "type": "url",
                    "url": url
                }
            })

        image_content.append({
            "type": "text",
            "text": prompt
        })

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                messages=[{
                    "role": "user",
                    "content": image_content
                }],
                temperature=0.0,  # Deterministic for OCR
            )

            # Parse response
            result = self._parse_ocr_response(response.content[0].text)
            result["method"] = "claude_vision"
            return result

        except Exception as e:
            logger.error("claude_vision_ocr_failed", error=str(e))
            return None

    def _build_ocr_prompt(
        self,
        product_category: Optional[str] = None,
        brand: Optional[str] = None
    ) -> str:
        """Build OCR prompt for serial number extraction."""

        base_prompt = """You are an expert OCR system specializing in extracting serial numbers and identifiers from product photos.

Your task is to find and extract the serial number, IMEI, or unique identifier from these product images.

WHERE TO LOOK:
- Back of device (most common)
- Battery compartment
- SIM tray
- Product label/sticker
- Original box
- Settings screen (if photo of screen)
- Engraved or printed on device housing

WHAT TO EXTRACT:
"""

        # Add category-specific hints
        if product_category and "phone" in product_category.lower():
            base_prompt += """
For PHONES:
- IMEI: 15-digit number (most important)
- Serial Number: Usually 10-12 alphanumeric characters
- Model Number: Format varies by brand
"""

        if brand:
            brand_lower = brand.lower()
            if "apple" in brand_lower:
                base_prompt += """
For APPLE PRODUCTS:
- Serial Number: 12 characters, alphanumeric (e.g., C02XYZ123ABC)
- IMEI: 15 digits (for iPhones/iPads with cellular)
- Model: Format A1234, A2345 etc.
"""
            elif "samsung" in brand_lower:
                base_prompt += """
For SAMSUNG PRODUCTS:
- Serial Number: Starts with 'R', 15 characters total
- IMEI: 15 digits
"""

        base_prompt += """

RESPONSE FORMAT (JSON):
{
  "serial_number": "The primary serial number or IMEI",
  "confidence": 85,
  "location": "Where you found it (e.g., 'back panel label', 'SIM tray')",
  "all_detected": ["All serial-like numbers you found"],
  "imei": "15-digit IMEI if this is a phone",
  "model_number": "Model number if visible",
  "all_text": "All text you could read from labels/stickers"
}

CONFIDENCE SCORING:
- 90-100: Clear, readable serial on official label
- 70-89: Serial visible but slightly blurry or partial
- 50-69: Possible serial but hard to read
- <50: No clear serial found or very poor quality

IMPORTANT:
- If multiple serials found, choose the most official-looking one as primary
- IMEI is preferred for phones (most verifiable)
- If you see "S/N:" or "Serial:" label, that's the main serial
- Return ONLY the JSON, no other text
"""

        return base_prompt

    @staticmethod
    def _extract_first_json_object(text: str) -> Optional[str]:
        """Extract the first balanced JSON object from text."""
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

    def _parse_ocr_response(self, response_text: str) -> Dict[str, Any]:
        """Parse Claude's OCR response into structured format."""
        import json
        import re

        # Try to extract JSON
        json_match = re.search(r'```json\s*(\{.*?\})\s*```', response_text, re.DOTALL)
        if json_match:
            json_text = json_match.group(1)
        else:
            json_text = self._extract_first_json_object(response_text)
            if not json_text:
                # No JSON found, return empty result
                return {
                    "serial_number": None,
                    "confidence": 0,
                    "all_detected": []
                }

        try:
            data = json.loads(json_text)
            return {
                "serial_number": data.get("serial_number"),
                "confidence": data.get("confidence", 0),
                "location": data.get("location"),
                "all_detected": data.get("all_detected", []),
                "imei": data.get("imei"),
                "model_number": data.get("model_number"),
                "all_text": data.get("all_text", "")
            }
        except json.JSONDecodeError:
            logger.error("ocr_json_parse_failed", response=response_text[:200])
            return {
                "serial_number": None,
                "confidence": 0,
                "all_detected": []
            }

    def _extract_with_patterns(
        self,
        text: str,
        product_category: Optional[str] = None,
        brand: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Extract serial using regex patterns.
        Fallback method when OCR confidence is low.
        """
        matches = []

        # Try IMEI first (most reliable for phones)
        if product_category and "phone" in product_category.lower():
            imei_matches = self.PATTERNS['imei'].findall(text)
            if imei_matches:
                return {
                    "serial_number": imei_matches[0],
                    "confidence": 75,
                    "method": "pattern_imei",
                    "all_detected": imei_matches,
                    "imei": imei_matches[0]
                }

        # Brand-specific patterns
        if brand:
            brand_lower = brand.lower()
            if "apple" in brand_lower:
                apple_matches = self.PATTERNS['apple_serial'].findall(text)
                if apple_matches:
                    matches.extend(apple_matches)
            elif "samsung" in brand_lower:
                samsung_matches = self.PATTERNS['samsung_serial'].findall(text)
                if samsung_matches:
                    matches.extend(samsung_matches)

        # General alphanumeric pattern
        alphanum_matches = self.PATTERNS['serial_alphanum'].findall(text)
        matches.extend(alphanum_matches)

        if matches:
            # Prefer longer serials (more likely to be real)
            best_match = max(matches, key=len)
            return {
                "serial_number": best_match,
                "confidence": 60,  # Pattern matching is less confident
                "method": "pattern_matching",
                "all_detected": list(set(matches))
            }

        return None


# Global instance
serial_extractor = SerialNumberExtractor()
