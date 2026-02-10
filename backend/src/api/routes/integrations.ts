/**
 * Integrations API Routes
 * Handles third-party service integrations (eBay, etc.)
 */
import { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { requireAuth } from '../middleware/auth.js';
import { logger } from '../../utils/logger.js';
import { encrypt, decrypt } from '../../utils/encryption.js';
import {
  getAuthorizationUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getEbayUserInfo,
  needsTokenRefresh,
} from '../../integrations/ebay/auth.js';
import { createEbayListing } from '../../integrations/ebay/client.js';
import { z } from 'zod';

const ebayCallbackSchema = z.object({
  code: z.string(),
  state: z.string().optional(),
});

const crosspostSchema = z.object({
  offerId: z.string().uuid(),
});

export async function integrationRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/integrations/ebay/authorize
   * Initiates eBay OAuth flow
   */
  fastify.get('/ebay/authorize', { preHandler: requireAuth }, async (request, reply) => {
    const userId = (request as any).userId;

    // Generate state parameter for CSRF protection
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');

    const authUrl = getAuthorizationUrl(state);

    logger.info({ userId, authUrl }, 'eBay OAuth authorization initiated');

    return reply.send({
      authUrl,
      message: 'Redirect user to authUrl to complete eBay authorization',
    });
  });

  /**
   * GET /api/v1/integrations/ebay/callback
   * Handles eBay OAuth callback
   */
  fastify.get('/ebay/callback', async (request, reply) => {
    const { code, state } = request.query as { code?: string; state?: string };

    if (!code) {
      return reply.status(400).send({ error: 'Missing authorization code' });
    }

    try {
      // Decode state to get userId
      const stateData = state ? JSON.parse(Buffer.from(state, 'base64').toString()) : null;
      const userId = stateData?.userId;

      if (!userId) {
        return reply.status(400).send({ error: 'Invalid state parameter' });
      }

      // Exchange code for tokens
      const tokenData = await exchangeCodeForToken(code);

      // Get eBay user info
      const userInfo = await getEbayUserInfo(tokenData.access_token);

      // Calculate token expiry
      const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

      // Encrypt tokens before storage
      const encryptedAccessToken = await encrypt(tokenData.access_token);
      const encryptedRefreshToken = await encrypt(tokenData.refresh_token);

      // Store/update eBay account in database
      const existingAccount = await db.findOne('ebay_accounts', { user_id: userId });

      if (existingAccount) {
        await db.update('ebay_accounts', existingAccount.id, {
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: expiresAt,
          ebay_user_id: userInfo.userId,
          ebay_username: userInfo.username,
          connected: true,
          last_sync_at: new Date(),
        });
      } else {
        await db.create('ebay_accounts', {
          user_id: userId,
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: expiresAt,
          ebay_user_id: userInfo.userId,
          ebay_username: userInfo.username,
          auto_crosspost: false,
          connected: true,
        });
      }

      logger.info({ userId, ebayUserId: userInfo.userId }, 'eBay account connected successfully');

      // Redirect to settings page with success message
      return reply.redirect('/settings/integrations?ebay=connected');
    } catch (err: any) {
      logger.error({ error: err.message }, 'eBay OAuth callback error');
      return reply.redirect('/settings/integrations?ebay=error');
    }
  });

  /**
   * POST /api/v1/integrations/ebay/disconnect
   * Disconnects eBay account
   */
  fastify.post('/ebay/disconnect', { preHandler: requireAuth }, async (request, reply) => {
    const userId = (request as any).userId;

    try {
      const ebayAccount = await db.findOne('ebay_accounts', { user_id: userId });

      if (!ebayAccount) {
        return reply.status(404).send({ error: 'No eBay account connected' });
      }

      // Mark as disconnected (keep record for audit trail)
      await db.update('ebay_accounts', ebayAccount.id, {
        connected: false,
        auto_crosspost: false,
      });

      logger.info({ userId, ebayAccountId: ebayAccount.id }, 'eBay account disconnected');

      return reply.send({
        success: true,
        message: 'eBay account disconnected successfully',
      });
    } catch (err: any) {
      logger.error({ error: err.message }, 'eBay disconnect error');
      return reply.status(500).send({ error: 'Failed to disconnect eBay account' });
    }
  });

  /**
   * GET /api/v1/integrations/ebay/status
   * Get eBay connection status
   */
  fastify.get('/ebay/status', { preHandler: requireAuth }, async (request, reply) => {
    const userId = (request as any).userId;

    try {
      const ebayAccount = await db.findOne('ebay_accounts', { user_id: userId, connected: true });

      if (!ebayAccount) {
        return reply.send({
          connected: false,
        });
      }

      return reply.send({
        connected: true,
        ebayUsername: ebayAccount.ebay_username,
        autoCrosspost: ebayAccount.auto_crosspost,
        lastSyncAt: ebayAccount.last_sync_at,
      });
    } catch (err: any) {
      logger.error({ error: err.message }, 'eBay status check error');
      return reply.status(500).send({ error: 'Failed to check eBay status' });
    }
  });

  /**
   * POST /api/v1/integrations/ebay/auto-crosspost
   * Toggle auto-crosspost setting
   */
  fastify.post('/ebay/auto-crosspost', { preHandler: requireAuth }, async (request, reply) => {
    const userId = (request as any).userId;
    const { enabled } = request.body as { enabled: boolean };

    try {
      const ebayAccount = await db.findOne('ebay_accounts', { user_id: userId, connected: true });

      if (!ebayAccount) {
        return reply.status(404).send({ error: 'No eBay account connected' });
      }

      await db.update('ebay_accounts', ebayAccount.id, {
        auto_crosspost: enabled,
      });

      logger.info({ userId, enabled }, 'eBay auto-crosspost setting updated');

      return reply.send({
        success: true,
        autoCrosspost: enabled,
      });
    } catch (err: any) {
      logger.error({ error: err.message }, 'eBay auto-crosspost update error');
      return reply.status(500).send({ error: 'Failed to update auto-crosspost setting' });
    }
  });

  /**
   * POST /api/v1/integrations/ebay/crosspost/:offerId
   * Crosspost an accepted offer to eBay
   */
  fastify.post('/ebay/crosspost/:offerId', { preHandler: requireAuth }, async (request, reply) => {
    const userId = (request as any).userId;
    const { offerId } = request.params as { offerId: string };

    try {
      // Verify offer exists and belongs to user
      const offer = await db.findOne('offers', { id: offerId, user_id: userId });

      if (!offer) {
        return reply.status(404).send({ error: 'Offer not found' });
      }

      // Verify offer is in accepted state
      if (offer.status !== 'accepted') {
        return reply.status(400).send({ error: 'Only accepted offers can be crossposted' });
      }

      // Check if already crossposted
      if (offer.ebay_listing_id) {
        return reply.status(400).send({
          error: 'Offer already crossposted to eBay',
          listingUrl: offer.ebay_listing_url,
        });
      }

      // Get eBay account
      const ebayAccount = await db.findOne('ebay_accounts', { user_id: userId, connected: true });

      if (!ebayAccount) {
        return reply.status(400).send({ error: 'No eBay account connected' });
      }

      // Decrypt tokens
      let accessToken = await decrypt(ebayAccount.access_token_encrypted);
      const refreshToken = await decrypt(ebayAccount.refresh_token_encrypted);

      // Refresh token if needed
      if (needsTokenRefresh(new Date(ebayAccount.token_expires_at))) {
        logger.info({ userId }, 'Refreshing eBay access token');
        const newTokens = await refreshAccessToken(refreshToken);
        const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

        // Encrypt new tokens
        const encryptedAccessToken = await encrypt(newTokens.access_token);
        const encryptedRefreshToken = await encrypt(newTokens.refresh_token);

        await db.update('ebay_accounts', ebayAccount.id, {
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: newExpiresAt,
        });

        accessToken = newTokens.access_token;
      }

      // Build listing data from offer
      const photos = offer.photos as any[];
      const imageUrls = photos.map((p: any) => p.url);

      const title = `${offer.item_brand || ''} ${offer.item_model || offer.item_category || 'Item'}`.trim();
      const description = offer.jake_script || offer.user_description || 'Quality item from JakeBuysIt';
      const category = offer.item_category || 'Consumer Electronics';
      const condition = offer.item_condition || 'Good';
      const price = parseFloat(offer.offer_amount);

      // Mark as pending
      await db.update('offers', offerId, {
        ebay_crosspost_status: 'pending',
      });

      // Create eBay listing
      const { itemId, listingUrl, fees } = await createEbayListing(accessToken, {
        title,
        description,
        category,
        condition,
        price,
        imageUrls,
      });

      // Update offer with eBay listing info
      await db.update('offers', offerId, {
        ebay_listing_id: itemId,
        ebay_listing_url: listingUrl,
        ebay_crosspost_status: 'success',
        ebay_crossposted_at: new Date(),
      });

      logger.info({ offerId, itemId, listingUrl, fees }, 'Offer crossposted to eBay successfully');

      return reply.send({
        success: true,
        itemId,
        listingUrl,
        fees,
        message: `Successfully listed on eBay! Listing fees: $${fees.toFixed(2)}`,
      });
    } catch (err: any) {
      // Mark as failed
      await db.update('offers', offerId, {
        ebay_crosspost_status: 'failed',
        ebay_crosspost_error: err.message,
      });

      logger.error({ offerId, error: err.message }, 'eBay crosspost error');
      return reply.status(500).send({ error: `Failed to crosspost to eBay: ${err.message}` });
    }
  });
}
