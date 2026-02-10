# Session: Phase 4 Team 2 - Dynamic Pricing Optimizer

**Date**: 2026-02-10
**Agent**: Claude Code (Senior Fullstack Developer)
**Beads Issue**: pawn-izc
**Status**: Completed

## Context

Implemented time-based price optimization system to automatically adjust stale listings and improve sell-through rates.

## Work Performed

### Phase 1: Database Schema

**File**: `backend/src/db/migrations/004_add_price_history.sql`

Created comprehensive price history tracking:
- `price_history` table with complete audit trail
- Auto-pricing control fields on `offers` table:
  - `auto_pricing_enabled` (default: true)
  - `price_locked` (admin override)
  - `price_floor` (minimum acceptable price)
  - `last_price_optimization` (timestamp)
  - `view_count` (engagement tracking)
- Indexes for performance:
  - Stale offer detection index
  - Price history lookups
  - View velocity calculation

**Reasoning**: Need complete audit trail for price changes with context (velocity, days active, trigger type).

### Phase 2: Python Pricing Optimizer

**File**: `services/pricing/optimizer.py` (221 lines)

Core pricing algorithm with:

**Velocity Detection**:
- High velocity (>5 views/day): Skip optimization
- Medium velocity (2-5 views/day): Monitor only
- Low velocity (<2 views/day): Apply time decay

**Time Decay Schedule**:
- 7-13 days + <10 views: -5%
- 14-29 days + <20 views: -10%
- 30+ days: -15%

**Price Floor Protection**:
- Never reduce below `original_offer * 1.20`
- Prevents selling at a loss

**Key Methods**:
- `analyze_offer()`: Single offer analysis
- `batch_analyze()`: Batch processing
- `_calculate_time_decay()`: Time-based decay logic

**Testing**: Created `test_optimizer.py` - all tests pass, verified:
- Velocity thresholds work correctly
- Time decay applies properly
- Price floor enforcement

**Bug Fixed**: Line 189 logic error - changed `>= min_views` to handle `min_views=0` case for 30+ day listings.

### Phase 3: BullMQ Scheduled Job

**File**: `backend/src/queue/jobs/price-optimizer.ts` (190 lines)

Job handler that:
1. Queries stale offers (>7 days, auto-pricing enabled, not locked)
2. Calls Python optimizer service for batch analysis
3. Applies recommended price changes
4. Records all changes in `price_history`
5. Returns summary stats

**Safety Features**:
- Dry run mode for testing
- Double-check price floor before applying
- Detailed logging of all changes

**File**: `backend/src/queue/scheduler.ts` (75 lines)

Cron scheduling system:
- `schedulePriceOptimizer()`: Sets up daily 2 AM cron
- `triggerPriceOptimizerNow()`: Manual trigger for testing
- Removes existing schedules before re-adding (prevents duplicates)

**Integration**: Updated `backend/src/index.ts` to call `setupScheduledJobs()` on startup.

### Phase 4: Python API Endpoint

**File**: `services/pricing/router.py`

Added `/optimize-prices` endpoint:
- Accepts array of offers with pricing context
- Returns recommendations for each offer
- Used by BullMQ job handler

**Updated**: `backend/src/integrations/agent2-client.ts` to add `optimizePrices()` method.

### Phase 5: Admin API Controls

**File**: `backend/src/api/routes/admin.ts` (added 267 lines)

Six new admin endpoints:

1. `GET /pricing/history/:offerId` - View price change history
2. `POST /pricing/toggle-auto/:offerId` - Enable/disable auto-pricing
3. `POST /pricing/lock/:offerId` - Lock price (prevents all changes)
4. `POST /pricing/manual-adjust/:offerId` - Admin manual price adjustment
5. `POST /pricing/trigger-optimizer` - Manual optimizer trigger (super-admin only)
6. `GET /pricing/optimizer-stats` - Effectiveness analytics

All endpoints:
- Require admin role
- Write to audit log
- Return comprehensive data

### Phase 6: Admin UI

**File**: `web/app/admin/pricing/page.tsx` (280 lines)

Admin dashboard showing:
- Optimizer stats (30-day window)
- Total adjustments, reduction amount, avg %
- Breakdown by reason (time decay types, velocity triggers)
- Manual trigger controls (dry run + live)
- Documentation of how optimizer works

**Design**: Clean card-based layout with real-time stats and trigger controls.

## Technical Decisions

| Decision | Rationale | Alternatives Considered |
|----------|-----------|------------------------|
| Daily 2 AM schedule | Low traffic time, won't interfere with customer activity | Hourly (too aggressive), weekly (too slow) |
| Price floor = original + 20% | Ensures profit margin is maintained | Fixed percentage of current price (could erode margin) |
| Velocity-first logic | Market demand is best indicator | Time-only decay (ignores engagement) |
| BullMQ for scheduling | Already in use for other jobs | Node-cron (separate system), OS cron (requires deployment config) |
| Separate price_history table | Complete audit trail | JSONB field on offers (harder to query) |

## Database Changes

**Migration**: `004_add_price_history.sql`
- New table: `price_history` (13 columns)
- New columns on `offers`: 5 fields for auto-pricing control
- 4 new indexes for performance

**Applied**: Successfully via `npx tsx src/scripts/run-migration.ts`

## Testing Performed

- [x] Python optimizer unit tests (6 test cases)
- [x] Velocity thresholds verified
- [x] Time decay percentages correct
- [x] Price floor protection works
- [x] Batch analysis functional
- [x] Migration applied successfully
- [x] Admin API endpoints accessible
- [x] Admin UI renders correctly

## Deployment Notes

**Required Environment Variables**: None (uses existing Redis/Postgres)

**Scheduler Auto-Start**: BullMQ scheduler initializes on server startup.

**Manual Testing**:
```bash
# Dry run
curl -X POST http://localhost:3000/api/v1/admin/pricing/trigger-optimizer \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"dryRun": true}'

# Live run
curl -X POST http://localhost:3000/api/v1/admin/pricing/trigger-optimizer \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"dryRun": false}'
```

**Monitoring**:
- Check logs for `price_optimizer_job_started` and `price_optimizer_job_completed`
- Admin UI shows stats: `/admin/pricing`
- Query `price_history` table for audit trail

## Known Limitations

1. **View count tracking**: Currently defaults to 0 - need to implement view tracking in offer detail page
2. **Market data integration**: Doesn't yet use external market trends (future enhancement)
3. **Category-specific tuning**: Uses same decay schedule for all categories (could be category-aware)
4. **Seasonal adjustments**: Not implemented (holidays, back-to-school, etc.)

## Next Steps

**Immediate**:
- [ ] Implement offer view tracking (increment `view_count` on offer detail page)
- [ ] Add price optimization history to offer detail admin view

**Future Enhancements**:
- [ ] A/B test different decay schedules
- [ ] Add conversion rate tracking (did price reduction lead to sale?)
- [ ] Category-specific decay rates
- [ ] Seasonal demand multipliers
- [ ] Integration with marketplace re-listing

## Files Modified

**New Files**:
- `backend/src/db/migrations/004_add_price_history.sql`
- `services/pricing/optimizer.py`
- `services/pricing/test_optimizer.py`
- `backend/src/queue/jobs/price-optimizer.ts`
- `backend/src/queue/scheduler.ts`
- `web/app/admin/pricing/page.tsx`

**Modified Files**:
- `backend/src/db/client.ts` (added `price_history` to ALLOWED_TABLES)
- `backend/src/index.ts` (added scheduler initialization)
- `backend/src/queue/workers.ts` (registered price-optimizer queue)
- `backend/src/integrations/agent2-client.ts` (added `optimizePrices()`)
- `backend/src/api/routes/admin.ts` (added 6 pricing endpoints)
- `services/pricing/router.py` (added `/optimize-prices` endpoint)

## Commits

- Migration: Add price_history table and auto-pricing fields
- Optimizer: Implement time-decay pricing algorithm
- Scheduler: Add BullMQ daily job for price optimization
- Admin: Add pricing optimizer controls and analytics
- UI: Create admin pricing dashboard

**Session Duration**: ~90 minutes
**Lines Added**: ~1200
**Files Created**: 6
**Files Modified**: 7

---

**Handoff Notes**:
- All tests pass
- Migration applied successfully
- Scheduler will run automatically on next server restart
- Admin can manually trigger via UI or API
- View count tracking needs implementation for full effectiveness
