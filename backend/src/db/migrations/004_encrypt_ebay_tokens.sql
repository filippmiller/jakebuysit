-- Migration: Encrypt eBay OAuth tokens
-- Adds pgcrypto extension and encrypts sensitive OAuth tokens

-- Enable pgcrypto extension for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted columns
ALTER TABLE ebay_accounts
  ADD COLUMN access_token_encrypted BYTEA,
  ADD COLUMN refresh_token_encrypted BYTEA;

-- Migrate existing plaintext tokens to encrypted columns
-- Uses encryption key from environment variable (set in production)
UPDATE ebay_accounts
SET
  access_token_encrypted = pgp_sym_encrypt(access_token, current_setting('app.encryption_key', true)),
  refresh_token_encrypted = pgp_sym_encrypt(refresh_token, current_setting('app.encryption_key', true))
WHERE access_token IS NOT NULL;

-- After migration, drop plaintext columns
-- IMPORTANT: Run this in separate migration after verifying encrypted tokens work
-- ALTER TABLE ebay_accounts DROP COLUMN access_token;
-- ALTER TABLE ebay_accounts DROP COLUMN refresh_token;

-- For now, keep both columns during transition period
-- Mark plaintext columns as deprecated
COMMENT ON COLUMN ebay_accounts.access_token IS 'DEPRECATED: Use access_token_encrypted instead';
COMMENT ON COLUMN ebay_accounts.refresh_token IS 'DEPRECATED: Use refresh_token_encrypted instead';

-- Add constraint to ensure at least one token format exists
ALTER TABLE ebay_accounts
  ADD CONSTRAINT check_token_exists CHECK (
    (access_token IS NOT NULL AND refresh_token IS NOT NULL) OR
    (access_token_encrypted IS NOT NULL AND refresh_token_encrypted IS NOT NULL)
  );
