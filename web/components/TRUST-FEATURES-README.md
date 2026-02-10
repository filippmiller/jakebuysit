# Phase 2 Trust Features - Developer Guide

## Overview

Three new components to build user trust through transparency:

1. **PricingBreakdown** - "Show Me the Math" expandable pricing explanation
2. **ComparablesSection** - Market comparables with 3 recent sales
3. **PriceLockCountdown** - 30-day offer expiration countdown

## Quick Start

### Enable Mock Data (Development)

```javascript
// In browser console or localStorage:
localStorage.setItem('useMockTrustData', 'true');

// Mock data will automatically be used in development mode
// Refresh the page to see trust features with mock data
```

### Disable Mock Data

```javascript
localStorage.removeItem('useMockTrustData');
// Now it will try to fetch from backend APIs
```

## Component Usage

### 1. PricingBreakdown

```tsx
import { PricingBreakdown } from "@/components/PricingBreakdown";

<PricingBreakdown
  steps={[
    {
      label: "Base Market Value",
      value: 400,
      explanation: "Starting point based on Electronics market data"
    },
    {
      label: "Condition Adjustment",
      value: 50,
      explanation: "Added value for excellent condition"
    },
    {
      label: "Current Demand",
      value: -25,
      explanation: "Market's slow, adjusted for current inventory"
    }
  ]}
  finalOffer={425}
  confidence={0.87}
  jakesNote="Fair deal based on current market, partner."
/>
```

**Props**:
- `steps`: Array of pricing steps with labels, values, and explanations
- `finalOffer`: Final offer price (number)
- `confidence`: Confidence score (0-1)
- `jakesNote`: Jake's personal note (string)

**Analytics**:
- Fires `pricing_breakdown_viewed` event when expanded
- Track with Google Analytics to measure engagement

---

### 2. ComparablesSection

```tsx
import { ComparablesSection } from "@/components/ComparablesSection";

<ComparablesSection
  comparables={[
    {
      title: "iPhone 13 Pro - Like New",
      price: 650,
      imageUrl: "https://example.com/image.jpg",
      soldDate: "2026-01-15T10:00:00Z",
      source: "ebay",
      url: "https://ebay.com/item/12345"
    },
    // ... 2 more items
  ]}
  averagePrice={625}
  userOffer={425}
/>
```

**Props**:
- `comparables`: Array of comparable sales (title, price, image, date, source, url)
- `averagePrice`: Market average price
- `userOffer`: Jake's offer to the user

**Features**:
- Grid layout (3 columns desktop, 1 column mobile)
- External links to original listings
- Relative time display ("2 days ago")
- Market comparison bar chart

---

### 3. PriceLockCountdown

```tsx
import { PriceLockCountdown } from "@/components/PriceLockCountdown";

<PriceLockCountdown
  expiresAt="2026-03-15T23:59:59Z"
  isExpired={false}
/>
```

**Props**:
- `expiresAt`: ISO 8601 timestamp (string)
- `isExpired`: Boolean flag for expired state

**Behavior**:
- Updates every second
- Shows urgency warning when <7 days
- Blocks acceptance when expired
- Amber theme for urgent state

---

## Backend API Integration

### Expected Endpoints

#### GET `/api/v1/offers/:id/comparables`

**Response**:
```json
{
  "comparables": [
    {
      "title": "iPhone 13 Pro - Like New",
      "price": 650,
      "imageUrl": "https://s3.../photo.jpg",
      "soldDate": "2026-01-15T10:00:00Z",
      "source": "ebay",
      "url": "https://ebay.com/item/12345"
    }
  ],
  "averagePrice": 625
}
```

#### GET `/api/v1/offers/:id/pricing-explanation`

**Response**:
```json
{
  "steps": [
    {
      "label": "Base Market Value",
      "value": 400,
      "explanation": "Starting point based on market data"
    }
  ],
  "jakesNote": "Fair deal, partner."
}
```

### Offer Response Extensions

Add these fields to offer responses:

```json
{
  "isExpired": false,
  "pricingExplanation": {
    "steps": [...],
    "jakesNote": "..."
  }
}
```

---

## Testing Checklist

### Visual Testing
- [ ] Pricing breakdown expands/collapses smoothly
- [ ] Comparables display in grid (3 columns desktop)
- [ ] Countdown updates every second
- [ ] Urgent state shows amber theme (<7 days)
- [ ] Expired state blocks button
- [ ] Mobile responsive (320px+)

### Functional Testing
- [ ] "Show me the math" tracks analytics event
- [ ] External links open in new tabs
- [ ] Broken images show fallback
- [ ] Countdown reaches zero correctly
- [ ] Accept button disabled when expired

### Accessibility Testing
- [ ] Keyboard navigation works
- [ ] Screen reader announces countdown
- [ ] Focus states visible
- [ ] Color contrast meets WCAG AA

---

## Design Tokens

### Colors
```css
--amber-400: #fbbf24
--amber-500: #f59e0b
--text-primary: #f5f0e8
--text-secondary: #c3bbad
--text-tertiary: #a89d8a
--text-muted: #706557
--bg-glass: rgba(255, 255, 255, 0.03)
--border-glass: rgba(255, 255, 255, 0.07)
```

### Typography
- Headings: `font-semibold text-base`
- Body: `font-normal text-sm`
- Monospace: `font-mono` for prices
- Italic: for Jake's quotes

### Spacing
- Component padding: `p-4` (16px)
- Section gaps: `mb-6` (24px)
- Grid gaps: `gap-4` (16px)

---

## Troubleshooting

### "TypeError: Cannot read property 'steps' of null"
**Solution**: Make sure mock data is enabled or backend API is returning data.

### "Countdown shows wrong time"
**Solution**: Ensure `expiresAt` is in ISO 8601 format with timezone.

### "Comparables images don't load"
**Solution**: Check CORS settings on image CDN. Fallback will show placeholder.

### "Analytics not tracking"
**Solution**: Verify gtag is loaded. Check browser console for tracking errors.

---

## Performance Notes

- **Countdown timer**: Uses `setInterval` with 1s updates (minimal CPU)
- **Animations**: GPU-accelerated (transform, opacity)
- **Images**: Lazy loaded (native browser behavior)
- **Mock data**: Only used in development (zero prod overhead)

---

## Future Enhancements

### Week 3-4 (Master Plan)
- [ ] A/B test different pricing explanation formats
- [ ] Add video comparables
- [ ] Dynamic expiration windows by category
- [ ] Social proof integration

### Potential Features
- [ ] Price history chart (last 90 days)
- [ ] Category-specific trust signals
- [ ] User reviews of Jake's fairness
- [ ] "Why this price?" educational tooltips

---

## Support

**Questions?** Check the session notes:
`.claude/sessions/2026-02-11-phase2-trust-features.md`

**Issues?** Report to frontend team with:
1. Browser and version
2. Screenshot of issue
3. Console errors (if any)
4. Steps to reproduce
