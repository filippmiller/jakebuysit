-- Price History & Auto-Pricing Migration
-- Tracks all price changes and enables admin control over auto-pricing

-- Price history table (tracks all price adjustments)
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,

  -- Price change
  old_price DECIMAL(10,2) NOT NULL,
  new_price DECIMAL(10,2) NOT NULL,
  price_delta DECIMAL(10,2) GENERATED ALWAYS AS (new_price - old_price) STORED,
  price_delta_percent DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN old_price > 0 THEN ((new_price - old_price) / old_price) * 100
      ELSE 0
    END
  ) STORED,

  -- Reason and metadata
  reason TEXT NOT NULL, -- 'time_decay', 'low_velocity', 'admin_override', 'manual_adjustment'
  trigger_type TEXT NOT NULL, -- 'auto', 'manual', 'system'

  -- Context
  days_since_created INTEGER, -- Days offer has been active
  view_count INTEGER, -- Views at time of price change
  views_per_day DECIMAL(5,2), -- Engagement velocity

  -- Actor
  changed_by UUID, -- NULL if automated
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for price history
CREATE INDEX idx_price_history_offer ON price_history(offer_id, created_at DESC);
CREATE INDEX idx_price_history_created ON price_history(created_at);
CREATE INDEX idx_price_history_reason ON price_history(reason);
CREATE INDEX idx_price_history_trigger ON price_history(trigger_type);

-- Add auto-pricing fields to offers table
ALTER TABLE offers
  ADD COLUMN IF NOT EXISTS auto_pricing_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS price_locked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_floor DECIMAL(10,2), -- Minimum acceptable price
  ADD COLUMN IF NOT EXISTS last_price_optimization TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;

-- Add price history to allowed tables (for db client)
COMMENT ON TABLE price_history IS 'Tracks all price changes for offers with reason and context';
COMMENT ON COLUMN offers.auto_pricing_enabled IS 'Whether automatic price optimization is enabled';
COMMENT ON COLUMN offers.price_locked IS 'Admin override - prevents any auto-pricing';
COMMENT ON COLUMN offers.price_floor IS 'Minimum price (cost + margin) - optimizer cannot go below this';

-- Index for finding stale offers ready for optimization
CREATE INDEX idx_offers_auto_pricing ON offers(status, last_price_optimization, created_at)
  WHERE status = 'ready' AND auto_pricing_enabled = true AND price_locked = false;

-- View count index for velocity calculation
CREATE INDEX idx_offers_view_velocity ON offers(view_count, created_at)
  WHERE status = 'ready';
