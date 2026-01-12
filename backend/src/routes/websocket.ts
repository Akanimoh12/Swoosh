/**
 * WebSocket handler for real-time intent updates
 */

import { FastifyInstance } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import { logger } from '../utils/logger.js';
import { prisma } from '../db/prisma.js';

interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'ping';
  intentId?: string;
}

// Store active connections
const connections = new Map<string, Set<SocketStream>>();

/**
 * Register WebSocket routes
 */
export async function websocketRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/ws/intents/:id',
    { websocket: true },
    (connection: SocketStream, request) => {
      const { id } = request.params as { id: string };
      const log = logger.child({ route: '/ws/intents/:id', intentId: id });

      log.info('WebSocket connection established');

      // Add connection to tracking
      if (!connections.has(id)) {
        connections.set(id, new Set());
      }
      connections.get(id)!.add(connection);

      // Send initial intent status
      sendInitialStatus(connection, id);

      // Handle incoming messages
      connection.socket.on('message', (message: Buffer) => {
        try {
          const data: WebSocketMessage = JSON.parse(message.toString());

          if (data.type === 'ping') {
            connection.socket.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (error) {
          log.error({ error }, 'Error handling WebSocket message');
        }
      });

      // Handle connection close
      connection.socket.on('close', () => {
        log.info('WebSocket connection closed');
        const connSet = connections.get(id);
        if (connSet) {
          connSet.delete(connection);
          if (connSet.size === 0) {
            connections.delete(id);
          }
        }
      });

      // Handle errors
      connection.socket.on('error', (error) => {
        log.error({ error }, 'WebSocket error');
      });
    }
  );
}

/**
 * Send initial intent status to WebSocket client
 */
async function sendInitialStatus(connection: SocketStream, intentId: string) {
  try {
    const intent = await prisma.intent.findUnique({
      where: { id: intentId },
      include: { routes: true },
    });

    if (intent) {
      connection.socket.send(
        JSON.stringify({
          type: 'status',
          data: {
            id: intent.id,
            status: intent.status,
            parsedData: intent.parsedData,
            routes: intent.routes.map((r) => r.routeData),
            updatedAt: intent.updatedAt.toISOString(),
          },
        })
      );
    }
  } catch (error) {
    logger.error({ error, intentId }, 'Error sending initial status');
  }
}

/**
 * Broadcast intent update to all connected clients
 */
export function broadcastIntentUpdate(intentId: string, data: unknown) {
  const connSet = connections.get(intentId);
  if (!connSet) return;

  const message = JSON.stringify({
    type: 'update',
    data,
    timestamp: new Date().toISOString(),
  });

  connSet.forEach((connection) => {
    try {
      connection.socket.send(message);
    } catch (error) {
      logger.error({ error, intentId }, 'Error broadcasting update');
    }
  });
}

/**
 * Clean up stale connections
 */
export function cleanupConnections() {
  connections.forEach((connSet, intentId) => {
    connSet.forEach((connection) => {
      if (connection.socket.readyState !== 1) {
        // 1 = OPEN
        connSet.delete(connection);
      }
    });

    if (connSet.size === 0) {
      connections.delete(intentId);
    }
  });
}

// Run cleanup every minute
setInterval(cleanupConnections, 60000);
