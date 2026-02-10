# Recommendation Service

AI-powered collaborative filtering recommendation engine for JakeBuysIt.

## Overview

This service provides personalized product recommendations using:

- **Collaborative Filtering**: "Users who viewed X also viewed Y"
- **Content-Based Filtering**: Similar category, brand, price range
- **Trending Analysis**: Popular items based on recent activity
- **Hybrid Approach**: Combines multiple algorithms for best results

## Architecture

- **FastAPI** service on port **8005**
- **PostgreSQL** for user activity and offer data
- **Redis** for caching (1 hour cache for user recommendations)
- Simple similarity algorithms (no ML models - cosine similarity on feature vectors)

## API Endpoints

### `POST /api/v1/recommendations/for-user`

Get personalized recommendations for a user.

**Request:**
```json
{
  "user_id": "uuid",
  "limit": 10,
  "exclude_offer_ids": ["uuid1", "uuid2"]
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "offer_id": "uuid",
      "score": 0.85,
      "reason": "Users who viewed similar items also liked this (12 users)",
      "item_category": "Consumer Electronics",
      "item_brand": "Apple",
      "item_model": "iPhone 13 Pro",
      "item_condition": "Good",
      "offer_amount": 450.00,
      "thumbnail_url": "https://..."
    }
  ],
  "algorithm": "hybrid",
  "cached": false
}
```

### `POST /api/v1/recommendations/similar`

Get items similar to a given offer.

**Request:**
```json
{
  "offer_id": "uuid",
  "limit": 10,
  "user_id": "uuid (optional)"
}
```

**Response:** Same as above, `algorithm: "content-based"`

### `POST /api/v1/recommendations/trending`

Get trending items based on recent activity.

**Request:**
```json
{
  "days": 7,
  "limit": 10,
  "category": "Consumer Electronics (optional)"
}
```

**Response:** Same as above, `algorithm: "trending"`

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "recommendations",
  "timestamp": "2026-02-10T...",
  "database_connected": true,
  "cache_connected": true
}
```

## Algorithm Details

### Collaborative Filtering

1. Find users who viewed/accepted the same items as target user
2. Find items those similar users also viewed/accepted
3. Rank by number of recommenders and acceptance rate
4. Score: 0.8 + (0.2 * min(accept_count, 5) / 5.0)

### Content-Based Filtering

1. Analyze user's history to extract preferences (categories, brands, price range)
2. Find offers matching those preferences
3. Calculate similarity score based on:
   - Category match: +2 points
   - Brand match: +2 points
   - Price within 30% range: +1 point
4. Score: 0.5 + (similarity_score * 0.15)

### Trending Algorithm

Trending score = (view_count * 1.0) + (accept_count * 10.0)

- Views have weight 1.0
- Accepts have weight 10.0 (strong signal)
- Results sorted by trending score descending

### Hybrid Approach

For personalized recommendations:

1. Run collaborative filtering (finds similar users)
2. Run content-based filtering (finds similar items)
3. Interleave results (prioritize collaborative slightly)
4. Deduplicate by offer_id
5. Sort by score descending
6. Fill remaining slots with trending items

## Performance

- **Caching**: All results cached for 1 hour (30 minutes for trending)
- **Query Optimization**: Uses PostgreSQL indexes on user_activity table
- **Connection Pooling**: asyncpg pool with 2-10 connections
- **Timeout**: 10 second timeout on backend integration calls

## Database Schema

The service uses the `user_activity` table:

```sql
CREATE TABLE user_activity (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  offer_id UUID REFERENCES offers(id),
  activity_type TEXT, -- 'view', 'accept', 'decline', 'share'
  source TEXT, -- 'dashboard', 'search', 'recommendation', 'direct'
  device_type TEXT,
  time_spent_seconds INTEGER,
  scroll_depth FLOAT,
  session_id TEXT,
  created_at TIMESTAMPTZ
);
```

Key indexes:
- `idx_user_activity_user` - user_id + created_at DESC
- `idx_user_activity_collab` - user_id + offer_id + activity_type (for collaborative filtering)
- `idx_user_activity_trending` - created_at DESC + offer_id (for trending queries)

## Setup

### 1. Install Dependencies

```bash
cd services/recommendations
pip install -r requirements.txt
```

### 2. Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/jakebuysit
REDIS_URL=redis://localhost:6379
CORS_ORIGINS=http://localhost:3001,http://localhost:8080
```

### 3. Run Migration

Apply the user_activity table migration:

```bash
psql $DATABASE_URL < backend/src/db/migrations/006_user_activity.sql
```

### 4. Start Service

```bash
python -m services.recommendations.main
```

Or with uvicorn directly:

```bash
uvicorn services.recommendations.main:app --host 0.0.0.0 --port 8005 --reload
```

## Integration

### Backend Integration

The backend integration client is at `backend/src/integrations/recommendations-client.ts`:

```typescript
import { recommendations } from './integrations/recommendations-client.js';

// Get user recommendations
const recs = await recommendations.forUser(userId, 10, []);

// Get similar items
const similar = await recommendations.similar(offerId, 5, userId);

// Get trending
const trending = await recommendations.trending(7, 10, 'Electronics');
```

### Frontend Integration

Use the `<RecommendationsSection>` component:

```tsx
import { RecommendationsSection } from '@/components/RecommendationsSection';

// Trending on dashboard
<RecommendationsSection type="trending" title="🔥 Trending Now" limit={5} />

// Similar items on offer page
<RecommendationsSection
  type="similar"
  offerId={offerId}
  title="You might also like"
  limit={4}
/>
```

### Tracking Views

Track user views from the frontend:

```typescript
await api.post(`/api/v1/offers/${offerId}/view`, {
  source: 'dashboard', // or 'search', 'recommendation', 'direct'
  deviceType: 'desktop',
  timeSpent: 30, // seconds
  scrollDepth: 0.75, // 75% of page
  sessionId: getSessionId(),
});
```

## Monitoring

- **Health Check**: `GET /health`
- **Logs**: Service logs to stdout (JSON format in production)
- **Metrics**: Cache hit rates available in logs

## Future Enhancements

- [ ] Machine learning models (e.g., matrix factorization, neural collaborative filtering)
- [ ] Real-time updates via WebSocket when new recommendations available
- [ ] A/B testing framework for algorithm comparison
- [ ] Diversity and serendipity factors (avoid filter bubbles)
- [ ] Seasonal and temporal factors (e.g., holidays, trends)
- [ ] Multi-armed bandit for exploration vs exploitation

## Testing

Example test with curl:

```bash
# Get trending items
curl -X POST http://localhost:8005/api/v1/recommendations/trending \
  -H "Content-Type: application/json" \
  -d '{"days": 7, "limit": 10}'

# Get similar items
curl -X POST http://localhost:8005/api/v1/recommendations/similar \
  -H "Content-Type: application/json" \
  -d '{"offer_id": "uuid", "limit": 5}'

# Health check
curl http://localhost:8005/health
```

## License

Part of JakeBuysIt platform. See root LICENSE file.
