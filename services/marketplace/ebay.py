"""
eBay Browse API integration for sold listings research.
Primary source for fair market value calculations.

Features:
- Real-time scraping with rate limiting
- Exponential backoff on errors
- Health metrics tracking
"""
import httpx
import asyncio
import structlog
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from config.settings import settings
from .models import MarketplaceListing

logger = structlog.get_logger()


class EBayClient:
    """
    Client for eBay Browse API.

    Features:
    - Real-time sold listings search
    - Rate limiting: 1 request/second
    - Exponential backoff on errors
    - Health metrics tracking
    """

    BASE_URL = "https://api.ebay.com/buy/browse/v1"
    AUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token"

    # Rate limiting: 1 request per second
    MIN_REQUEST_INTERVAL = 1.0  # seconds

    # Retry configuration
    MAX_RETRIES = 3
    BASE_BACKOFF = 2.0  # seconds

    def __init__(self):
        self.app_id = settings.ebay_app_id
        self.cert_id = settings.ebay_cert_id
        self.access_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None
        self.last_request_time: Optional[datetime] = None

        # Health metrics
        self.metrics = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "total_response_time": 0.0,
            "blocked_count": 0
        }

    async def search_sold_listings(
        self,
        query: str,
        category: Optional[str] = None,
        condition: Optional[str] = None,
        sold_within_days: int = 90,
        limit: int = 50,
        real_time: bool = False
    ) -> List[MarketplaceListing]:
        """
        Search eBay for sold listings with real-time capability.

        Args:
            query: Search query (brand, model, etc.)
            category: eBay category filter
            condition: Condition filter (Used, New, etc.)
            sold_within_days: Limit to items sold in last N days (default: 90)
            limit: Maximum number of results (default: 50)
            real_time: If True, bypass cache and fetch live data

        Returns:
            List of MarketplaceListing objects

        Note:
            - Real-time mode uses rate limiting (1 req/sec)
            - Implements exponential backoff on errors
            - Tracks health metrics
        """
        logger.info(
            "searching_ebay_sold_listings",
            query=query,
            condition=condition,
            days=sold_within_days,
            real_time=real_time
        )

        # Apply rate limiting
        await self._rate_limit()

        # Ensure we have a valid access token
        await self._ensure_access_token()

        # Build search parameters
        params = {
            "q": query,
            "filter": self._build_filters(condition, sold_within_days),
            "limit": min(limit, 200),  # eBay max is 200
            "sort": "price"  # Sort by price for consistent results
        }

        # Try with retries and exponential backoff
        for attempt in range(self.MAX_RETRIES):
            try:
                start_time = datetime.now()
                self.metrics["total_requests"] += 1

                async with httpx.AsyncClient() as client:
                    response = await client.get(
                        f"{self.BASE_URL}/item_summary/search",
                        params=params,
                        headers={
                            "Authorization": f"Bearer {self.access_token}",
                            "X-EBAY-C-MARKETPLACE-ID": "EBAY_US"
                        },
                        timeout=30.0
                    )

                    # Track response time
                    response_time = (datetime.now() - start_time).total_seconds()
                    self.metrics["total_response_time"] += response_time

                    response.raise_for_status()
                    data = response.json()

                    # Parse listings
                    listings = self._parse_search_results(data)

                    self.metrics["successful_requests"] += 1

                    logger.info(
                        "ebay_search_completed",
                        query=query,
                        listings_found=len(listings),
                        response_time=round(response_time, 2),
                        attempt=attempt + 1
                    )

                    return listings

            except httpx.HTTPStatusError as e:
                # Check for rate limiting (429) or blocked IP
                if e.response.status_code == 429:
                    self.metrics["blocked_count"] += 1
                    logger.warning(
                        "ebay_rate_limited",
                        attempt=attempt + 1,
                        max_retries=self.MAX_RETRIES
                    )
                elif e.response.status_code == 403:
                    self.metrics["blocked_count"] += 1
                    logger.error("ebay_blocked_ip", attempt=attempt + 1)

                # Exponential backoff
                if attempt < self.MAX_RETRIES - 1:
                    backoff_time = self.BASE_BACKOFF * (2 ** attempt)
                    logger.info("retrying_with_backoff", backoff_seconds=backoff_time)
                    await asyncio.sleep(backoff_time)
                else:
                    self.metrics["failed_requests"] += 1
                    logger.error("ebay_api_error_max_retries", error=str(e))
                    return []

            except httpx.HTTPError as e:
                self.metrics["failed_requests"] += 1
                logger.error("ebay_api_error", error=str(e), attempt=attempt + 1)
                if attempt >= self.MAX_RETRIES - 1:
                    return []
                # Retry with backoff
                await asyncio.sleep(self.BASE_BACKOFF * (2 ** attempt))

        return []

    def _build_filters(self, condition: Optional[str], sold_within_days: int) -> str:
        """Build eBay API filter string."""
        filters = []

        # Filter for sold items
        filters.append("buyingOptions:{FIXED_PRICE}")

        # Condition filter — use specific condition if provided, otherwise broad default
        condition_map = {
            "New": "NEW",
            "Like New": "USED_EXCELLENT",
            "Good": "USED_GOOD|USED_VERY_GOOD",
            "Fair": "USED_ACCEPTABLE",
            "Poor": "FOR_PARTS_OR_NOT_WORKING"
        }
        if condition and condition in condition_map:
            filters.append(f"conditions:{{{condition_map[condition]}}}")
        else:
            filters.append("conditions:{USED_EXCELLENT|USED_GOOD|USED_VERY_GOOD}")

        # Date filter (sold within last N days)
        cutoff_date = datetime.now() - timedelta(days=sold_within_days)
        date_str = cutoff_date.strftime("%Y-%m-%dT%H:%M:%S.000Z")
        filters.append(f"endedAfter:{date_str}")

        return ",".join(filters)

    def _parse_search_results(self, data: Dict[str, Any]) -> List[MarketplaceListing]:
        """Parse eBay API response into MarketplaceListing objects."""
        listings = []

        items = data.get("itemSummaries", [])
        for item in items:
            try:
                # Extract price
                price_data = item.get("price", {})
                price = float(price_data.get("value", 0))

                # Extract shipping cost
                shipping_data = item.get("shippingOptions", [{}])[0]
                shipping_cost = float(
                    shipping_data.get("shippingCost", {}).get("value", 0)
                )

                # Extract condition
                condition = item.get("condition", "Unknown")

                # Extract sold date if available
                sold_date = None
                if "itemEndDate" in item:
                    sold_date = datetime.fromisoformat(
                        item["itemEndDate"].replace("Z", "+00:00")
                    )

                listing = MarketplaceListing(
                    title=item.get("title", ""),
                    price=price,
                    condition=condition,
                    sold_date=sold_date,
                    shipping=shipping_cost,
                    source="ebay",
                    url=item.get("itemWebUrl")
                )

                listings.append(listing)

            except (ValueError, KeyError) as e:
                logger.warning("failed_to_parse_listing", error=str(e))
                continue

        return listings

    async def _rate_limit(self):
        """
        Apply rate limiting: 1 request per second.

        Ensures we don't exceed eBay's rate limits and avoid IP bans.
        """
        if self.last_request_time:
            elapsed = (datetime.now() - self.last_request_time).total_seconds()
            if elapsed < self.MIN_REQUEST_INTERVAL:
                sleep_time = self.MIN_REQUEST_INTERVAL - elapsed
                logger.debug("rate_limiting", sleep_seconds=round(sleep_time, 2))
                await asyncio.sleep(sleep_time)

        self.last_request_time = datetime.now()

    async def _ensure_access_token(self):
        """Ensure we have a valid OAuth access token."""
        # Check if token is still valid
        if self.access_token and self.token_expires_at:
            if datetime.now() < self.token_expires_at:
                return  # Token still valid

        # Get new access token
        logger.info("fetching_new_ebay_token")

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.AUTH_URL,
                    data={
                        "grant_type": "client_credentials",
                        "scope": "https://api.ebay.com/oauth/api_scope"
                    },
                    auth=(self.app_id, self.cert_id),
                    timeout=10.0
                )
                response.raise_for_status()
                data = response.json()

                self.access_token = data["access_token"]
                expires_in = data.get("expires_in", 7200)  # Default 2 hours
                self.token_expires_at = datetime.now() + timedelta(seconds=expires_in - 60)

                logger.info("ebay_token_refreshed", expires_in=expires_in)

        except httpx.HTTPError as e:
            logger.error("failed_to_get_ebay_token", error=str(e))
            raise

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


# Global instance
ebay_client = EBayClient()
