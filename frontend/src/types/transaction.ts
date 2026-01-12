/**
 * Transaction Types
 * Types for transaction tracking and history
 */

// ============================================================================
// Transaction Status
// ============================================================================

export type TransactionStatus =
  | 'pending'
  | 'submitted'
  | 'confirming'
  | 'confirmed'
  | 'failed'
  | 'replaced';

// ============================================================================
// Transaction Step
// ============================================================================

export interface TransactionStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  txHash?: string;
  chainId?: number;
  blockNumber?: number;
  timestamp?: string;
  gasUsed?: string;
  error?: string;
}

// ============================================================================
// Transaction
// ============================================================================

export interface Transaction {
  hash: string;
  chainId: number;
  from: string;
  to: string;
  value: string;
  data?: string;
  
  // Gas info
  gasLimit?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  gasUsed?: string;
  
  // Status
  status: TransactionStatus;
  blockNumber?: number;
  blockHash?: string;
  confirmations?: number;
  
  // Timestamps
  submittedAt: string;
  confirmedAt?: string;
  
  // Intent reference
  intentId?: string;
}

// ============================================================================
// Cross-Chain Transaction
// ============================================================================

export interface CrossChainTransaction {
  id: string;
  sourceTransaction: Transaction;
  destinationTransaction?: Transaction;
  
  // CCIP specific
  ccipMessageId?: string;
  ccipStatus?: 'pending' | 'in_transit' | 'delivered' | 'failed';
  
  // Bridge info
  bridgeProtocol: string;
  sourceChainId: number;
  destChainId: number;
  
  // Amount info
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut?: string;
  
  // Timing
  estimatedTime: number; // seconds
  actualTime?: number;
}

// ============================================================================
// Transaction Receipt
// ============================================================================

export interface TransactionReceipt {
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  blockNumber: number;
  from: string;
  to: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  effectiveGasPrice: string;
  status: 'success' | 'reverted';
  logs: TransactionLog[];
}

export interface TransactionLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  blockHash: string;
  logIndex: number;
  removed: boolean;
}
