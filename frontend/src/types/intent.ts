/**
 * Intent Types
 * Core types for intent creation, tracking, and management
 */

// ============================================================================
// Intent Status
// ============================================================================

export type IntentStatus =
  | 'PENDING'
  | 'VALIDATING'
  | 'VALIDATED'
  | 'ROUTING'
  | 'EXECUTING'
  | 'BRIDGING'
  | 'SETTLING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type IntentStep =
  | 'pending'
  | 'validating'
  | 'routing'
  | 'executing'
  | 'bridging'
  | 'settling'
  | 'completed'
  | 'failed';

// ============================================================================
// Token Information
// ============================================================================

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  chainId: number;
  logoUrl?: string;
}

// ============================================================================
// Route Step
// ============================================================================

export interface RouteStep {
  type: 'swap' | 'bridge' | 'transfer';
  protocol: string;
  fromToken: TokenInfo;
  toToken: TokenInfo;
  fromChain: number;
  toChain: number;
  estimatedGas?: string;
  estimatedTime?: number; // in seconds
}

// ============================================================================
// Intent
// ============================================================================

export interface Intent {
  id: string;
  rawText: string;
  status: IntentStatus;
  
  // Parsed intent details
  sourceChain: number | null;
  destChain: number | null;
  sourceToken: string | null;
  destToken: string | null;
  amount: string | null;
  recipient?: string;
  
  // Execution details
  route?: RouteStep[];
  estimatedCost: string | null;
  actualCost: string | null;
  estimatedTime?: number;
  
  // Transaction hashes
  txHash?: string;
  ccipMessageId?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  
  // User info
  userAddress: string;
}

export interface IntentListItem {
  id: string;
  rawText: string;
  status: IntentStatus;
  sourceChain: string | null;
  destChain: string | null;
  sourceToken: string | null;
  destToken: string | null;
  amount: string | null;
  estimatedCost: string | null;
  actualCost: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

// ============================================================================
// Intent Creation
// ============================================================================

export interface CreateIntentRequest {
  rawText: string;
  walletAddress: string;
}

export interface CreateIntentResponse {
  success: boolean;
  intentId: string;
  message?: string;
}

// ============================================================================
// Intent Tracking
// ============================================================================

export interface IntentTrackingStatus {
  intentId: string;
  status: IntentStatus;
  step: IntentStep;
  progress: number; // 0-100
  message?: string;
  estimatedTimeRemaining?: number;
  txHash?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Status Configuration
// ============================================================================

export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  description?: string;
}

export const STATUS_CONFIG: Record<IntentStatus, StatusConfig> = {
  PENDING: {
    label: 'Pending',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    description: 'Intent received and queued',
  },
  VALIDATING: {
    label: 'Validating',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    description: 'Validating intent parameters',
  },
  VALIDATED: {
    label: 'Validated',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    description: 'Intent validated successfully',
  },
  ROUTING: {
    label: 'Routing',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    description: 'Finding optimal route',
  },
  EXECUTING: {
    label: 'Executing',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    description: 'Executing transaction',
  },
  BRIDGING: {
    label: 'Bridging',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    description: 'Cross-chain transfer in progress',
  },
  SETTLING: {
    label: 'Settling',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    description: 'Finalizing settlement',
  },
  COMPLETED: {
    label: 'Completed',
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    description: 'Intent completed successfully',
  },
  FAILED: {
    label: 'Failed',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    description: 'Intent failed',
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
    description: 'Intent cancelled by user',
  },
};
