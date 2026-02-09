# JakeBuysIt Frontend

Next.js 14+ frontend for Jake's AI Pawn Shop.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Visit `http://localhost:3000`

## 📁 Project Structure

```
web/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Landing page
│   ├── submit/            # Photo submission flow
│   ├── offers/[id]/       # Offer display & research animation
│   ├── batch/             # Garage Sale Mode
│   ├── dashboard/         # User dashboard
│   └── layout.tsx         # Root layout
├── components/
│   ├── JakeCharacter.tsx  # Rive animation integration
│   ├── JakeVoice.tsx      # Audio player with waveform
│   ├── CameraCapture.tsx  # Camera interface
│   ├── ResearchAnimation.tsx  # 3-stage signature animation
│   ├── OfferCard.tsx      # Offer presentation
│   └── ui/                # Radix UI components
├── hooks/
│   ├── useCamera.ts       # Camera access & photo capture
│   ├── useWebSocket.ts    # Real-time updates
│   └── useJakeVoice.ts    # Audio playback management
├── lib/
│   ├── api-client.ts      # Backend API wrapper
│   ├── jake-scripts.ts    # Jake personality copy
│   └── utils.ts           # Utilities (compression, formatting)
└── public/
    └── jake/
        ├── character.riv   # Jake's Rive animation
        └── voices/         # Pre-cached voice clips
```

## 🎨 Features Built

### ✅ Phase 1: Foundation
- [x] Next.js 14+ with App Router & TypeScript
- [x] Tailwind CSS with western color palette
- [x] Radix UI primitives
- [x] Framer Motion animations
- [x] Rive character integration
- [x] Howler.js voice playback

### ✅ Phase 2: Core Components
- [x] Jake Character (Rive state machine)
- [x] Jake Voice UI (audio player with waveform)
- [x] Camera Capture (multi-photo with compression)
- [x] Research Animation (3-stage signature moment)
- [x] Offer Card (market context display)

### ✅ Phase 3: Pages
- [x] Landing Page (hero, how it works, FAQ)
- [x] Submit Page (camera/upload flow)
- [x] Offer Page (research animation + offer card)

### 🚧 TODO
- [ ] Registration flow (post-accept)
- [ ] Dashboard ("Jake's Office")
- [ ] Batch/Garage Sale Mode
- [ ] Shipping label display
- [ ] PWA configuration
- [ ] Performance optimization (Lighthouse >90)

## 🎭 Jake's Personality

All copy uses Jake's western character voice:
- Casual contractions: "gonna", "wanna", "gettin'"
- Western drawl: "partner", "howdy", "shucks"
- Direct but friendly tone
- Never condescending

See `lib/jake-scripts.ts` for all personality copy.

## 🔌 API Integration

Frontend expects backend at:
- HTTP: `http://localhost:3001`
- WebSocket: `ws://localhost:3001`

Configure via `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

### API Endpoints Used

```typescript
POST /api/v1/offers/create        // Submit photos
GET  /api/v1/offers/:id            // Get offer details
WS   /api/v1/offers/:id/stream     // Real-time research updates
POST /api/v1/offers/:id/accept     // Accept offer
GET  /api/v1/users/me/dashboard    // User dashboard
```

## 🎨 Design System

### Colors
- **Saloon**: Primary western palette (#e89f4d)
- **Dusty**: Neutral earth tones (#938673)

### Typography
- Sans: Inter (system fallback)
- Western: Custom western font (to be added)

### Animations
- Jake character states: 10 states (idle, examining, researching, etc.)
- Page transitions: Framer Motion
- Complex sequences: GSAP (not yet implemented)

## 📸 Camera Features

- Multi-photo capture (up to 6 photos)
- Automatic compression (<500KB per photo)
- Mobile camera support (back camera preferred)
- Desktop upload fallback
- Real-time preview

## 🔊 Voice Features

- Howler.js audio playback
- Waveform visualization
- Transcript toggle (accessibility)
- Auto-play option
- Volume control
- Seek/scrub support

## 🎬 Research Animation

The signature 3-stage animation:

**Stage A - Jake Looks (2-3s)**
- Jake examines photo
- Animated labels appear (brand, model, condition)
- "Alright, let's see what we got here..."

**Stage B - Jake Checks Market (3-6s)**
- Network visualization (marketplace nodes)
- Real prices stream in via WebSocket
- Counter: "147 recent sales found"
- "eBay's movin' these fast..."

**Stage C - Jake Decides (2-3s)**
- Price histogram visualization
- Jake's offer materializes
- Transition to offer card

## 🧪 Testing

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build test
npm run build
```

## 🚀 Deployment

Build optimized for:
- Vercel (recommended)
- Netlify
- Self-hosted Docker

## 📝 Notes

- Jake is the brand - every interaction is in his voice
- Research animation is the signature moment - polish heavily
- Voice on by default, graceful text fallback
- Mobile-first design (most users on phone)
- Performance critical: Lighthouse >90 target

## 🔗 Related

- Backend API: `../services/backend/`
- Jake Voice Service: `../services/jake/`
- AI Vision Service: `../services/vision/`
