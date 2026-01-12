/**
 * WebSocket Manager Service
 * Centralized management for WebSocket connections with heartbeat, auth, and broadcasting
 */

import { WebSocket, RawData } from 'ws';
import { FastifyRequest } from 'fastify';
import { logger } from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

export interface WSClient {
  id: string;
  socket: WebSocket;
  intentId: string;
  userId?: string;
  connectedAt: Date;
  lastPing: Date;
  isAlive: boolean;
  metadata?: Record<string, unknown>;
}

export interface WSMessage {
  type: WSMessageType;
  data?: unknown;
  timestamp?: string;
  messageId?: string;
}

export type WSMessageType =
  // Client -> Server
  | 'subscribe'
  | 'unsubscribe'
  | 'ping'
  // Server -> Client
  | 'pong'
  | 'connected'
  | 'subscribed'
  | 'unsubscribed'
  | 'status'
  | 'update'
  | 'error'
  // Intent Events
  | 'intent:validated'
  | 'intent:routing'
  | 'intent:swap_started'
  | 'intent:swap_completed'
  | 'intent:bridge_initiated'
  | 'intent:bridge_pending'
  | 'intent:bridge_completed'
  | 'intent:settlement_started'
  | 'intent:settlement_completed'
  | 'intent:failed'
  | 'intent:cancelled';

export interface IntentStatusUpdate {
  intentId: string;
  status: string;
  step: IntentStep;
  progress: number; // 0-100
  message: string;
  txHash?: string;
  blockNumber?: number;
  chainId?: number;
  estimatedTimeRemaining?: number; // seconds
  metadata?: Record<string, unknown>;
}

export type IntentStep =
  | 'pending'
  | 'validating'
  | 'validated'
  | 'routing'
  | 'swapping'
  | 'swapped'
  | 'bridging'
  | 'bridge_pending'
  | 'bridge_completed'
  | 'settling'
  | 'completed'
  | 'failed';

export interface WSStats {
  totalConnections: number;
  connectionsByIntent: Record<string, number>;
  uptime: number;
  messagesReceived: number;
  messagesSent: number;
  errors: number;
}

// ============================================================================
// Configuration
// ============================================================================

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const CLIENT_TIMEOUT = 60000; // 60 seconds without pong = dead
const MAX_CONNECTIONS_PER_INTENT = 100;
const MAX_TOTAL_CONNECTIONS = 10000;

// ============================================================================
// WebSocket Manager Class
// ============================================================================

class WebSocketManager {
  private clients: Map<string, WSClient> = new Map();
  private intentSubscriptions: Map<string, Set<string>> = new Map(); // intentId -> Set<clientId>
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private stats = {
    messagesReceived: 0,
    messagesSent: 0,
    errors: 0,
    startedAt: Date.now(),
  };
  private log = logger.child({ service: 'WebSocketManager' });

  constructor() {
    this.startHeartbeat();
  }

  // ==========================================================================
  // Connection Management
  // ==========================================================================

  /**
   * Register a new WebSocket client
   */
  registerClient(
    socket: WebSocket,
    intentId: string,
    request: FastifyRequest,
    userId?: string
  ): WSClient | null {
    // Check total connections limit
    if (this.clients.size >= MAX_TOTAL_CONNECTIONS) {
      this.log.warn('Max total connections reached');
      this.sendError(socket, 'Server at capacity, please try again later');
      socket.close(1013, 'Server at capacity');
      return null;
    }

    // Check per-intent connections limit
    const intentClients = this.intentSubscriptions.get(intentId);
    if (intentClients && intentClients.size >= MAX_CONNECTIONS_PER_INTENT) {
      this.log.warn({ intentId }, 'Max connections per intent reached');
      this.sendError(socket, 'Too many connections for this intent');
      socket.close(1013, 'Too many connections');
      return null;
    }

    // Generate unique client ID
    const clientId = this.generateClientId();

    // Create client object
    const client: WSClient = {
      id: clientId,
      socket,
      intentId,
      userId,
      connectedAt: new Date(),
      lastPing: new Date(),
      isAlive: true,
      metadata: {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      },
    };

    // Store client
    this.clients.set(clientId, client);

    // Add to intent subscriptions
    if (!this.intentSubscriptions.has(intentId)) {
      this.intentSubscriptions.set(intentId, new Set());
    }
    this.intentSubscriptions.get(intentId)!.add(clientId);

    // Set up event handlers
    this.setupClientHandlers(client);

    // Send connected confirmation
    this.sendToClient(client, {
      type: 'connected',
      data: {
        clientId,
        intentId,
        serverTime: new Date().toISOString(),
      },
    });

    this.log.info({ clientId, intentId, userId }, 'Client connected');

    return client;
  }

  /**
   * Remove a client and clean up
   */
  removeClient(clientId: string, reason?: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from intent subscriptions
    const intentClients = this.intentSubscriptions.get(client.intentId);
    if (intentClients) {
      intentClients.delete(clientId);
      if (intentClients.size === 0) {
        this.intentSubscriptions.delete(client.intentId);
      }
    }

    // Close socket if still open
    if (client.socket.readyState === WebSocket.OPEN) {
      client.socket.close(1000, reason || 'Connection closed');
    }

    // Remove from clients map
    this.clients.delete(clientId);

    this.log.info({ clientId, intentId: client.intentId, reason }, 'Client disconnected');
  }

  /**
   * Set up event handlers for a client
   */
  private setupClientHandlers(client: WSClient): void {
    const { socket, id: clientId } = client;

    socket.on('message', (data: RawData) => {
      this.handleMessage(client, data);
    });

    socket.on('close', (code: number, reason: Buffer) => {
      this.log.debug({ clientId, code, reason: reason.toString() }, 'Socket closed');
      this.removeClient(clientId, `Close code: ${code}`);
    });

    socket.on('error', (error: Error) => {
      this.log.error({ clientId, error: error.message }, 'Socket error');
      this.stats.errors++;
      this.removeClient(clientId, 'Socket error');
    });

    socket.on('pong', () => {
      client.isAlive = true;
      client.lastPing = new Date();
    });
  }

  /**
   * Handle incoming message from client
   */
  private handleMessage(client: WSClient, data: RawData): void {
    this.stats.messagesReceived++;

    try {
      const message: WSMessage = JSON.parse(data.toString());
      const { type } = message;

      this.log.debug({ clientId: client.id, type }, 'Message received');

      switch (type) {
        case 'ping':
          client.isAlive = true;
          client.lastPing = new Date();
          this.sendToClient(client, { type: 'pong' });
          break;

        case 'subscribe':
          // Already subscribed on connection, but could support multiple intents
          this.sendToClient(client, {
            type: 'subscribed',
            data: { intentId: client.intentId },
          });
          break;

        case 'unsubscribe':
          this.removeClient(client.id, 'Unsubscribed');
          break;

        default:
          this.log.warn({ clientId: client.id, type }, 'Unknown message type');
      }
    } catch (error) {
      this.log.error({ clientId: client.id, error }, 'Failed to parse message');
      this.sendError(client.socket, 'Invalid message format');
    }
  }

  // ==========================================================================
  // Heartbeat
  // ==========================================================================

  /**
   * Start heartbeat interval to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.checkHeartbeats();
    }, HEARTBEAT_INTERVAL);

    this.log.info('Heartbeat started');
  }

  /**
   * Check all clients for heartbeat timeout
   */
  private checkHeartbeats(): void {
    const now = Date.now();
    const deadClients: string[] = [];

    this.clients.forEach((client, clientId) => {
      if (!client.isAlive) {
        // Client didn't respond to last ping
        const timeSinceLastPing = now - client.lastPing.getTime();
        if (timeSinceLastPing > CLIENT_TIMEOUT) {
          deadClients.push(clientId);
        }
      } else {
        // Mark as not alive and send ping
        client.isAlive = false;
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.ping();
        }
      }
    });

    // Remove dead clients
    deadClients.forEach((clientId) => {
      this.log.info({ clientId }, 'Removing dead client (no heartbeat)');
      this.removeClient(clientId, 'Heartbeat timeout');
    });

    if (deadClients.length > 0) {
      this.log.info({ count: deadClients.length }, 'Cleaned up dead connections');
    }
  }

  /**
   * Stop heartbeat (for graceful shutdown)
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      this.log.info('Heartbeat stopped');
    }
  }

  // ==========================================================================
  // Broadcasting
  // ==========================================================================

  /**
   * Send message to a specific client
   */
  sendToClient(client: WSClient, message: WSMessage): boolean {
    if (client.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const payload = JSON.stringify({
        ...message,
        timestamp: message.timestamp || new Date().toISOString(),
        messageId: message.messageId || this.generateMessageId(),
      });

      client.socket.send(payload);
      this.stats.messagesSent++;
      return true;
    } catch (error) {
      this.log.error({ clientId: client.id, error }, 'Failed to send message');
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Broadcast message to all clients subscribed to an intent
   */
  broadcastToIntent(intentId: string, message: WSMessage): number {
    const clientIds = this.intentSubscriptions.get(intentId);
    if (!clientIds || clientIds.size === 0) {
      return 0;
    }

    let sentCount = 0;
    const failedClients: string[] = [];

    clientIds.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client) {
        if (this.sendToClient(client, message)) {
          sentCount++;
        } else {
          failedClients.push(clientId);
        }
      }
    });

    // Clean up failed clients
    failedClients.forEach((clientId) => {
      this.removeClient(clientId, 'Send failed');
    });

    this.log.debug({ intentId, sentCount, totalClients: clientIds.size }, 'Broadcast complete');

    return sentCount;
  }

  /**
   * Broadcast intent status update
   */
  broadcastIntentStatus(update: IntentStatusUpdate): number {
    const message: WSMessage = {
      type: 'update',
      data: update,
    };

    return this.broadcastToIntent(update.intentId, message);
  }

  /**
   * Broadcast intent event (validated, swap, bridge, etc.)
   */
  broadcastIntentEvent(
    intentId: string,
    eventType: WSMessageType,
    data: Record<string, unknown>
  ): number {
    const message: WSMessage = {
      type: eventType,
      data: {
        intentId,
        ...data,
      },
    };

    return this.broadcastToIntent(intentId, message);
  }

  /**
   * Send error message to socket
   */
  private sendError(socket: WebSocket, errorMessage: string): void {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: 'error',
          data: { message: errorMessage },
          timestamp: new Date().toISOString(),
        })
      );
    }
  }

  // ==========================================================================
  // Stats & Utilities
  // ==========================================================================

  /**
   * Get connection statistics
   */
  getStats(): WSStats {
    const connectionsByIntent: Record<string, number> = {};
    this.intentSubscriptions.forEach((clients, intentId) => {
      connectionsByIntent[intentId] = clients.size;
    });

    return {
      totalConnections: this.clients.size,
      connectionsByIntent,
      uptime: Date.now() - this.stats.startedAt,
      messagesReceived: this.stats.messagesReceived,
      messagesSent: this.stats.messagesSent,
      errors: this.stats.errors,
    };
  }

  /**
   * Get number of clients for an intent
   */
  getIntentClientCount(intentId: string): number {
    return this.intentSubscriptions.get(intentId)?.size || 0;
  }

  /**
   * Check if any clients are connected for an intent
   */
  hasActiveClients(intentId: string): boolean {
    return (this.intentSubscriptions.get(intentId)?.size || 0) > 0;
  }

  /**
   * Get all connected client IDs for an intent
   */
  getIntentClients(intentId: string): string[] {
    const clients = this.intentSubscriptions.get(intentId);
    return clients ? Array.from(clients) : [];
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  }

  /**
   * Graceful shutdown - close all connections
   */
  shutdown(): void {
    this.log.info('Shutting down WebSocket manager');
    this.stopHeartbeat();

    this.clients.forEach((client, clientId) => {
      this.sendToClient(client, {
        type: 'error',
        data: { message: 'Server shutting down' },
      });
      client.socket.close(1001, 'Server shutting down');
    });

    this.clients.clear();
    this.intentSubscriptions.clear();
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const wsManager = new WebSocketManager();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate progress percentage based on intent step
 */
export function calculateProgress(step: IntentStep): number {
  const stepProgress: Record<IntentStep, number> = {
    pending: 0,
    validating: 10,
    validated: 20,
    routing: 30,
    swapping: 40,
    swapped: 50,
    bridging: 60,
    bridge_pending: 70,
    bridge_completed: 80,
    settling: 90,
    completed: 100,
    failed: -1,
  };

  return stepProgress[step] ?? 0;
}

/**
 * Get human-readable step message
 */
export function getStepMessage(step: IntentStep): string {
  const messages: Record<IntentStep, string> = {
    pending: 'Intent received, waiting to process',
    validating: 'Validating intent on-chain',
    validated: 'Intent validated successfully',
    routing: 'Finding optimal route',
    swapping: 'Executing token swap',
    swapped: 'Swap completed',
    bridging: 'Initiating cross-chain bridge',
    bridge_pending: 'Waiting for bridge confirmation',
    bridge_completed: 'Bridge transfer confirmed',
    settling: 'Finalizing settlement',
    completed: 'Transaction completed successfully',
    failed: 'Transaction failed',
  };

  return messages[step] ?? 'Processing...';
}

/**
 * Estimate time remaining based on step
 */
export function estimateTimeRemaining(step: IntentStep): number {
  // Estimates in seconds
  const estimates: Record<IntentStep, number> = {
    pending: 600, // 10 min total
    validating: 540, // 9 min
    validated: 480, // 8 min
    routing: 420, // 7 min
    swapping: 360, // 6 min
    swapped: 300, // 5 min
    bridging: 240, // 4 min
    bridge_pending: 180, // 3 min (CCIP takes ~2-5 min)
    bridge_completed: 60, // 1 min
    settling: 30,
    completed: 0,
    failed: 0,
  };

  return estimates[step] ?? 300;
}

export default wsManager;
