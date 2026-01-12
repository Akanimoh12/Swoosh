import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ChevronDown, Search, CheckCircle2, ExternalLink } from 'lucide-react';
import { getChainIcon, isTestnetMode } from '@/lib/icons';

export interface Chain {
  id: number;
  name: string;
  shortName: string;
  logoUrl?: string;
  rpcUrl?: string;
  blockExplorer?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  isTestnet?: boolean;
  disabled?: boolean;
  faucetUrl?: string;
}

export interface ChainSelectorProps {
  selectedChain: Chain;
  chains: Chain[];
  onChainSelect: (chain: Chain) => void;
  label?: string;
  disabled?: boolean;
  showTestnets?: boolean;
  showTestnetBadge?: boolean;
}

const DEFAULT_CHAINS: Chain[] = [
  {
    id: 421614,
    name: 'Arbitrum Sepolia',
    shortName: 'Arb Sepolia',
    logoUrl: getChainIcon(421614),
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://sepolia.arbiscan.io',
    isTestnet: true,
    faucetUrl: 'https://www.alchemy.com/faucets/arbitrum-sepolia',
  },
  {
    id: 84532,
    name: 'Base Sepolia',
    shortName: 'Base Sepolia',
    logoUrl: getChainIcon(84532),
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://sepolia.basescan.org',
    isTestnet: true,
    faucetUrl: 'https://www.alchemy.com/faucets/base-sepolia',
  },
  // Mainnets disabled for now
  {
    id: 42161,
    name: 'Arbitrum One',
    shortName: 'Arbitrum',
    logoUrl: getChainIcon(42161),
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://arbiscan.io',
    isTestnet: false,
    disabled: isTestnetMode(), // Disabled in testnet mode
  },
  {
    id: 8453,
    name: 'Base',
    shortName: 'Base',
    logoUrl: getChainIcon(8453),
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://basescan.org',
    isTestnet: false,
    disabled: isTestnetMode(), // Disabled in testnet mode
  },
];

export function ChainSelector({
  selectedChain,
  chains = DEFAULT_CHAINS,
  onChainSelect,
  label = "Select Chain",
  disabled = false,
  showTestnets = true,
  showTestnetBadge = true
}: ChainSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChains = useMemo(() => {
    let filtered = chains;

    // In testnet mode, only show testnets
    if (isTestnetMode()) {
      filtered = filtered.filter(c => c.isTestnet || !c.disabled);
    } else if (!showTestnets) {
      filtered = filtered.filter(c => !c.isTestnet);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        c => c.name.toLowerCase().includes(query) || 
             c.shortName.toLowerCase().includes(query) ||
             c.id.toString().includes(query)
      );
    }

    return filtered;
  }, [chains, searchQuery, showTestnets]);

  const handleChainSelect = (chain: Chain) => {
    if (!chain.disabled) {
      onChainSelect(chain);
      setIsDropdownOpen(false);
      setSearchQuery('');
    }
  };

  // Get chain logo - now uses real icons from CDN
  const getChainLogo = (chain: Chain) => {
    // Use the logoUrl if provided, otherwise fetch from icons lib
    const iconUrl = chain.logoUrl || getChainIcon(chain.id);
    return { type: 'image' as const, value: iconUrl };
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      
      <div className="relative">
        <Button
          variant="outline"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={disabled}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-3">
            <img 
              src={getChainLogo(selectedChain).value} 
              alt={selectedChain.name} 
              className="w-6 h-6 rounded-full object-cover"
              loading="lazy"
            />
            <div className="text-left">
              <div className="flex items-center gap-2">
                <span className="font-medium">{selectedChain.name}</span>
                {showTestnetBadge && selectedChain.isTestnet && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 rounded border border-yellow-500/30">
                    Testnet
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                {selectedChain.nativeCurrency.symbol}
              </div>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 ml-2" />
        </Button>

        {/* Dropdown */}
        {isDropdownOpen && (
          <div className="absolute left-0 top-full mt-2 w-full bg-card border border-border rounded-lg shadow-lg z-50">
            {/* Search */}
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chains..."
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Chain List */}
            <div className="max-h-[320px] overflow-y-auto">
              {filteredChains.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No chains found
                </div>
              ) : (
                <>
                  {/* Mainnets */}
                  {filteredChains.filter(c => !c.isTestnet).length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/50">
                        MAINNETS
                      </div>
                      {filteredChains.filter(c => !c.isTestnet).map((chain) => (
                        <ChainItem
                          key={chain.id}
                          chain={chain}
                          isSelected={selectedChain.id === chain.id}
                          onSelect={handleChainSelect}
                        />
                      ))}
                    </div>
                  )}

                  {/* Testnets */}
                  {showTestnets && filteredChains.filter(c => c.isTestnet).length > 0 && (
                    <div>
                      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground bg-muted/50">
                        TESTNETS
                      </div>
                      {filteredChains.filter(c => c.isTestnet).map((chain) => (
                        <ChainItem
                          key={chain.id}
                          chain={chain}
                          isSelected={selectedChain.id === chain.id}
                          onSelect={handleChainSelect}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Overlay to close dropdown */}
      {isDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsDropdownOpen(false)}
        />
      )}
    </div>
  );
}

interface ChainItemProps {
  chain: Chain;
  isSelected: boolean;
  onSelect: (chain: Chain) => void;
}

function ChainItem({ chain, isSelected, onSelect }: ChainItemProps) {
  // Always use CDN icons
  const iconUrl = chain.logoUrl || getChainIcon(chain.id);

  return (
    <button
      onClick={() => onSelect(chain)}
      disabled={chain.disabled}
      className={`w-full px-4 py-3 flex items-center justify-between transition-colors text-left ${
        chain.disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:bg-accent cursor-pointer'
      } ${isSelected ? 'bg-accent' : ''}`}
    >
      <div className="flex items-center gap-3">
        <img 
          src={iconUrl} 
          alt={chain.name} 
          className="w-7 h-7 rounded-full object-cover"
          loading="lazy"
          onError={(e) => {
            // Fallback to placeholder on error
            (e.target as HTMLImageElement).src = `data:image/svg+xml,${encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
                <circle cx="14" cy="14" r="14" fill="#6366f1"/>
                <text x="14" y="18" font-size="12" fill="white" text-anchor="middle" font-family="system-ui">${chain.shortName[0]}</text>
              </svg>
            `)}`;
          }}
        />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{chain.name}</span>
            {chain.isTestnet && (
              <Badge variant="outline" className="text-xs py-0 px-1 border-yellow-500/50 text-yellow-600 dark:text-yellow-400">
                Testnet
              </Badge>
            )}
            {chain.disabled && (
              <Badge variant="outline" className="text-xs py-0 px-1 border-muted-foreground/50 text-muted-foreground">
                Coming Soon
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>Chain ID: {chain.id}</span>
            <span>•</span>
            <span>{chain.nativeCurrency.symbol}</span>
            {chain.faucetUrl && (
              <>
                <span>•</span>
                <a 
                  href={chain.faucetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  Faucet
                  <ExternalLink className="w-3 h-3" />
                </a>
              </>
            )}
          </div>
        </div>
      </div>
      {isSelected && (
        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
      )}
    </button>
  );
}
