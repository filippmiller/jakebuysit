# AGENT 5: Admin & Operations Platform

## MISSION
Build the internal operations platform for managing JakeBuysIt: real-time dashboard, business rule configuration, Jake voice management, escalation handling, fraud monitoring, and analytics. This is mission control.

## CONTEXT
The admin platform is used by:
1. **Operators** (Jake): Review escalations, verify items at warehouse, handle disputes
2. **Finance**: Monitor cash flow, payout status, margin analysis
3. **Product Team**: Adjust pricing rules, Jake voice experiments, A/B tests
4. **Fraud Team**: Monitor suspicious activity, update detection rules

This is NOT a customer-facing tool. Prioritize functionality, speed, and data density over polish.

## TECHNOLOGY STACK
- **Framework**: Next.js 14 with App Router (same as frontend for code sharing)
- **UI**: Tailwind CSS + Shadcn/ui (data tables, forms, charts)
- **Auth**: Admin-only JWT, 2FA required
- **Charts**: Recharts or Chart.js
- **Real-time**: Server-Sent Events or WebSocket
- **Database**: Direct PostgreSQL access (via Agent 4 API)
- **Telegram Bot**: For mobile escalation handling

## DELIVERABLES

### 1. Real-Time Dashboard (`/admin/dashboard`)

**Metric Cards (Top Row)**:
- **Today's Offers**: Count + trend (↑12% vs yesterday)
- **Acceptance Rate**: 38% (24h) | 42% (7d) | 40% (30d)
- **Items In Transit**: 23 packages
- **Payouts Pending**: $1,847 (12 users)

**Live Feed (Center)**:
- Scrolling list of recent offers (auto-refresh every 5s)
- Color-coded by status: processing (blue), ready (green), escalated (yellow), fraud (red)
- Click to drill down

**Quick Actions (Right Sidebar)**:
- Escalations queue (count badge)
- Fraud alerts (count badge)
- Payout issues (count badge)
- System health

**Charts (Below Fold)**:
- **Offers Over Time**: Line chart, last 30 days, daily granularity
- **Acceptance Rate**: Line chart, trend
- **Revenue vs. Costs**: Stacked bar, margin visualization
- **Category Breakdown**: Pie chart

### 2. Offers Management (`/admin/offers`)

**Table Columns**:
- ID (truncated UUID, click to copy full)
- Thumbnail (item photo)
- User (email/name, link to profile)
- Category | Brand | Model
- Condition
- AI Confidence (color-coded: green >80, yellow 60-80, red <60)
- FMV | Offer | Margin %
- Status (badge)
- Jake (play voice icon)
- Created (relative time)
- Actions (view, escalate, edit, cancel)

**Filters**:
- Status: All | Processing | Ready | Accepted | Escalated | Rejected
- Category: dropdown
- AI Confidence: <60 | 60-80 | >80
- Date range: picker
- Search: by ID, user email, item model

**Bulk Actions**:
- Export to CSV
- Batch escalate
- Batch approve (if escalated)

### 3. Offer Detail View (`/admin/offers/:id`)

**Layout**: Three columns

**Left Column - Item Details**:
- Photos (carousel, zoom, download)
- User description (if provided)
- AI Identification:
  - Category | Subcategory
  - Brand | Model | Condition
  - Features list
  - Damage notes
  - Confidence score
  - Model used (Claude/GPT-4o/Gemini)

**Center Column - Pricing Breakdown**:
- **Fair Market Value**: $118
  - eBay sold: $118 median (312 listings) [View listings link]
  - Amazon used: $125 avg
  - Google Shopping: $122 avg
- **Condition Multiplier**: 0.80 (Good)
- **Category Margin**: 0.60 (Electronics)
- **Dynamic Adjustments**:
  - Velocity bonus: +5%
  - Inventory saturation: -0%
  - User loyalty: +3%
- **Final Offer**: $59
- **Offer-to-Market Ratio**: 50% (color-coded)

**Right Column - Jake & Actions**:
- **Jake's Voice**:
  - Play button
  - Script text
  - Animation state
  - Tier (1/2/3)
  - Engagement: played? completed?
- **Status Timeline**:
  - Processing started: 2:34 PM
  - Vision complete: 2:34 PM (3s)
  - Marketplace research: 2:34 PM (6s)
  - Offer ready: 2:35 PM
- **Admin Actions**:
  - Edit offer amount (opens modal)
  - Escalate to reviewer
  - Reject offer
  - Flag fraud
  - View audit log

### 4. Escalation Interface (`/admin/escalations`)

**Queue View**:
- List of escalated offers sorted by age
- Reason badge (low confidence | high value | few comparables | risk category | user dispute)
- SLA timer (red if >5 min)
- Claim button (assigns to you)

**Review Modal** (opens when claimed):
- Full offer detail (left column)
- Suggested offer with AI reasoning (center)
- **Decision Panel** (right):
  - **Approve**: Use suggested offer, continue flow
  - **Custom Price**: Enter new offer (with reason)
  - **Reject**: Provide reason, generates Jake rejection message
  - **Flag Fraud**: Escalate to fraud team
  - **Request More Info**: Ask user for clearer photos
- Comments box (visible to other admins)
- History: if previously reviewed, show

**Telegram Integration**:
- All escalations also sent to Telegram channel
- Reviewers can handle directly from Telegram:
  - Photos displayed inline
  - Buttons: Approve | Custom | Reject | Fraud
  - Custom price → opens inline form
- Decision syncs back to dashboard

### 5. Configuration Panel (`/admin/config`)

All business rules managed here:

#### Pricing Rules
```json
{
  "category_margins": {
    "Consumer Electronics": 0.60,
    "Gaming": 0.60,
    "Phones & Tablets": 0.65,
    "Clothing & Fashion": 0.45,
    "Collectibles & Vintage": 0.50,
    "Books & Media": 0.35,
    "Small Appliances": 0.50,
    "Tools & Equipment": 0.55
  },
  "condition_multipliers": {
    "New": 1.0,
    "Like New": 0.925,
    "Good": 0.80,
    "Fair": 0.625,
    "Poor": 0.40
  },
  "min_offer": 5,
  "max_offer_by_category": {
    "Consumer Electronics": 2000,
    "Phones & Tablets": 1500,
    "Collectibles & Vintage": 5000
  },
  "daily_spending_limit": 10000,
  "offer_expiry_hours": 24
}
```

**UI**:
- Editable table for category margins
- Sliders for condition multipliers
- Number inputs for limits
- Save button (requires confirmation)
- Audit log: who changed what when

#### Confidence Thresholds
```json
{
  "auto_price_threshold": 80,
  "flag_threshold": 60,
  "auto_escalate_threshold": 60,
  "high_value_escalate_above": 500
}
```

#### Dynamic Adjustments
```json
{
  "inventory_saturation_limit": 5,
  "inventory_saturation_penalty": 0.10,
  "velocity_threshold_days": 7,
  "velocity_bonus": 0.05,
  "loyalty_bonus": 0.03,
  "jake_bucks_bonus": 0.12
}
```

#### Fraud Detection Settings
```json
{
  "stock_photo_threshold": 0.80,
  "reverse_image_match_threshold": 0.75,
  "user_velocity_max_per_day": 10,
  "new_account_max_offer": 100,
  "new_account_days": 30,
  "high_value_id_required_above": 200
}
```

### 6. Jake Voice Management (`/admin/jake`)

**Tier 1 - Pre-Recorded Clips**:
- Table: Category | Scenario | Audio | Script | Play Count | Completion Rate
- Upload new clips (drag & drop audio files)
- Edit script text
- Preview (play audio)
- Delete (confirmation required)
- Download all (ZIP)

**Tier 2 - Templates**:
- Table: Scenario | Template Text | Variables | Tier | Usage Count | Acceptance Rate
- Add new template (form: scenario, template, variables, tone)
- Edit template
- Test generation (fills dummy data, generates voice, plays)
- A/B test: create variant, track performance

**Tier 3 - Dynamic Scripts**:
- Recent dynamically generated scripts
- Table: Offer ID | Generated Script | Audio | Play Rate | Completion Rate | Acceptance
- Flag for promotion to template
- Regenerate (if user feedback was poor)

**Voice Settings** (ElevenLabs):
- Voice model selector (if multiple Jake voices)
- Stability slider (50-80)
- Similarity slider (70-95)
- Style exaggeration slider (30-60)
- Test synthesis (enter text, generate, play)

**Engagement Analytics**:
- Chart: Play rate by scenario
- Chart: Completion rate by tier
- Correlation: Voice played → Offer accepted?
- Top performing scripts (highest acceptance rate)
- Worst performing scripts (low completion rate)

### 7. Warehouse Operations (`/admin/warehouse`)

**Incoming Shipments**:
- Table: Tracking # | User | Item | Expected Delivery | Status
- Filter: In Transit | Delivered | Overdue
- Scan tracking # (mobile-friendly)

**Verification Interface** (when item received):
- Photos submitted by user (side-by-side comparison)
- Photo of received item (upload from warehouse)
- Condition assessment:
  - Match: ✅ Approve payout
  - Mismatch: ❌ Revise offer (enter new price + reason)
  - Damaged in transit: 🚨 Insurance claim
- Serial number entry (if applicable)
- Weight comparison (expected vs actual)
- Notes field
- Actions: Approve | Revise | Return to sender | Flag fraud

**Verified Items** (awaiting resale, Phase 2):
- Inventory list: Item | Cost | Days held | Market price | Action
- Mark for eBay listing
- Mark for internal store
- Mark for liquidation

### 8. Payouts & Finance (`/admin/finance`)

**Payout Queue**:
- Pending: awaiting processing (manual review if flagged)
- Processing: in-flight with payment provider
- Completed: delivered to user
- Failed: requires attention

**Table Columns**:
- User | Offer | Amount | Method | Status | Transaction Ref | Created | Completed
- Filter by status, method, date range
- Search by user email, transaction ref

**Actions**:
- Retry failed payout
- Refund (rare, requires reason)
- View receipt

**Cash Flow Dashboard**:
- **Daily**: Offers accepted (money out) | Items resold (money in) | Net
- Chart: 30-day cash flow
- **Liabilities**: Total $ committed but not paid out
- **Jake Bucks**: Total outstanding store credit
- **Margin**: Realized margin on completed offer → resale cycles

**Financial Metrics**:
- Average offer: $47
- Average margin: 32%
- Payout method breakdown (pie chart)
- Cost per offer: $0.23 (AI + shipping + fees)

### 9. User Management (`/admin/users`)

**User Table**:
- ID | Email | Name | Trust Score | Jake Familiarity | Jake Bucks | Created | Last Active
- Filter: Trust score range, familiarity, created date
- Search: email, name, ID

**User Detail View** (`/admin/users/:id`):
- **Profile**:
  - Email, phone, name
  - Auth provider
  - Verified status
  - Trust score (graph over time)
  - Risk flags (fraud history)
  - Jake familiarity level
- **Offers History**:
  - Table: all offers by this user
  - Acceptance rate
  - Average offer amount
  - Categories sold
- **Payouts**:
  - Preferred method
  - Payout history
  - Jake Bucks transactions
- **Fraud Checks**:
  - All fraud checks run on this user
  - Flags and results
- **Admin Actions**:
  - Ban user (prevents new offers)
  - Adjust trust score manually
  - Reset Jake Bucks balance
  - Send notification
  - View audit log

### 10. Fraud Detection (`/admin/fraud`)

**Active Alerts**:
- High-risk offers requiring review
- Color-coded severity: red (fail), yellow (flag)
- Table: Offer | User | Check Type | Result | Confidence | Action Taken
- Actions: Review, Reject, Approve, Flag user

**Fraud Checks by Type**:
- Stock Photos: % caught, false positive rate
- Reverse Image: matches found
- User Velocity: users exceeding limits
- Device Reputation: flagged devices

**User Risk Dashboard**:
- Table: User | Risk Score | Flags | Offers Count | Acceptance Rate | Action
- Sort by risk score descending
- Ban button

**Fraud Rules Editor**:
- Adjust thresholds (stock photo confidence, velocity limits, etc.)
- Add IP blacklist
- Add device fingerprint blacklist
- Add model blacklist (e.g., "iPhone 15 Pro Max" if high fraud)

### 11. Analytics & Reports (`/admin/analytics`)

**Tabs**:

#### Profitability by Category
- Table: Category | Offers | Acceptance Rate | Avg Offer | Avg Margin | Total Profit
- Sort by total profit
- Export CSV

#### Pricing Accuracy
- Compare AI offer to actual resale price (Phase 2 data)
- Table: Offer | AI Price | Resale Price | Margin Actual vs Expected
- Identify categories where AI underprices or overprices

#### User Cohorts
- Retention: % of users returning for 2nd offer
- LTV: average lifetime value by cohort (month of signup)
- Chart: Cohort retention curves

#### Funnel Analysis
- Visit → Photo → Offer → Accept → Ship → Payout
- Conversion rates at each step
- Drop-off analysis

#### Jake Engagement
- Voice play rate by scenario
- Voice completion rate
- Correlation: Jake voice → offer accepted?

#### Escalation Analysis
- Escalation rate by category, confidence, value
- Average resolution time
- Reviewer performance (accuracy, speed)

### 12. System Health (`/admin/health`)

**Service Status**:
- API: ✅ Healthy (p95 latency: 230ms)
- Database: ✅ Healthy (connections: 12/100)
- Redis: ✅ Healthy (memory: 340MB / 2GB)
- Queue: ✅ Healthy (pending: 3, failed: 0)
- S3: ✅ Healthy
- EasyPost: ✅ Healthy
- ElevenLabs: ⚠️ Degraded (rate limit warning)

**Queue Monitoring**:
- Table: Queue | Pending | Active | Completed | Failed
- Failed jobs: view logs, retry

**Error Tracking** (Sentry integration):
- Recent errors
- Error rate chart
- Most common errors
- Unresolved issues

**API Metrics**:
- Requests/min (chart)
- Error rate (chart)
- Latency distribution (histogram)

**Database Performance**:
- Slow queries log
- Table sizes
- Index usage

### 13. Telegram Bot Integration

**Bot Commands** (for mobile escalation handling):
```
/queue - Show pending escalations
/claim <id> - Claim an escalation
/approve <id> - Approve offer
/custom <id> <price> - Set custom price
/reject <id> <reason> - Reject offer
/fraud <id> - Flag as fraud
/stats - Today's stats
```

**Notifications**:
- New escalation (with inline buttons)
- Fraud alert
- Payout failure
- System error

## API ENDPOINTS (Admin-Only)

All endpoints require admin JWT with 2FA verification.

```typescript
// Dashboard
GET /api/v1/admin/dashboard/metrics
GET /api/v1/admin/dashboard/feed?limit=50

// Offers
GET /api/v1/admin/offers?status=&category=&confidence=&page=
GET /api/v1/admin/offers/:id
PUT /api/v1/admin/offers/:id/price
POST /api/v1/admin/offers/:id/escalate
POST /api/v1/admin/offers/:id/reject
POST /api/v1/admin/offers/:id/fraud

// Escalations
GET /api/v1/admin/escalations
POST /api/v1/admin/escalations/:id/claim
POST /api/v1/admin/escalations/:id/approve
POST /api/v1/admin/escalations/:id/custom-price
POST /api/v1/admin/escalations/:id/reject

// Configuration
GET /api/v1/admin/config
PUT /api/v1/admin/config

// Jake Voice
GET /api/v1/admin/jake/clips
POST /api/v1/admin/jake/clips
DELETE /api/v1/admin/jake/clips/:id
GET /api/v1/admin/jake/templates
POST /api/v1/admin/jake/templates
PUT /api/v1/admin/jake/templates/:id
GET /api/v1/admin/jake/analytics

// Warehouse
GET /api/v1/admin/warehouse/incoming
POST /api/v1/admin/warehouse/verify/:shipmentId

// Payouts
GET /api/v1/admin/payouts?status=
POST /api/v1/admin/payouts/:id/retry
POST /api/v1/admin/payouts/:id/refund

// Users
GET /api/v1/admin/users?search=&trust_score=
GET /api/v1/admin/users/:id
POST /api/v1/admin/users/:id/ban
PUT /api/v1/admin/users/:id/trust-score

// Fraud
GET /api/v1/admin/fraud/alerts
GET /api/v1/admin/fraud/checks?type=
PUT /api/v1/admin/fraud/rules

// Analytics
GET /api/v1/admin/analytics/profitability
GET /api/v1/admin/analytics/accuracy
GET /api/v1/admin/analytics/cohorts
GET /api/v1/admin/analytics/funnel
GET /api/v1/admin/analytics/jake-engagement

// Health
GET /api/v1/admin/health
GET /api/v1/admin/health/queue
GET /api/v1/admin/health/errors
```

## INTEGRATION POINTS

**Consumes**:
- All data from Agent 4 (Backend) via APIs
- Real-time updates via WebSocket or SSE

**Calls**:
- Agent 2 (AI) for manual re-pricing requests
- Agent 3 (Jake) for voice regeneration
- Agent 4 (Backend) for all data operations

**Provides to**:
- Human operators (reviewers, warehouse staff, finance)
- Product team (configuration, experiments)
- Fraud team (monitoring, rules)

## FILE STRUCTURE

```
admin/
├── app/
│   ├── dashboard/page.tsx
│   ├── offers/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── escalations/page.tsx
│   ├── config/page.tsx
│   ├── jake/page.tsx
│   ├── warehouse/page.tsx
│   ├── finance/page.tsx
│   ├── users/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   ├── fraud/page.tsx
│   ├── analytics/page.tsx
│   └── health/page.tsx
├── components/
│   ├── MetricCard.tsx
│   ├── OfferTable.tsx
│   ├── ReviewModal.tsx
│   ├── ConfigEditor.tsx
│   ├── JakeVoicePlayer.tsx
│   └── charts/
├── lib/
│   ├── admin-api.ts
│   └── telegram-bot.ts
└── middleware/
    └── admin-auth.ts
```

## QUALITY STANDARDS

1. **Performance**: Admin pages load <1s with real-time data
2. **Reliability**: All critical actions logged to audit trail
3. **Security**: 2FA required, IP whitelist, session timeout
4. **Usability**: Mobile-friendly for Telegram, desktop-optimized for dashboard
5. **Real-time**: Dashboards update without refresh

## TESTING

1. **Escalation Flow**: End-to-end from offer → Telegram → approval → payout
2. **Configuration**: Verify margin changes apply to new offers
3. **Fraud Detection**: Test all fraud check types
4. **Warehouse**: Verify item verification flow
5. **Analytics**: Spot-check metrics against raw data

## SUCCESS CRITERIA

- [ ] Real-time dashboard displays live metrics
- [ ] Escalation interface functional via web and Telegram
- [ ] Configuration panel allows margin/threshold adjustments
- [ ] Jake voice management uploads, edits, and tracks engagement
- [ ] Warehouse verification flow processes items
- [ ] Payout queue manages all payout states
- [ ] User management shows trust scores and history
- [ ] Fraud monitoring flags suspicious activity
- [ ] Analytics provide actionable insights
- [ ] System health monitoring active with alerts

## NOTES

- **Function over form**: Admin tools prioritize speed and information density
- **Mobile for escalations**: Reviewers handle escalations from phones via Telegram
- **Audit everything**: Every admin action logged
- **Real-time critical**: Dashboard must feel live, not stale
- **Jake is everywhere**: Even admin notifications should feel on-brand

---

**PROCEED AUTONOMOUSLY. BUILD THE CONTROL CENTER.**
