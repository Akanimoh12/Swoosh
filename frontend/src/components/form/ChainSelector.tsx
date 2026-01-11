import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ChevronDown, Search, CheckCircle2 } from 'lucide-react';

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
}

export interface ChainSelectorProps {
  selectedChain: Chain;
  chains: Chain[];
  onChainSelect: (chain: Chain) => void;
  label?: string;
  disabled?: boolean;
  showTestnets?: boolean;
}

const DEFAULT_CHAINS: Chain[] = [
  {
    id: 42161,
    name: 'Arbitrum One',
    shortName: 'Arbitrum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://arbiscan.io',
    isTestnet: false
  },
  {
    id: 421614,
    name: 'Arbitrum Sepolia',
    shortName: 'Arb Sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://sepolia.arbiscan.io',
    isTestnet: true
  },
  {
    id: 8453,
    name: 'Base',
    shortName: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://basescan.org',
    isTestnet: false
  },
  {
    id: 84532,
    name: 'Base Sepolia',
    shortName: 'Base Sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://sepolia.basescan.org',
    isTestnet: true
  },
  {
    id: 10,
    name: 'Optimism',
    shortName: 'Optimism',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    blockExplorer: 'https://optimistic.etherscan.io',
    isTestnet: false
  },
  {
    id: 137,
    name: 'Polygon',
    shortName: 'Polygon',
    nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
    blockExplorer: 'https://polygonscan.com',
    isTestnet: false
  }
];

export function ChainSelector({
  selectedChain,
  chains = DEFAULT_CHAINS,
  onChainSelect,
  label = "Select Chain",
  disabled = false,
  showTestnets = true
}: ChainSelectorProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredChains = useMemo(() => {
    let filtered = chains;

    // Filter testnets if needed
    if (!showTestnets) {
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

  // Generate a simple logo based on chain name
  const getChainLogo = (chain: Chain) => {
    if (chain.logoUrl) return { type: 'image' as const, value: chain.logoUrl };
    
    // Return colored circles for different chains
    const colors: Record<string, string> = {
      'Arbitrum': 'bg-blue-500',
      'Arb Sepolia': 'bg-blue-400',
      'Base': 'bg-blue-600',
      'Base Sepolia': 'bg-blue-500',
      'Optimism': 'bg-red-500',
      'Polygon': 'bg-purple-500'
    };
    
    const colorClass = colors[chain.shortName] || 'bg-gray-500';
    return { type: 'color' as const, colorClass, letter: chain.shortName[0] };
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
            {(() => {
              const logo = getChainLogo(selectedChain);
              return logo.type === 'image' ? (
                <img 
                  src={logo.value} 
                  alt={selectedChain.name} 
                  className="w-6 h-6 rounded-full" 
                />
              ) : (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${logo.colorClass}`}>
                  {logo.letter}
                </div>
              );
            })()}
            <div className="text-left">
              <div className="font-medium">{selectedChain.name}</div>
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
  const getChainLogo = (chain: Chain) => {
    if (chain.logoUrl) return { type: 'image', value: chain.logoUrl };
    
    const colors: Record<string, string> = {
      'Arbitrum': 'bg-blue-500',
      'Arb Sepolia': 'bg-blue-400',
      'Base': 'bg-blue-600',
      'Base Sepolia': 'bg-blue-500',
      'Optimism': 'bg-red-500',
      'Polygon': 'bg-purple-500'
    };
    
    const colorClass = colors[chain.shortName] || 'bg-gray-500';
    return { type: 'color', colorClass, letter: chain.shortName[0] };
  };

  const logo = getChainLogo(chain);

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
        {logo.type === 'image' ? (
          <img src={logo.value} alt={chain.name} className="w-7 h-7 rounded-full" />
        ) : (
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold ${logo.colorClass}`}>
            {logo.letter}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{chain.name}</span>
            {chain.isTestnet && (
              <Badge variant="outline" className="text-xs py-0 px-1">
                Testnet
              </Badge>
            )}
            {chain.disabled && (
              <Badge variant="outline" className="text-xs py-0 px-1 border-red-500 text-red-500">
                Coming Soon
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            Chain ID: {chain.id} • {chain.nativeCurrency.symbol}
          </div>
        </div>
      </div>
      {isSelected && (
        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
      )}
    </button>
  );
}
