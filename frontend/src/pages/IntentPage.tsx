import { useState } from 'react'
import { useParams } from 'react-router-dom'

export function IntentPage() {
  const { id } = useParams()
  const [intent, setIntent] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Submit intent:', intent)
    // TODO: Call API to process intent
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">
          {id ? 'Track Intent' : 'Create New Intent'}
        </h1>
        <p className="text-muted-foreground">
          {id
            ? 'Monitor your cross-chain transaction progress'
            : 'Describe what you want to do in natural language'}
        </p>
      </div>

      {!id && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="intent" className="text-sm font-medium">
              Your Intent
            </label>
            <textarea
              id="intent"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
              placeholder="e.g., Swap 100 USDC on Arbitrum to ETH on Base"
              className="w-full min-h-[150px] p-4 rounded-lg border border-input bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground text-right">
              {intent.length}/500
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() =>
                setIntent('Swap 100 USDC on Arbitrum to ETH on Base')
              }
              className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent transition-colors"
            >
              Example 1
            </button>
            <button
              type="button"
              onClick={() =>
                setIntent('Bridge 50 USDT from Arbitrum Sepolia to Base Sepolia')
              }
              className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent transition-colors"
            >
              Example 2
            </button>
          </div>

          <button
            type="submit"
            disabled={!intent.trim()}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Parse Intent
          </button>
        </form>
      )}

      {id && (
        <div className="p-6 border border-border rounded-xl bg-card">
          <p className="text-muted-foreground">
            Tracking intent: <span className="font-mono text-foreground">{id}</span>
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Transaction tracking UI will be implemented here.
          </p>
        </div>
      )}
    </div>
  )
}
