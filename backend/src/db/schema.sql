-- JakeBuysIt Database Schema
-- PostgreSQL 16+

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  name TEXT,
  auth_provider TEXT, -- 'email', 'google', 'apple'
  auth_provider_id TEXT,
  password_hash TEXT, -- null if OAuth
  verified BOOLEAN DEFAULT false,
  trust_score FLOAT DEFAULT 50, -- 0-100
  risk_flags JSONB DEFAULT '[]',
  role TEXT DEFAULT 'user', -- 'user', 'admin', 'super_admin', 'reviewer', 'warehouse'
  banned BOOLEAN DEFAULT false,
  ban_reason TEXT,
  payout_preferred TEXT, -- 'paypal', 'venmo', 'zelle', 'bank', 'jake_bucks'
  payout_details_encrypted TEXT, -- tokenized
  jake_bucks_balance DECIMAL(10,2) DEFAULT 0,
  jake_familiarity TEXT DEFAULT 'new', -- 'new', 'returning', 'regular', 'vip'
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth_provider ON users(auth_provider, auth_provider_id);

-- Offers
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  status TEXT NOT NULL, -- 'processing', 'ready', 'accepted', 'declined', 'expired', 'shipped', 'received', 'verified', 'paid', 'disputed', 'rejected', 'cancelled'

  -- Item identification
  item_category TEXT,
  item_subcategory TEXT,
  item_brand TEXT,
  item_model TEXT,
  item_condition TEXT, -- 'New', 'Like New', 'Good', 'Fair', 'Poor'
  item_features JSONB,
  item_damage JSONB,
  photos JSONB NOT NULL, -- [{ url, thumbnail_url, uploaded_at }]
  user_description TEXT,

  -- AI analysis
  ai_identification JSONB, -- full vision output
  ai_confidence FLOAT,
  ai_model_used TEXT,

  -- Marketplace data
  market_data JSONB, -- { ebay: {...}, amazon: {...}, ... }
  fmv DECIMAL(10,2), -- fair market value
  fmv_confidence FLOAT,

  -- Pricing
  condition_multiplier FLOAT,
  category_margin FLOAT,
  dynamic_adjustments JSONB, -- { velocity: 1.05, inventory: 0.95, ... }
  offer_amount DECIMAL(10,2) NOT NULL,
  offer_to_market_ratio FLOAT,

  -- Jake personality
  jake_voice_url TEXT,
  jake_script TEXT,
  jake_animation_state TEXT,
  jake_tier INTEGER, -- 1, 2, or 3

  -- Escalation
  escalated BOOLEAN DEFAULT false,
  escalation_reason TEXT,
  escalation_notes JSONB,
  reviewer_id UUID,
  reviewed_at TIMESTAMPTZ,

  -- Expiry
  expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

CREATE INDEX idx_offers_user_status ON offers(user_id, status);
CREATE INDEX idx_offers_status_created ON offers(status, created_at);
CREATE INDEX idx_offers_escalated ON offers(escalated, created_at);

-- Shipments
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES offers(id),
  user_id UUID REFERENCES users(id),

  -- Shipping details
  carrier TEXT DEFAULT 'USPS',
  service TEXT, -- 'Priority', 'First Class', etc.
  tracking_number TEXT UNIQUE,
  label_url TEXT,
  label_cost DECIMAL(10,2),

  -- Address
  address JSONB NOT NULL, -- { name, street, city, state, zip }

  -- Status
  status TEXT, -- 'label_created', 'in_transit', 'delivered', 'exception'
  status_history JSONB DEFAULT '[]',

  -- Tracking
  estimated_delivery TIMESTAMPTZ,
  actual_delivery TIMESTAMPTZ,
  last_tracking_update TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX idx_shipments_status ON shipments(status, estimated_delivery);

-- Verifications (at warehouse)
CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES offers(id),
  shipment_id UUID REFERENCES shipments(id),

  -- Verification
  verified_by UUID, -- staff member
  condition_match BOOLEAN,
  condition_actual TEXT,
  photos_at_receipt JSONB,
  weight_submitted FLOAT,
  weight_actual FLOAT,
  serial_number TEXT,

  -- Outcome
  approved BOOLEAN,
  revised_offer DECIMAL(10,2),
  revision_reason TEXT,
  notes TEXT,

  verified_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_verifications_offer ON verifications(offer_id);

-- Payouts
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  offer_id UUID REFERENCES offers(id),

  -- Amount
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',

  -- Method
  method TEXT NOT NULL, -- 'paypal', 'venmo', 'zelle', 'bank', 'jake_bucks'
  method_details JSONB, -- { email, phone, account_number (tokenized) }

  -- Status
  status TEXT, -- 'pending', 'processing', 'completed', 'failed'
  transaction_ref TEXT, -- external ID from payment provider
  failure_reason TEXT,

  -- Fees
  fee DECIMAL(10,2),
  net_amount DECIMAL(10,2),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_payouts_user_status ON payouts(user_id, status);
CREATE INDEX idx_payouts_status_created ON payouts(status, created_at);

-- Jake Bucks Transactions
CREATE TABLE jake_bucks_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),

  type TEXT, -- 'earned', 'redeemed', 'expired', 'bonus'
  amount DECIMAL(10,2),
  balance_after DECIMAL(10,2),

  -- Reference
  reference_type TEXT, -- 'offer', 'bonus', 'redemption'
  reference_id UUID,
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jake_bucks_user ON jake_bucks_transactions(user_id, created_at);

-- Fraud Detection
CREATE TABLE fraud_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  offer_id UUID REFERENCES offers(id),

  -- Checks
  check_type TEXT, -- 'stock_photo', 'reverse_image', 'device_fingerprint', etc.
  result TEXT, -- 'pass', 'flag', 'fail'
  confidence FLOAT,
  details JSONB,

  -- Action
  action_taken TEXT, -- 'none', 'flag', 'escalate', 'reject'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fraud_checks_user ON fraud_checks(user_id);
CREATE INDEX idx_fraud_checks_offer ON fraud_checks(offer_id);

-- Audit Log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Entity
  entity_type TEXT, -- 'offer', 'user', 'payout', etc.
  entity_id UUID,

  -- Action
  action TEXT, -- 'created', 'updated', 'deleted', 'state_change'
  actor_type TEXT, -- 'user', 'admin', 'system'
  actor_id UUID,

  -- Changes
  before JSONB,
  after JSONB,

  -- Context
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- Configuration
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config
INSERT INTO config (key, value) VALUES
('pricing_rules', '{
  "category_margins": {
    "Consumer Electronics": 0.60,
    "Gaming": 0.60,
    "Phones & Tablets": 0.65,
    "Clothing & Fashion": 0.45,
    "Collectibles & Vintage": 0.50,
    "Books & Media": 0.35,
    "Small Appliances": 0.50,
    "Tools & Equipment": 0.55
  },
  "condition_multipliers": {
    "New": 1.0,
    "Like New": 0.925,
    "Good": 0.80,
    "Fair": 0.625,
    "Poor": 0.40
  },
  "min_offer": 5,
  "max_offer_by_category": {
    "Consumer Electronics": 2000,
    "Phones & Tablets": 1500,
    "Collectibles & Vintage": 5000
  },
  "daily_spending_limit": 10000,
  "offer_expiry_hours": 24
}'),
('confidence_thresholds', '{
  "auto_price_threshold": 80,
  "flag_threshold": 60,
  "auto_escalate_threshold": 60,
  "high_value_escalate_above": 500
}'),
('fraud_settings', '{
  "stock_photo_threshold": 0.80,
  "reverse_image_match_threshold": 0.75,
  "user_velocity_max_per_day": 10,
  "new_account_max_offer": 100,
  "new_account_days": 30,
  "high_value_id_required_above": 200
}');

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON shipments
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
