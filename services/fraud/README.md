# Fraud Detection Service

AI-powered ML pipeline for detecting fraudulent transactions in real-time.

## Overview

The fraud detection service analyzes offers using multiple signals to produce a risk score (0-100) and recommend actions (approve, review, escalate, reject).

**Port:** 8004
**Tech Stack:** FastAPI, Python 3.10+
**Integration:** Called by backend orchestrator after pricing stage

## Architecture

```
Offer Pipeline:
Upload → Vision → Marketplace → Pricing → Fraud Check → Jake Voice → Ready
                                            ↑
                                     Fraud Service
                                        (8004)
```

## Fraud Signals

### 1. Price Anomaly Detection (35% weight)
- **Suspiciously High**: Offer > 130% of FMV
- **Significantly Above FMV**: Offer > 150% of FMV
- **Unusually Low**: Offer < 30% of FMV (possible damaged/fake item)

### 2. Velocity Analysis (25% weight)
- **Critical**: 10+ offers/hour OR 50+ offers/24h
- **High**: 5+ offers/hour OR 20+ offers/24h
- **Medium**: 3+ offers/hour OR 10+ offers/24h
- **High Value**: $5000+ total value in 24h

### 3. Pattern Matching (20% weight)
- **Suspicious Descriptions**: Stock phrases used by fraudsters
  - "brand new in box", "never used", "quick sale", "urgent"
  - "fell off truck", "stolen", "need gone asap"
- **IP Patterns**: VPN/proxy/datacenter detection
- **Photo Analysis**: Stock photo detection (future enhancement)

### 4. User Trust Score (20% weight)
- **New Account Risk**: Account < 30 days old
- **New Account + High Value**: < 30 days + offer > $100
- **Low Trust Score**: User trust < 30
- **Medium Trust Score**: User trust < 50

### 5. Category Risk Multipliers
- **Phones & Tablets**: 1.3x (commonly stolen)
- **Consumer Electronics**: 1.2x (frequently targeted)
- **Collectibles & Vintage**: 1.15x (hard to verify)

## Scoring Formula

```python
risk_score = (
    price_anomaly_score * 0.35 +
    velocity_score * 0.25 +
    pattern_match_score * 0.20 +
    user_trust_score * 0.20
) * category_multiplier
```

## Risk Levels & Actions

| Risk Score | Risk Level | Recommended Action | Outcome |
|------------|------------|-------------------|---------|
| 0-29       | Low        | Approve           | Continue pipeline |
| 30-49      | Medium     | Approve/Review    | Continue with flag |
| 50-69      | High       | Review/Escalate   | Flag for admin review |
| 70-84      | High       | Escalate          | Block pipeline |
| 85-100     | Critical   | Reject            | Auto-reject offer |

## API Endpoints

### POST `/api/v1/analyze-fraud`

Analyze offer for fraud risk.

**Request:**
```json
{
  "offer_id": "uuid",
  "user_id": "uuid",
  "offer_amount": 150.0,
  "fmv": 200.0,
  "category": "Consumer Electronics",
  "condition": "Good",
  "user_created_at": "2025-08-01T00:00:00Z",
  "user_offer_count": 5,
  "user_trust_score": 75.0,
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "photo_urls": ["https://..."],
  "description": "iPad Air 2, good condition"
}
```

**Response:**
```json
{
  "offer_id": "uuid",
  "risk_score": 25,
  "risk_level": "low",
  "confidence": 0.85,
  "flags": [],
  "explanation": "Low fraud risk (score: 25). Transaction appears legitimate with no major red flags.",
  "breakdown": {
    "price_anomaly": 0,
    "velocity": 0,
    "pattern_match": 0,
    "user_trust": 20
  },
  "recommended_action": "approve",
  "analyzed_at": "2026-02-10T12:00:00Z"
}
```

### GET `/api/v1/health`

Health check.

**Response:**
```json
{
  "service": "fraud-detection",
  "status": "operational",
  "version": "1.0.0"
}
```

### GET `/api/v1/patterns`

Get current fraud detection patterns and thresholds (admin only).

## Running the Service

### Development

```bash
# From project root
cd services/fraud
python -m services.fraud.main
```

Service starts on `http://localhost:8004`

### Production

```bash
# Using uvicorn directly
uvicorn services.fraud.main:app --host 0.0.0.0 --port 8004

# Or with gunicorn (recommended)
gunicorn services.fraud.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8004
```

## Testing

```bash
# Run test suite
cd services/fraud
python test_fraud_detection.py
```

Test suite includes:
1. ✅ Legitimate offer (low risk) - should approve
2. ✅ High-value offer (medium risk) - should approve
3. ✅ Price anomaly (high risk) - should escalate
4. ✅ Velocity fraud (high risk) - should flag
5. ✅ New account fraud (critical risk) - should reject

**Expected Results:**
- False positive rate: < 10%
- True positive rate: 100%
- All tests pass

## Database Integration

Fraud results are stored in the `fraud_checks` table:

```sql
CREATE TABLE fraud_checks (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  offer_id UUID REFERENCES offers(id),

  check_type TEXT,           -- 'ml_analysis'
  result TEXT,               -- 'pass', 'flag', 'fail'
  confidence FLOAT,

  -- ML analysis fields
  risk_score INTEGER,        -- 0-100
  risk_level TEXT,          -- 'low', 'medium', 'high', 'critical'
  flags JSONB,              -- Array of fraud flags
  breakdown JSONB,          -- Score breakdown by signal
  explanation TEXT,         -- Human-readable summary
  recommended_action TEXT,  -- 'approve', 'review', 'escalate', 'reject'

  action_taken TEXT,        -- 'none', 'flag', 'escalate', 'reject'
  details JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Backend Integration

The backend TypeScript client (`backend/src/integrations/fraud-client.ts`) provides:

```typescript
import { fraudClient } from './integrations/fraud-client.js';

const result = await fraudClient.analyzeFraud({
  offer_id: offerId,
  user_id: userId,
  offer_amount: 150.0,
  fmv: 200.0,
  category: "Consumer Electronics",
  condition: "Good",
  // ... other fields
});

if (result.recommended_action === 'reject') {
  // Auto-reject offer
} else if (result.recommended_action === 'escalate') {
  // Escalate to admin
} else if (result.recommended_action === 'review') {
  // Flag for review
} else {
  // Approve - continue pipeline
}
```

## Environment Variables

Required in `.env`:

```bash
# Already configured in config/settings.py
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=sk-...
```

Optional:
```bash
FRAUD_SERVICE_URL=http://localhost:8004  # Backend uses this
```

## Future Enhancements

### Phase 2 - Image Analysis
- Stock photo detection using reverse image search
- Photo metadata analysis (EXIF data tampering)
- Visual similarity matching against known fraud photos

### Phase 3 - Advanced ML
- Train custom ML model on historical fraud data
- Behavioral biometrics (typing patterns, mouse movement)
- Network analysis (detect fraud rings)
- Real-time threat intelligence feeds

### Phase 4 - Adaptive Learning
- Feedback loop from admin reviews
- Dynamic threshold adjustment
- A/B testing of fraud strategies

## Monitoring & Alerts

**Key Metrics:**
- False positive rate (should be < 10%)
- True positive rate (should be > 90%)
- Average processing time (should be < 500ms)
- Service uptime (should be > 99.9%)

**Alert Thresholds:**
- High fraud volume: > 10 critical flags/hour
- Service degradation: > 1s response time
- Error rate: > 1% failures

## File Structure

```
services/fraud/
├── __init__.py           # Package init
├── main.py               # FastAPI app entry point
├── router.py             # API route handlers
├── detector.py           # Core fraud detection engine
├── patterns.py           # Fraud pattern database
├── models.py             # Pydantic request/response models
├── test_fraud_detection.py  # Test suite
└── README.md             # This file
```

## Admin Dashboard

Fraud detection data is accessible via the admin API:

```
GET /api/v1/admin/fraud-checks?risk_level=high
GET /api/v1/admin/offers/:id/fraud-check
```

Admin dashboard shows:
- Recent fraud flags
- Risk score distribution
- Top fraud signals
- False positive review queue

## Support

For questions or issues:
1. Check service logs: `journalctl -u fraud-service -f`
2. Test health endpoint: `curl http://localhost:8004/api/v1/health`
3. Review fraud patterns: `curl http://localhost:8004/api/v1/patterns`
4. Run test suite: `python test_fraud_detection.py`

---

**Version:** 1.0.0
**Last Updated:** 2026-02-10
**Maintained By:** Team 2 - AI/ML Pipeline
