# Admin Platform Setup Guide

## Quick Start

```bash
cd admin
npm install
cp .env.example .env
npm run dev
```

Admin platform: **http://localhost:3001**

## Status

### ✅ Completed
- Next.js 14 App Router with TypeScript
- 13 pages (dashboard, offers, escalations, config, jake, warehouse, finance, users, fraud, analytics, health)
- Core components (AdminNav, MetricCard, LiveFeed, QuickActions)
- API client with JWT auth
- TypeScript types for all data models
- Tailwind CSS + Radix UI setup

### 🚧 To Be Implemented
- Component implementations (35+ components stubbed)
- Recharts integration for all charts
- 2FA, IP whitelist, audit logging
- SSE for real-time updates
- Telegram bot integration

See README.md for full documentation.
