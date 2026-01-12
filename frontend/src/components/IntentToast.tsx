/**
 * Intent Toast Notifications
 * Toast notification handlers for intent status updates
 * Uses Sonner for beautiful, accessible notifications
 */

import { toast } from 'sonner';
import React from 'react';

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

interface IntentStatusUpdate {
  intentId: string;
  status: IntentStep;
  previousStatus?: IntentStep;
  txHash?: string;
  ccipMessageId?: string;
  errorMessage?: string;
  fromToken?: string;
  toToken?: string;
  amount?: string;
}

// Toast messages configuration
const TOAST_CONFIG: Record<
  IntentStep,
  {
    title: string;
    description: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'loading';
  }
> = {
  pending: {
    title: 'Intent Submitted',
    description: 'Your cross-chain swap has been queued',
    type: 'info',
  },
  validating: {
    title: 'Validating Intent',
    description: 'Checking parameters and balances...',
    type: 'loading',
  },
  validated: {
    title: 'Intent Validated',
    description: 'Parameters verified, preparing execution',
    type: 'success',
  },
  routing: {
    title: 'Finding Best Route',
    description: 'Optimizing your swap path...',
    type: 'loading',
  },
  swapping: {
    title: 'Executing Swap',
    description: 'Transaction submitted to source chain',
    type: 'loading',
  },
  swapped: {
    title: 'Swap Complete',
    description: 'Tokens swapped, initiating bridge',
    type: 'success',
  },
  bridging: {
    title: 'Bridge Initiated',
    description: 'CCIP message sent to destination chain',
    type: 'loading',
  },
  bridge_pending: {
    title: 'Bridge in Progress',
    description: 'Cross-chain transfer underway (~2-5 min)',
    type: 'loading',
  },
  bridge_completed: {
    title: 'Bridge Complete',
    description: 'Assets arrived on destination chain',
    type: 'success',
  },
  settling: {
    title: 'Settling Transaction',
    description: 'Finalizing your cross-chain swap',
    type: 'loading',
  },
  completed: {
    title: 'Swap Complete! 🎉',
    description: 'Your cross-chain swap was successful',
    type: 'success',
  },
  failed: {
    title: 'Swap Failed',
    description: 'Something went wrong with your swap',
    type: 'error',
  },
};

// Track active toasts to update them
const activeToasts = new Map<string, string | number>();

/**
 * Show a toast for intent status update
 */
export function showIntentToast(update: IntentStatusUpdate): void {
  const { intentId, status, txHash, ccipMessageId, errorMessage } = update;
  const config = TOAST_CONFIG[status];
  const toastKey = `intent-${intentId}`;
  const existingToastId = activeToasts.get(toastKey);

  // Build description with optional links
  let description = config.description;
  if (errorMessage && status === 'failed') {
    description = errorMessage;
  }

  // Common toast options
  const options = {
    id: existingToastId || toastKey,
    duration: status === 'completed' || status === 'failed' ? 10000 : Infinity,
    description,
    action: txHash
      ? {
          label: 'View TX',
          onClick: () => window.open(`https://sepolia.arbiscan.io/tx/${txHash}`, '_blank'),
        }
      : ccipMessageId
        ? {
            label: 'Track',
            onClick: () =>
              window.open(`https://ccip.chain.link/msg/${ccipMessageId}`, '_blank'),
          }
        : undefined,
  };

  // Dismiss existing and show new based on type
  if (existingToastId) {
    toast.dismiss(existingToastId);
  }

  let toastId: string | number;

  switch (config.type) {
    case 'success':
      toastId = toast.success(config.title, options);
      break;
    case 'error':
      toastId = toast.error(config.title, options);
      break;
    case 'warning':
      toastId = toast.warning(config.title, options);
      break;
    case 'loading':
      toastId = toast.loading(config.title, options);
      break;
    default:
      toastId = toast.info(config.title, options);
  }

  activeToasts.set(toastKey, toastId);

  // Clean up completed/failed toasts after duration
  if (status === 'completed' || status === 'failed') {
    setTimeout(() => {
      activeToasts.delete(toastKey);
    }, 10000);
  }
}

/**
 * Show a custom intent toast with JSX content
 */
export function showCustomIntentToast(
  intentId: string,
  content: {
    title: string;
    description: string;
    icon?: React.ReactNode;
    action?: { label: string; onClick: () => void };
  }
): void {
  const toastKey = `intent-${intentId}`;

  toast.custom(
    (t) => (
      <div className="flex items-start gap-3 rounded-lg bg-white p-4 shadow-lg dark:bg-gray-800">
        {content.icon && <div className="flex-shrink-0">{content.icon}</div>}
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-white">{content.title}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">{content.description}</p>
        </div>
        {content.action && (
          <button
            onClick={() => {
              content.action?.onClick();
              toast.dismiss(t);
            }}
            className="text-sm font-medium text-blue-500 hover:text-blue-600"
          >
            {content.action.label}
          </button>
        )}
      </div>
    ),
    { id: toastKey, duration: 5000 }
  );
}

/**
 * Dismiss all toasts for an intent
 */
export function dismissIntentToast(intentId: string): void {
  const toastKey = `intent-${intentId}`;
  const toastId = activeToasts.get(toastKey);
  if (toastId) {
    toast.dismiss(toastId);
    activeToasts.delete(toastKey);
  }
}

/**
 * Show transaction submitted toast
 */
export function showTxSubmittedToast(txHash: string, chainName: string = 'Arbitrum'): void {
  toast.success('Transaction Submitted', {
    description: `Waiting for confirmation on ${chainName}`,
    action: {
      label: 'View',
      onClick: () => window.open(`https://sepolia.arbiscan.io/tx/${txHash}`, '_blank'),
    },
    duration: 5000,
  });
}

/**
 * Show transaction confirmed toast
 */
export function showTxConfirmedToast(txHash: string): void {
  toast.success('Transaction Confirmed', {
    description: 'Your transaction has been confirmed on-chain',
    action: {
      label: 'View',
      onClick: () => window.open(`https://sepolia.arbiscan.io/tx/${txHash}`, '_blank'),
    },
    duration: 5000,
  });
}

/**
 * Show error toast
 */
export function showErrorToast(message: string, details?: string): void {
  toast.error(message, {
    description: details,
    duration: 8000,
  });
}

/**
 * Show wallet connection toast
 */
export function showWalletConnectedToast(address: string): void {
  const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
  toast.success('Wallet Connected', {
    description: `Connected to ${shortAddress}`,
    duration: 3000,
  });
}

/**
 * Show insufficient balance toast
 */
export function showInsufficientBalanceToast(token: string, required: string, available: string): void {
  toast.error('Insufficient Balance', {
    description: `Need ${required} ${token}, but only have ${available} ${token}`,
    duration: 8000,
  });
}

/**
 * Show CCIP message tracking toast
 */
export function showCCIPTrackingToast(messageId: string): void {
  toast.info('CCIP Message Sent', {
    description: 'Track your cross-chain message delivery',
    action: {
      label: 'Track',
      onClick: () => window.open(`https://ccip.chain.link/msg/${messageId}`, '_blank'),
    },
    duration: Infinity,
    id: `ccip-${messageId}`,
  });
}

/**
 * Update CCIP tracking toast to completed
 */
export function updateCCIPToastCompleted(messageId: string): void {
  toast.dismiss(`ccip-${messageId}`);
  toast.success('CCIP Transfer Complete', {
    description: 'Cross-chain message delivered successfully',
    duration: 5000,
  });
}

// Export toast utility for direct use
export { toast };
