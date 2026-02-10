# TEAM 2: Frontend/UX — Remaining Tasks

**Last Updated**: 2026-02-11
**Status**: Task 2.1 Complete ✅

---

## Completed

### ✅ Task 2.1: 4-Step Mobile-First Submission Flow (Week 2)
**Status**: Complete
**Impact**: +25% mobile completion rate (target)
**Files**:
- `web/components/SubmitWizard.tsx`
- `web/components/wizard/PhotoStep.tsx`
- `web/components/wizard/DetailsStep.tsx`
- `web/components/wizard/ContactStep.tsx`
- `web/components/wizard/ReviewStep.tsx`

---

## Remaining Tasks (Priority Order)

### 🔴 Task 2.3: Transparent Pricing Breakdown Display (Week 2) — HIGH PRIORITY

**Research Source**: Google PAIR (40% trust increase from explainability)

**Feature**: "Show Me the Math" expandable section on OfferCard

**Implementation**:
```typescript
// web/components/OfferCard.tsx
<Accordion>
  <AccordionTrigger>Show Me the Math ▼</AccordionTrigger>
  <AccordionContent>
    Base value (eBay avg): $700
    Condition adjustment: -$105 (Good = -15%)
    Category margin: 60%
    $595 × 0.6 = $357
    ─────────────────────
    Jake's Offer: $357
  </AccordionContent>
</Accordion>
```

**Backend Dependency**:
- Endpoint: `GET /api/v1/offers/:id/explanation`
- Response: `{ baseValue, conditionAdjustment, margin, breakdown }`

**Success Metric**: >40% click-through rate on "Show me the math"

**Effort**: 1 day (frontend only, backend needs endpoint)

---

### 🟡 Task 2.5: 30-Day Price Lock Countdown (Week 2) — MEDIUM PRIORITY

**Research Source**: Gazelle price lock (industry standard)

**Feature**: Display countdown timer on offer card

**Implementation**:
```typescript
// web/components/CountdownTimer.tsx
export function CountdownTimer({ expiresAt }: { expiresAt: Date }) {
  const remaining = useMemo(() => {
    const diff = expiresAt.getTime() - Date.now();
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    };
  }, [expiresAt]);

  return (
    <div className="countdown">
      🕐 {remaining.days} days, {remaining.hours} hours, {remaining.minutes} mins
    </div>
  );
}
```

**Backend Dependency**:
- Database: Add `offer_expires_at TIMESTAMP` to offers table
- Default: `NOW() + INTERVAL '30 days'`

**Success Metric**: Offer acceptance rate within 30-day window tracked

**Effort**: 1 day

---

### 🟡 Task 2.4: Market Comparables Display (Week 3) — MEDIUM PRIORITY

**Research Source**: Zillow comps (30% higher engagement)

**Feature**: Show 3 similar items sold recently below offer

**Implementation**:
```typescript
// web/components/ComparablesSection.tsx
export function ComparablesSection({ offerId }: { offerId: string }) {
  const { data, isLoading } = useSWR(
    `/api/v1/offers/${offerId}/comparables`,
    fetcher
  );

  return (
    <section>
      <h3>Similar Items Recently Sold:</h3>
      {data?.comparables.map((comp) => (
        <CompCard
          key={comp.id}
          image={comp.image}
          title={comp.title}
          price={comp.price}
          soldDate={comp.soldDate}
        />
      ))}
    </section>
  );
}
```

**Backend Dependency**:
- Endpoint: `GET /api/v1/offers/:id/comparables`
- Integration: Agent 2 marketplace scraping (eBay sold listings API)
- Response: `{ comparables: [{ title, image, price, soldDate }] }`

**Success Metric**: +20% offer acceptance when users view comparables

**Effort**: 2 days (frontend only, backend needs marketplace integration)

---

### 🟢 Task 2.2: Trust Badge System UI (Week 3) — LOWER PRIORITY

**Research Source**: multivendorx verification (35-50% confidence boost)

**Badges to implement**:
- ✅ Email Verified (green checkmark)
- 📱 Phone Verified (blue phone icon)
- 🆔 ID Verified (gold shield)
- ⭐ Trusted Seller (5+ transactions, silver star)
- 🤠 Sheriff (25+ transactions, gold cowboy hat)

**Implementation**:
```typescript
// web/components/TrustBadge.tsx
export function TrustBadge({ type, verified }: BadgeProps) {
  const badgeConfig = {
    email: { icon: "✅", color: "green", label: "Email Verified" },
    phone: { icon: "📱", color: "blue", label: "Phone Verified" },
    id: { icon: "🆔", color: "gold", label: "ID Verified" },
    trusted: { icon: "⭐", color: "silver", label: "Trusted Seller" },
    sheriff: { icon: "🤠", color: "gold", label: "Sheriff" },
  };

  return (
    <span className={`badge badge-${type}`} title={badgeConfig[type].label}>
      {badgeConfig[type].icon}
    </span>
  );
}

// web/components/TrustBadgeList.tsx
export function TrustBadgeList({ user }: { user: User }) {
  return (
    <div className="badges">
      {user.badges.map((badge) => (
        <TrustBadge key={badge} type={badge} verified={true} />
      ))}
      <p className="progress">
        {user.badges.length} of 5 badges earned
      </p>
    </div>
  );
}
```

**Backend Dependency**:
- Database: Add `badges JSONB` to users table
- Endpoints:
  - `POST /api/v1/users/verify-email`
  - `POST /api/v1/users/verify-phone`
  - `POST /api/v1/users/verify-id` (with ID upload)
- Badge logic: Auto-award based on user actions

**Display Locations**:
- User profile page
- Offer cards (next to seller name)
- Admin dashboard

**Success Metric**: +35-50% buyer confidence (user survey)

**Effort**: 3 days (2 frontend, 1 backend)

---

### 🔵 Task 2.6: Microcopy Audit (Week 4-6) — ONGOING

**Research Source**: Wendy's Twitter consistency, Cards Against Humanity workshops

**Task**: Audit all UI strings and rewrite in Jake's voice

**Process**:
1. Create spreadsheet with all 200+ UI strings
2. Collaborate with Team 4 (Jake Bible creators) for rewrites
3. Implement rewrites across all components
4. Get Team 4 approval before deploying

**Examples**:
| Before | After |
|--------|-------|
| "Submit Photo" | "Show Me What You Got" |
| "Error: File too large" | "Whoa there — that photo's too big. Try a smaller one?" |
| "Offer Ready" | "Alright partner, I've had a look. Here's what I can do for ya." |
| "Empty State" | "Nothin' here yet. Ready to see what your stuff's worth?" |

**Implementation**:
```typescript
// web/lib/jake-copy.ts (centralized copy library)
export const jakeCopy = {
  submit: {
    title: "Show Me What You Got",
    subtitle: "Snap 3 to 5 photos from different angles",
    button: "Get Jake's Offer",
  },
  errors: {
    photoTooLarge: "Whoa there — that photo's too big. Try a smaller one?",
    noPhotos: "Jake needs at least one photo, partner.",
    networkError: "Can't reach Jake right now. Check your connection?",
  },
  // ... 200+ strings
};
```

**Success Metric**: All UI copy approved by Team 4

**Effort**: 2 weeks (1 week audit, 1 week implementation)

---

## Dependencies Summary

### Team 1 (Backend/AI) Blockers:

| Task | Endpoint Needed | Status |
|------|----------------|--------|
| 2.3 Pricing Breakdown | `GET /api/v1/offers/:id/explanation` | ❌ Not implemented |
| 2.4 Comparables | `GET /api/v1/offers/:id/comparables` | ❌ Not implemented (needs marketplace scraping) |
| 2.5 Price Lock | Add `offer_expires_at` to database | ❌ Not implemented |
| 2.2 Trust Badges | `POST /api/v1/users/verify-*` | ❌ Not implemented |
| 2.1 AI Auto-Fill | `POST /api/v2/describe-item` | ❌ Not implemented (simulated in UI) |

### Team 4 (Jake Voice) Collaboration:

| Task | Deliverable | Status |
|------|-------------|--------|
| 2.6 Microcopy Audit | Rewrite 200+ UI strings | ⏳ Waiting for Team 4 availability |

---

## Priority Recommendation

**Week 2 Focus**:
1. **Task 2.3** (Pricing Breakdown) — HIGH trust impact, easy frontend
2. **Task 2.5** (Price Lock) — Industry standard, easy implementation

**Week 3 Focus**:
3. **Task 2.4** (Comparables) — HIGH engagement, requires backend integration
4. **Task 2.2** (Trust Badges) — Gamification + trust, moderate effort

**Week 4-6**:
5. **Task 2.6** (Microcopy Audit) — Ongoing, collaborate with Team 4

---

## Success Metrics Dashboard (Target)

| Metric | Baseline | Target | Actual |
|--------|----------|--------|--------|
| Mobile completion rate | 45-55% | 70-80% | ⏳ TBD |
| Offer acceptance rate | 60% | 75-80% | ⏳ TBD |
| "Show math" click-through | 0% | 40%+ | ⏳ TBD |
| User trust score (survey) | 3.5/5 | 4.5/5 | ⏳ TBD |
| Mobile bounce rate | 35% | <20% | ⏳ TBD |

---

**Next Session**: Focus on Task 2.3 (Pricing Breakdown) + Task 2.5 (Price Lock)
