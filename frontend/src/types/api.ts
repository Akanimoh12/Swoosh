/**
 * API Types
 * Types for API requests and responses
 */

// ============================================================================
// Generic API Response
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// Pagination
// ============================================================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

// ============================================================================
// Error Types
// ============================================================================

export interface ApiErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// WebSocket Message Types
// ============================================================================

export type WSMessageType =
  | 'ping'
  | 'pong'
  | 'subscribe'
  | 'unsubscribe'
  | 'intent_update'
  | 'status_change'
  | 'error'
  | 'connected';

export interface WSMessage {
  type: WSMessageType;
  intentId?: string;
  status?: string;
  data?: unknown;
  timestamp?: number;
}

export interface WSIntentUpdate {
  type: 'intent_update';
  intentId: string;
  status: string;
  progress?: number;
  message?: string;
  txHash?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Connection Status
// ============================================================================

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';
