import { useEffect, useState } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { SUPPORTED_CHAINS } from '@/lib/wallet';
import { cn } from '@/lib/utils';

interface NetworkSwitcherProps {
  autoSwitch?: boolean;
  className?: string;
}

/**
 * Component that displays a warning when connected to wrong network
 * and provides a button to switch to a supported network
 */
export function NetworkSwitcher({ autoSwitch = false, className }: NetworkSwitcherProps) {
  const { isWrongNetwork, chainName, switchToSupportedChain, isConnected } = useWallet();
  const [isSwitching, setIsSwitching] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Show banner when on wrong network
  useEffect(() => {
    if (isWrongNetwork && isConnected) {
      setShowBanner(true);
    } else {
      setShowBanner(false);
      setIsSwitching(false);
    }
  }, [isWrongNetwork, isConnected]);

  // Auto-switch if enabled
  useEffect(() => {
    if (autoSwitch && isWrongNetwork && !isSwitching) {
      handleSwitch();
    }
  }, [autoSwitch, isWrongNetwork]);

  const handleSwitch = async () => {
    setIsSwitching(true);
    try {
      await switchToSupportedChain();
    } catch (error) {
      console.error('Failed to switch network:', error);
      setIsSwitching(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div
      className={cn(
        'bg-destructive/10 border border-destructive/20 rounded-lg p-4',
        'flex items-start gap-3',
        className
      )}
    >
      {/* Warning icon */}
      <div className="flex-shrink-0 mt-0.5">
        <svg
          className="w-5 h-5 text-destructive"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-destructive mb-1">
          Wrong Network
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          You're connected to <span className="font-medium">{chainName}</span>. 
          This app only supports:{' '}
          <span className="font-medium">
            {SUPPORTED_CHAINS.map(c => c.name).join(', ')}
          </span>
        </p>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSwitch}
            disabled={isSwitching}
            className={cn(
              'px-3 py-1.5 rounded-md bg-destructive text-destructive-foreground text-sm font-medium',
              'hover:opacity-90 transition-opacity',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSwitching ? (
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Switching...
              </span>
            ) : (
              `Switch to ${SUPPORTED_CHAINS[0].name}`
            )}
          </button>

          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}
