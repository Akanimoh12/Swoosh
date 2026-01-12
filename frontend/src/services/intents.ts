/**
 * Intents Service
 * API functions for intent CRUD operations
 */

import { api, type PaginatedResponse } from './api';

// Intent status enum
export type IntentStatus = 
  | 'PENDING'
  | 'VALIDATING'
  | 'VALIDATED'
  | 'ROUTING'
  | 'SWAPPING'
  | 'SWAPPED'
  | 'BRIDGING'
  | 'BRIDGE_PENDING'
  | 'BRIDGE_COMPLETED'
  | 'SETTLING'
  | 'COMPLETED'
  | 'FAILED';

// Token info
export interface TokenInfo {
  symbol: string;
  amount: string;
  address?: string;
  decimals?: number;
  chainId?: number;
}

// Route step
export interface RouteStep {
  type: 'swap' | 'bridge' | 'transfer';
  protocol: string;
  fromChain: string;
  toChain: string;
  fromToken: TokenInfo;
  toToken: TokenInfo;
  estimatedTime?: string;
  gasCost?: string;
}

// Intent type
export interface Intent {
  id: string;
  userAddress: string;
  rawText: string;
  status: IntentStatus;
  sourceChain: string;
  destChain: string;
  sourceToken: TokenInfo;
  destToken: TokenInfo;
  route?: RouteStep[];
  txHash?: string;
  ccipMessageId?: string;
  estimatedGas?: string;
  estimatedTime?: string;
  actualGas?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// Create intent request
export interface CreateIntentRequest {
  rawText: string;
  userAddress: string;
}

// Create intent response
export interface CreateIntentResponse {
  intent: Intent;
  message: string;
}

// Get intents params
export interface GetIntentsParams {
  address?: string;
  status?: IntentStatus;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Create a new intent
 */
export async function createIntent(
  rawText: string,
  userAddress: string
): Promise<CreateIntentResponse> {
  return api.post<CreateIntentResponse>('/api/intents', {
    rawText,
    userAddress,
  });
}

/**
 * Get a single intent by ID
 */
export async function getIntent(intentId: string): Promise<Intent> {
  const response = await api.get<{ intent: Intent }>(`/api/intents/${intentId}`);
  return response.intent;
}

/**
 * Get list of intents with optional filters
 */
export async function getIntents(
  params: GetIntentsParams = {}
): Promise<PaginatedResponse<Intent>> {
  const searchParams = new URLSearchParams();
  
  if (params.address) searchParams.set('address', params.address);
  if (params.status) searchParams.set('status', params.status);
  if (params.page) searchParams.set('page', params.page.toString());
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.sortBy) searchParams.set('sortBy', params.sortBy);
  if (params.sortOrder) searchParams.set('sortOrder', params.sortOrder);

  const queryString = searchParams.toString();
  const endpoint = `/api/intents${queryString ? `?${queryString}` : ''}`;
  
  return api.get<PaginatedResponse<Intent>>(endpoint);
}

/**
 * Cancel an intent (if possible)
 */
export async function cancelIntent(intentId: string): Promise<{ success: boolean; message: string }> {
  return api.post(`/api/intents/${intentId}/cancel`);
}

/**
 * Retry a failed intent
 */
export async function retryIntent(intentId: string): Promise<CreateIntentResponse> {
  return api.post<CreateIntentResponse>(`/api/intents/${intentId}/retry`);
}

/**
 * Get intent status (lightweight endpoint)
 */
export async function getIntentStatus(intentId: string): Promise<{
  id: string;
  status: IntentStatus;
  progress: number;
  message?: string;
}> {
  return api.get(`/api/intents/${intentId}/status`);
}

export default {
  createIntent,
  getIntent,
  getIntents,
  cancelIntent,
  retryIntent,
  getIntentStatus,
};
