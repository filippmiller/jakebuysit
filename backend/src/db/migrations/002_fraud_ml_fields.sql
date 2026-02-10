-- Migration: Add ML-based fraud detection fields
-- Created: 2026-02-10

-- Add new columns to fraud_checks for ML-based analysis
ALTER TABLE fraud_checks
  ADD COLUMN IF NOT EXISTS risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  ADD COLUMN IF NOT EXISTS risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  ADD COLUMN IF NOT EXISTS flags JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS breakdown JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS explanation TEXT,
  ADD COLUMN IF NOT EXISTS recommended_action TEXT CHECK (recommended_action IN ('approve', 'review', 'escalate', 'reject'));

-- Update existing check_type to support 'ml_analysis'
COMMENT ON COLUMN fraud_checks.check_type IS 'Type of fraud check: stock_photo, reverse_image, device_fingerprint, ml_analysis';

-- Add index for risk_score queries
CREATE INDEX IF NOT EXISTS idx_fraud_checks_risk_score ON fraud_checks(risk_score) WHERE risk_score IS NOT NULL;

-- Add index for recommended_action
CREATE INDEX IF NOT EXISTS idx_fraud_checks_recommended_action ON fraud_checks(recommended_action) WHERE recommended_action IS NOT NULL;
