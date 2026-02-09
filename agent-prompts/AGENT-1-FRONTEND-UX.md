# AGENT 1: Frontend & User Experience

## MISSION
Build the complete frontend user experience for JakeBuysIt.com using Next.js 14+, implementing Jake's character-driven interface with animations, camera capture, and real-time offer flow.

## CONTEXT
You are building the user-facing web application for an AI pawn shop fronted by "Jake" - a western-style character with personality. The frontend must be:
- **Effortless**: Near-zero friction, no registration wall
- **Transparent**: Show how Jake arrived at prices
- **Entertaining**: Jake's personality makes it fun

## TECHNOLOGY STACK
- **Framework**: Next.js 14+ (App Router, React Server Components)
- **Styling**: Tailwind CSS + Radix UI primitives
- **Animation**: Rive (Jake character), Framer Motion (transitions), GSAP (complex)
- **Audio**: Howler.js for voice playback
- **State**: Zustand for client state
- **Camera**: MediaDevices API with compression
- **PWA**: next-pwa for offline, push, installable

## DELIVERABLES

### 1. Landing Page (`app/page.tsx`)
- **Hero Section**:
  - Animated Jake character in idle state (Rive integration)
  - Large CTA: "Show Jake What You Got"
  - Ambient animations, western aesthetic
- **How It Works**: 3-step visual guide with Jake narrating
- **Trust Signals**: Recent offers ticker, testimonials
- **FAQ**: In Jake's voice/tone

### 2. Camera/Upload Flow (`app/submit/page.tsx`)
- Multi-photo capture (up to 6 photos)
- Viewfinder guidance: "Get the whole thing in frame, partner"
- Real-time compression (target <500KB per photo)
- Optional text description field
- Ghost labels for AI pre-identification
- Drag-and-drop for desktop

### 3. Jake Researches Flow (THE SIGNATURE MOMENT)
**3-Stage Animated Sequence** (`components/ResearchAnimation.tsx`):

**Stage A - Jake Looks (2-3s)**:
- Jake leans forward, examines photo
- Expression shifts based on item category
- Animated labels: brand, model, condition
- Voice: "Alright, let's see what we got here..."

**Stage B - Jake Checks Market (3-6s)**:
- Network visualization: marketplace nodes pulse
- Real prices stream in (WebSocket from backend)
- Counter: "147 recent sales found"
- Jake text bubbles: "eBay's movin' these fast..."

**Stage C - Jake Decides (2-3s)**:
- Data converges into price histogram
- Jake's offer materializes with animation
- Facial reaction matches offer level
- Transition to offer card

### 4. Offer Card (`components/OfferCard.tsx`)
- Item identification (brand, model, condition)
- **Jake's Price** (bold, prominent)
- Market context: avg, range, comparables count
- Confidence indicator
- 24-hour expiry countdown
- Jake voice message with waveform player
- Accept/Decline actions

### 5. Registration Flow (Post-Accept Only)
**Framed by Jake**: "Now I just need to know where to send your money!"
- Email/phone + name
- Payout method selection:
  - PayPal/Venmo/Zelle/Bank/Jake Bucks
  - Show Jake Bucks 10-15% bonus prominently
- OAuth: Google Sign-In, Apple Sign-In
- Smooth, non-intrusive modal or slide-in

### 6. Shipping Screen
- USPS label displayed (PDF viewer)
- Jake guides: "Box it up, slap this on..."
- Illustrated packing tips (category-specific)
- Schedule pickup button
- Download label / Email label

### 7. Batch Flow - "Garage Sale Mode" (`app/batch/page.tsx`)
- Sequential photo capture with parallel processing
- Split-screen: left = camera, right = Jake processing queue
- Summary card: per-item accept/decline + total
- Jake: "Twelve items, three forty for the lot!"

### 8. Dashboard - "Jake's Office" (`app/dashboard/page.tsx`)
- Personalized Jake greeting (VIP, returning, new)
- Active offers with expiry timers
- Shipments with tracking visualization
- Payout history
- Jake Bucks balance (prominent if >$0)
- "Sell Something New" CTA

### 9. Jake Voice UI (`components/JakeVoice.tsx`)
Reusable voice message component:
- Chat bubble style (iMessage/WhatsApp aesthetic)
- Jake avatar + waveform visualization
- Play/pause, duration, scrubbing
- Text transcript toggle (accessibility)
- Auto-play vs. tap-to-play setting
- Volume control

### 10. Jake Animation System (`components/JakeCharacter.tsx`)
**Rive State Machine Integration**:
- States: idle, examining, researching, excited, offering, celebrating, sympathetic, disappointed, suspicious, thinking
- Trigger API for state transitions
- Smooth blending between states
- Responsive sizing (mobile vs. desktop)

### 11. User Settings
- Voice on/off toggle
- Auto-play preferences
- Volume control
- Text-only mode
- Payout method management
- Notification preferences

### 12. PWA Configuration
- Service worker for offline
- Push notification setup
- Install prompt
- Offline fallback page with Jake

## INTEGRATION POINTS (APIs to consume)

You'll call these backend endpoints (to be built by Agent 4):

```typescript
// Offer submission
POST /api/v1/offers/create
Body: { photos: File[], description?: string, userId?: string }
Returns: { offerId: string, status: 'processing' }

// Real-time research updates (WebSocket)
WS /api/v1/offers/:id/stream
Receives: { stage: 'looking'|'researching'|'deciding', data: {...}, jakeMessage?: string }

// Get offer result
GET /api/v1/offers/:id
Returns: { offer: {...}, jakeVoiceUrl: string, jakeScript: string }

// Accept offer
POST /api/v1/offers/:id/accept
Body: { email, name, payoutMethod, payoutDetails }
Returns: { shipmentId: string, labelUrl: string }

// Dashboard data
GET /api/v1/users/me/dashboard
Returns: { activeOffers: [], shipments: [], payouts: [], jakeBucks: number }
```

## QUALITY STANDARDS

1. **Performance**:
   - Lighthouse score >90
   - First Contentful Paint <1.5s
   - Image compression aggressive
   - Lazy loading for below-fold

2. **Accessibility**:
   - WCAG 2.1 AA compliance
   - Keyboard navigation
   - Screen reader support
   - Text alternatives for all Jake interactions

3. **Mobile-First**:
   - Responsive breakpoints: 375px, 768px, 1024px, 1440px
   - Touch-friendly targets (min 44x44px)
   - Native camera on mobile

4. **Error Handling**:
   - Graceful degradation if voice fails
   - Offline detection
   - Network error recovery
   - Jake delivers error messages in character

## JAKE'S PERSONALITY (Frontend Copy)

**Voice Characteristics**:
- Western drawl: "gettin'", "ain't", "lemme", "y'all"
- Casual contractions: "gonna", "wanna", "gotta"
- Signature phrases: "Take it or leave it, partner", "Now THAT's what I'm talkin' about"
- Direct but never condescending

**Example Copy**:
- Button: "Show Jake What You Got" (not "Submit Item")
- Error: "Whoops! That didn't work. Give it another shot, partner."
- Loading: "Jake's thinkin'..."
- Success: "Deal! Let's get you paid."

## FILE STRUCTURE

```
app/
├── page.tsx                    # Landing page
├── submit/
│   └── page.tsx               # Photo submission
├── offers/
│   └── [id]/page.tsx          # Offer result & acceptance
├── batch/
│   └── page.tsx               # Garage Sale Mode
├── dashboard/
│   └── page.tsx               # User dashboard
├── api/
│   └── [...backend proxy]     # If needed
components/
├── JakeCharacter.tsx          # Rive animation wrapper
├── JakeVoice.tsx              # Voice player UI
├── ResearchAnimation.tsx      # 3-stage sequence
├── OfferCard.tsx              # Offer presentation
├── CameraCapture.tsx          # Camera interface
├── ShippingLabel.tsx          # Label display
└── ui/                        # Radix primitives
hooks/
├── useCamera.ts               # Camera access
├── useJakeVoice.ts            # Audio playback
└── useWebSocket.ts            # Real-time updates
lib/
├── jake-scripts.ts            # Client-side Jake copy
└── api-client.ts              # Backend API wrapper
public/
├── jake/                      # Jake assets
│   ├── character.riv          # Rive file
│   └── voices/                # Pre-cached clips
└── fonts/                     # Western-style typography
```

## TESTING

1. **Manual E2E**: Full flow from landing → photo → offer → accept → label
2. **Jake States**: Verify all animation states trigger correctly
3. **Voice Playback**: Test auto-play, manual play, text fallback
4. **Responsive**: Test on real devices (iOS Safari, Android Chrome)
5. **Offline**: Test PWA offline behavior

## SUCCESS CRITERIA

- [ ] Landing page loads <1.5s, Jake animation plays smoothly
- [ ] Camera captures 6 photos, compresses to <500KB each
- [ ] Research animation completes 3 stages with WebSocket updates
- [ ] Offer card displays with working voice playback
- [ ] Registration flow accepts offer, returns shipping label
- [ ] Dashboard shows all user data with Jake personality
- [ ] Batch mode processes multiple items in parallel UI
- [ ] PWA installs and works offline
- [ ] Lighthouse score >90 on mobile and desktop
- [ ] All Jake interactions feel consistent and entertaining

## NOTES

- Jake is the brand. Every screen, every message, every error is in his voice.
- The "Research Animation" is the signature moment. Invest heavily in polish.
- Voice on by default, but must gracefully fall back to text.
- Prioritize mobile: most users will photograph items on phone.
- Use real placeholder data that feels like Jake wrote it.

---

**PROCEED AUTONOMOUSLY. BUILD THE JAKE EXPERIENCE.**
