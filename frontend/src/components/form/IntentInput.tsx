import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export interface IntentInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  maxLength?: number;
  placeholder?: string;
  examples?: string[];
  disabled?: boolean;
}

const DEFAULT_EXAMPLES = [
  "Swap 100 USDC from Arbitrum to Base",
  "Bridge 0.5 ETH to Optimism with lowest fees",
  "Convert 1000 DAI to USDC on Polygon",
  "Send 50 USDT to 0x742d...4e89 on Base"
];

export function IntentInput({
  value,
  onChange,
  onSubmit,
  maxLength = 500,
  placeholder = "Describe your intent in natural language...",
  examples = DEFAULT_EXAMPLES,
  disabled = false
}: IntentInputProps) {
  const [selectedExample, setSelectedExample] = useState<string | null>(null);

  const handleExampleClick = (example: string) => {
    onChange(example);
    setSelectedExample(example);
  };

  const handleSubmit = () => {
    if (value.trim() && onSubmit) {
      onSubmit();
    }
  };

  const isNearLimit = value.length >= maxLength * 0.9;
  const isAtLimit = value.length >= maxLength;

  return (
    <Card className="w-full">
      <CardContent className="pt-6 space-y-4">
        {/* Main Textarea */}
        <div className="relative">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            maxLength={maxLength}
            disabled={disabled}
            className="min-h-[120px] resize-y"
          />
          
          {/* Character Counter */}
          <div className={`absolute bottom-3 right-3 text-xs transition-colors ${
            isAtLimit ? 'text-red-500 font-medium' : 
            isNearLimit ? 'text-yellow-600' : 
            'text-muted-foreground'
          }`}>
            {value.length} / {maxLength}
          </div>
        </div>

        {/* Example Suggestions */}
        {examples.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Try these examples:</p>
            <div className="flex flex-wrap gap-2">
              {examples.map((example, index) => (
                <Badge
                  key={index}
                  variant={selectedExample === example ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/20 transition-colors"
                  onClick={() => handleExampleClick(example)}
                >
                  {example}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            size="lg"
          >
            Create Intent
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
