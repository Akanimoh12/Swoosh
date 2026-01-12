/**
 * Type definitions for the application
 */

import { z } from 'zod';

// Parsed intent structure
export const ParsedIntentSchema = z.object({
  action: z.enum(['swap', 'bridge', 'send']),
  sourceChain: z.number().int().positive(),
  destinationChain: z.number().int().positive(),
  tokenIn: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  tokenOut: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  amount: z.string(), // Amount in smallest unit (wei)
  recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  slippageTolerance: z.number().min(0).max(50).default(0.5), // Percentage
});

export type ParsedIntent = z.infer<typeof ParsedIntentSchema>;

// Route step types
export enum RouteStepType {
  SWAP = 'SWAP',
  BRIDGE = 'BRIDGE',
  TRANSFER = 'TRANSFER',
}

// Single route step
export interface RouteStep {
  type: RouteStepType;
  chainId: number;
  protocol: string; // e.g., '1inch', 'CCIP', 'native'
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
  data: string; // Calldata for execution
  estimatedGas: string;
}

// Complete route
export interface Route {
  steps: RouteStep[];
  totalCost: string; // Total cost in USD
  estimatedTime: number; // Estimated time in seconds
  confidence: number; // Confidence score 0-100
}

// API request/response types
export const ParseIntentRequestSchema = z.object({
  text: z.string().min(1).max(500),
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

export type ParseIntentRequest = z.infer<typeof ParseIntentRequestSchema>;

export const OptimizeRouteRequestSchema = z.object({
  intent: ParsedIntentSchema,
  userAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

export type OptimizeRouteRequest = z.infer<typeof OptimizeRouteRequestSchema>;

// Standard API response
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  requestId?: string;
}

// Intent status response
export interface IntentStatusResponse {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  rawInput: string;
  parsedData: ParsedIntent | null;
  routes: Route[];
  createdAt: string;
  updatedAt: string;
}
