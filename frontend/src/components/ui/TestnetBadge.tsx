/**
 * Testnet Badge Component
 * Displays a testnet indicator badge for chains and transactions
 */

import { cn } from '@/lib/utils';
import { isTestnetMode, isTestnetChain, getChainDisplayName, getChainIcon } from '@/lib/icons';
import { AlertTriangle } from 'lucide-react';

interface TestnetBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

/**
 * Generic testnet badge
 */
export function TestnetBadge({ 
  className, 
  size = 'sm',
  showIcon = true 
}: TestnetBadgeProps) {
  if (!isTestnetMode()) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border border-yellow-500/30 bg-yellow-500/10',
        size === 'sm' && 'px-1.5 py-0.5 text-[10px]',
        size === 'md' && 'px-2 py-1 text-xs',
        'font-medium text-yellow-600 dark:text-yellow-400',
        className
      )}
    >
      {showIcon && <AlertTriangle className={cn(size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />}
      Testnet
    </span>
  );
}

interface ChainBadgeProps {
  chainId: number;
  chainName?: string;
  showIcon?: boolean;
  showTestnetIndicator?: boolean;
  className?: string;
}

/**
 * Chain badge with icon and testnet indicator
 */
export function ChainBadge({
  chainId,
  chainName,
  showIcon = true,
  showTestnetIndicator = true,
  className,
}: ChainBadgeProps) {
  const displayName = chainName || getChainDisplayName(chainId, false);
  const isTestnet = isTestnetChain(chainId);
  const iconUrl = getChainIcon(chainId);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
        'bg-muted text-foreground',
        className
      )}
    >
      {showIcon && (
        <img
          src={iconUrl}
          alt={displayName}
          className="w-4 h-4 rounded-full"
          loading="lazy"
        />
      )}
      <span>{displayName}</span>
      {showTestnetIndicator && isTestnet && (
        <span className="px-1 py-0.5 text-[9px] bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded">
          TEST
        </span>
      )}
    </span>
  );
}

interface ChainPairProps {
  sourceChainId: number;
  destChainId: number;
  sourceChainName?: string;
  destChainName?: string;
  className?: string;
}

/**
 * Shows source → destination chain pair
 */
export function ChainPair({
  sourceChainId,
  destChainId,
  sourceChainName,
  destChainName,
  className,
}: ChainPairProps) {
  const sourceIcon = getChainIcon(sourceChainId);
  const destIcon = getChainIcon(destChainId);
  const sourceDisplay = sourceChainName || getChainDisplayName(sourceChainId, false);
  const destDisplay = destChainName || getChainDisplayName(destChainId, false);

  return (
    <div className={cn('flex items-center gap-2 text-xs', className)}>
      <div className="flex items-center gap-1">
        <img src={sourceIcon} alt={sourceDisplay} className="w-4 h-4 rounded-full" loading="lazy" />
        <span className="text-muted-foreground">{sourceDisplay}</span>
      </div>
      <span className="text-muted-foreground">→</span>
      <div className="flex items-center gap-1">
        <img src={destIcon} alt={destDisplay} className="w-4 h-4 rounded-full" loading="lazy" />
        <span className="text-muted-foreground">{destDisplay}</span>
      </div>
    </div>
  );
}
