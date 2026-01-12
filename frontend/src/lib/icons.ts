/**
 * Chain and Token Icons Library
 * Provides consistent icon URLs for chains and tokens throughout the app
 */

// ============================================================================
// Chain Icons
// ============================================================================

export interface ChainIconConfig {
  chainId: number;
  name: string;
  displayName: string;
  iconUrl: string;
  isTestnet: boolean;
  faucetUrl?: string;
  blockExplorerUrl: string;
}

/**
 * Chain icon URLs using llamao.fi CDN
 * These are high-quality, consistently sized chain logos
 */
export const CHAIN_ICONS: Record<number, ChainIconConfig> = {
  // Testnets (Primary for Swoosh)
  421614: {
    chainId: 421614,
    name: 'arbitrumSepolia',
    displayName: 'Arbitrum Sepolia',
    iconUrl: 'https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg',
    isTestnet: true,
    faucetUrl: 'https://www.alchemy.com/faucets/arbitrum-sepolia',
    blockExplorerUrl: 'https://sepolia.arbiscan.io',
  },
  84532: {
    chainId: 84532,
    name: 'baseSepolia',
    displayName: 'Base Sepolia',
    iconUrl: 'https://icons.llamao.fi/icons/chains/rsz_base.jpg',
    isTestnet: true,
    faucetUrl: 'https://www.alchemy.com/faucets/base-sepolia',
    blockExplorerUrl: 'https://sepolia.basescan.org',
  },
  // Mainnets (Future support)
  42161: {
    chainId: 42161,
    name: 'arbitrum',
    displayName: 'Arbitrum One',
    iconUrl: 'https://icons.llamao.fi/icons/chains/rsz_arbitrum.jpg',
    isTestnet: false,
    blockExplorerUrl: 'https://arbiscan.io',
  },
  8453: {
    chainId: 8453,
    name: 'base',
    displayName: 'Base',
    iconUrl: 'https://icons.llamao.fi/icons/chains/rsz_base.jpg',
    isTestnet: false,
    blockExplorerUrl: 'https://basescan.org',
  },
  1: {
    chainId: 1,
    name: 'ethereum',
    displayName: 'Ethereum',
    iconUrl: 'https://icons.llamao.fi/icons/chains/rsz_ethereum.jpg',
    isTestnet: false,
    blockExplorerUrl: 'https://etherscan.io',
  },
  10: {
    chainId: 10,
    name: 'optimism',
    displayName: 'Optimism',
    iconUrl: 'https://icons.llamao.fi/icons/chains/rsz_optimism.jpg',
    isTestnet: false,
    blockExplorerUrl: 'https://optimistic.etherscan.io',
  },
};

/**
 * Get chain icon URL by chain ID
 */
export function getChainIcon(chainId: number): string {
  return CHAIN_ICONS[chainId]?.iconUrl || getPlaceholderIcon('chain');
}

/**
 * Get chain config by ID
 */
export function getChainConfig(chainId: number): ChainIconConfig | undefined {
  return CHAIN_ICONS[chainId];
}

/**
 * Get chain display name with testnet suffix if applicable
 */
export function getChainDisplayName(chainId: number, includeTestnet = true): string {
  const config = CHAIN_ICONS[chainId];
  if (!config) return `Chain ${chainId}`;
  
  if (includeTestnet && config.isTestnet && !config.displayName.includes('Sepolia')) {
    return `${config.displayName} Testnet`;
  }
  return config.displayName;
}

/**
 * Check if chain is testnet
 */
export function isTestnetChain(chainId: number): boolean {
  return CHAIN_ICONS[chainId]?.isTestnet ?? false;
}

/**
 * Get faucet URL for testnet chain
 */
export function getFaucetUrl(chainId: number): string | undefined {
  return CHAIN_ICONS[chainId]?.faucetUrl;
}

// ============================================================================
// Token Icons
// ============================================================================

export interface TokenIconConfig {
  symbol: string;
  name: string;
  iconUrl: string;
  coingeckoId?: string;
  decimals: number;
}

/**
 * Token icon URLs using CoinGecko CDN
 * Fallback to Trust Wallet assets if needed
 */
export const TOKEN_ICONS: Record<string, TokenIconConfig> = {
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    iconUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    coingeckoId: 'ethereum',
    decimals: 18,
  },
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    iconUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
    coingeckoId: 'weth',
    decimals: 18,
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    iconUrl: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
    coingeckoId: 'usd-coin',
    decimals: 6,
  },
  USDT: {
    symbol: 'USDT',
    name: 'Tether USD',
    iconUrl: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
    coingeckoId: 'tether',
    decimals: 6,
  },
  DAI: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    iconUrl: 'https://assets.coingecko.com/coins/images/9956/small/Badge_Dai.png',
    coingeckoId: 'dai',
    decimals: 18,
  },
  WBTC: {
    symbol: 'WBTC',
    name: 'Wrapped Bitcoin',
    iconUrl: 'https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png',
    coingeckoId: 'wrapped-bitcoin',
    decimals: 8,
  },
  ARB: {
    symbol: 'ARB',
    name: 'Arbitrum',
    iconUrl: 'https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg',
    coingeckoId: 'arbitrum',
    decimals: 18,
  },
  LINK: {
    symbol: 'LINK',
    name: 'Chainlink',
    iconUrl: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
    coingeckoId: 'chainlink',
    decimals: 18,
  },
};

/**
 * Get token icon URL by symbol
 */
export function getTokenIcon(symbol: string): string {
  const upperSymbol = symbol.toUpperCase();
  return TOKEN_ICONS[upperSymbol]?.iconUrl || getPlaceholderIcon('token');
}

/**
 * Get token config by symbol
 */
export function getTokenConfig(symbol: string): TokenIconConfig | undefined {
  return TOKEN_ICONS[symbol.toUpperCase()];
}

// ============================================================================
// Protocol Icons
// ============================================================================

export interface ProtocolIconConfig {
  id: string;
  name: string;
  iconUrl: string;
}

/**
 * Protocol/DEX icon URLs
 */
export const PROTOCOL_ICONS: Record<string, ProtocolIconConfig> = {
  uniswap: {
    id: 'uniswap',
    name: 'Uniswap',
    iconUrl: 'https://assets.coingecko.com/coins/images/12504/small/uni.jpg',
  },
  sushiswap: {
    id: 'sushiswap',
    name: 'SushiSwap',
    iconUrl: 'https://assets.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png',
  },
  ccip: {
    id: 'ccip',
    name: 'Chainlink CCIP',
    iconUrl: 'https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png',
  },
  '1inch': {
    id: '1inch',
    name: '1inch',
    iconUrl: 'https://assets.coingecko.com/coins/images/13469/small/1inch-token.png',
  },
  curve: {
    id: 'curve',
    name: 'Curve',
    iconUrl: 'https://assets.coingecko.com/coins/images/12124/small/Curve.png',
  },
  balancer: {
    id: 'balancer',
    name: 'Balancer',
    iconUrl: 'https://assets.coingecko.com/coins/images/11683/small/Balancer.png',
  },
};

/**
 * Get protocol icon URL by ID
 */
export function getProtocolIcon(protocolId: string): string {
  return PROTOCOL_ICONS[protocolId.toLowerCase()]?.iconUrl || getPlaceholderIcon('protocol');
}

// ============================================================================
// Placeholder Icons
// ============================================================================

/**
 * Get placeholder icon for unknown chains/tokens
 */
export function getPlaceholderIcon(type: 'chain' | 'token' | 'protocol'): string {
  // Using a simple data URI for a gray circle placeholder
  // In production, you might use a hosted placeholder image
  const colors = {
    chain: '6366f1', // Indigo
    token: '8b5cf6', // Purple
    protocol: '06b6d4', // Cyan
  };
  
  const color = colors[type];
  return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      <circle cx="16" cy="16" r="16" fill="#${color}"/>
      <text x="16" y="21" font-size="14" fill="white" text-anchor="middle" font-family="system-ui">?</text>
    </svg>
  `)}`;
}

// ============================================================================
// Network Mode
// ============================================================================

/**
 * Current network mode from environment
 */
export const NETWORK_MODE = import.meta.env.VITE_NETWORK_MODE || 'testnet';

/**
 * Check if currently in testnet mode
 */
export function isTestnetMode(): boolean {
  return NETWORK_MODE === 'testnet';
}

/**
 * Get supported chain IDs based on network mode
 */
export function getSupportedChainIds(): number[] {
  if (NETWORK_MODE === 'mainnet') {
    return [42161, 8453]; // Arbitrum One, Base
  }
  if (NETWORK_MODE === 'all') {
    return [421614, 84532, 42161, 8453]; // All chains
  }
  // Default: testnet
  return [421614, 84532]; // Arbitrum Sepolia, Base Sepolia
}

/**
 * Get supported chain configs based on network mode
 */
export function getSupportedChains(): ChainIconConfig[] {
  return getSupportedChainIds()
    .map(id => CHAIN_ICONS[id])
    .filter((c): c is ChainIconConfig => c !== undefined);
}
