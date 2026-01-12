import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useIntentTracking } from '@/hooks/useIntentTracking'
import { useWallet } from '@/hooks/useWallet'
import { ProgressVisualization, type IntentStep } from '@/components/ProgressVisualizationEnhanced'
import { showIntentToast, showErrorToast, showTxSubmittedToast } from '@/components/IntentToast'
import { createIntent, ApiError } from '@/services'
import { RefreshCw, ExternalLink, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'

export function IntentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { address, isConnected: walletConnected } = useWallet()
  const [intent, setIntent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)
  const [copied, setCopied] = useState(false)

  // WebSocket tracking for existing intent
  const {
    status: intentStatus,
    isConnected: wsConnected,
    error: wsError,
    reconnect,
  } = useIntentTracking(id || null)

  // Extract values from intent status
  const status = intentStatus?.status
  const progress = intentStatus?.progress ?? 0
  const message = intentStatus?.message
  const estimatedTimeRemaining = intentStatus?.estimatedTimeRemaining
  const txHash = intentStatus?.txHash
  const ccipMessageId = intentStatus?.metadata?.ccipMessageId as string | undefined

  // Convert WS status to step type
  const currentStep = (intentStatus?.step || 'pending') as IntentStep

  // Show toast on status changes
  useEffect(() => {
    if (id && status) {
      showIntentToast({
        intentId: id,
        status: currentStep,
        txHash: txHash || undefined,
        ccipMessageId: ccipMessageId || undefined,
      })
    }
  }, [id, status, currentStep, txHash, ccipMessageId])

  // Show error toast for WS errors
  useEffect(() => {
    if (wsError) {
      showErrorToast('Connection Error', wsError)
    }
  }, [wsError])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!intent.trim()) return

    // Require wallet connection
    if (!walletConnected || !address) {
      showErrorToast('Wallet Required', 'Please connect your wallet to create an intent')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await createIntent(intent, address)
      const intentId = response.intent?.id
      
      if (!intentId) {
        throw new Error('No intent ID returned from server')
      }

      showTxSubmittedToast(response.intent?.txHash || 'pending', 'Arbitrum Sepolia')
      setIntent('') // Clear the input
      navigate(`/intent/${intentId}`)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 
                      err instanceof Error ? err.message : 'Unknown error'
      showErrorToast('Failed to create intent', message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const copyIntentId = useCallback(() => {
    if (id) {
      navigator.clipboard.writeText(id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [id])

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold">
          {id ? 'Track Intent' : 'Create New Intent'}
        </h1>
        <p className="text-muted-foreground">
          {id
            ? 'Monitor your cross-chain transaction progress in real-time'
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
            >
              Example 1
            </button>
            <button
              type="button"
              onClick={() =>
                setIntent('Bridge 50 USDT from Arbitrum Sepolia to Base Sepolia')
              }
              className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent transition-colors"
              disabled={isSubmitting}
            >
              Example 2
            </button>
          </div>

          <button
            type="submit"
            disabled={!intent.trim() || isSubmitting}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Parse Intent'
            )}
          </button>
        </form>
      )}

      {id && (
        <div className="space-y-6">
          {/* Intent ID and connection status */}
          <div className="flex items-center justify-between p-4 border border-border rounded-xl bg-card">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Intent ID:</span>
              <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
                {id.slice(0, 8)}...{id.slice(-8)}
              </code>
              <button
                onClick={copyIntentId}
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
                title="Copy full ID"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  wsConnected ? 'bg-green-500' : 'bg-red-500'
                )}
              />
              <span className="text-xs text-muted-foreground">
                {wsConnected ? 'Live' : 'Disconnected'}
              </span>
              {!wsConnected && (
                <button
                  onClick={reconnect}
                  className="p-1 hover:bg-muted rounded-md"
                  title="Reconnect"
                >
                  <RefreshCw className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Progress Visualization */}
          <div className="p-6 border border-border rounded-xl bg-card">
            <ProgressVisualization
              currentStep={currentStep}
              progress={progress}
              estimatedTimeRemaining={estimatedTimeRemaining}
              txHash={txHash || undefined}
              ccipMessageId={ccipMessageId || undefined}
              showDetails={true}
            />
          </div>

          {/* Current status message */}
          {message && (
            <div className="p-4 border border-border rounded-xl bg-card">
              <p className="text-sm text-muted-foreground">Status: {message}</p>
            </div>
          )}

          {/* Transaction Links */}
          {(txHash || ccipMessageId) && (
            <div className="flex flex-wrap gap-3">
              {txHash && (
                <a
                  href={`https://sepolia.arbiscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-500 rounded-lg hover:bg-blue-500/20 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  View on Arbiscan
                </a>
              )}
              {ccipMessageId && (
                <a
                  href={`https://ccip.chain.link/msg/${ccipMessageId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 text-purple-500 rounded-lg hover:bg-purple-500/20 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  Track CCIP Message
                </a>
              )}
            </div>
          )}

          {/* Expandable Vertical Timeline */}
          <div className="border border-border rounded-xl bg-card overflow-hidden">
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <span className="font-medium">Step Details</span>
              {showTimeline ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
            {showTimeline && (
              <div className="p-4 border-t border-border">
                <ProgressVisualization
                  currentStep={currentStep}
                  progress={progress}
                  estimatedTimeRemaining={estimatedTimeRemaining}
                  txHash={txHash || undefined}
                  ccipMessageId={ccipMessageId || undefined}
                  variant="vertical"
                  showDetails={false}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
