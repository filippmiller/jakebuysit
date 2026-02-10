-- eBay Integration Migration
-- Adds eBay account connection and crossposting support

-- eBay Accounts table
CREATE TABLE ebay_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- eBay OAuth tokens (encrypted)
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,

  -- eBay user info
  ebay_user_id TEXT NOT NULL,
  ebay_username TEXT,

  -- Settings
  auto_crosspost BOOLEAN DEFAULT false,

  -- Status
  connected BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- One eBay account per user
  CONSTRAINT unique_user_ebay UNIQUE(user_id)
);

CREATE INDEX idx_ebay_accounts_user ON ebay_accounts(user_id);
CREATE INDEX idx_ebay_accounts_expires ON ebay_accounts(token_expires_at) WHERE connected = true;

-- Add eBay listing tracking to offers
ALTER TABLE offers
ADD COLUMN ebay_listing_id TEXT,
ADD COLUMN ebay_listing_url TEXT,
ADD COLUMN ebay_crosspost_status TEXT, -- 'pending', 'success', 'failed', null
ADD COLUMN ebay_crosspost_error TEXT,
ADD COLUMN ebay_crossposted_at TIMESTAMPTZ;

CREATE INDEX idx_offers_ebay_listing ON offers(ebay_listing_id) WHERE ebay_listing_id IS NOT NULL;

-- Trigger for updated_at on ebay_accounts
CREATE TRIGGER update_ebay_accounts_updated_at BEFORE UPDATE ON ebay_accounts
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
