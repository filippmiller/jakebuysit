"""
SEO title generation service using Claude 3.5 Sonnet.
Creates search-optimized product titles for offers.
"""
import anthropic
import structlog
from typing import Optional
from config.settings import settings

logger = structlog.get_logger()


class SEOTitleGenerator:
    """Generates SEO-optimized product titles for search engines."""

    def __init__(self):
        self.client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        self.model = "claude-sonnet-4-5-20250929"

    async def generate_seo_title(
        self,
        brand: str,
        model: str,
        category: str,
        condition: str,
        features: list[str],
        subcategory: Optional[str] = None
    ) -> str:
        """
        Generate an SEO-optimized title for a product.

        Target length: 60-70 characters for optimal Google snippet display.

        Args:
            brand: Product brand name
            model: Product model name
            category: Product category
            condition: Item condition (New, Like New, Good, Fair, Poor)
            features: List of notable features
            subcategory: Optional subcategory

        Returns:
            SEO-optimized title string

        Example outputs:
            "iPhone 13 Pro 128GB - Like New | Sierra Blue | Fast Ship"
            "Sony PS5 Disc - Good Condition | Ships Today"
            "MacBook Pro M1 2021 - Excellent | 16GB RAM | Warranty"
        """
        logger.info(
            "generating_seo_title",
            brand=brand,
            model=model,
            category=category
        )

        prompt = self._build_seo_prompt(
            brand=brand,
            model=model,
            category=category,
            condition=condition,
            features=features,
            subcategory=subcategory
        )

        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=150,
                messages=[{
                    "role": "user",
                    "content": prompt
                }],
                temperature=0.7,  # Slightly higher for creative title generation
            )

            seo_title = response.content[0].text.strip()

            # Remove quotes if Claude wrapped it
            if seo_title.startswith('"') and seo_title.endswith('"'):
                seo_title = seo_title[1:-1]

            # Truncate if too long (hard limit at 70 chars)
            if len(seo_title) > 70:
                seo_title = seo_title[:67] + "..."

            logger.info(
                "seo_title_generated",
                title=seo_title,
                length=len(seo_title)
            )

            return seo_title

        except Exception as e:
            logger.error("seo_title_generation_failed", error=str(e))
            # Fallback to basic title
            return self._generate_fallback_title(brand, model, condition)

    def _build_seo_prompt(
        self,
        brand: str,
        model: str,
        category: str,
        condition: str,
        features: list[str],
        subcategory: Optional[str] = None
    ) -> str:
        """Build the prompt for SEO title generation."""
        features_text = ", ".join(features[:3]) if features else "N/A"
        subcategory_text = subcategory or "N/A"

        return f"""You are an expert at writing SEO-optimized product titles for e-commerce listings.

Create a compelling, search-optimized title for this product:

**Product Details:**
- Brand: {brand}
- Model: {model}
- Category: {category}
- Subcategory: {subcategory_text}
- Condition: {condition}
- Key Features: {features_text}

**SEO Title Requirements:**
1. **Length**: 60-70 characters (strict limit - this displays best in Google search results)
2. **Format**: [Brand] [Model] - [Condition] | [Key Feature] | [Trust Signal]
3. **Components**:
   - Include brand and model prominently
   - Include condition if not "New"
   - Add 1-2 key differentiators from features
   - Add trust signal: "Fast Ship", "Ships Today", "Free Ship", "Warranty", etc.
4. **Style**:
   - Use pipe (|) separators for readability
   - Use hyphens (-) for clauses
   - Capitalize important words
   - NO emojis, NO special characters except | and -
   - Be descriptive but concise
5. **Keywords**:
   - Include model number/size if available
   - Include color if distinctive
   - Include capacity/storage if relevant (phones, laptops)

**Examples:**
- "iPhone 13 Pro 128GB - Like New | Sierra Blue | Fast Ship"
- "Sony PS5 Disc - Good Condition | Ships Today"
- "MacBook Pro M1 2021 - Excellent | 16GB RAM | Warranty"
- "Canon EOS R6 Camera - Like New | Body Only | Free Ship"
- "Nintendo Switch OLED - Good | Animal Crossing | Ships 24h"

**Generate the SEO title now. Output ONLY the title, nothing else.**"""

    def _generate_fallback_title(self, brand: str, model: str, condition: str) -> str:
        """Generate a simple fallback title if AI generation fails."""
        title = f"{brand} {model}"
        if condition and condition not in ["New", "Unknown"]:
            title += f" - {condition}"
        title += " | Fast Shipping"
        return title[:70]


# Global instance
seo_title_generator = SEOTitleGenerator()
