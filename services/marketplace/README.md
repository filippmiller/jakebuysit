# Marketplace Real-Time Scraper

Real-time marketplace data scraping system for eBay and Facebook Marketplace, providing live comparable sales data for accurate fair market value (FMV) calculations.

## Features

### Real-Time Scraping
- **eBay Browse API**: Fetch sold listings from the last 30-90 days
- **Facebook Marketplace**: Scrape active listings with Playwright (headless browser)
- **Rate Limiting**: 1 request/second per scraper to avoid bans
- **Exponential Backoff**: Automatic retry with backoff on errors
- **Health Metrics**: Track success rate, response time, and errors

### Data Freshness Tracking
- **Live**: Real-time data fetched from scrapers
- **Cached**: Recent data from Redis cache (< 1 hour old)
- **Stale**: Older data or scraper failures

### Caching Strategy
- **1 hour TTL**: Live comparable data cached for 1 hour
- **Force Live Mode**: Bypass cache with `force_live=true` parameter
- **Smart Fallback**: Use cached data on scraper failures

## Architecture

```
┌─────────────────┐
│  GET /comparables│
└────────┬────────┘
         │
         ├─> Cache Check (1h TTL)
         │   ├─> Cache Hit → Return cached data
         │   └─> Cache Miss → Continue
         │
         ├─> eBay Scraper (real_time=True)
         │   ├─> Rate Limit (1 req/sec)
         │   ├─> OAuth Token
         │   ├─> Browse API Search
         │   └─> Parse Sold Listings
         │
         ├─> Facebook Scraper
         │   ├─> Rate Limit (1 req/sec)
         │   ├─> Playwright Browser
         │   ├─> Search Page Load
         │   └─> Parse Active Listings
         │
         └─> Combine & Cache → Return
```

## API Endpoints

### `GET /api/v1/marketplace/comparables`

Fetch live comparable sales data from eBay and Facebook Marketplace.

**Parameters:**
- `item` (required): Item name (e.g., "iPhone 13 Pro")
- `category` (optional): Product category (default: "Consumer Electronics")
- `condition` (optional): Item condition filter
- `force_live` (optional): Bypass cache and fetch live data (default: false)

**Response:**
```json
{
  "listings": [
    {
      "title": "Apple iPhone 13 Pro 128GB Unlocked",
      "price": 549.99,
      "condition": "Good",
      "sold_date": "2026-02-08T14:30:00Z",
      "source": "ebay",
      "url": "https://www.ebay.com/itm/12345",
      "shipping": 0.0
    }
  ],
  "total_count": 42,
  "sources": {
    "ebay": {
      "count": 30,
      "health": {
        "success_rate": 98.5,
        "avg_response_time": 1.23,
        "total_requests": 150,
        "failed_requests": 2,
        "blocked_count": 0
      }
    },
    "facebook": {
      "count": 12,
      "health": {
        "success_rate": 95.0,
        "avg_response_time": 3.45,
        "total_requests": 20,
        "failed_requests": 1,
        "blocked_count": 0
      }
    }
  },
  "data_freshness": "live",
  "cache_hit": false,
  "query": {
    "item": "iPhone 13 Pro",
    "category": "Consumer Electronics",
    "condition": null
  }
}
```

### `GET /api/v1/marketplace/health`

Check marketplace service health and scraper metrics.

**Response:**
```json
{
  "service": "marketplace",
  "status": "operational",
  "sources": {
    "ebay": {
      "enabled": true,
      "health": {
        "success_rate": 98.5,
        "avg_response_time": 1.23,
        "total_requests": 150,
        "successful_requests": 148,
        "failed_requests": 2,
        "blocked_count": 0
      }
    },
    "facebook": {
      "enabled": true,
      "health": {
        "success_rate": 95.0,
        "avg_response_time": 3.45,
        "total_requests": 20,
        "successful_requests": 19,
        "failed_requests": 1,
        "blocked_count": 0
      }
    }
  }
}
```

## Integration with FMV Calculation

The FMV engine (`services/pricing/fmv.py`) automatically uses live data when available:

```python
# FMV calculation with data freshness tracking
fmv_response = fmv_engine.calculate_fmv(
    marketplace_stats=marketplace_data,
    category="Consumer Electronics",
    condition="Good",
    data_freshness="live"  # "live", "cached", or "stale"
)

# Confidence adjusted based on freshness:
# - Live data: no penalty
# - Cached data: -5 confidence
# - Stale data: -15 confidence
```

## Scrapers

### eBay Scraper (`ebay.py`)

**API**: eBay Browse API (official)
**Method**: REST API with OAuth 2.0
**Data**: Sold listings (last 30-90 days)
**Rate Limit**: 1 request/second
**Retries**: 3 attempts with exponential backoff

**Key Features:**
- OAuth token auto-refresh
- Sold date extraction
- Seller rating tracking
- Shipping cost inclusion
- Condition mapping (New, Like New, Good, Fair, Poor)

**Error Handling:**
- 429 Rate Limit → Exponential backoff
- 403 Blocked IP → Log and retry
- Network errors → Retry with backoff
- Max retries exceeded → Return empty results

### Facebook Marketplace Scraper (`facebook.py`)

**API**: Playwright browser automation
**Method**: Headless Chrome with anti-detection
**Data**: Active listings (current market prices)
**Rate Limit**: 1 request/second
**Retries**: 3 attempts with exponential backoff

**Key Features:**
- Headless browser automation
- Anti-bot detection bypass
- Dynamic content loading
- Location-based search
- Price/condition extraction

**Limitations:**
- No sold dates (active listings only)
- Slower than API (browser overhead)
- Requires Playwright installed
- May break on Facebook UI changes

**Error Handling:**
- Page timeout → Retry with backoff
- Element not found → Skip listing
- Browser crash → Reinitialize browser
- Max retries exceeded → Return empty results

## Configuration

### Environment Variables

Required for eBay:
```bash
EBAY_APP_ID=your_app_id
EBAY_CERT_ID=your_cert_id
EBAY_DEV_ID=your_dev_id  # Optional
```

No configuration needed for Facebook (uses public endpoints).

### Rate Limiting

Both scrapers implement rate limiting to avoid bans:

```python
# services/marketplace/ebay.py
MIN_REQUEST_INTERVAL = 1.0  # 1 second between requests

# services/marketplace/facebook.py
MIN_REQUEST_INTERVAL = 1.0  # 1 second between requests
```

### Cache Configuration

Redis cache TTL for comparables:

```python
# services/marketplace/router.py
COMPARABLES_CACHE_TTL = 3600  # 1 hour in seconds
```

## Health Metrics

Each scraper tracks:
- **Total Requests**: Count of all requests made
- **Successful Requests**: Requests that returned data
- **Failed Requests**: Requests that errored
- **Blocked Count**: Times the scraper was rate-limited or blocked
- **Average Response Time**: Mean response time in seconds
- **Success Rate**: Percentage of successful requests

Access metrics via `/health` endpoint or programmatically:

```python
from services.marketplace.ebay import ebay_client
from services.marketplace.facebook import facebook_client

ebay_metrics = ebay_client.get_health_metrics()
facebook_metrics = facebook_client.get_health_metrics()
```

## Testing

### Manual Testing

Test eBay scraper:
```bash
curl "http://localhost:8000/api/v1/marketplace/comparables?item=iPhone%2013%20Pro&force_live=true"
```

Test cache:
```bash
# First call (cache miss)
curl "http://localhost:8000/api/v1/marketplace/comparables?item=AirPods%20Pro"

# Second call (cache hit)
curl "http://localhost:8000/api/v1/marketplace/comparables?item=AirPods%20Pro"
```

Check health:
```bash
curl "http://localhost:8000/api/v1/marketplace/health"
```

### Integration Testing

The scrapers integrate with the FMV pipeline:

```python
# services/pricing/offer.py
# Automatically uses live data when available

from marketplace.aggregator import marketplace_aggregator
from pricing.fmv import fmv_engine

# Fetch live marketplace data
marketplace_data = await marketplace_aggregator.research_product(
    brand="Apple",
    model="iPhone 13 Pro",
    category="Phones & Tablets",
    condition="Good",
    use_live_data=True  # Enable live scraping
)

# Calculate FMV with live data
fmv_response = fmv_engine.calculate_fmv(
    marketplace_stats=marketplace_data["stats"],
    category="Phones & Tablets",
    condition="Good",
    data_freshness=marketplace_data.get("data_freshness", "unknown")
)

# FMV confidence adjusted based on data freshness
print(f"FMV: ${fmv_response.fmv}")
print(f"Confidence: {fmv_response.confidence}%")
print(f"Data Freshness: {fmv_response.data_freshness}")
```

## Error Scenarios

### Scraper Failures

**eBay API Down:**
- Returns empty listings
- Logs error
- Falls back to cached data (if available)
- Marks data as "stale"

**Facebook Blocked:**
- Retries with exponential backoff
- Returns empty listings after max retries
- Continues with eBay data only
- Logs blocked count in metrics

**Network Timeout:**
- Retries up to 3 times
- Exponential backoff (2s, 4s, 8s)
- Returns partial results if one scraper succeeds

### Cache Failures

**Redis Down:**
- Scraper proceeds without cache
- Live data returned every time
- Warning logged but doesn't fail request

**Cache Corruption:**
- Invalid data ignored
- Fresh scrape performed
- Cache overwritten with new data

## Performance Considerations

### Response Times

Typical response times:
- **Cache Hit**: 10-50ms
- **eBay Live**: 1-3 seconds
- **Facebook Live**: 5-10 seconds (browser overhead)
- **Combined Live**: 6-13 seconds

### Optimization Strategies

1. **Always check cache first** (1 hour TTL)
2. **Run scrapers in parallel** (asyncio)
3. **Limit results** (50 eBay + 20 Facebook)
4. **Use rate limiting** to avoid bans
5. **Implement exponential backoff** on errors

## Future Enhancements

### Planned Features

- [ ] Amazon scraper (requires Product Advertising API)
- [ ] Google Shopping scraper
- [ ] Craigslist scraper (local deals)
- [ ] OfferUp scraper
- [ ] Poshmark scraper (clothing/fashion)

### Improvements

- [ ] Adaptive rate limiting based on response codes
- [ ] Scraper health-based routing (skip unhealthy scrapers)
- [ ] Multi-tier caching (hot cache for popular items)
- [ ] Scraper result validation (detect bad data)
- [ ] Proxy rotation for Facebook scraper
- [ ] CAPTCHA handling for Facebook

## Troubleshooting

### eBay Returns Empty Results

1. Check API credentials in `.env`
2. Verify OAuth token is refreshing (check logs)
3. Check rate limiting (1 req/sec)
4. Inspect eBay health metrics for blocked count

### Facebook Returns Empty Results

1. Ensure Playwright is installed: `pip install playwright`
2. Install browser: `playwright install chromium`
3. Check if Facebook UI changed (update selectors)
4. Review logs for timeout errors
5. Test with `headless=False` to see browser

### Poor Data Quality

1. Increase `sold_within_days` for eBay (90 days recommended)
2. Increase `limit` for more results
3. Check data freshness (prefer "live" over "cached")
4. Verify condition mapping is accurate

## License

This scraper system is part of the JakeBuysIt pawn shop platform.
