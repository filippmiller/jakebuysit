-- Migration: Add confidence explanation field
-- Date: 2026-02-10
-- Purpose: Store pricing confidence explanation text

BEGIN;

-- Add confidence explanation column (from pricing confidence_factors)
ALTER TABLE offers ADD COLUMN confidence_explanation TEXT;

COMMIT;
