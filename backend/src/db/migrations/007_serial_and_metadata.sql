-- Migration: Add serial number and product metadata to offers
-- Date: 2026-02-10

-- Add serial_number column for OCR-extracted serials
ALTER TABLE offers
ADD COLUMN serial_number TEXT;

-- Add product_metadata for granular product taxonomy
ALTER TABLE offers
ADD COLUMN product_metadata JSONB DEFAULT '{}'::jsonb;

-- Add indexes for search and filtering
CREATE INDEX idx_offers_serial_number ON offers(serial_number) WHERE serial_number IS NOT NULL;
CREATE INDEX idx_offers_product_metadata_brand ON offers((product_metadata->>'brand')) WHERE product_metadata->>'brand' IS NOT NULL;
CREATE INDEX idx_offers_product_metadata_model ON offers((product_metadata->>'model')) WHERE product_metadata->>'model' IS NOT NULL;

-- Add GIN index for full JSONB search
CREATE INDEX idx_offers_product_metadata_gin ON offers USING GIN (product_metadata);

COMMENT ON COLUMN offers.serial_number IS 'OCR-extracted serial number (IMEI, device serial, etc.)';
COMMENT ON COLUMN offers.product_metadata IS 'Granular product taxonomy: { brand, model, variant, storage, color, year, generation }';
