# Jake Admin Platform

Internal operations platform for managing JakeBuysIt. Mission control for operators, finance team, product team, and fraud monitoring.

## Features

### Real-Time Dashboard
- Live metrics: Today's offers, acceptance rate, items in transit, payouts pending
- Auto-refreshing live feed (every 5 seconds)
- Quick actions for escalations, fraud alerts, and payout issues
- Charts: Offers over time, acceptance rate trends, revenue vs costs, category breakdown

### Offers Management
- View all offers with filtering (status, category, confidence, date range)
- Drill down to detailed offer view with:
  - Item photos and AI identification details
  - Pricing breakdown with market data
  - Jake voice playback and script
  - Status timeline
  - Admin actions (edit price, escalate, reject, flag fraud)

### Escalation Interface
- Queue of offers requiring human review
- Reason badges (low confidence, high value, few comparables, etc.)
- SLA timer with alerts
- Review modal with decision panel:
  - Approve suggested offer
  - Set custom price
  - Reject with reason
  - Flag fraud
  - Request more info
- Telegram integration for mobile handling

### Configuration Panel
- **Pricing Rules**: Category margins, condition multipliers, offer limits
- **Confidence Thresholds**: Auto-price, escalation, fraud detection
- **Dynamic Adjustments**: Velocity bonuses, inventory saturation, loyalty
- **Fraud Settings**: Stock photo detection, user velocity limits, ID requirements
- Audit log for all configuration changes

### Jake Voice Management
- **Pre-Recorded Clips**: Upload, edit, preview, download
- **Templates**: Create, edit, A/B test, track performance
- **Dynamic Scripts**: Review AI-generated scripts, promote to templates
- **Voice Settings**: ElevenLabs model, stability, similarity, style
- **Analytics**: Play rate, completion rate, acceptance correlation

### Warehouse Operations
- Incoming shipments tracking
- Verification interface (photo comparison, condition assessment)
- Serial number entry, weight comparison
- Actions: Approve payout, revise offer, return to sender, flag fraud
- Verified inventory management (Phase 2: resale)

### Finance & Payouts
- Payout queue (pending, processing, completed, failed)
- Retry failed payouts, refund handling
- Cash flow dashboard (offers out, resales in, net)
- Liabilities: Committed but not paid out
- Jake Bucks outstanding
- Financial metrics (avg offer, margin, cost per offer)

### User Management
- User table with trust scores, Jake familiarity, Jake Bucks
- User detail view:
  - Profile and auth info
  - Offers history and acceptance rate
  - Payout history
  - Fraud checks
  - Admin actions (ban, adjust trust score, reset Jake Bucks)

### Fraud Detection
- Active alerts requiring review
- Fraud checks by type (stock photos, reverse image, user velocity, device reputation)
- User risk dashboard sorted by risk score
- Fraud rules editor

### Analytics & Reports
- Profitability by category
- Pricing accuracy (AI offer vs actual resale)
- User cohorts (retention, LTV)
- Funnel analysis (conversion rates)
- Jake engagement (play rate, completion rate)
- Escalation analysis (rate, resolution time, reviewer performance)

### System Health
- Service status (API, database, Redis, queue, S3, integrations)
- Queue monitoring (pending, failed jobs)
- Error tracking (Sentry integration)
- API metrics (requests/min, error rate, latency)
- Database performance (slow queries, table sizes)

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **UI**: Tailwind CSS + Radix UI primitives
- **Charts**: Recharts
- **Auth**: JWT with 2FA (planned)
- **Real-time**: Server-Sent Events (SSE)
- **API Client**: Axios with interceptors
- **Telegram**: node-telegram-bot-api

## Getting Started

### Prerequisites

- Node.js 18.17.0 or higher
- npm or pnpm
- Backend API running (Agent 4)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
# Required: NEXT_PUBLIC_BACKEND_URL, JWT_SECRET, TELEGRAM_BOT_TOKEN (optional)

# Run development server
npm run dev
```

Admin platform will be available at: http://localhost:3001

### Development

```bash
# Development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
admin/
├── app/                  # Next.js 14 App Router pages
│   ├── dashboard/        # Real-time dashboard
│   ├── offers/           # Offers management + detail view
│   ├── escalations/      # Escalation queue
│   ├── config/           # Business rules configuration
│   ├── jake/             # Jake voice management
│   ├── warehouse/        # Warehouse operations
│   ├── finance/          # Payouts & cash flow
│   ├── users/            # User management + detail view
│   ├── fraud/            # Fraud detection
│   ├── analytics/        # Analytics & reports
│   └── health/           # System health monitoring
├── components/           # React components
│   ├── ui/               # Base UI components (Radix)
│   ├── charts/           # Chart components
│   └── *.tsx             # Feature components
├── lib/                  # Utilities
│   ├── admin-api.ts      # API client
│   └── utils.ts          # Helper functions
├── types/                # TypeScript types
├── middleware/           # Auth middleware
├── hooks/                # React hooks
└── public/               # Static assets
```

## API Integration

The admin platform consumes APIs from Agent 4 (Backend). All endpoints are proxied through `/api/v1/admin/*`.

### Authentication

All API requests require admin JWT token:
```typescript
Authorization: Bearer <admin_jwt_token>
```

2FA verification required for sensitive operations (configuration changes, user bans, etc.).

### Real-Time Updates

Dashboard uses Server-Sent Events (SSE) for real-time updates:
```typescript
const eventSource = new EventSource('/api/v1/admin/events');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Update UI
};
```

## Security

- Admin-only access with JWT authentication
- 2FA required (planned)
- IP whitelist (configurable)
- Session timeout (30 minutes default)
- CSRF protection
- Audit logging for all admin actions
- HTTP-only cookies for tokens
- Security headers (CSP, X-Frame-Options, etc.)

## Telegram Integration

For mobile escalation handling:

1. Create Telegram bot via @BotFather
2. Get bot token and add to `.env`
3. Get chat ID for admin channel
4. Bot commands:
   - `/queue` - Show pending escalations
   - `/claim <id>` - Claim an escalation
   - `/approve <id>` - Approve offer
   - `/custom <id> <price>` - Set custom price
   - `/reject <id> <reason>` - Reject offer
   - `/fraud <id>` - Flag as fraud
   - `/stats` - Today's stats

## Quality Standards

- **Performance**: Pages load <1s with real-time data
- **Reliability**: All critical actions logged to audit trail
- **Security**: 2FA required, IP whitelist, session timeout
- **Usability**: Mobile-friendly for Telegram, desktop-optimized for dashboard
- **Real-time**: Dashboards update without refresh (5s interval)

## Testing

```bash
# Run tests
npm test

# E2E testing with Playwright (planned)
npm run test:e2e
```

## Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

Deploy to Vercel, Railway, or any Node.js hosting platform.

### Environment Variables (Production)

- `NEXT_PUBLIC_BACKEND_URL`: Backend API URL
- `JWT_SECRET`: Secret for JWT verification
- `REQUIRE_2FA`: Enable 2FA (true/false)
- `TELEGRAM_BOT_TOKEN`: Telegram bot token (optional)
- `ALLOWED_ADMIN_IPS`: Comma-separated IP whitelist
- `SESSION_COOKIE_SECURE`: Use secure cookies (true)

## License

Proprietary - JakeBuysIt Platform
