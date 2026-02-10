# Pricing Confidence & Comparable Sales API Specification

**Phase 1 Enhancement** - Ready for Frontend Integration
**Date**: 2026-02-10
**Beads**: pawn-86x (Closed)

---

## Overview

The pricing API now returns confidence scores (0-100%) and comparable sales data to make pricing more transparent and trustworthy.

## Endpoint

**POST** `/api/v1/price`

### Request
```json
{
  "marketplace_stats": {
    "count": 150,
    "median": 118.0,
    "mean": 120.0,
    "std_dev": 12.0,
    "percentiles": {
      "p25": 105.0,
      "p50": 118.0,
      "p75": 132.0
    },
    "listings": [
      {
        "title": "Apple AirPods Pro 2nd Gen",
        "price": 118.50,
        "condition": "Good",
        "sold_date": "2026-02-08T14:30:00Z",
        "source": "ebay",
        "url": "https://ebay.com/itm/12345"
      }
    ]
  },
  "category": "Consumer Electronics",
  "condition": "Good"
}
```

### Response
```json
{
  "fmv": 118.00,
  "fmv_confidence": 85,
  "offer_amount": 59.00,
  "offer_to_market_ratio": 0.5,
  "condition_multiplier": 0.8,
  "category_margin": 0.6,
  "data_quality": "High",
  "range": {
    "low": 94.40,
    "high": 141.60
  },

  // NEW FIELDS
  "pricing_confidence": 85,
  "comparable_sales": [
    {
      "source": "ebay",
      "title": "Apple AirPods Pro 2nd Gen - Excellent Condition",
      "price": 118.50,
      "sold_date": "2026-02-08T14:30:00Z",
      "condition": "Good",
      "url": "https://ebay.com/itm/12345"
    },
    {
      "source": "ebay",
      "title": "AirPods Pro 2 with Charging Case",
      "price": 119.00,
      "sold_date": "2026-02-07T10:15:00Z",
      "condition": "Like New",
      "url": "https://ebay.com/itm/12346"
    },
    {
      "source": "ebay",
      "title": "Apple AirPods Pro Gen 2",
      "price": 117.00,
      "sold_date": "2026-02-06T16:45:00Z",
      "condition": "Good",
      "url": "https://ebay.com/itm/12347"
    }
  ],
  "confidence_factors": {
    "score": 85,
    "data_points": 150,
    "data_availability": "excellent",
    "recency_score": 25,
    "recency_quality": "excellent",
    "price_variance": "low",
    "coefficient_of_variation": 10.1,
    "category_coverage": "high",
    "explanation": "High confidence (85%): 150 sales found (excellent data), excellent recency, low price variance (10.1%), high category coverage"
  }
}
```

---

## Field Descriptions

### Existing Fields
| Field | Type | Description |
|-------|------|-------------|
| `fmv` | number | Fair Market Value in USD |
| `fmv_confidence` | number | Legacy confidence (0-100) |
| `offer_amount` | number | Final offer in USD |
| `offer_to_market_ratio` | number | Offer / FMV ratio |
| `condition_multiplier` | number | Multiplier for item condition |
| `category_margin` | number | Buy-at percentage for category |
| `data_quality` | string | "High" \| "Medium" \| "Low" |
| `range` | object | Price range (low, high) |

### New Fields

#### `pricing_confidence` (number, 0-100)
Overall confidence in pricing accuracy. Use this for UI displays.

**Tiers:**
- **80-100%**: High confidence - Many recent sales, low variance
- **50-79%**: Medium confidence - Moderate data availability
- **0-49%**: Low confidence - Limited data, high variance

**UI Recommendations:**
- Show confidence badge with color coding (green/yellow/red)
- Display confidence bar/meter
- Surface confidence explanation on hover/click

#### `comparable_sales` (array)
3-5 actual sales used in pricing calculation, sorted by price proximity to FMV.

**Fields:**
- `source` (string): "ebay" | "facebook" | "amazon" | "manual"
- `title` (string): Original listing title
- `price` (number): Sold price in USD
- `sold_date` (string | null): ISO datetime when sold
- `condition` (string): Item condition
- `url` (string | null): Link to original listing

**UI Recommendations:**
- Display as table or card list
- Show source badge (eBay logo, Facebook icon, etc.)
- Format dates as relative ("2 days ago")
- Make URLs clickable for verification
- Highlight the item closest to our FMV

#### `confidence_factors` (object)
Detailed breakdown of how confidence was calculated.

**Fields:**
- `score` (number): Same as pricing_confidence
- `data_points` (number): Number of sales analyzed
- `data_availability` (string): "excellent" | "good" | "moderate" | "limited" | "insufficient"
- `recency_score` (number): 0-25 points based on sale dates
- `recency_quality` (string): "excellent" | "good" | "moderate" | "dated" | "unknown"
- `price_variance` (string): "low" | "moderate" | "high" | "very_high"
- `coefficient_of_variation` (number): Percentage variance (optional)
- `category_coverage` (string): "high" | "medium"
- `explanation` (string): Human-readable summary

**UI Recommendations:**
- Show in expandable "Market Analysis" section
- Display explanation text prominently
- Use tooltips for technical terms (CV, recency score)
- Visual indicators for each factor (checkmarks, progress bars)

---

## Confidence Calculation Formula

```
Confidence = Data Availability (0-40)
           + Recency Score (0-25)
           + Variance Score (0-20)
           + Category Coverage (0-15)
```

### Data Availability (0-40 points)
| Sales Count | Points | Quality |
|-------------|--------|---------|
| ≥50 | 40 | excellent |
| 20-49 | 32 | good |
| 10-19 | 24 | moderate |
| 3-9 | 16 | limited |
| <3 | 8 | insufficient |

### Recency Score (0-25 points)
| % Recent Sales (<30 days) | Points | Quality |
|---------------------------|--------|---------|
| ≥70% | 25 | excellent |
| 50-69% | 20 | good |
| 30-49% | 15 | moderate |
| <30% | 10 | dated |

### Variance Score (0-20 points)
| Coefficient of Variation | Points | Level |
|--------------------------|--------|-------|
| <15% | 20 | low |
| 15-30% | 12 | moderate |
| 30-50% | 5 | high |
| >50% | 0 | very_high |

### Category Coverage (0-15 points)
| Category | Points | Coverage |
|----------|--------|----------|
| Electronics, Gaming, Phones, Tools | 15 | high |
| Other | 8 | medium |

---

## Frontend Integration Examples

### Display Confidence Badge
```tsx
function ConfidenceBadge({ confidence }: { confidence: number }) {
  const level = confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low';
  const colors = {
    high: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-red-100 text-red-800'
  };

  return (
    <span className={`px-2 py-1 rounded ${colors[level]}`}>
      {confidence}% Confidence
    </span>
  );
}
```

### Display Comparable Sales
```tsx
function ComparableSales({ comparables }: { comparables: ComparableSale[] }) {
  return (
    <div className="space-y-2">
      <h3 className="font-semibold">Comparable Sales</h3>
      {comparables.map((comp, i) => (
        <div key={i} className="p-3 border rounded">
          <div className="flex justify-between">
            <span className="font-medium">${comp.price}</span>
            <span className="text-sm text-gray-600">{comp.source}</span>
          </div>
          <div className="text-sm">{comp.title}</div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>{comp.condition}</span>
            <span>{formatRelativeDate(comp.sold_date)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### Display Confidence Explanation
```tsx
function ConfidenceExplanation({ factors }: { factors: ConfidenceFactors }) {
  return (
    <details className="mt-2">
      <summary className="cursor-pointer text-blue-600">
        How was this calculated?
      </summary>
      <div className="mt-2 p-3 bg-gray-50 rounded">
        <p className="text-sm">{factors.explanation}</p>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div>
            <strong>Data Points:</strong> {factors.data_points}
          </div>
          <div>
            <strong>Recency:</strong> {factors.recency_quality}
          </div>
          <div>
            <strong>Variance:</strong> {factors.price_variance}
          </div>
          <div>
            <strong>Coverage:</strong> {factors.category_coverage}
          </div>
        </div>
      </div>
    </details>
  );
}
```

---

## Database Schema

### Offers Table (Updated)
```sql
ALTER TABLE offers ADD COLUMN pricing_confidence INTEGER CHECK (pricing_confidence >= 0 AND pricing_confidence <= 100);
ALTER TABLE offers ADD COLUMN comparable_sales JSONB DEFAULT '[]'::jsonb;
ALTER TABLE offers ADD COLUMN confidence_explanation TEXT;
```

**Migration**: `backend/src/db/migrations/001_add_confidence_explanation.sql`

---

## Testing

### High Confidence Scenario
```json
{
  "marketplace_stats": {
    "count": 150,
    "median": 118.0,
    "std_dev": 12.0
  },
  "category": "Consumer Electronics",
  "condition": "Good"
}
```
**Expected**: `pricing_confidence: 85-95`

### Medium Confidence Scenario
```json
{
  "marketplace_stats": {
    "count": 15,
    "median": 75.0,
    "std_dev": 18.0
  },
  "category": "Gaming",
  "condition": "Good"
}
```
**Expected**: `pricing_confidence: 50-70`

### Low Confidence Scenario
```json
{
  "marketplace_stats": {
    "count": 2,
    "median": 45.0,
    "std_dev": 30.0
  },
  "category": "Collectibles & Vintage",
  "condition": "Fair"
}
```
**Expected**: `pricing_confidence: 20-40`

---

## Migration Checklist

- [x] Backend Python changes complete
- [x] TypeScript interfaces updated
- [x] Database migration created
- [ ] Database migration applied
- [ ] End-to-end testing with real data
- [ ] Frontend UI components updated
- [ ] User acceptance testing

---

## Support

**Questions?** Contact Team 2 (Pricing Engine)
**Related Issues**: pawn-86x (closed), pawn-xky (frontend blocked)
**Session Notes**: `.claude/sessions/2026-02-10-040502-pawn-86x-pricing-confidence.md`
