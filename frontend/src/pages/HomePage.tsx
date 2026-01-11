import { Link } from 'react-router-dom'
import { useWallet } from '@/hooks/useWallet'

export function HomePage() {
  const { isConnected } = useWallet()

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-16rem)] gap-8">
      <div className="text-center space-y-4 max-w-3xl">
        <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent">
          Cross-Chain Swaps,
          <br />
          Made Simple
        </h1>
        <p className="text-xl text-muted-foreground">
          Execute complex cross-chain transactions with natural language.
          Powered by AI and optimized routing.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        {isConnected ? (
          <Link
            to="/intent"
            className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Create Intent
          </Link>
        ) : (
          <div className="px-8 py-4 bg-muted text-muted-foreground rounded-lg font-semibold">
            Connect Wallet to Start
          </div>
        )}
        <a
          href="#features"
          className="px-8 py-4 border border-border rounded-lg font-semibold hover:bg-accent transition-colors"
        >
          Learn More
        </a>
      </div>

      <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 w-full max-w-5xl">
        <div className="p-6 border border-border rounded-xl bg-card">
          <h3 className="text-xl font-semibold mb-2">Natural Language</h3>
          <p className="text-muted-foreground">
            Describe what you want in plain English. Our AI understands your intent.
          </p>
        </div>
        <div className="p-6 border border-border rounded-xl bg-card">
          <h3 className="text-xl font-semibold mb-2">Optimized Routing</h3>
          <p className="text-muted-foreground">
            Get the best rates across DEXs and bridges automatically.
          </p>
        </div>
        <div className="p-6 border border-border rounded-xl bg-card">
          <h3 className="text-xl font-semibold mb-2">Real-Time Tracking</h3>
          <p className="text-muted-foreground">
            Monitor your cross-chain transactions every step of the way.
          </p>
        </div>
      </div>
    </div>
  )
}
