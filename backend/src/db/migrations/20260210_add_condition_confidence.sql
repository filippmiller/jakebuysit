-- Migration: Add condition and confidence tracking to offers
-- Date: 2026-02-10
-- Purpose: Support competitive features - condition assessment and pricing confidence

BEGIN;

-- Add condition grade column
-- Values: 'Excellent', 'Good', 'Fair', 'Poor'
ALTER TABLE offers ADD COLUMN condition_grade VARCHAR(20);

-- Add condition notes (detailed defect descriptions)
ALTER TABLE offers ADD COLUMN condition_notes TEXT;

-- Add pricing confidence score (0-100)
ALTER TABLE offers ADD COLUMN pricing_confidence INTEGER CHECK (pricing_confidence >= 0 AND pricing_confidence <= 100);

-- Add comparable sales data (JSONB array of comparison objects)
-- Structure: [{ source: 'eBay', price: 299.99, date: '2026-02-05', url: '...', title: '...' }]
ALTER TABLE offers ADD COLUMN comparable_sales JSONB DEFAULT '[]'::jsonb;

-- Add index for condition grade queries
CREATE INDEX idx_offers_condition_grade ON offers(condition_grade) WHERE condition_grade IS NOT NULL;

-- Add index for confidence-based filtering
CREATE INDEX idx_offers_pricing_confidence ON offers(pricing_confidence) WHERE pricing_confidence IS NOT NULL;

COMMIT;
