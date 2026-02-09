# Agent 2 ↔ Agent 4 Integration Guide

## API Contract

Agent 2 (Pricing Engine) provides these endpoints for Agent 4 (Backend Orchestrator):

### Base URL
```
http://localhost:8000
```

### Endpoints

#### 1. POST /api/v1/identify
**Purpose**: Identify item from photos using Claude Vision

**Request:**
```json
{
  "photo_urls": ["https://cdn.example.com/photo1.jpg"],
  "user_description": "AirPods Pro with case" // optional
}
```

**Response:**
```json
{
  "category": "Consumer Electronics",
  "subcategory": "Wireless Earbuds",
  "brand": "Apple",
  "model": "AirPods Pro 2nd Generation",
  "condition": "Good",
  "features": ["Charging case", "Original tips"],
  "damage": ["Minor scratches on case"],
  "confidence": 87,
  "identifiers": {
    "upc": "194253397434",
    "model_number": "MTJV3AM/A"
  }
}
```

#### 2. POST /api/v1/research
**Purpose**: Research marketplace prices for identified item

**Request:**
```json
{
  "brand": "Apple",
  "model": "AirPods Pro 2nd Gen",
  "category": "Consumer Electronics",
  "condition": "Good" // optional
}
```

**Response:**
```json
{
  "listings": [
    {
      "source": "ebay",
      "price": 118.50,
      "title": "Apple AirPods Pro 2nd Gen",
      "sold_date": "2026-01-15T10:30:00"
    }
  ],
  "stats": {
    "count": 312,
    "median": 118.00,
    "mean": 121.30,
    "std_dev": 14.20,
    "percentiles": { "p25": 105, "p50": 118, "p75": 132 },
    "min_price": 85.00,
    "max_price": 175.00
  },
  "sources_checked": ["ebay"],
  "cache_hit": false
}
```

#### 3. POST /api/v1/price
**Purpose**: Calculate FMV and generate offer amount

**Request:**
```json
{
  "marketplace_stats": {
    "count": 312,
    "median": 118.00,
    "mean": 121.30,
    "std_dev": 14.20,
    "percentiles": { "p25": 105, "p50": 118, "p75": 132 }
  },
  "category": "Consumer Electronics",
  "condition": "Good"
}
```

**Response:**
```json
{
  "fmv": 118.59,
  "fmv_confidence": 85,
  "offer_amount": 57.00,
  "offer_to_market_ratio": 0.481,
  "condition_multiplier": 0.80,
  "category_margin": 0.60,
  "data_quality": "High",
  "range": { "low": 94.87, "high": 142.31 }
}
```

## Pipeline Flow

```
Agent 4 Backend Orchestrator
    ↓
1. POST /api/v1/identify
    → Agent 2 identifies item
    → Returns: brand, model, condition, confidence
    ↓
2. POST /api/v1/research
    → Agent 2 fetches marketplace data
    → Returns: eBay sold listings, statistics
    ↓
3. POST /api/v1/price
    → Agent 2 calculates FMV + offer
    → Returns: combined pricing result
    ↓
Agent 4 queues Agent 3 (Jake Voice)
```

## Error Handling

**HTTP Status Codes:**
- `200` - Success
- `400` - Bad request (missing/invalid parameters)
- `500` - Internal error (AI API failure, network issue)
- `504` - Timeout (>30 seconds)

**Error Response Format:**
```json
{
  "detail": "Error message here"
}
```

## Escalation Triggers

Agent 2 indicates escalation needed via confidence scores:

**Vision Confidence:**
- `< 50`: Auto-escalate to human review
- `50-79`: Proceed but flag for review
- `≥ 80`: Auto-approve

**Data Quality:**
- `"Low"`: < 10 comparable listings → escalate
- `"Medium"`: 10-49 listings → proceed
- `"High"`: ≥ 50 listings → high confidence

**Agent 4 should escalate if:**
- Vision confidence < 50
- Marketplace stats count < 5
- Offer amount > $500
- Any API call fails on final retry

## Timeouts

All endpoints have 30-second timeout:
- Vision: ~3-8 seconds typical
- Research: ~5-15 seconds typical
- Price: <1 second typical

**Agent 4 should:**
- Set 30s timeout on all calls
- Retry once on timeout
- Escalate if retry fails

## Environment Requirements

**Agent 2 needs:**
- `ANTHROPIC_API_KEY` - Required for vision
- `EBAY_APP_ID`, `EBAY_CERT_ID`, `EBAY_DEV_ID` - Optional for marketplace
- `DATABASE_URL` - Required for data warehouse
- `REDIS_URL` - Required for caching

**Network:**
- Agent 2 runs on `localhost:8000`
- Agent 4 calls Agent 2 via HTTP (same VPS)
- No external access needed

## Testing Integration

**Test Agent 2 is running:**
```bash
curl http://localhost:8000/health
```

**Test vision endpoint:**
```bash
curl -X POST http://localhost:8000/api/v1/identify \
  -H "Content-Type: application/json" \
  -d '{
    "photo_urls": ["https://example.com/test.jpg"],
    "user_description": "Test item"
  }'
```

**Expected:** 200 OK with VisionResult JSON

**Test research endpoint:**
```bash
curl -X POST http://localhost:8000/api/v1/research \
  -H "Content-Type: application/json" \
  -d '{
    "brand": "Apple",
    "model": "AirPods Pro",
    "category": "Consumer Electronics"
  }'
```

**Expected:** 200 OK with MarketplaceResult JSON

**Test pricing endpoint:**
```bash
curl -X POST http://localhost:8000/api/v1/price \
  -H "Content-Type: application/json" \
  -d '{
    "marketplace_stats": {
      "count": 100,
      "median": 118.0,
      "mean": 121.0,
      "std_dev": 10.0,
      "percentiles": {"p25": 105, "p50": 118, "p75": 132}
    },
    "category": "Consumer Electronics",
    "condition": "Good"
  }'
```

**Expected:** 200 OK with PricingResult JSON

## Monitoring

**Agent 2 logs to stdout in JSON format:**
```json
{
  "event": "integration_identify_called",
  "photo_count": 2,
  "timestamp": "2026-02-09T16:30:00Z"
}
```

**Agent 4 should monitor:**
- Response times per endpoint
- Error rates
- Confidence score distributions
- Cache hit rates

## API Changes

**Versioning:**
- Current: `/api/v1/*`
- Future versions will be `/api/v2/*`
- v1 will remain supported for 6 months after v2 launch

**Backward Compatibility:**
- We maintain parameter backward compat
- Response fields may be added (never removed)
- Breaking changes require new version

## Support

**Issues with Agent 2:**
- Check `docker logs jakebuysit-pricing-api`
- Verify environment variables are set
- Confirm Anthropic API key is valid
- Check eBay API credentials (if using marketplace)

**Common Issues:**

1. **"ANTHROPIC_API_KEY is required"**
   - Set environment variable in Coolify
   - Restart container

2. **"Agent 2 timeout after 30000ms"**
   - Check Anthropic API status
   - Verify network connectivity
   - Increase timeout if needed

3. **"eBay API error"**
   - Not critical - will return empty marketplace data
   - Pricing will fall back to limited data

4. **Low confidence scores**
   - Poor quality photos
   - Unusual/rare items
   - System working as designed - escalate to human
