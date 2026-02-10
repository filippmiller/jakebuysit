-- Add confidence_explanation field to offers table
-- This stores the human-readable explanation of pricing confidence factors
ALTER TABLE offers ADD COLUMN IF NOT EXISTS confidence_explanation TEXT;

-- Add comment for documentation
COMMENT ON COLUMN offers.confidence_explanation IS 'Human-readable explanation of pricing confidence factors (data points, recency, variance, category)';
