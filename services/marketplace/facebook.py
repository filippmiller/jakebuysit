"""
Facebook Marketplace scraper for live comparable sales data.

Features:
- Real-time scraping using Playwright (headless browser)
- Rate limiting (1 req/sec)
- Location-based search
- Price/condition extraction
- Error handling and retries

Note:
    Facebook Marketplace requires browser automation due to dynamic content.
    This scraper uses Playwright in headless mode.
"""
import asyncio
import structlog
from typing import List, Optional, Dict, Any
from datetime import datetime
from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeout
from .models import MarketplaceListing

logger = structlog.get_logger()


class FacebookMarketplaceClient:
    """
    Client for scraping Facebook Marketplace listings.

    Features:
    - Headless browser scraping
    - Rate limiting: 1 request/second
    - Exponential backoff on errors
    - Health metrics tracking
    """

    BASE_URL = "https://www.facebook.com/marketplace"

    # Rate limiting: 1 request per second
    MIN_REQUEST_INTERVAL = 1.0  # seconds

    # Retry configuration
    MAX_RETRIES = 3
    BASE_BACKOFF = 2.0  # seconds

    # Timeout for page loads
    PAGE_TIMEOUT = 30000  # 30 seconds

    def __init__(self):
        self.last_request_time: Optional[datetime] = None
        self.browser_context = None
        self.playwright = None

        # Health metrics
        self.metrics = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "total_response_time": 0.0,
            "blocked_count": 0
        }

    async def search_listings(
        self,
        query: str,
        category: Optional[str] = None,
        location: str = "United States",
        limit: int = 20
    ) -> List[MarketplaceListing]:
        """
        Search Facebook Marketplace for listings.

        Args:
            query: Search query (item name)
            category: Category filter (optional)
            location: Location for search (default: "United States")
            limit: Maximum number of results (default: 20)

        Returns:
            List of MarketplaceListing objects

        Note:
            - Uses headless browser automation
            - Applies rate limiting
            - Handles anti-bot detection
        """
        logger.info(
            "searching_facebook_marketplace",
            query=query,
            category=category,
            location=location,
            limit=limit
        )

        # Apply rate limiting
        await self._rate_limit()

        # Try with retries and exponential backoff
        for attempt in range(self.MAX_RETRIES):
            try:
                start_time = datetime.now()
                self.metrics["total_requests"] += 1

                # Initialize browser if needed
                if not self.browser_context:
                    await self._init_browser()

                # Build search URL
                search_url = self._build_search_url(query, category, location)

                # Fetch and parse listings
                listings = await self._scrape_listings(search_url, limit)

                # Track response time
                response_time = (datetime.now() - start_time).total_seconds()
                self.metrics["total_response_time"] += response_time
                self.metrics["successful_requests"] += 1

                logger.info(
                    "facebook_search_completed",
                    query=query,
                    listings_found=len(listings),
                    response_time=round(response_time, 2),
                    attempt=attempt + 1
                )

                return listings

            except PlaywrightTimeout as e:
                logger.warning(
                    "facebook_timeout",
                    attempt=attempt + 1,
                    error=str(e)
                )
                # Retry with backoff
                if attempt < self.MAX_RETRIES - 1:
                    backoff_time = self.BASE_BACKOFF * (2 ** attempt)
                    await asyncio.sleep(backoff_time)
                else:
                    self.metrics["failed_requests"] += 1
                    logger.error("facebook_max_retries_reached")
                    return []

            except Exception as e:
                self.metrics["failed_requests"] += 1
                logger.error(
                    "facebook_scrape_error",
                    error=str(e),
                    attempt=attempt + 1
                )
                # Retry with backoff
                if attempt < self.MAX_RETRIES - 1:
                    await asyncio.sleep(self.BASE_BACKOFF * (2 ** attempt))
                else:
                    return []

        return []

    async def _init_browser(self):
        """Initialize Playwright browser context."""
        logger.info("initializing_facebook_browser")

        self.playwright = await async_playwright().start()
        browser = await self.playwright.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage"
            ]
        )

        # Create context with realistic user agent
        self.browser_context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080}
        )

        logger.info("facebook_browser_initialized")

    def _build_search_url(
        self,
        query: str,
        category: Optional[str],
        location: str
    ) -> str:
        """Build Facebook Marketplace search URL."""
        # URL encode query
        from urllib.parse import quote
        encoded_query = quote(query)

        # Base search URL
        url = f"{self.BASE_URL}/search?query={encoded_query}"

        # Add category filter if provided
        # Note: Facebook category IDs would need to be mapped
        # For now, we'll rely on query matching

        return url

    async def _scrape_listings(
        self,
        url: str,
        limit: int
    ) -> List[MarketplaceListing]:
        """
        Scrape listings from Facebook Marketplace page.

        Args:
            url: Search URL
            limit: Maximum listings to return

        Returns:
            List of MarketplaceListing objects
        """
        if not self.browser_context:
            await self._init_browser()

        page = await self.browser_context.new_page()
        listings = []

        try:
            # Navigate to search page
            await page.goto(url, timeout=self.PAGE_TIMEOUT)

            # Wait for listings to load
            # Note: Selectors may need adjustment based on Facebook's HTML structure
            await page.wait_for_selector(
                '[data-testid="marketplace_search_results"]',
                timeout=10000
            )

            # Scroll to load more listings
            for _ in range(3):  # Scroll 3 times to load ~20 items
                await page.evaluate("window.scrollBy(0, window.innerHeight)")
                await asyncio.sleep(1)

            # Extract listing elements
            listing_elements = await page.query_selector_all(
                '[data-testid="marketplace_search_result_item"]'
            )

            # Parse each listing
            for element in listing_elements[:limit]:
                try:
                    listing = await self._parse_listing_element(element)
                    if listing:
                        listings.append(listing)
                except Exception as e:
                    logger.warning("failed_to_parse_listing", error=str(e))
                    continue

        finally:
            await page.close()

        return listings

    async def _parse_listing_element(self, element) -> Optional[MarketplaceListing]:
        """
        Parse a single listing element.

        Note: Selectors are approximate and may need adjustment
        based on Facebook's current DOM structure.
        """
        try:
            # Extract title
            title_elem = await element.query_selector('span[dir="auto"]')
            title = await title_elem.inner_text() if title_elem else ""

            # Extract price
            price_elem = await element.query_selector('span:has-text("$")')
            price_text = await price_elem.inner_text() if price_elem else "$0"
            # Parse price (remove $ and commas)
            price = float(price_text.replace("$", "").replace(",", ""))

            # Extract condition (if available)
            # Facebook doesn't always show condition explicitly
            condition = "Unknown"
            if "new" in title.lower():
                condition = "New"
            elif "like new" in title.lower():
                condition = "Like New"
            elif "used" in title.lower():
                condition = "Good"

            # Extract URL
            link_elem = await element.query_selector('a[href*="/marketplace/item/"]')
            url = None
            if link_elem:
                href = await link_elem.get_attribute("href")
                url = f"https://www.facebook.com{href}" if href else None

            # Extract location (if available)
            location_elem = await element.query_selector('span:has-text("miles away")')
            location = await location_elem.inner_text() if location_elem else None

            if not title or price <= 0:
                return None

            return MarketplaceListing(
                title=title.strip(),
                price=price,
                condition=condition,
                sold_date=None,  # Facebook doesn't show sold dates for active listings
                shipping=0.0,  # Typically local pickup
                source="facebook",
                url=url
            )

        except Exception as e:
            logger.debug("listing_parse_error", error=str(e))
            return None

    async def _rate_limit(self):
        """
        Apply rate limiting: 1 request per second.

        Helps avoid detection as bot and reduces ban risk.
        """
        if self.last_request_time:
            elapsed = (datetime.now() - self.last_request_time).total_seconds()
            if elapsed < self.MIN_REQUEST_INTERVAL:
                sleep_time = self.MIN_REQUEST_INTERVAL - elapsed
                logger.debug("rate_limiting_facebook", sleep_seconds=round(sleep_time, 2))
                await asyncio.sleep(sleep_time)

        self.last_request_time = datetime.now()

    def get_health_metrics(self) -> Dict[str, Any]:
        """
        Get scraper health metrics.

        Returns:
            Dict with success rate, avg response time, and error counts
        """
        total = self.metrics["total_requests"]
        if total == 0:
            return {
                "success_rate": 0.0,
                "avg_response_time": 0.0,
                "total_requests": 0,
                "failed_requests": 0,
                "blocked_count": 0
            }

        success_rate = (self.metrics["successful_requests"] / total) * 100
        avg_response_time = self.metrics["total_response_time"] / total

        return {
            "success_rate": round(success_rate, 1),
            "avg_response_time": round(avg_response_time, 2),
            "total_requests": total,
            "successful_requests": self.metrics["successful_requests"],
            "failed_requests": self.metrics["failed_requests"],
            "blocked_count": self.metrics["blocked_count"]
        }

    async def close(self):
        """Close browser and cleanup resources."""
        if self.browser_context:
            await self.browser_context.close()
        if self.playwright:
            await self.playwright.stop()
        logger.info("facebook_browser_closed")


# Global instance
facebook_client = FacebookMarketplaceClient()
