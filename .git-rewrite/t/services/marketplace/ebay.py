"""
eBay Browse API integration for sold listings research.
Primary source for fair market value calculations.
"""
import httpx
import structlog
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from config.settings import settings
from .models import MarketplaceListing

logger = structlog.get_logger()


class EBayClient:
    """Client for eBay Browse API."""

    BASE_URL = "https://api.ebay.com/buy/browse/v1"
    AUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token"

    def __init__(self):
        self.app_id = settings.ebay_app_id
        self.cert_id = settings.ebay_cert_id
        self.access_token: Optional[str] = None
        self.token_expires_at: Optional[datetime] = None

    async def search_sold_listings(
        self,
        query: str,
        category: Optional[str] = None,
        condition: Optional[str] = None,
        sold_within_days: int = 90,
        limit: int = 50
    ) -> List[MarketplaceListing]:
        """
        Search eBay for sold listings.

        Args:
            query: Search query (brand, model, etc.)
            category: eBay category filter
            condition: Condition filter (Used, New, etc.)
            sold_within_days: Limit to items sold in last N days
            limit: Maximum number of results

        Returns:
            List of MarketplaceListing objects
        """
        logger.info(
            "searching_ebay_sold_listings",
            query=query,
            condition=condition,
            days=sold_within_days
        )

        # Ensure we have a valid access token
        await self._ensure_access_token()

        # Build search parameters
        params = {
            "q": query,
            "filter": self._build_filters(condition, sold_within_days),
            "limit": min(limit, 200),  # eBay max is 200
            "sort": "price"  # Sort by price for consistent results
        }

        try:
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
                response.raise_for_status()
                data = response.json()

                # Parse listings
                listings = self._parse_search_results(data)

                logger.info(
                    "ebay_search_completed",
                    query=query,
                    listings_found=len(listings)
                )

                return listings

        except httpx.HTTPError as e:
            logger.error("ebay_api_error", error=str(e))
            # Return empty list on error rather than failing entirely
            return []

    def _build_filters(self, condition: Optional[str], sold_within_days: int) -> str:
        """Build eBay API filter string."""
        filters = []

        # Filter for sold items
        filters.append("buyingOptions:{FIXED_PRICE}")
        filters.append("conditions:{USED_EXCELLENT|USED_GOOD|USED_VERY_GOOD}")

        # Condition filter
        if condition:
            condition_map = {
                "New": "NEW",
                "Like New": "USED_EXCELLENT",
                "Good": "USED_GOOD|USED_VERY_GOOD",
                "Fair": "USED_ACCEPTABLE",
                "Poor": "FOR_PARTS_OR_NOT_WORKING"
            }
            if condition in condition_map:
                filters.append(f"conditions:{{{condition_map[condition]}}}")

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


# Global instance
ebay_client = EBayClient()
