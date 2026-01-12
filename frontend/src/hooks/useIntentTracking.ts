/**
 * useIntentTracking Hook
 * Real-time intent tracking via WebSocket with auto-reconnect
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// Types
// ============================================================================

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

/** Connection status enum for UI display */
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

export interface IntentStatus {
  intentId: string;
  status: string;
  step: IntentStep;
  progress: number; // 0-100
  message: string;
  txHash?: string;
  blockNumber?: number;
  chainId?: number;
  estimatedTimeRemaining?: number;
  metadata?: Record<string, unknown>;
}

/** WebSocket message types */
export type WSMessageType = 
  | 'ping' 
  | 'pong' 
  | 'subscribe' 
  | 'unsubscribe' 
  | 'status' 
  | 'update' 
  | 'error' 
  | 'connected'
  | 'intent:created'
  | 'intent:swap_completed'
  | 'intent:bridge_initiated'
  | 'intent:settlement_completed'
  | 'intent:completed'
  | 'intent:failed';

export interface WSMessage {
  type: WSMessageType | string;
  data?: unknown;
  timestamp?: string;
  messageId?: string;
}

export interface UseIntentTrackingOptions {
  /** WebSocket server URL (defaults to VITE_WS_URL env var) */
  wsUrl?: string;
  /** JWT token for authentication (optional) */
  token?: string;
  /** Called when status updates */
  onStatusUpdate?: (status: IntentStatus) => void;
  /** Called when transaction hash received */
  onTransaction?: (txHash: string, chainId: number) => void;
  /** Called when intent completes */
  onComplete?: (status: IntentStatus) => void;
  /** Called when intent fails */
  onError?: (error: string) => void;
  /** Called when connection state changes */
  onConnectionChange?: (connected: boolean) => void;
  /** Called when reconnected after disconnect */
  onReconnect?: () => void;
  /** Auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Max reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Base delay for reconnection in ms (default: 1000) */
  reconnectDelay?: number;
}

export interface UseIntentTrackingResult {
  /** Current intent status */
  status: IntentStatus | null;
  /** Whether connected to WebSocket */
  isConnected: boolean;
  /** Current connection status for UI */
  connectionStatus: ConnectionStatus;
  /** Whether currently reconnecting */
  isReconnecting: boolean;
  /** Number of reconnection attempts */
  reconnectAttempts: number;
  /** Last ping/pong latency in ms */
  latency: number | null;
  /** Error message if any */
  error: string | null;
  /** Manually reconnect */
  reconnect: () => void;
  /** Disconnect from WebSocket */
  disconnect: () => void;
  /** Send a message to server */
  sendMessage: (message: WSMessage) => void;
}

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds
const PING_INTERVAL = 25000; // 25 seconds

// ============================================================================
// Hook Implementation
// ============================================================================

export function useIntentTracking(
  intentId: string | null,
  options: UseIntentTrackingOptions = {}
): UseIntentTrackingResult {
  const {
    wsUrl = DEFAULT_WS_URL,
    token,
    onStatusUpdate,
    onTransaction,
    onComplete,
    onError,
    onConnectionChange,
    onReconnect,
    autoReconnect = true,
    maxReconnectAttempts = MAX_RECONNECT_ATTEMPTS,
    reconnectDelay = BASE_RECONNECT_DELAY,
  } = options;

  // State
  const [status, setStatus] = useState<IntentStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  // Refs for cleanup
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);
  const pingTimestampRef = useRef<number | null>(null);
  const messageQueueRef = useRef<WSMessage[]>([]);
  const wasConnectedRef = useRef(false);

  // Calculate reconnection delay with exponential backoff
  const getReconnectDelay = useCallback((attempt: number): number => {
    const delay = reconnectDelay * Math.pow(2, attempt);
    return Math.min(delay, MAX_RECONNECT_DELAY);
  }, [reconnectDelay]);

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  // Start ping interval
  const startPingInterval = useCallback(() => {
    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        pingTimestampRef.current = Date.now();
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, PING_INTERVAL);
  }, []);

  // Flush queued messages
  const flushMessageQueue = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN && messageQueueRef.current.length > 0) {
      console.log(`[WS] Flushing ${messageQueueRef.current.length} queued messages`);
      messageQueueRef.current.forEach((msg) => {
        wsRef.current?.send(JSON.stringify(msg));
      });
      messageQueueRef.current = [];
    }
  }, []);

  // Handle incoming messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message: WSMessage = JSON.parse(event.data);
      const { type, data } = message;

      console.debug('[WS] Message received:', type, data);

      switch (type) {
        case 'connected':
          console.log('[WS] Connected to server');
          break;

        case 'pong':
          // Calculate latency from ping
          if (pingTimestampRef.current) {
            const newLatency = Date.now() - pingTimestampRef.current;
            setLatency(newLatency);
            pingTimestampRef.current = null;
          }
          break;

        case 'status':
        case 'update':
          if (data && typeof data === 'object') {
            const statusData = data as IntentStatus;
            if (mountedRef.current) {
              setStatus(statusData);
              onStatusUpdate?.(statusData);

              // Check for completion or failure
              if (statusData.step === 'completed') {
                onComplete?.(statusData);
              } else if (statusData.step === 'failed') {
                onError?.(statusData.message || 'Intent failed');
              }
            }
          }
          break;

        case 'intent:swap_completed':
        case 'intent:bridge_initiated':
        case 'intent:settlement_completed':
          if (data && typeof data === 'object') {
            const txData = data as { txHash?: string; chainId?: number };
            if (txData.txHash && txData.chainId) {
              onTransaction?.(txData.txHash, txData.chainId);
            }
          }
          break;

        case 'error':
          if (data && typeof data === 'object') {
            const errData = data as { message?: string };
            const errorMsg = errData.message || 'Unknown error';
            if (mountedRef.current) {
              setError(errorMsg);
              onError?.(errorMsg);
            }
          }
          break;

        default:
          console.debug('[WS] Unhandled message type:', type);
      }
    } catch (err) {
      console.error('[WS] Failed to parse message:', err);
    }
  }, [onStatusUpdate, onTransaction, onComplete, onError]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!intentId) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    clearTimers();
    setError(null);
    setConnectionStatus('connecting');

    // Build WebSocket URL
    let url = `${wsUrl}/ws/intents/${intentId}`;
    if (token) {
      url += `?token=${encodeURIComponent(token)}`;
    }

    console.log('[WS] Connecting to:', url);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connection opened');
        if (mountedRef.current) {
          const wasReconnect = wasConnectedRef.current;
          setIsConnected(true);
          setConnectionStatus('connected');
          setIsReconnecting(false);
          setReconnectAttempts(0);
          onConnectionChange?.(true);
          startPingInterval();
          flushMessageQueue();
          
          // Fire reconnect callback if this was a reconnection
          if (wasReconnect) {
            onReconnect?.();
          }
          wasConnectedRef.current = true;
        }
      };

      ws.onmessage = handleMessage;

      ws.onclose = (event) => {
        console.log('[WS] Connection closed:', event.code, event.reason);
        if (mountedRef.current) {
          setIsConnected(false);
          setConnectionStatus('disconnected');
          onConnectionChange?.(false);
          clearTimers();

          // Attempt reconnection if enabled and not intentionally closed
          if (autoReconnect && event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
            const delay = getReconnectDelay(reconnectAttempts);
            console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1})`);
            setIsReconnecting(true);
            setConnectionStatus('reconnecting');
            reconnectTimeoutRef.current = setTimeout(() => {
              setReconnectAttempts((prev) => prev + 1);
              connect();
            }, delay);
          } else if (reconnectAttempts >= maxReconnectAttempts) {
            setError('Maximum reconnection attempts reached');
          }
        }
      };

      ws.onerror = (event) => {
        console.error('[WS] Error:', event);
        if (mountedRef.current) {
          setError('WebSocket connection error');
        }
      };
    } catch (err) {
      console.error('[WS] Failed to create WebSocket:', err);
      setError('Failed to connect to server');
    }
  }, [
    intentId,
    wsUrl,
    token,
    autoReconnect,
    reconnectAttempts,
    maxReconnectAttempts,
    handleMessage,
    onConnectionChange,
    onReconnect,
    clearTimers,
    startPingInterval,
    getReconnectDelay,
    flushMessageQueue,
  ]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    clearTimers();
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsReconnecting(false);
    setConnectionStatus('disconnected');
    wasConnectedRef.current = false;
  }, [clearTimers]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    disconnect();
    setReconnectAttempts(0);
    connect();
  }, [disconnect, connect]);

  // Send message to server (with queueing for offline)
  const sendMessage = useCallback((message: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      // Queue message for later delivery
      console.warn('[WS] Connection not ready, queueing message');
      messageQueueRef.current.push(message);
    }
  }, []);

  // Effect: Connect when intentId changes
  useEffect(() => {
    mountedRef.current = true;

    if (intentId) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, [intentId]); // Only depend on intentId to avoid reconnection loops

  return {
    status,
    isConnected,
    connectionStatus,
    isReconnecting,
    reconnectAttempts,
    latency,
    error,
    reconnect,
    disconnect,
    sendMessage,
  };
}

// ============================================================================
// Helper Hooks
// ============================================================================

/**
 * Hook to get step display info
 */
export function useStepInfo(step: IntentStep | undefined) {
  const stepInfo: Record<IntentStep, { label: string; icon: string; color: string }> = {
    pending: { label: 'Pending', icon: '⏳', color: 'text-yellow-500' },
    validating: { label: 'Validating', icon: '🔍', color: 'text-blue-500' },
    validated: { label: 'Validated', icon: '✓', color: 'text-green-500' },
    routing: { label: 'Finding Route', icon: '🗺️', color: 'text-blue-500' },
    swapping: { label: 'Swapping', icon: '🔄', color: 'text-purple-500' },
    swapped: { label: 'Swapped', icon: '✓', color: 'text-green-500' },
    bridging: { label: 'Bridging', icon: '🌉', color: 'text-orange-500' },
    bridge_pending: { label: 'Bridge Pending', icon: '⏳', color: 'text-orange-500' },
    bridge_completed: { label: 'Bridge Complete', icon: '✓', color: 'text-green-500' },
    settling: { label: 'Settling', icon: '📝', color: 'text-blue-500' },
    completed: { label: 'Completed', icon: '✅', color: 'text-green-500' },
    failed: { label: 'Failed', icon: '❌', color: 'text-red-500' },
  };

  return step ? stepInfo[step] : null;
}

/**
 * Hook to format time remaining
 */
export function useTimeRemaining(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return '';

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (minutes > 0) {
    return `~${minutes}m ${secs}s remaining`;
  }
  return `~${secs}s remaining`;
}

export default useIntentTracking;
