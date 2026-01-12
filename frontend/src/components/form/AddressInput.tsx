import { useState, useEffect, useMemo } from 'react';
import { useEnsAddress, useEnsName } from 'wagmi';
import { normalize } from 'viem/ens';
import { mainnet } from 'wagmi/chains';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle2, AlertCircle, Clipboard, Loader2 } from 'lucide-react';
import { isAddress } from 'viem';

// Debounce hook for ENS resolution
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export interface AddressInputProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  showPasteButton?: boolean;
  showENSResolution?: boolean;
  recentAddresses?: string[];
}

export function AddressInput({
  value,
  onChange,
  label = "Recipient Address",
  placeholder = "0x... or name.eth",
  disabled = false,
  showPasteButton = true,
  showENSResolution = true,
  recentAddresses = []
}: AddressInputProps) {
  const [validationError, setValidationError] = useState<string | undefined>();

  // Debounce the input for ENS resolution
  const debouncedValue = useDebounce(value, 500);

  // Check if input looks like an ENS name
  const isEnsName = useMemo(() => {
    return debouncedValue?.endsWith('.eth') && showENSResolution;
  }, [debouncedValue, showENSResolution]);

  // Normalize ENS name safely
  const normalizedEnsName = useMemo(() => {
    if (!isEnsName) return undefined;
    try {
      return normalize(debouncedValue);
    } catch {
      return undefined;
    }
  }, [debouncedValue, isEnsName]);

  // Use wagmi's useEnsAddress hook for forward resolution (name -> address)
  const { 
    data: resolvedAddress, 
    isLoading: isResolvingAddress,
    isError: isAddressError,
  } = useEnsAddress({
    name: normalizedEnsName,
    chainId: mainnet.id, // ENS resolution happens on mainnet
    query: {
      enabled: !!normalizedEnsName,
    },
  });

  // Use wagmi's useEnsName hook for reverse resolution (address -> name)
  const isValidAddress = useMemo(() => isAddress(value), [value]);
  const { 
    data: reverseName,
    isLoading: isResolvingName,
  } = useEnsName({
    address: isValidAddress ? (value as `0x${string}`) : undefined,
    chainId: mainnet.id,
    query: {
      enabled: isValidAddress && showENSResolution,
    },
  });

  // Validate input
  useEffect(() => {
    if (!value) {
      setValidationError(undefined);
      return;
    }

    // ENS name validation
    if (value.endsWith('.eth')) {
      if (!showENSResolution) {
        setValidationError('ENS resolution is disabled');
      } else if (isAddressError) {
        setValidationError('ENS name not found');
      } else {
        setValidationError(undefined);
      }
      return;
    }

    // Ethereum address validation
    if (isAddress(value)) {
      setValidationError(undefined);
    } else if (value.startsWith('0x')) {
      setValidationError('Invalid address format');
    } else {
      setValidationError('Address must start with 0x or be an ENS name');
    }
  }, [value, showENSResolution, isAddressError]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onChange(text.trim());
    } catch (error) {
      console.error('Failed to read clipboard:', error);
    }
  };

  const handleRecentAddressClick = (address: string) => {
    onChange(address);
  };

  // Determine if input is valid
  const isLoading = isResolvingAddress || isResolvingName;
  const isValid = value && !validationError && (isValidAddress || !!resolvedAddress);

  // Get display info
  const displayEnsName = isEnsName ? debouncedValue : reverseName;
  const displayAddress = resolvedAddress || (isValidAddress ? value : null);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      
      <div className="relative">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          error={validationError}
          className="pr-24"
        />

        {/* Paste Button */}
        {showPasteButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handlePaste}
            disabled={disabled}
            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2"
          >
            <Clipboard className="w-4 h-4 mr-1" />
            Paste
          </Button>
        )}

        {/* Validation Icon */}
        {value && !isLoading && (
          <div className="absolute right-20 top-1/2 -translate-y-1/2">
            {isValid ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : validationError ? (
              <AlertCircle className="w-5 h-5 text-red-500" />
            ) : null}
          </div>
        )}

        {/* Loading spinner for ENS resolution */}
        {isLoading && (
          <div className="absolute right-20 top-1/2 -translate-y-1/2">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        )}
      </div>

      {/* ENS Resolution Result */}
      {displayEnsName && displayAddress && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          <div className="text-sm">
            <div className="font-medium text-green-700 dark:text-green-400">{displayEnsName}</div>
            <div className="text-xs text-muted-foreground font-mono">{displayAddress}</div>
          </div>
        </div>
      )}

      {/* Recent Addresses */}
      {recentAddresses.length > 0 && !value && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Recent addresses:</p>
          <div className="flex flex-wrap gap-2">
            {recentAddresses.slice(0, 3).map((address, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-accent transition-colors font-mono text-xs"
                onClick={() => handleRecentAddressClick(address)}
              >
                {address.slice(0, 6)}...{address.slice(-4)}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
