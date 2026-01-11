import { formatUnits } from 'viem';
import { arbitrumSepolia, baseSepolia } from 'wagmi/chains';
import type { Chain } from 'wagmi/chains';

/**
 * Supported chains for the application
 */
export const SUPPORTED_CHAINS = [arbitrumSepolia, baseSepolia];

/**
 * Formats an Ethereum address to a shortened version
 * @param address - Full Ethereum address
 * @param prefixLength - Number of characters to show at start (default: 6)
 * @param suffixLength - Number of characters to show at end (default: 4)
 * @returns Formatted address like "0x1234...5678"
 */
export function formatAddress(
  address: string | undefined,
  prefixLength = 6,
  suffixLength = 4
): string {
  if (!address) return '';
  if (address.length < prefixLength + suffixLength) return address;
  
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`;
}

/**
 * Formats a balance value for display
 * @param balance - Balance in wei as bigint
 * @param decimals - Token decimals (default: 18 for ETH)
 * @param displayDecimals - Number of decimals to show (default: 4)
 * @returns Formatted balance string like "1.2345"
 */
export function formatBalance(
  balance: bigint | undefined,
  decimals = 18,
  displayDecimals = 4
): string {
  if (balance === undefined) return '0.0000';
  
  const formatted = formatUnits(balance, decimals);
  const num = parseFloat(formatted);
  
  // Handle very small numbers
  if (num < 0.0001 && num > 0) return '<0.0001';
  
  return num.toFixed(displayDecimals);
}

/**
 * Gets a user-friendly chain name
 * @param chainId - Chain ID
 * @returns Chain name or "Unknown Network"
 */
export function getChainName(chainId: number | undefined): string {
  if (!chainId) return 'Unknown Network';
  
  const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
  return chain?.name || 'Unknown Network';
}

/**
 * Checks if a chain is supported by the application
 * @param chainId - Chain ID to check
 * @returns True if chain is supported
 */
export function isChainSupported(chainId: number | undefined): boolean {
  if (!chainId) return false;
  return SUPPORTED_CHAINS.some(chain => chain.id === chainId);
}

/**
 * Gets the chain object by ID
 * @param chainId - Chain ID
 * @returns Chain object or undefined
 */
export function getChainById(chainId: number | undefined): Chain | undefined {
  if (!chainId) return undefined;
  return SUPPORTED_CHAINS.find(c => c.id === chainId);
}

/**
 * LocalStorage keys for wallet persistence
 */
export const STORAGE_KEYS = {
  LAST_CONNECTED_ADDRESS: 'swoosh_last_connected_address',
  LAST_CONNECTED_CHAIN: 'swoosh_last_connected_chain',
} as const;

/**
 * Stores the last connected wallet address
 */
export function saveLastConnectedAddress(address: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_CONNECTED_ADDRESS, address);
  } catch (error) {
    console.error('Failed to save last connected address:', error);
  }
}

/**
 * Retrieves the last connected wallet address
 */
export function getLastConnectedAddress(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_CONNECTED_ADDRESS);
  } catch (error) {
    console.error('Failed to get last connected address:', error);
    return null;
  }
}

/**
 * Clears stored wallet data
 */
export function clearStoredWalletData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.LAST_CONNECTED_ADDRESS);
    localStorage.removeItem(STORAGE_KEYS.LAST_CONNECTED_CHAIN);
  } catch (error) {
    console.error('Failed to clear stored wallet data:', error);
  }
}
