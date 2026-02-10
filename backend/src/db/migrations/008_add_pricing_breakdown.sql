-- Migration: Add pricing_breakdown field for transparent pricing explanations
-- Phase 2, Task 3: Transparent Pricing Breakdown
-- Date: 2026-02-11

-- Add pricing breakdown JSONB field to offers table
ALTER TABLE offers
ADD COLUMN IF NOT EXISTS pricing_breakdown JSONB DEFAULT NULL;

-- Create index for querying offers with pricing breakdowns
CREATE INDEX IF NOT EXISTS idx_offers_pricing_breakdown
ON offers USING GIN (pricing_breakdown)
WHERE pricing_breakdown IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN offers.pricing_breakdown IS 'Phase 2: Transparent pricing breakdown showing base value, condition adjustment, category margin, and final offer calculation';
