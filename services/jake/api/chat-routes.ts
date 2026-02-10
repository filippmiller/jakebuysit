/**
 * Jake Chat API - WebSocket Routes
 * Real-time conversational AI with Jake's personality
 */

import { FastifyInstance } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import { conversationManager } from '../chatbot/conversation.js';
import { contextProvider } from '../chatbot/context.js';
import { logger } from '../../../backend/src/utils/logger.js';

interface ChatMessage {
  type: 'message' | 'greeting' | 'error' | 'close';
  data?: {
    message?: string;
    animation_state?: string;
    timestamp?: string;
    error?: string;
  };
}

interface ClientMessage {
  type: 'message' | 'ping';
  data?: {
    message?: string;
  };
}

export async function registerChatRoutes(fastify: FastifyInstance) {
  /**
   * WebSocket endpoint for real-time chat
   * WS /ws/chat/:offerId
   */
  fastify.get('/ws/chat/:offerId', { websocket: true }, async (connection: SocketStream, request) => {
    const { offerId } = request.params as { offerId: string };
    const socket = connection.socket;

    logger.info({ offerId }, 'WebSocket chat connection established');

    try {
      // Validate offer exists and is ready for chat
      const isValid = await contextProvider.validateOfferForChat(offerId);
      if (!isValid) {
        socket.send(JSON.stringify({
          type: 'error',
          data: {
            error: 'Offer not found or not ready for chat',
            timestamp: new Date().toISOString(),
          },
        } as ChatMessage));
        socket.close();
        return;
      }

      // Get offer context
      const context = await contextProvider.getOfferContext(offerId);

      // Send initial greeting
      const greeting = await conversationManager.generateGreeting(offerId, context);
      socket.send(JSON.stringify({
        type: 'greeting',
        data: {
          message: greeting.message,
          animation_state: greeting.animation_state,
          timestamp: new Date().toISOString(),
        },
      } as ChatMessage));

      // Handle incoming messages
      socket.on('message', async (rawMessage: Buffer) => {
        try {
          const clientMessage: ClientMessage = JSON.parse(rawMessage.toString());

          if (clientMessage.type === 'ping') {
            // Respond to ping with pong
            socket.send(JSON.stringify({ type: 'pong' }));
            return;
          }

          if (clientMessage.type === 'message' && clientMessage.data?.message) {
            const userMessage = clientMessage.data.message;

            logger.info({ offerId, userMessage }, 'User message received');

            // Generate Jake's response
            const response = await conversationManager.generateResponse(
              offerId,
              userMessage,
              context
            );

            // Send response to client
            socket.send(JSON.stringify({
              type: 'message',
              data: {
                message: response.message,
                animation_state: response.animation_state,
                timestamp: new Date().toISOString(),
              },
            } as ChatMessage));

            logger.info({ offerId, animationState: response.animation_state }, 'Jake response sent');
          }
        } catch (error) {
          logger.error({ offerId, error }, 'Error processing message');
          socket.send(JSON.stringify({
            type: 'error',
            data: {
              error: 'Failed to process message',
              timestamp: new Date().toISOString(),
            },
          } as ChatMessage));
        }
      });

      // Handle disconnection
      socket.on('close', () => {
        logger.info({ offerId }, 'WebSocket chat connection closed');
        // Keep conversation history for potential reconnection
        // Could add cleanup after timeout if needed
      });

      // Handle errors
      socket.on('error', (error) => {
        logger.error({ offerId, error }, 'WebSocket error');
      });

    } catch (error) {
      logger.error({ offerId, error }, 'Error establishing chat connection');
      socket.send(JSON.stringify({
        type: 'error',
        data: {
          error: 'Failed to establish chat',
          timestamp: new Date().toISOString(),
        },
      } as ChatMessage));
      socket.close();
    }
  });

  /**
   * REST endpoint to check chat availability
   * GET /api/v1/chat/:offerId/available
   */
  fastify.get('/api/v1/chat/:offerId/available', async (request, reply) => {
    const { offerId } = request.params as { offerId: string };

    try {
      const isValid = await contextProvider.validateOfferForChat(offerId);

      return reply.code(200).send({
        available: isValid,
        offerId,
      });
    } catch (error) {
      logger.error({ offerId, error }, 'Error checking chat availability');
      return reply.code(500).send({
        error: 'Failed to check chat availability',
        message: (error as Error).message,
      });
    }
  });

  /**
   * REST endpoint to clear chat history
   * DELETE /api/v1/chat/:offerId/history
   */
  fastify.delete('/api/v1/chat/:offerId/history', async (request, reply) => {
    const { offerId } = request.params as { offerId: string };

    try {
      conversationManager.clearHistory(offerId);

      return reply.code(200).send({
        success: true,
        offerId,
        message: 'Chat history cleared',
      });
    } catch (error) {
      logger.error({ offerId, error }, 'Error clearing chat history');
      return reply.code(500).send({
        error: 'Failed to clear chat history',
        message: (error as Error).message,
      });
    }
  });
}
