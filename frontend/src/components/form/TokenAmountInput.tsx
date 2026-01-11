import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ChevronDown, Search } from 'lucide-react';

export interface Token {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoUrl?: string;
  balance?: string;
  priceUsd?: number;
}

export interface TokenAmountInputProps {
  amount: string;
  selectedToken?: Token;
  tokens: Token[];
  onAmountChange: (amount: string) => void;
  onTokenSelect: (token: Token) => void;
  disabled?: boolean;
  label?: string;
  error?: string;
}

const DEFAULT_TOKENS: Token[] = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18,
    balance: '2.5432',
    priceUsd: 3500.00
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    decimals: 6,
    balance: '1250.00',
    priceUsd: 1.00
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    decimals: 6,
    balance: '500.00',
    priceUsd: 1.00
  },
  {
    symbol: 'ARB',
    name: 'Arbitrum',
    address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    decimals: 18,
    balance: '1000.00',
    priceUsd: 1.85
  }
];

export function TokenAmountInput({
  amount,
  selectedToken,
  tokens = DEFAULT_TOKENS,
  onAmountChange,
  onTokenSelect,
  disabled = false,
  label = "Amount",
  error
}: TokenAmountInputProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const token = selectedToken || tokens[0];

  const filteredTokens = useMemo(() => {
    if (!searchQuery) return tokens;
    const query = searchQuery.toLowerCase();
    return tokens.filter(
      t => t.symbol.toLowerCase().includes(query) || 
           t.name.toLowerCase().includes(query)
    );
  }, [tokens, searchQuery]);

  const handleMaxClick = () => {
    if (token.balance) {
      onAmountChange(token.balance);
    }
  };

  const handleTokenSelect = (selectedToken: Token) => {
    onTokenSelect(selectedToken);
    setIsDropdownOpen(false);
    setSearchQuery('');
  };

  const usdValue = useMemo(() => {
    if (!amount || !token.priceUsd) return null;
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return null;
    return (numAmount * token.priceUsd).toFixed(2);
  }, [amount, token.priceUsd]);

  const hasInsufficientBalance = useMemo(() => {
    if (!amount || !token.balance) return false;
    const numAmount = parseFloat(amount);
    const numBalance = parseFloat(token.balance);
    return !isNaN(numAmount) && !isNaN(numBalance) && numAmount > numBalance;
  }, [amount, token.balance]);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      
      <div className="relative">
        <div className="flex gap-2">
          {/* Amount Input */}
          <div className="flex-1">
            <Input
              type="text"
              value={amount}
              onChange={(e) => {
                const value = e.target.value;
                // Only allow numbers and decimal point
                if (value === '' || /^\d*\.?\d*$/.test(value)) {
                  onAmountChange(value);
                }
              }}
              placeholder="0.0"
              disabled={disabled}
              error={error || (hasInsufficientBalance ? 'Insufficient balance' : undefined)}
              className="text-lg font-medium"
            />
          </div>

          {/* Token Selector */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={disabled}
              className="min-w-[140px] justify-between"
            >
              <div className="flex items-center gap-2">
                {token.logoUrl && (
                  <img src={token.logoUrl} alt={token.symbol} className="w-5 h-5 rounded-full" />
                )}
                <span className="font-medium">{token.symbol}</span>
              </div>
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>

            {/* Dropdown */}
            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-[320px] bg-card border border-border rounded-lg shadow-lg z-50">
                {/* Search */}
                <div className="p-3 border-b border-border">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tokens..."
                      className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Token List */}
                <div className="max-h-[280px] overflow-y-auto">
                  {filteredTokens.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No tokens found
                    </div>
                  ) : (
                    filteredTokens.map((t) => (
                      <button
                        key={t.address}
                        onClick={() => handleTokenSelect(t)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-accent transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          {t.logoUrl && (
                            <img src={t.logoUrl} alt={t.symbol} className="w-6 h-6 rounded-full" />
                          )}
                          <div>
                            <div className="font-medium">{t.symbol}</div>
                            <div className="text-xs text-muted-foreground">{t.name}</div>
                          </div>
                        </div>
                        {t.balance && (
                          <div className="text-sm text-muted-foreground">
                            {parseFloat(t.balance).toFixed(4)}
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Balance and Max Button */}
        <div className="flex items-center justify-between mt-2 text-sm">
          <div className="text-muted-foreground">
            {token.balance && (
              <span>
                Balance: <span className="font-medium">{parseFloat(token.balance).toFixed(4)} {token.symbol}</span>
              </span>
            )}
          </div>
          {token.balance && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMaxClick}
              disabled={disabled}
              className="h-6 px-2 text-xs font-medium text-primary hover:text-primary"
            >
              MAX
            </Button>
          )}
        </div>

        {/* USD Value */}
        {usdValue && (
          <div className="text-sm text-muted-foreground mt-1">
            ≈ ${usdValue} USD
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
