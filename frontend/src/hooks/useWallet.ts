import { useEffect, useState, useCallback } from 'react';
import { useAccount, useBalance, useDisconnect, useSwitchChain } from 'wagmi';
import {
  formatAddress,
  formatBalance,
  getChainName,
  isChainSupported,
  saveLastConnectedAddress,
  getLastConnectedAddress,
  clearStoredWalletData,
  SUPPORTED_CHAINS,
} from '@/lib/wallet';

export interface UseWalletReturn {
  // Connection state
  address: string | undefined;
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  
  // Chain state
  chainId: number | undefined;
  chainName: string;
  isWrongNetwork: boolean;
  
  // Balance
  balance: bigint | undefined;
  formattedBalance: string;
  balanceLoading: boolean;
  
  // Actions
  disconnect: () => Promise<void>;
  switchToSupportedChain: (chainId?: number) => Promise<void>;
  
  // Formatted values
  formattedAddress: string;
  shortAddress: string;
  
  // Error state
  error: Error | null;
}

/**
 * Custom hook that wraps wagmi wallet functionality with enhanced features:
 * - Error handling
 * - LocalStorage persistence
 * - Balance formatting
 * - Chain validation
 * - Convenience methods
 */
export function useWallet(): UseWalletReturn {
  const [error, setError] = useState<Error | null>(null);
  
  // Core wagmi hooks
  const {
    address,
    isConnected,
    isConnecting,
    isReconnecting,
    chainId,
  } = useAccount();
  
  const { data: balanceData, isLoading: balanceLoading } = useBalance({
    address,
    query: {
      enabled: !!address && !!chainId,
    },
  });
  
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  
  // Derived state
  const isWrongNetwork = isConnected && !isChainSupported(chainId);
  const chainName = getChainName(chainId);
  const formattedAddress = formatAddress(address, 6, 4);
  const shortAddress = formatAddress(address, 4, 4);
  const formattedBalance = formatBalance(balanceData?.value);
  
  // Persist connected address to localStorage
  useEffect(() => {
    if (address && isConnected) {
      saveLastConnectedAddress(address);
    }
  }, [address, isConnected]);
  
  // Handle disconnection with cleanup
  const disconnect = useCallback(async () => {
    try {
      setError(null);
      clearStoredWalletData();
      wagmiDisconnect();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to disconnect wallet');
      setError(error);
      console.error('Disconnect error:', error);
    }
  }, [wagmiDisconnect]);
  
  // Switch to a supported chain (or first supported chain if none specified)
  const switchToSupportedChain = useCallback(async (targetChainId?: number) => {
    try {
      setError(null);
      
      // If no target specified, use first supported chain
      const chainToSwitch = targetChainId || SUPPORTED_CHAINS[0].id;
      
      if (!switchChain) {
        throw new Error('Chain switching not available');
      }
      
      switchChain({ chainId: chainToSwitch });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to switch network');
      setError(error);
      console.error('Network switch error:', error);
    }
  }, [switchChain]);
  
  // Auto-switch if on wrong network
  useEffect(() => {
    if (isWrongNetwork && !isSwitchingChain) {
      console.warn(`Connected to unsupported chain: ${chainId}. Supported chains:`, 
        SUPPORTED_CHAINS.map(c => `${c.name} (${c.id})`).join(', ')
      );
      // Note: Auto-switching disabled by default for better UX
      // User should manually switch via NetworkSwitcher component
    }
  }, [isWrongNetwork, chainId, isSwitchingChain]);
  
  // Log last connected address on mount (useful for debugging)
  useEffect(() => {
    const lastAddress = getLastConnectedAddress();
    if (lastAddress) {
      console.log('Last connected address:', lastAddress);
    }
  }, []);
  
  return {
    // Connection state
    address,
    isConnected,
    isConnecting,
    isReconnecting,
    
    // Chain state
    chainId,
    chainName,
    isWrongNetwork,
    
    // Balance
    balance: balanceData?.value,
    formattedBalance,
    balanceLoading,
    
    // Actions
    disconnect,
    switchToSupportedChain,
    
    // Formatted values
    formattedAddress,
    shortAddress,
    
    // Error state
    error,
  };
}
