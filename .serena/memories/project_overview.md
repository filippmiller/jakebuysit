# JakeBuysIt - Admin & Operations Platform (Agent 5)

## Project Purpose
Internal operations platform for managing JakeBuysIt - a marketplace where "Jake" (AI character) buys items from users. This admin dashboard provides mission control for operators, finance team, product team, and fraud monitoring.

## Multi-Agent Architecture
This is Agent 5 of a 5-agent system:
- **Agent 1**: Frontend & UX (Next.js user-facing app)
- **Agent 2**: AI Vision & Pricing (Python/FastAPI)
- **Agent 3**: Jake Voice & Character (ElevenLabs TTS, Rive animation)
- **Agent 4**: Backend Infrastructure (Fastify API, PostgreSQL, orchestration)
- **Agent 5**: Admin & Operations (THIS - Next.js admin dashboard)

## Technology Stack
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript (strict mode)
- **UI**: Tailwind CSS + Shadcn/ui
- **Charts**: Recharts
- **Auth**: JWT with 2FA
- **Real-time**: Server-Sent Events or WebSocket
- **Database**: PostgreSQL (via Agent 4 API)
- **External**: Telegram Bot API for mobile escalations

## Key Features
1. Real-time dashboard with live metrics
2. Escalation handling (web + Telegram bot)
3. Business rule configuration (margins, thresholds)
4. Jake voice management (upload, edit, A/B test)
5. Warehouse verification flow
6. Payout queue management
7. User trust scoring & fraud monitoring
8. Analytics & reporting
