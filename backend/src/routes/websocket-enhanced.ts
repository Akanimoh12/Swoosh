/**
 * WebSocket Routes for Real-Time Intent Tracking
 * Handles connections, authentication, and integrates with WebSocket Manager
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import { logger } from '../utils/logger.js';
import { prisma } from '../db/prisma.js';
import {
  wsManager,
  calculateProgress,
  getStepMessage,
  estimateTimeRemaining,
  IntentStep,
  WSMessage,
} from '../services/websocket-manager.js';

const log = logger.child({ module: 'websocket-routes' });

// ============================================================================
// JWT Verification (Optional)
// ============================================================================

interface JWTPayload {
  sub: string; // user ID
  iat: number;
  exp: number;
}

/**
 * Verify JWT token from query parameter (optional authentication)
 * Returns userId if valid, undefined if no token or invalid
 */
function verifyToken(request: FastifyRequest): string | undefined {
  const token = (request.query as Record<string, string>).token;
  
  if (!token) {
    return undefined; // Anonymous connection allowed
  }

  try {
    // Simple JWT verification - in production use a proper library
    // For now, just decode without verification for testnet
    const parts = token.split('.');
    if (parts.length !== 3) {
      log.warn('Invalid JWT format');
      return undefined;
    }

    const payload: JWTPayload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString()
    );

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      log.warn('JWT token expired');
      return undefined;
    }

    return payload.sub;
  } catch (error) {
    log.warn({ error }, 'Failed to verify JWT token');
    return undefined;
  }
}

// ============================================================================
// WebSocket Route Registration
// ============================================================================

export async function websocketRoutes(fastify: FastifyInstance) {
  /**
   * WebSocket endpoint for intent tracking
   * GET /ws/intents/:id?token=optional_jwt
   */
  fastify.get(
    '/ws/intents/:id',
    { websocket: true },
    async (connection: SocketStream, request: FastifyRequest) => {
      const { id: intentId } = request.params as { id: string };
      const userId = verifyToken(request);

      log.info({ intentId, userId, ip: request.ip }, 'WebSocket connection request');

      // Validate intent exists
      const intent = await prisma.intent.findUnique({
        where: { id: intentId },
        select: { id: true, status: true, parsedData: true, updatedAt: true },
      });

      if (!intent) {
        log.warn({ intentId }, 'Intent not found');
        connection.socket.close(4004, 'Intent not found');
        return;
      }

      // Register client with WebSocket manager
      const client = wsManager.registerClient(
        connection.socket,
        intentId,
        request,
        userId
      );

      if (!client) {
        // Registration failed (connection limits, etc.)
        return;
      }

      // Send initial intent status
      await sendInitialStatus(intentId, client.id);

      log.info(
        { clientId: client.id, intentId, userId },
        'WebSocket client registered'
      );
    }
  );

  /**
   * General WebSocket endpoint for multiple subscriptions
   * GET /ws?token=optional_jwt
   */
  fastify.get(
    '/ws',
    { websocket: true },
    (connection: SocketStream, request: FastifyRequest) => {
      const userId = verifyToken(request);

      log.info({ userId, ip: request.ip }, 'General WebSocket connection');

      // For general connections, client needs to send subscribe message
      // with intentId. For now, just acknowledge connection.
      connection.socket.send(
        JSON.stringify({
          type: 'connected',
          data: {
            message: 'Connected. Send subscribe message with intentId.',
            authenticated: !!userId,
          },
          timestamp: new Date().toISOString(),
        })
      );

      // Handle messages for subscription
      connection.socket.on('message', async (data) => {
        try {
          const message: WSMessage = JSON.parse(data.toString());

          if (message.type === 'subscribe' && message.data) {
            const { intentId } = message.data as { intentId: string };
            if (intentId) {
              // Verify intent exists
              const intent = await prisma.intent.findUnique({
                where: { id: intentId },
                select: { id: true },
              });

              if (intent) {
                // Register with manager
                wsManager.registerClient(
                  connection.socket,
                  intentId,
                  request,
                  userId
                );
              } else {
                connection.socket.send(
                  JSON.stringify({
                    type: 'error',
                    data: { message: 'Intent not found' },
                  })
                );
              }
            }
          } else if (message.type === 'ping') {
            connection.socket.send(
              JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() })
            );
          }
        } catch (error) {
          log.error({ error }, 'Error handling general WS message');
        }
      });

      connection.socket.on('close', () => {
        log.debug('General WebSocket closed');
      });
    }
  );

  /**
   * REST endpoint to get WebSocket stats (admin/debug)
   * GET /ws/stats
   */
  fastify.get('/ws/stats', async (request, reply) => {
    const stats = wsManager.getStats();
    return {
      success: true,
      data: stats,
    };
  });

  /**
   * REST endpoint to broadcast test message (admin/debug)
   * POST /ws/test-broadcast
   */
  fastify.post('/ws/test-broadcast', async (request, reply) => {
    const { intentId, message } = request.body as {
      intentId: string;
      message: string;
    };

    if (!intentId) {
      return reply.status(400).send({ error: 'intentId required' });
    }

    const count = wsManager.broadcastToIntent(intentId, {
      type: 'update',
      data: { test: true, message: message || 'Test broadcast' },
    });

    return {
      success: true,
      clientsNotified: count,
    };
  });

  log.info('WebSocket routes registered');
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Send initial intent status to a newly connected client
 */
async function sendInitialStatus(intentId: string, clientId: string): Promise<void> {
  try {
    const intent = await prisma.intent.findUnique({
      where: { id: intentId },
      include: {
        routes: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!intent) return;

    // Map DB status to step
    const stepMap: Record<string, IntentStep> = {
      PENDING: 'pending',
      VALIDATING: 'validating',
      VALIDATED: 'validated',
      ROUTING: 'routing',
      EXECUTING: 'swapping',
      BRIDGING: 'bridging',
      SETTLING: 'settling',
      COMPLETED: 'completed',
      FAILED: 'failed',
      CANCELLED: 'failed',
    };

    const step = stepMap[intent.status] || 'pending';
    const progress = calculateProgress(step);

    // Broadcast to the specific client (via intent broadcast)
    wsManager.broadcastIntentStatus({
      intentId,
      status: intent.status,
      step,
      progress,
      message: getStepMessage(step),
      estimatedTimeRemaining: estimateTimeRemaining(step),
      metadata: {
        parsedData: intent.parsedData,
        route: intent.routes[0]?.routeData,
        updatedAt: intent.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    log.error({ error, intentId }, 'Failed to send initial status');
  }
}

/**
 * Notify all clients when an intent status changes
 * Call this from other services when status updates
 */
export async function notifyIntentStatusChange(
  intentId: string,
  status: string,
  step: IntentStep,
  additionalData?: Record<string, unknown>
): Promise<void> {
  const progress = calculateProgress(step);

  wsManager.broadcastIntentStatus({
    intentId,
    status,
    step,
    progress,
    message: getStepMessage(step),
    estimatedTimeRemaining: estimateTimeRemaining(step),
    ...additionalData,
  });
}

/**
 * Notify clients of a transaction hash
 */
export function notifyTransaction(
  intentId: string,
  eventType: 'swap' | 'bridge' | 'settlement',
  txHash: string,
  chainId: number,
  blockNumber?: number
): void {
  const typeMap = {
    swap: 'intent:swap_completed' as const,
    bridge: 'intent:bridge_initiated' as const,
    settlement: 'intent:settlement_completed' as const,
  };

  wsManager.broadcastIntentEvent(intentId, typeMap[eventType], {
    txHash,
    chainId,
    blockNumber,
    explorerUrl: getExplorerUrl(chainId, txHash),
  });
}

/**
 * Get block explorer URL for transaction
 */
function getExplorerUrl(chainId: number, txHash: string): string {
  const explorers: Record<number, string> = {
    421614: 'https://sepolia.arbiscan.io',
    84532: 'https://sepolia.basescan.org',
    42161: 'https://arbiscan.io',
    8453: 'https://basescan.org',
  };

  const baseUrl = explorers[chainId] || 'https://etherscan.io';
  return `${baseUrl}/tx/${txHash}`;
}

// ============================================================================
// Exports
// ============================================================================

export { wsManager };
export default websocketRoutes;
