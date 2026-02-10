-- Migration: Ensure 30-day price lock expiry is enforced
-- Phase 2, Task 2: 30-Day Price Lock Backend
-- Date: 2026-02-11

-- Add index for efficient expiry queries (if not exists)
CREATE INDEX IF NOT EXISTS idx_offers_expires_at ON offers(expires_at);

-- Backfill existing offers with null expires_at (set to 30 days from creation)
UPDATE offers
SET expires_at = created_at + INTERVAL '30 days'
WHERE expires_at IS NULL;

-- Add check constraint to ensure expires_at is always set for new offers
-- (Postgres will ignore if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'offers_expires_at_not_null'
  ) THEN
    ALTER TABLE offers
    ADD CONSTRAINT offers_expires_at_not_null CHECK (expires_at IS NOT NULL);
  END IF;
END$$;

-- Add comment for documentation
COMMENT ON COLUMN offers.expires_at IS 'Phase 2: 30-day price lock — offer expires if not accepted within 30 days';
