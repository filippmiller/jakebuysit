-- Loyalty System Migration
-- Adds Frontier Club 3-tier loyalty system and Jake Bucks economy

-- Add loyalty fields to users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS loyalty_tier VARCHAR(20) DEFAULT 'prospector',
  ADD COLUMN IF NOT EXISTS total_items_sold INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sales_value DECIMAL(10,2) DEFAULT 0;

-- Create index for tier queries
CREATE INDEX IF NOT EXISTS idx_users_loyalty_tier ON users(loyalty_tier);
CREATE INDEX IF NOT EXISTS idx_users_items_sold ON users(total_items_sold);

-- Add tier transition tracking
CREATE TABLE IF NOT EXISTS loyalty_tier_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  from_tier VARCHAR(20),
  to_tier VARCHAR(20) NOT NULL,
  triggered_by TEXT, -- 'items_sold', 'sales_value', 'manual'
  items_sold_at_transition INTEGER,
  sales_value_at_transition DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tier_transitions_user ON loyalty_tier_transitions(user_id, created_at);

-- Update jake_bucks_transactions to support loyalty system
-- (table already exists from schema.sql, just add index)
CREATE INDEX IF NOT EXISTS idx_jake_bucks_reference ON jake_bucks_transactions(reference_type, reference_id);

-- Add redemption catalog table
CREATE TABLE IF NOT EXISTS loyalty_redemptions (
  id VARCHAR(50) PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cost INTEGER NOT NULL CHECK (cost > 0),
  value_usd DECIMAL(10,2) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'discount', 'perk', 'feature', 'service', 'item'
  tier_requirement VARCHAR(20), -- null = all tiers, or 'wrangler', 'sheriff'
  active BOOLEAN DEFAULT true,
  max_redemptions_per_user INTEGER, -- null = unlimited
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add user redemption history
CREATE TABLE IF NOT EXISTS loyalty_redemption_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  redemption_id VARCHAR(50) REFERENCES loyalty_redemptions(id),
  cost INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'completed', -- 'completed', 'applied', 'expired', 'refunded'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_redemption_history_user ON loyalty_redemption_history(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_redemption_history_status ON loyalty_redemption_history(status, created_at);

-- Insert default redemption catalog
INSERT INTO loyalty_redemptions (id, name, description, cost, value_usd, type, tier_requirement, active) VALUES
  ('discount_5', '$5 Off Next Purchase', 'Get $5 off your next purchase when you buy from Jake''s inventory', 500, 5.00, 'discount', NULL, true),
  ('free_shipping', 'Free Shipping', 'Free shipping label for your next item submission', 1000, 8.00, 'perk', NULL, true),
  ('listing_boost', '24-Hour Listing Boost', 'Your item appears at the top of Jake''s featured items for 24 hours', 2000, 10.00, 'feature', 'wrangler', true),
  ('jake_appraisal', 'Jake Personal Appraisal', 'Get a detailed personal appraisal video from Jake for a high-value item', 5000, 25.00, 'service', 'wrangler', true),
  ('mystery_box', 'Mystery Box', 'Receive a surprise item from Jake''s warehouse (valued at $50+)', 10000, 50.00, 'item', 'sheriff', true)
ON CONFLICT (id) DO NOTHING;

-- Add loyalty configuration to config table
INSERT INTO config (key, value) VALUES
('loyalty_tiers', '{
  "prospector": {
    "min_items_sold": 0,
    "min_sales_value": 0,
    "earn_multiplier": 1.0,
    "benefits": ["30-day price lock", "Standard shipping"],
    "badge_color": "#CD7F32"
  },
  "wrangler": {
    "min_items_sold": 10,
    "min_sales_value": 0,
    "earn_multiplier": 1.5,
    "benefits": ["Free shipping", "Early access (24hr)", "Jake video message", "Listing boost access"],
    "badge_color": "#C0C0C0"
  },
  "sheriff": {
    "min_items_sold": 50,
    "min_sales_value": 5000,
    "earn_multiplier": 2.0,
    "benefits": ["Priority support", "Exclusive deals", "Custom Jake voicemail", "Mystery box access"],
    "badge_color": "#FFD700"
  }
}'),
('jake_bucks_rules', '{
  "base_earn_per_dollar": 10,
  "value_per_buck": 0.01,
  "daily_earn_cap": 500,
  "min_offer_for_bucks": 5,
  "inflation_threshold": 1.1,
  "monthly_audit_enabled": true
}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- Add trigger to update users.updated_at on loyalty changes
CREATE OR REPLACE FUNCTION update_user_loyalty_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.loyalty_tier IS DISTINCT FROM OLD.loyalty_tier) OR
     (NEW.total_items_sold IS DISTINCT FROM OLD.total_items_sold) OR
     (NEW.total_sales_value IS DISTINCT FROM OLD.total_sales_value) OR
     (NEW.jake_bucks_balance IS DISTINCT FROM OLD.jake_bucks_balance) THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER loyalty_update_timestamp
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_loyalty_timestamp();
