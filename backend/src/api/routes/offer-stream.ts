/**
 * Offer Stream — WebSocket endpoint for real-time pipeline progress.
 *
 * Route: GET /:id/stream (mounted under /api/v1/offers)
 *
 * Polls Redis every 2s for stage transitions, maps backend stages to the
 * frontend's three-phase model, and pushes JSON messages over the socket.
 *
 * Frontend stage mapping:
 *   vision       -> "looking"
 *   marketplace  -> "researching"
 *   pricing      -> "deciding"
 *   jake-voice   -> "deciding"
 *   ready        -> final message, then close
 *   escalated    -> error message, then close
 *   failed       -> error message, then close
 */
import { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { offerOrchestrator, OfferStage } from '../../services/offer-orchestrator.js';
import { logger } from '../../utils/logger.js';

// WebSocket type from the 'ws' library (used by @fastify/websocket).
// Declared here to avoid requiring @types/ws as a dev dependency.
interface WsSocket {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  on(event: 'close', listener: () => void): void;
  on(event: 'error', listener: (err: Error) => void): void;
  on(event: 'message', listener: (data: Buffer) => void): void;
}
const WS_OPEN = 1;

// --- Types ---

type FrontendStage = 'looking' | 'researching' | 'deciding';

interface StageMessage {
  stage: FrontendStage;
  data: {
    labels?: string[];
    marketplaceCount?: number;
    salesCount?: number;
    pricePoints?: number[];
  };
  jakeMessage?: string;
}

interface ErrorMessage {
  error: string;
  reason?: string;
}

interface CompleteMessage {
  complete: true;
  offerId: string;
}

// --- Constants ---

const POLL_INTERVAL_MS = 2_000;
const CONNECTION_TIMEOUT_MS = 5 * 60 * 1_000; // 5 minutes

const BACKEND_TO_FRONTEND: Record<string, FrontendStage> = {
  vision: 'looking',
  marketplace: 'researching',
  pricing: 'deciding',
  'jake-voice': 'deciding',
};

const TERMINAL_STAGES = new Set<OfferStage>(['ready', 'escalated', 'failed']);

// --- Helpers ---

function safeSend(socket: WsSocket, payload: StageMessage | ErrorMessage | CompleteMessage): void {
  if (socket.readyState === WS_OPEN) {
    socket.send(JSON.stringify(payload));
  }
}

/**
 * Read the offer row and extract stage-specific data for the frontend message.
 */
async function buildStageData(
  offerId: string,
  backendStage: OfferStage,
): Promise<Pick<StageMessage, 'data' | 'jakeMessage'>> {
  const data: StageMessage['data'] = {};
  let jakeMessage: string | undefined;

  const offer = await db.findOne('offers', { id: offerId });
  if (!offer) {
    return { data };
  }

  switch (backendStage) {
    case 'vision': {
      // Labels come from the AI identification result
      const identification = typeof offer.ai_identification === 'string'
        ? JSON.parse(offer.ai_identification)
        : offer.ai_identification;

      if (identification) {
        const labels: string[] = [];
        if (identification.brand) labels.push(identification.brand);
        if (identification.model) labels.push(identification.model);
        if (identification.category) labels.push(identification.category);
        if (identification.condition) labels.push(identification.condition);
        data.labels = labels;
      }
      break;
    }

    case 'marketplace': {
      const marketData = typeof offer.market_data === 'string'
        ? JSON.parse(offer.market_data)
        : offer.market_data;

      if (marketData?.stats) {
        data.marketplaceCount = marketData.sources_checked?.length ?? 0;
        data.salesCount = marketData.stats.count ?? 0;
      }
      break;
    }

    case 'pricing':
    case 'jake-voice': {
      // Price points from marketplace stats + the calculated offer
      const mktData = typeof offer.market_data === 'string'
        ? JSON.parse(offer.market_data)
        : offer.market_data;

      const pricePoints: number[] = [];
      if (mktData?.stats?.median) pricePoints.push(mktData.stats.median);
      if (mktData?.stats?.mean) pricePoints.push(mktData.stats.mean);
      if (offer.fmv) pricePoints.push(parseFloat(offer.fmv));
      if (offer.offer_amount && parseFloat(offer.offer_amount) > 0) {
        pricePoints.push(parseFloat(offer.offer_amount));
      }
      data.pricePoints = pricePoints;

      // Jake script if available (jake-voice stage)
      if (backendStage === 'jake-voice' && offer.jake_script) {
        jakeMessage = offer.jake_script;
      }
      break;
    }
  }

  return { data, jakeMessage };
}

// --- Route ---

export async function offerStreamRoutes(fastify: FastifyInstance) {
  fastify.get('/:id/stream', { websocket: true }, async (socket: WsSocket, request) => {
    const { id: offerId } = request.params as { id: string };

    // Validate UUID format (basic check to reject garbage early)
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(offerId)) {
      safeSend(socket, { error: 'Invalid offer ID format' });
      socket.close(1008, 'Invalid offer ID');
      return;
    }

    // Verify the offer exists
    const offer = await db.findOne('offers', { id: offerId });
    if (!offer) {
      safeSend(socket, { error: 'Offer not found' });
      socket.close(1008, 'Offer not found');
      return;
    }

    // If the offer is already in a terminal state, send the result immediately
    if (['ready', 'accepted', 'declined', 'expired'].includes(offer.status) && offer.status !== 'processing') {
      safeSend(socket, { complete: true, offerId });
      socket.close(1000, 'Offer already complete');
      return;
    }

    logger.info({ offerId }, 'WebSocket stream connected');

    let lastStage: string | null = null;
    let alive = true;

    // Cleanup function shared between close, timeout, and error paths
    function cleanup() {
      if (!alive) return;
      alive = false;
      clearInterval(pollTimer);
      clearTimeout(timeoutTimer);
      logger.info({ offerId, lastStage }, 'WebSocket stream disconnected');
    }

    // Connection timeout — no pipeline should exceed 5 minutes
    const timeoutTimer = setTimeout(() => {
      if (alive) {
        safeSend(socket, { error: 'Pipeline timeout — offer is taking too long' });
        socket.close(1000, 'Timeout');
        cleanup();
      }
    }, CONNECTION_TIMEOUT_MS);

    // Poll Redis for stage changes
    const pollTimer = setInterval(async () => {
      if (!alive) return;

      try {
        const stageData = await offerOrchestrator.getStage(offerId);
        if (!stageData) return;

        const currentStage = stageData.stage;

        // Only send when the stage actually changes
        if (currentStage === lastStage) return;
        lastStage = currentStage;

        // --- Terminal: ready ---
        if (currentStage === 'ready') {
          const { data, jakeMessage } = await buildStageData(offerId, 'jake-voice');
          safeSend(socket, {
            stage: 'deciding',
            data,
            jakeMessage,
          });
          // Small delay so the client can render the final "deciding" frame
          setTimeout(() => {
            safeSend(socket, { complete: true, offerId });
            socket.close(1000, 'Offer ready');
            cleanup();
          }, 500);
          return;
        }

        // --- Terminal: escalated ---
        if (currentStage === 'escalated') {
          safeSend(socket, { error: 'This offer needs a closer look from our team. Hang tight, partner.' });
          socket.close(1000, 'Escalated');
          cleanup();
          return;
        }

        // --- Terminal: failed ---
        if (currentStage === 'failed') {
          safeSend(socket, { error: 'Something went wrong processing this offer. Our team has been notified.' });
          socket.close(1000, 'Failed');
          cleanup();
          return;
        }

        // --- Active stages ---
        const frontendStage = BACKEND_TO_FRONTEND[currentStage];
        if (!frontendStage) {
          // "uploaded" or unknown — skip silently
          return;
        }

        const { data, jakeMessage } = await buildStageData(offerId, currentStage as OfferStage);
        safeSend(socket, { stage: frontendStage, data, jakeMessage });
      } catch (err) {
        logger.error({ offerId, err }, 'Error during stream poll');
        // Don't kill the connection on transient errors — let it retry next interval
      }
    }, POLL_INTERVAL_MS);

    // Send an initial message with the current stage (if any)
    try {
      const initialStage = await offerOrchestrator.getStage(offerId);
      if (initialStage && !TERMINAL_STAGES.has(initialStage.stage)) {
        const frontendStage = BACKEND_TO_FRONTEND[initialStage.stage];
        if (frontendStage) {
          lastStage = initialStage.stage;
          const { data, jakeMessage } = await buildStageData(offerId, initialStage.stage);
          safeSend(socket, { stage: frontendStage, data, jakeMessage });
        }
      }
    } catch (err) {
      logger.error({ offerId, err }, 'Error sending initial stream state');
    }

    // Client disconnect
    socket.on('close', cleanup);
    socket.on('error', (err: Error) => {
      logger.error({ offerId, err }, 'WebSocket error');
      cleanup();
    });
  });
}
