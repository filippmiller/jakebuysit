# Work Log - JakeBuysIt

## [2026-02-09] - Full Platform Deployment to Hetzner VPS

**Status**: Completed
**Duration**: ~3 hours
**Commits**: cb865a6f, d253184e, fa2b2a14, 40423b60, 638b0bc9, 006c705e, 5ca91737, 12b7fd8f

### What was done
- Deployed all 5 services (Backend, Pricing, Web, Jake, Admin) to Hetzner VPS via Coolify
- Created PostgreSQL database and applied 11-table schema
- Configured environment variables for all services
- Fixed 20+ build/runtime errors across 8 deployment rounds
- Backend deployed manually via Docker when Coolify API went down

### Key fixes
- Admin: 30 stub components with invalid hyphenated function names → PascalCase
- Backend: TypeScript compilation errors (QueryResultRow, unused params, unknown error types)
- Backend: Docker networking (host.docker.internal → direct IPs), Redis auth, healthcheck IPv6
- Jake: Unterminated regex, missing template functions, ESM/CJS import issues
- Web/Admin: NODE_ENV leaking into build, missing deps, missing public directory

### Decisions made
- Hardcoded `0.0.0.0` in Fastify listen (Coolify overrides HOST env var)
- Used `127.0.0.1` in healthcheck (Alpine wget resolves localhost to IPv6)
- Deployed backend manually with Traefik labels after Coolify API 503

### Live URLs
- Backend: http://qwsk44ogwc8c4w004gws4wok.89.167.42.128.sslip.io
- Pricing: http://n8g4owkoco0skcksogcg0sok.89.167.42.128.sslip.io
- Web: http://ecwwoo4kc4cg8skcwcc8wgkw.89.167.42.128.sslip.io
- Jake: http://rs4cw4cooskog8go0kw4o0cc.89.167.42.128.sslip.io
- Admin: http://ssk80wkswwwscggs804c4o0w.89.167.42.128.sslip.io

**Session notes**: `.claude/sessions/2026-02-09-200000-deployment.md`

---

## [2026-02-09] - Hero Section Redesign

**Status**: Completed
**Duration**: ~60 minutes
**Commits**: f01d1540

### What was done
- Redesigned hero section with real Jake photo (jack1.png), animated speech bubbles, glassmorphism category cards
- 3-column grid layout: headline | glass card stack | Jake with speech bubbles
- Switched fonts from Inter to Syne (display) + Outfit (body)
- Fixed Next.js Image rendering issue with large PNG — switched to regular `<img>` tag

### Decisions made
- Used `<img>` instead of Next.js `<Image>` — 3.2MB PNG silently fails with Image component
- 3-column grid for clean separation vs scattered absolute positioning

### Next steps
- Fix the "next page" (likely /submit) — user flagged this for next session

**Session notes**: `.claude/sessions/2026-02-09-172500-hero-redesign.md`

---

# Work Log - JakeBuysIt Frontend

## [2026-02-09] - Frontend Foundation (Agent 1)

**Status**: Phase 1 Complete
**Duration**: ~90 minutes
**Commits**: 20ebba17

### What was done

**Project Initialization**
- Set up Next.js 14+ with App Router, TypeScript, and Tailwind CSS
- Configured western-themed design system (saloon/dusty color palettes)
- Installed core dependencies: Framer Motion, Rive, Howler.js, Radix UI, Zustand

**Core Components Built**
1. JakeCharacter.tsx - Rive state machine integration with 10 character states
2. JakeVoice.tsx - Full-featured audio player with waveform visualization
3. CameraCapture.tsx - Multi-photo capture (up to 6 photos) with compression
4. ResearchAnimation.tsx - The signature 3-stage animated sequence
5. OfferCard.tsx - Offer presentation with market context

**Pages**: Landing, Submit, Offer display
**Infrastructure**: API client, WebSocket hook, Camera hook, Jake personality system

### Next Session
- Build registration flow
- Implement dashboard
- Add batch/garage sale mode
- Configure PWA
