export interface TokenDisplayProps {
  symbol: string;
  amount: string | number;
  logoUrl?: string;
  usdValue?: string | number;
  size?: 'sm' | 'md' | 'lg';
  showUsdValue?: boolean;
  variant?: 'default' | 'positive' | 'negative';
  className?: string;
}

export function TokenDisplay({
  symbol,
  amount,
  logoUrl,
  usdValue,
  size = 'md',
  showUsdValue = true,
  variant = 'default',
  className
}: TokenDisplayProps) {
  const sizeClasses = {
    sm: {
      logo: 'w-4 h-4',
      amount: 'text-sm',
      symbol: 'text-xs',
      usd: 'text-xs'
    },
    md: {
      logo: 'w-6 h-6',
      amount: 'text-lg',
      symbol: 'text-sm',
      usd: 'text-xs'
    },
    lg: {
      logo: 'w-8 h-8',
      amount: 'text-2xl',
      symbol: 'text-base',
      usd: 'text-sm'
    }
  };

  const variantColors = {
    default: 'text-foreground',
    positive: 'text-green-600 dark:text-green-400',
    negative: 'text-red-600 dark:text-red-400'
  };

  const classes = sizeClasses[size];
  const colorClass = variantColors[variant];

  const formatAmount = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    
    // Format with appropriate decimal places
    if (num >= 1000000) {
      return (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(2) + 'K';
    }
    if (num < 0.01 && num > 0) {
      return num.toExponential(2);
    }
    if (num < 1) {
      return num.toFixed(6);
    }
    return num.toFixed(4);
  };

  const formatUsdValue = (value: string | number): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '$0.00';
    
    if (num >= 1000000) {
      return '$' + (num / 1000000).toFixed(2) + 'M';
    }
    if (num >= 1000) {
      return '$' + (num / 1000).toFixed(2) + 'K';
    }
    return '$' + num.toFixed(2);
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Token Logo */}
      {logoUrl && (
        <img 
          src={logoUrl} 
          alt={symbol} 
          className={`${classes.logo} rounded-full flex-shrink-0`}
        />
      )}

      {/* Amount and Symbol */}
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1.5">
          <span className={`font-semibold ${classes.amount} ${colorClass}`}>
            {formatAmount(amount)}
          </span>
          <span className={`font-medium ${classes.symbol} text-muted-foreground`}>
            {symbol}
          </span>
        </div>

        {/* USD Value */}
        {showUsdValue && usdValue !== undefined && (
          <span className={`${classes.usd} text-muted-foreground`}>
            {formatUsdValue(usdValue)}
          </span>
        )}
      </div>
    </div>
  );
}
