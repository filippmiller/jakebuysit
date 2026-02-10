/**
 * eBay OAuth 2.0 Integration
 * Handles authorization flow, token refresh, and token management
 */
import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import { EbayOAuthTokenResponse, EbayUserInfo } from './types.js';

const EBAY_OAUTH_BASE = config.ebay.sandbox
  ? 'https://auth.sandbox.ebay.com/oauth2'
  : 'https://auth.ebay.com/oauth2';

const EBAY_API_BASE = config.ebay.sandbox
  ? 'https://api.sandbox.ebay.com'
  : 'https://api.ebay.com';

/**
 * Generate eBay OAuth authorization URL
 * User will be redirected here to grant permission
 */
export function getAuthorizationUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: config.ebay.clientId,
    redirect_uri: config.ebay.redirectUri,
    response_type: 'code',
    scope: 'https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account',
    state: state || '',
  });

  return `${EBAY_OAUTH_BASE}/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access/refresh tokens
 */
export async function exchangeCodeForToken(code: string): Promise<EbayOAuthTokenResponse> {
  const credentials = Buffer.from(`${config.ebay.clientId}:${config.ebay.clientSecret}`).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.ebay.redirectUri,
  });

  try {
    const res = await fetch(`${EBAY_OAUTH_BASE}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`eBay OAuth token exchange failed: ${res.status} ${errorText}`);
    }

    const tokenData = await res.json() as EbayOAuthTokenResponse;
    logger.info('eBay OAuth token exchange successful');
    return tokenData;
  } catch (err: any) {
    logger.error({ error: err.message }, 'eBay OAuth token exchange error');
    throw err;
  }
}

/**
 * Refresh an expired access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<EbayOAuthTokenResponse> {
  const credentials = Buffer.from(`${config.ebay.clientId}:${config.ebay.clientSecret}`).toString('base64');

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    scope: 'https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account',
  });

  try {
    const res = await fetch(`${EBAY_OAUTH_BASE}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${credentials}`,
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`eBay token refresh failed: ${res.status} ${errorText}`);
    }

    const tokenData = await res.json() as EbayOAuthTokenResponse;
    logger.info('eBay access token refreshed');
    return tokenData;
  } catch (err: any) {
    logger.error({ error: err.message }, 'eBay token refresh error');
    throw err;
  }
}

/**
 * Get eBay user information
 */
export async function getEbayUserInfo(accessToken: string): Promise<EbayUserInfo> {
  try {
    const res = await fetch(`${EBAY_API_BASE}/commerce/identity/v1/user`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Failed to get eBay user info: ${res.status} ${errorText}`);
    }

    const userData = await res.json() as { userId: string; username: string };
    return {
      userId: userData.userId,
      username: userData.username,
    };
  } catch (err: any) {
    logger.error({ error: err.message }, 'eBay user info fetch error');
    throw err;
  }
}

/**
 * Check if token needs refresh (refresh 5 minutes before expiry)
 */
export function needsTokenRefresh(expiresAt: Date): boolean {
  const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
  return expiresAt < fiveMinutesFromNow;
}
