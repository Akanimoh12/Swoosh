/**
 * Event Monitor API Routes
 * Endpoints for checking event monitor status and triggering manual checks
 */

import { FastifyInstance } from 'fastify';
import { logger } from '../utils/logger.js';
import { intentEventMonitor } from '../services/intent-event-monitor.js';
import { wsManager } from '../services/websocket-manager.js';

const log = logger.child({ module: 'events-routes' });

export async function eventsRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/events/status - Get event monitor status
   */
  fastify.get('/status', {
    schema: {
      description: 'Get event monitor status and statistics',
      tags: ['Events'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                eventMonitor: {
                  type: 'object',
                  properties: {
                    isRunning: { type: 'boolean' },
                    chainWatchers: { type: 'number' },
                    pendingCCIPMessages: { type: 'number' },
                    lastProcessedBlocks: { type: 'object' },
                  },
                },
                websocket: {
                  type: 'object',
                  properties: {
                    totalConnections: { type: 'number' },
                    uptime: { type: 'number' },
                    messagesReceived: { type: 'number' },
                    messagesSent: { type: 'number' },
                  },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const eventMonitorStats = intentEventMonitor.getStats();
    const wsStats = wsManager.getStats();

    return {
      success: true,
      data: {
        eventMonitor: eventMonitorStats,
        websocket: {
          totalConnections: wsStats.totalConnections,
          uptime: wsStats.uptime,
          messagesReceived: wsStats.messagesReceived,
          messagesSent: wsStats.messagesSent,
        },
      },
    };
  });

  /**
   * POST /api/events/check/:intentId - Manually trigger event check for an intent
   */
  fastify.post('/check/:intentId', {
    schema: {
      description: 'Trigger manual event check for a specific intent',
      tags: ['Events'],
      params: {
        type: 'object',
        required: ['intentId'],
        properties: {
          intentId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { intentId } = request.params as { intentId: string };

    log.info({ intentId }, 'Manual event check triggered');

    try {
      await intentEventMonitor.checkIntentEvents(intentId);
      return {
        success: true,
        message: `Event check triggered for intent ${intentId}`,
      };
    } catch (error: any) {
      log.error({ error, intentId }, 'Error triggering event check');
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to trigger event check',
      });
    }
  });

  /**
   * GET /api/events/connections/:intentId - Get WebSocket connections for an intent
   */
  fastify.get('/connections/:intentId', {
    schema: {
      description: 'Get WebSocket connection count for an intent',
      tags: ['Events'],
      params: {
        type: 'object',
        required: ['intentId'],
        properties: {
          intentId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                intentId: { type: 'string' },
                connectionCount: { type: 'number' },
                hasActiveClients: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { intentId } = request.params as { intentId: string };

    return {
      success: true,
      data: {
        intentId,
        connectionCount: wsManager.getIntentClientCount(intentId),
        hasActiveClients: wsManager.hasActiveClients(intentId),
      },
    };
  });

  log.info('Events routes registered');
}

export default eventsRoutes;
