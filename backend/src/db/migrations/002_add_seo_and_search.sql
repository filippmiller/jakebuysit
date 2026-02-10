-- Migration: Add SEO and Full-Text Search Support
-- Created: 2026-02-10
-- Purpose: Enable SEO optimization and enhanced search capabilities

-- Enable pg_trgm extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add seo_title column to offers table
ALTER TABLE offers
ADD COLUMN seo_title TEXT;

-- Create full-text search index on searchable fields
CREATE INDEX idx_offers_fulltext_search ON offers
USING GIN(
  to_tsvector('english',
    COALESCE(item_brand, '') || ' ' ||
    COALESCE(item_model, '') || ' ' ||
    COALESCE(item_category, '') || ' ' ||
    COALESCE(item_subcategory, '') || ' ' ||
    COALESCE(user_description, '')
  )
);

-- Create trigram index for fuzzy search on brand and model
CREATE INDEX idx_offers_brand_trgm ON offers USING GIN(item_brand gin_trgm_ops);
CREATE INDEX idx_offers_model_trgm ON offers USING GIN(item_model gin_trgm_ops);

-- Create index for SEO title
CREATE INDEX idx_offers_seo_title ON offers(seo_title) WHERE seo_title IS NOT NULL;

-- Add comment to document the purpose
COMMENT ON COLUMN offers.seo_title IS 'AI-generated SEO-optimized title for search engines (60-70 chars)';
