import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle2, AlertCircle, Clipboard } from 'lucide-react';
import { isAddress } from 'viem';

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
  const [isValidating, setIsValidating] = useState(false);
  const [ensName, setEnsName] = useState<string | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | undefined>();

  // Validate address
  useEffect(() => {
    if (!value) {
      setValidationError(undefined);
      setEnsName(null);
      setResolvedAddress(null);
      return;
    }

    // Check if it's an ENS name
    if (value.endsWith('.eth')) {
      if (showENSResolution) {
        handleENSResolution(value);
      }
      return;
    }

    // Validate Ethereum address
    if (isAddress(value)) {
      setValidationError(undefined);
      setEnsName(null);
      setResolvedAddress(null);
    } else if (value.startsWith('0x')) {
      setValidationError('Invalid address format');
      setEnsName(null);
      setResolvedAddress(null);
    } else {
      setValidationError('Address must start with 0x or be an ENS name');
      setEnsName(null);
      setResolvedAddress(null);
    }
  }, [value, showENSResolution]);

  const handleENSResolution = async (name: string) => {
    setIsValidating(true);
    setValidationError(undefined);
    
    try {
      // Simulate ENS resolution (in production, use a real ENS resolver)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock resolution for demo purposes
      if (name === 'vitalik.eth') {
        const mockAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
        setResolvedAddress(mockAddress);
        setEnsName(name);
        setValidationError(undefined);
      } else {
        setValidationError('ENS name not found');
        setResolvedAddress(null);
        setEnsName(null);
      }
    } catch (error) {
      setValidationError('Failed to resolve ENS name');
      setResolvedAddress(null);
      setEnsName(null);
    } finally {
      setIsValidating(false);
    }
  };

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

  const isValid = value && !validationError && (isAddress(value) || resolvedAddress);

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
        {value && !isValidating && (
          <div className="absolute right-20 top-1/2 -translate-y-1/2">
            {isValid ? (
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            ) : validationError ? (
              <AlertCircle className="w-5 h-5 text-red-500" />
            ) : null}
          </div>
        )}

        {/* Loading spinner for ENS resolution */}
        {isValidating && (
          <div className="absolute right-20 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* ENS Resolution Result */}
      {ensName && resolvedAddress && (
        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-md">
          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          <div className="text-sm">
            <div className="font-medium text-green-700 dark:text-green-400">{ensName}</div>
            <div className="text-xs text-muted-foreground font-mono">{resolvedAddress}</div>
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
