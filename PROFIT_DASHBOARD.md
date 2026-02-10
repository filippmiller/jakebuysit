# Profit Dashboard - Quick Start Guide

## Overview

The Profit Dashboard provides sellers with comprehensive earnings analytics including:
- Lifetime profit summary
- Profit trends (weekly/monthly)
- Category-level breakdowns
- Projections from pending offers

## Getting Started

### 1. Database Setup

The migration has already been applied. If you need to reapply:

```bash
cd backend
npx tsx src/scripts/run-migration.ts 005_profit_tracking.sql
```

### 2. Seed Test Data

```bash
cd backend
npx tsx src/scripts/seed-profit-data.ts
```

This creates:
- 1 test user (ID: `00000000-0000-0000-0000-000000000001`)
- 6 completed sales
- Total profit: $558.50

### 3. Start Backend

```bash
cd backend
npm run dev
```

Backend will start on `http://localhost:8080`

### 4. Start Frontend

```bash
cd web
npm run dev
```

Frontend will start on `http://localhost:3001`

### 5. View Dashboard

Navigate to: `http://localhost:3001/dashboard/profits`

## API Endpoints

### GET /api/v1/profits/summary

Get profit summary for a user.

**Query Parameters:**
- `userId` (required) - User UUID

**Example:**
```bash
curl "http://localhost:8080/api/v1/profits/summary?userId=00000000-0000-0000-0000-000000000001"
```

**Response:**
```json
{
  "totalProfit": 558.5,
  "totalSales": 6,
  "avgProfitPerSale": 93.08,
  "avgProfitMargin": 17.83,
  "currentMonthProfit": 558.5,
  "currentMonthSales": 6
}
```

### GET /api/v1/profits/trends

Get profit trends over time.

**Query Parameters:**
- `userId` (required) - User UUID
- `interval` (optional) - `week` or `month` (default: `week`)
- `limit` (optional) - Number of periods (default: `12`, max: `52`)

**Example:**
```bash
curl "http://localhost:8080/api/v1/profits/trends?userId=00000000-0000-0000-0000-000000000001&interval=week&limit=12"
```

**Response:**
```json
[
  {
    "period": "2026-01-27",
    "profit": 116.5,
    "sales": 1,
    "avgProfit": 116.5
  },
  ...
]
```

### GET /api/v1/profits/by-category

Get profit breakdown by category.

**Query Parameters:**
- `userId` (required) - User UUID

**Example:**
```bash
curl "http://localhost:8080/api/v1/profits/by-category?userId=00000000-0000-0000-0000-000000000001"
```

**Response:**
```json
[
  {
    "category": "Electronics",
    "profit": 284.5,
    "sales": 3,
    "avgProfit": 94.83,
    "profitMargin": 18.2
  },
  ...
]
```

### GET /api/v1/profits/projections

Get estimated profit from pending offers.

**Query Parameters:**
- `userId` (required) - User UUID

**Example:**
```bash
curl "http://localhost:8080/api/v1/profits/projections?userId=00000000-0000-0000-0000-000000000001"
```

**Response:**
```json
{
  "pendingOffers": 0,
  "estimatedRevenue": 0,
  "estimatedCosts": 0,
  "estimatedProfit": 0,
  "ifAllAcceptedProfit": 0
}
```

### POST /api/v1/profits/record-sale

Record a completed sale (admin/internal use).

**Body:**
```json
{
  "offerId": "00000000-0000-0000-0000-000000000011",
  "userId": "00000000-0000-0000-0000-000000000001",
  "soldPrice": 640,
  "shippingCost": 9.50,
  "ebayFees": 64.0,
  "platformFees": 0,
  "salePlatform": "ebay",
  "saleReference": "ebay-listing-123"
}
```

**Response:**
```json
{
  "saleId": "uuid-here",
  "profit": 116.5,
  "message": "Sale recorded successfully"
}
```

## Database Schema

### Sales Table

```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY,
  offer_id UUID REFERENCES offers(id),
  user_id UUID REFERENCES users(id),
  sold_price DECIMAL(10,2),
  sold_at TIMESTAMPTZ,
  offer_amount DECIMAL(10,2),
  shipping_cost DECIMAL(10,2),
  ebay_fees DECIMAL(10,2),
  platform_fees DECIMAL(10,2),
  total_costs DECIMAL(10,2),
  profit DECIMAL(10,2),
  profit_margin DECIMAL(5,2),
  sale_platform TEXT,
  sale_reference TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Profit Calculation

```
Net Profit = Sold Price - (Offer Amount + Shipping Cost + eBay Fees + Platform Fees)
Profit Margin = (Net Profit / Sold Price) * 100
```

## Frontend Components

### Profit Dashboard Page

**Path:** `web/app/dashboard/profits/page.tsx`

**Features:**
- Summary cards (total profit, items sold, current month, margin)
- Profit trends line chart (Recharts)
- Category breakdown pie chart
- Category details table
- Projections widget for pending offers
- Weekly/Monthly interval toggle

### OfferCard Enhancement

**Path:** `web/components/OfferCard.tsx`

Shows estimated profit on offer cards:
- Displayed below Jake's offer price
- Formula: `FMV - (Offer Amount + $8.50 shipping + Platform Fees)`
- Green text to highlight potential earnings

## Testing

### Manual Testing Checklist

- [ ] Backend starts without errors
- [ ] All API endpoints return valid JSON
- [ ] Profit summary shows correct totals ($558.50)
- [ ] Trends chart displays 6 data points
- [ ] Category breakdown shows 3 categories
- [ ] Pie chart renders correctly
- [ ] Weekly/Monthly toggle works
- [ ] Dashboard loads in <2 seconds
- [ ] Mobile responsive design works

### Test User

**User ID:** `00000000-0000-0000-0000-000000000001`
**Email:** `mock@example.com`
**Total Profit:** $558.50
**Sales:** 6

## Caching

All analytics queries are cached in Redis with 1-hour TTL:

- `profit:summary:{userId}` - Summary stats
- `profit:trends:{userId}:{interval}:{limit}` - Trends data
- `profit:categories:{userId}` - Category breakdown
- `profit:projections:{userId}` - Pending offers (10 min TTL)

Cache is automatically invalidated when new sales are recorded.

## Performance

- **Target Response Time:** <500ms with caching
- **Database Indexes:**
  - `idx_sales_user_sold_at` - For trends queries
  - `idx_sales_user_profit` - For profit sorting
  - `idx_sales_platform` - For platform filtering

## Troubleshooting

### "Route not found" error

**Solution:** Restart the backend server to load new profit routes.

### No data showing

**Solution:** Run the seed script to create test data:
```bash
cd backend && npx tsx src/scripts/seed-profit-data.ts
```

### Charts not rendering

**Solution:** Ensure Recharts is installed:
```bash
cd web && npm install recharts
```

### Invalid UUID error

**Solution:** Use the test user ID: `00000000-0000-0000-0000-000000000001`

## Architecture

```
┌─────────────────┐
│  Frontend       │
│  /profits       │
│  page.tsx       │
└────────┬────────┘
         │
         ├─ GET /api/v1/profits/summary
         ├─ GET /api/v1/profits/trends
         ├─ GET /api/v1/profits/by-category
         └─ GET /api/v1/profits/projections
         │
┌────────▼────────┐
│  Backend API    │
│  profits.ts     │
└────────┬────────┘
         │
┌────────▼────────┐
│  Service Layer  │
│  profit-        │
│  calculator.ts  │
└────────┬────────┘
         │
         ├─ PostgreSQL (sales table)
         └─ Redis (analytics cache)
```

## Future Enhancements

- [ ] Export profit reports (CSV/PDF)
- [ ] Profit goal setting and tracking
- [ ] Comparison to industry benchmarks
- [ ] Push notifications for profit milestones
- [ ] Tax reporting integration
- [ ] Multi-currency support
- [ ] Profit by time of day analysis
- [ ] Seasonal trend analysis
