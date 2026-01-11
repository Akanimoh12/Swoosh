import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWallet } from '@/hooks/useWallet';
import { cn } from '@/lib/utils';

export function WalletButton() {
  const { isWrongNetwork } = useWallet();

  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        // Loading state
        const ready = mounted && authenticationStatus !== 'loading';
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus || authenticationStatus === 'authenticated');

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              // Not connected - show Connect button
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
                  >
                    Connect Wallet
                  </button>
                );
              }

              // Wrong network - show switch network button
              if (chain.unsupported || isWrongNetwork) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
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
                    Wrong Network
                  </button>
                );
              }

              // Connected - show wallet info
              return (
                <div className="flex items-center gap-2">
                  {/* Chain selector */}
                  <button
                    onClick={openChainModal}
                    type="button"
                    className={cn(
                      "px-3 py-2 rounded-lg bg-secondary text-secondary-foreground font-medium hover:bg-secondary/80 transition-colors flex items-center gap-2",
                      "border border-border"
                    )}
                  >
                    {chain.hasIcon && (
                      <div
                        className="w-4 h-4 rounded-full overflow-hidden"
                        style={{
                          background: chain.iconBackground,
                        }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            className="w-4 h-4"
                          />
                        )}
                      </div>
                    )}
                    <span className="hidden sm:inline">{chain.name}</span>
                  </button>

                  {/* Account button */}
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className={cn(
                      "px-4 py-2 rounded-lg bg-card text-card-foreground font-medium hover:bg-accent transition-colors",
                      "border border-border flex items-center gap-2"
                    )}
                  >
                    {/* Balance */}
                    {account.displayBalance && (
                      <span className="hidden md:inline text-muted-foreground">
                        {account.displayBalance}
                      </span>
                    )}
                    
                    {/* Address */}
                    <span className="font-mono">
                      {account.displayName}
                    </span>
                    
                    {/* Dropdown icon */}
                    <svg
                      className="w-4 h-4 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
