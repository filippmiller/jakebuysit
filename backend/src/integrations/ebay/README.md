# eBay Integration Module

OAuth 2.0 integration for crossposting JakeBuysIt offers to eBay marketplace.

## Architecture

```
┌─────────────────┐
│   User Flow     │
└────────┬────────┘
         │
         v
┌─────────────────────────────────────────────┐
│  Settings Page (/settings/integrations)    │
│  - Connect/disconnect eBay                  │
│  - Toggle auto-crosspost                    │
└────────┬────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────┐
│  Backend: /api/v1/integrations/ebay/*       │
│  - auth.ts: OAuth flow handlers             │
│  - client.ts: eBay API wrapper              │
│  - types.ts: TypeScript interfaces          │
└────────┬────────────────────────────────────┘
         │
         v
┌─────────────────────────────────────────────┐
│  eBay Trading API                           │
│  - AddFixedPriceItem (create listing)       │
│  - Token refresh via OAuth                  │
└─────────────────────────────────────────────┘
```

## Files

### `auth.ts`
OAuth 2.0 flow implementation:
- `getAuthorizationUrl()` - Generate eBay OAuth URL
- `exchangeCodeForToken()` - Exchange auth code for tokens
- `refreshAccessToken()` - Refresh expired tokens
- `getEbayUserInfo()` - Fetch eBay user details
- `needsTokenRefresh()` - Check if token needs refresh

### `client.ts`
eBay Trading API wrapper:
- `createEbayListing()` - Create fixed-price listing
- XML request/response builders
- Fee calculation
- Error handling

### `types.ts`
TypeScript interfaces for eBay API:
- `EbayOAuthTokenResponse` - OAuth token structure
- `EbayListingRequest` - Listing creation payload
- `EbayListingResponse` - API response structure
- `EBAY_CONDITION_MAP` - Condition to eBay ID mapping
- `EBAY_CATEGORY_MAP` - Category to eBay ID mapping

## OAuth Flow

```
1. User clicks "Connect eBay" in settings
   ↓
2. Backend generates authorization URL with state
   GET /api/v1/integrations/ebay/authorize
   ↓
3. User redirected to eBay to grant permissions
   ↓
4. eBay redirects back with auth code
   GET /api/v1/integrations/ebay/callback?code=XXX&state=YYY
   ↓
5. Backend exchanges code for access/refresh tokens
   ↓
6. Tokens stored in database (encrypted)
   ↓
7. User redirected to settings with success message
```

## Crossposting Flow

```
1. User accepts an offer
   ↓
2. User clicks "Crosspost to eBay" button
   POST /api/v1/integrations/ebay/crosspost/:offerId
   ↓
3. Backend checks eBay account connection
   ↓
4. Backend refreshes token if needed
   ↓
5. Backend builds eBay listing from offer data
   - Title: brand + model
   - Description: Jake's script
   - Photos: all offer photos
   - Price: offer amount
   - Condition: mapped to eBay condition ID
   ↓
6. Backend calls eBay AddFixedPriceItem API
   ↓
7. eBay returns listing ID and URL
   ↓
8. Backend updates offer with eBay listing data
   ↓
9. User sees success message with listing link
```

## Token Management

Tokens are automatically refreshed before expiry:

```typescript
if (needsTokenRefresh(expiresAt)) {
  const newTokens = await refreshAccessToken(refreshToken);
  await db.update('ebay_accounts', accountId, {
    access_token: newTokens.access_token,
    refresh_token: newTokens.refresh_token,
    token_expires_at: new Date(Date.now() + newTokens.expires_in * 1000),
  });
}
```

Refresh happens 5 minutes before expiry to prevent race conditions.

## Category Mapping

JakeBuysIt categories are mapped to eBay category IDs:

| JakeBuysIt Category      | eBay Category ID | eBay Category Name     |
|--------------------------|------------------|------------------------|
| Consumer Electronics     | 293              | Consumer Electronics   |
| Gaming                   | 1249             | Video Games            |
| Phones & Tablets         | 15032            | Cell Phones & Smart... |
| Clothing & Fashion       | 11450            | Clothing, Shoes & A... |
| Collectibles & Vintage   | 1                | Collectibles           |
| Books & Media            | 267              | Books                  |
| Small Appliances         | 20710            | Small Kitchen Applian..|
| Tools & Equipment        | 631              | Hand Tools             |

**Note**: In production, use eBay's `GetSuggestedCategories` API for dynamic category suggestions.

## Condition Mapping

| JakeBuysIt Condition | eBay Condition ID | eBay Condition Name |
|----------------------|-------------------|---------------------|
| New                  | 1000              | Brand New           |
| Like New             | 1500              | New other           |
| Good                 | 3000              | Used                |
| Fair                 | 4000              | Very Good           |
| Poor                 | 5000              | Acceptable          |

## Error Handling

eBay API errors are captured and stored in `offers.ebay_crosspost_error`:

```typescript
try {
  const { itemId, listingUrl } = await createEbayListing(...);
  await db.update('offers', offerId, {
    ebay_listing_id: itemId,
    ebay_listing_url: listingUrl,
    ebay_crosspost_status: 'success',
  });
} catch (err) {
  await db.update('offers', offerId, {
    ebay_crosspost_status: 'failed',
    ebay_crosspost_error: err.message,
  });
  throw err;
}
```

Common errors:
- **Token expired**: Auto-refreshed before API calls
- **Invalid category**: Check category mapping
- **Photo URL not accessible**: Ensure photos are public
- **PayPal email missing**: Set `EBAY_PAYPAL_EMAIL` env var
- **Rate limit exceeded**: eBay allows 5000 calls/day

## Rate Limits

eBay API rate limits:
- **Sandbox**: 5000 calls/day
- **Production**: Varies by seller tier (5000-10000/day)

Rate limit tracking should be implemented in production:

```typescript
const dailyCallsKey = cache.keys.rateLimitUser(userId, 'ebay-daily');
const callCount = await cache.incrementWithExpiry(dailyCallsKey, 86400);
if (callCount > 5000) {
  throw new Error('eBay daily rate limit exceeded');
}
```

## Testing

### Unit Tests (TODO)

```typescript
// auth.test.ts
describe('eBay OAuth', () => {
  test('generates valid authorization URL', () => {
    const url = getAuthorizationUrl('test-state');
    expect(url).toContain('client_id=');
    expect(url).toContain('redirect_uri=');
  });

  test('exchanges code for token', async () => {
    // Mock fetch
    const token = await exchangeCodeForToken('test-code');
    expect(token.access_token).toBeDefined();
  });
});

// client.test.ts
describe('eBay Listing Creation', () => {
  test('creates listing with valid data', async () => {
    const result = await createEbayListing('token', {
      title: 'Test Item',
      description: 'Description',
      category: 'Consumer Electronics',
      condition: 'Good',
      price: 100,
      imageUrls: ['https://example.com/photo.jpg'],
    });
    expect(result.itemId).toBeDefined();
  });
});
```

### Integration Tests

1. **Sandbox Testing**: Use eBay sandbox environment
2. **End-to-End**: Test full OAuth flow and listing creation
3. **Token Refresh**: Test token expiry and refresh

## Security

1. **Token Storage**: Tokens stored in database (consider encryption)
2. **State Parameter**: CSRF protection via state parameter
3. **HTTPS Only**: Production OAuth callbacks must use HTTPS
4. **Scope Minimization**: Only request necessary scopes
5. **Token Expiry**: Auto-refresh prevents token leakage

### Recommended: Token Encryption

For production, encrypt tokens at rest:

```sql
-- Add encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt before storing
UPDATE ebay_accounts SET
  access_token = pgp_sym_encrypt(access_token, 'encryption-key'),
  refresh_token = pgp_sym_encrypt(refresh_token, 'encryption-key');

-- Decrypt when reading
SELECT
  pgp_sym_decrypt(access_token::bytea, 'encryption-key') as access_token
FROM ebay_accounts;
```

## Future Enhancements

1. **Inventory Sync**: Sync eBay sales back to JakeBuysIt
2. **Bulk Crosspost**: Crosspost multiple offers at once
3. **Repricing**: Auto-adjust eBay prices based on market data
4. **Analytics**: Track eBay listing performance
5. **Multi-Account**: Support multiple eBay accounts per user
6. **Auto-End Listings**: End eBay listings when items sell on JakeBuysIt
7. **Promoted Listings**: Support eBay's promoted listings feature

## References

- [eBay OAuth Documentation](https://developer.ebay.com/api-docs/static/oauth-tokens.html)
- [eBay Trading API](https://developer.ebay.com/devzone/xml/docs/reference/ebay/index.html)
- [AddFixedPriceItem API](https://developer.ebay.com/devzone/xml/docs/reference/ebay/AddFixedPriceItem.html)
- [eBay Condition IDs](https://developer.ebay.com/devzone/finding/callref/enums/conditionIdList.html)
