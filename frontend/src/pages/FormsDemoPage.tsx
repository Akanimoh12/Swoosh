import { useState } from 'react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Separator } from '@/components/ui/Separator';
import { 
  IntentInput, 
  TokenAmountInput, 
  AddressInput, 
  ChainSelector,
  type Token,
  type Chain
} from '@/components/form';
import {
  RouteVisualizer,
  TransactionTracker,
  IntentCard,
  StatCard,
  TokenDisplay,
  type RouteStep,
  type TransactionStep,
  type Intent
} from '@/components/display';
import { 
  Activity, 
  DollarSign, 
  Zap,
  CheckCircle2
} from 'lucide-react';

// Mock data
const mockTokens: Token[] = [
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
  }
];

const mockChains: Chain[] = [
  {
    id: 42161,
    name: 'Arbitrum One',
    shortName: 'Arbitrum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    isTestnet: false
  },
  {
    id: 8453,
    name: 'Base',
    shortName: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    isTestnet: false
  }
];

const mockRouteSteps: RouteStep[] = [
  {
    id: '1',
    type: 'swap',
    protocol: 'Uniswap',
    fromChain: 'Arbitrum',
    toChain: 'Arbitrum',
    fromToken: { symbol: 'ETH', amount: '1.0' },
    toToken: { symbol: 'USDC', amount: '3500.00' },
    estimatedTime: '30 seconds',
    gasCost: '$2.50',
    protocolFee: '0.3%'
  },
  {
    id: '2',
    type: 'bridge',
    protocol: 'CCIP',
    fromChain: 'Arbitrum',
    toChain: 'Base',
    fromToken: { symbol: 'USDC', amount: '3500.00' },
    toToken: { symbol: 'USDC', amount: '3498.50' },
    estimatedTime: '5 minutes',
    gasCost: '$1.20',
    protocolFee: '$1.50'
  }
];

const mockTransactionSteps: TransactionStep[] = [
  {
    id: '1',
    title: 'Approve Token',
    description: 'Approving USDC spending',
    status: 'completed',
    timestamp: '2 mins ago',
    txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  },
  {
    id: '2',
    title: 'Swap on Uniswap',
    description: 'Swapping ETH to USDC on Arbitrum',
    status: 'processing',
    estimatedTime: '30 seconds'
  },
  {
    id: '3',
    title: 'Bridge via CCIP',
    description: 'Bridging USDC from Arbitrum to Base',
    status: 'pending',
    estimatedTime: '5 minutes'
  },
  {
    id: '4',
    title: 'Receive on Base',
    description: 'USDC will arrive on Base',
    status: 'pending',
    estimatedTime: '30 seconds'
  }
];

const mockIntents: Intent[] = [
  {
    id: '1',
    description: 'Swap 100 USDC from Arbitrum to Base',
    status: 'completed',
    fromChain: 'Arbitrum',
    toChain: 'Base',
    fromToken: { symbol: 'USDC', amount: '100' },
    toToken: { symbol: 'USDC', amount: '99.5' },
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    estimatedValue: '$99.50'
  },
  {
    id: '2',
    description: 'Bridge 0.5 ETH to Optimism with lowest fees',
    status: 'processing',
    fromChain: 'Arbitrum',
    toChain: 'Optimism',
    fromToken: { symbol: 'ETH', amount: '0.5' },
    toToken: { symbol: 'ETH', amount: '0.498' },
    timestamp: new Date(Date.now() - 300000).toISOString(),
    estimatedValue: '$1,745'
  }
];

export function FormsDemoPage() {
  // Form states
  const [intentValue, setIntentValue] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState<Token>(mockTokens[0]);
  const [address, setAddress] = useState('');
  const [selectedChain, setSelectedChain] = useState<Chain>(mockChains[0]);

  return (
    <PageContainer>
      <div className="py-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold mb-2">Form & Display Components</h1>
          <p className="text-lg text-muted-foreground">
            Specialized components for intent creation and tracking
          </p>
        </div>

        <Separator />

        {/* Form Components Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Form Components</h2>
            <p className="text-muted-foreground">
              Interactive input components for creating intents
            </p>
          </div>

          {/* IntentInput */}
          <Card>
            <CardHeader>
              <CardTitle>IntentInput</CardTitle>
              <CardDescription>
                Large textarea with suggestion chips, character counter, and submit button
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IntentInput
                value={intentValue}
                onChange={setIntentValue}
                onSubmit={() => alert('Intent submitted: ' + intentValue)}
              />
            </CardContent>
          </Card>

          {/* TokenAmountInput */}
          <Card>
            <CardHeader>
              <CardTitle>TokenAmountInput</CardTitle>
              <CardDescription>
                Token selector with amount input, balance display, and MAX button
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TokenAmountInput
                amount={tokenAmount}
                selectedToken={selectedToken}
                tokens={mockTokens}
                onAmountChange={setTokenAmount}
                onTokenSelect={setSelectedToken}
              />
            </CardContent>
          </Card>

          {/* AddressInput */}
          <Card>
            <CardHeader>
              <CardTitle>AddressInput</CardTitle>
              <CardDescription>
                Address input with ENS resolution, validation, and paste button
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AddressInput
                value={address}
                onChange={setAddress}
                recentAddresses={[
                  '0x742d35Cc6634C0532925a3b844Bc9e7595f4e89',
                  '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'
                ]}
              />
              <div className="mt-4 text-sm text-muted-foreground">
                💡 Try typing "vitalik.eth" to see ENS resolution
              </div>
            </CardContent>
          </Card>

          {/* ChainSelector */}
          <Card>
            <CardHeader>
              <CardTitle>ChainSelector</CardTitle>
              <CardDescription>
                Dropdown with searchable chain list, logos, and network status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChainSelector
                selectedChain={selectedChain}
                chains={mockChains}
                onChainSelect={setSelectedChain}
              />
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* Display Components Section */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">Display Components</h2>
            <p className="text-muted-foreground">
              Components for visualizing routes, tracking transactions, and displaying data
            </p>
          </div>

          {/* StatCards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Activity}
              label="Total Intents"
              value="1,234"
              trend={{ value: 12.5, direction: 'up' }}
              iconColor="text-blue-500"
            />
            <StatCard
              icon={DollarSign}
              label="Total Volume"
              value="$2.4M"
              subLabel="Last 30 days"
              trend={{ value: 8.3, direction: 'up' }}
              iconColor="text-green-500"
            />
            <StatCard
              icon={Zap}
              label="Avg. Execution Time"
              value="4.2 min"
              trend={{ value: 15.2, direction: 'down' }}
              iconColor="text-yellow-500"
            />
            <StatCard
              icon={CheckCircle2}
              label="Success Rate"
              value="99.8%"
              trend={{ value: 0.3, direction: 'up' }}
              iconColor="text-purple-500"
            />
          </div>

          {/* TokenDisplay */}
          <Card>
            <CardHeader>
              <CardTitle>TokenDisplay</CardTitle>
              <CardDescription>
                Display token amounts with symbols, logos, and USD conversion
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium mb-2">Small size:</div>
                  <TokenDisplay 
                    symbol="ETH" 
                    amount="2.5432" 
                    usdValue="8901.20"
                    size="sm"
                  />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Medium size (default):</div>
                  <TokenDisplay 
                    symbol="USDC" 
                    amount="1250.00" 
                    usdValue="1250.00"
                  />
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">Large size with positive variant:</div>
                  <TokenDisplay 
                    symbol="ARB" 
                    amount="1000" 
                    usdValue="1850.00"
                    size="lg"
                    variant="positive"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RouteVisualizer */}
          <Card>
            <CardHeader>
              <CardTitle>RouteVisualizer</CardTitle>
              <CardDescription>
                Step-by-step breakdown of the optimized route with protocol badges and cost estimates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RouteVisualizer 
                steps={mockRouteSteps}
                totalTime="5.5 minutes"
                totalCost="$5.20"
              />
            </CardContent>
          </Card>

          {/* TransactionTracker */}
          <Card>
            <CardHeader>
              <CardTitle>TransactionTracker</CardTitle>
              <CardDescription>
                Real-time transaction progress with status indicators and explorer links
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TransactionTracker 
                steps={mockTransactionSteps}
                currentStepIndex={1}
              />
            </CardContent>
          </Card>

          {/* IntentCard */}
          <div>
            <h3 className="text-lg font-semibold mb-4">IntentCard</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Display past intents with status, timestamp, and route summary
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockIntents.map((intent) => (
                <IntentCard
                  key={intent.id}
                  intent={intent}
                  onViewDetails={(id) => alert(`View details for intent ${id}`)}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
