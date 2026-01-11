import { useWallet } from '@/hooks/useWallet';
import { useEffect, useState } from 'react';

export function WalletDemoPage() {
  const wallet = useWallet();
  const [logs, setLogs] = useState<string[]>([]);

  // Log wallet state changes
  useEffect(() => {
    if (wallet.isConnected) {
      addLog(`✅ Wallet connected: ${wallet.formattedAddress}`);
      addLog(`🌐 Network: ${wallet.chainName}`);
      addLog(`💰 Balance: ${wallet.formattedBalance} ETH`);
    } else {
      addLog('❌ Wallet disconnected');
    }
  }, [wallet.isConnected, wallet.address]);

  useEffect(() => {
    if (wallet.isWrongNetwork) {
      addLog(`⚠️ Wrong network detected: ${wallet.chainName}`);
    }
  }, [wallet.isWrongNetwork]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 10));
  };

  const handleDisconnect = async () => {
    await wallet.disconnect();
    addLog('👋 Disconnect requested');
  };

  const handleSwitchNetwork = async () => {
    await wallet.switchToSupportedChain();
    addLog('🔄 Network switch requested');
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold mb-2">Wallet Connection Demo</h1>
        <p className="text-muted-foreground">
          Test all wallet connection features and state management
        </p>
      </div>

      {/* Connection Status */}
      <div className="border border-border rounded-lg p-6 bg-card space-y-4">
        <h2 className="text-2xl font-semibold">Connection Status</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${wallet.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="font-medium">
                {wallet.isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {wallet.isConnected && (
              <>
                <div className="text-sm">
                  <span className="text-muted-foreground">Address: </span>
                  <code className="bg-muted px-2 py-1 rounded">
                    {wallet.formattedAddress}
                  </code>
                </div>
                
                <div className="text-sm">
                  <span className="text-muted-foreground">Short: </span>
                  <code className="bg-muted px-2 py-1 rounded">
                    {wallet.shortAddress}
                  </code>
                </div>
                
                <div className="text-sm">
                  <span className="text-muted-foreground">Network: </span>
                  <span className={wallet.isWrongNetwork ? 'text-destructive font-semibold' : ''}>
                    {wallet.chainName}
                  </span>
                  {wallet.isWrongNetwork && ' ⚠️'}
                </div>
                
                <div className="text-sm">
                  <span className="text-muted-foreground">Chain ID: </span>
                  {wallet.chainId}
                </div>
                
                <div className="text-sm">
                  <span className="text-muted-foreground">Balance: </span>
                  <span className="font-mono">{wallet.formattedBalance} ETH</span>
                  {wallet.balanceLoading && ' ⏳'}
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Connecting: </span>
              {wallet.isConnecting ? '✅' : '❌'}
            </div>
            
            <div className="text-sm">
              <span className="text-muted-foreground">Reconnecting: </span>
              {wallet.isReconnecting ? '✅' : '❌'}
            </div>
            
            <div className="text-sm">
              <span className="text-muted-foreground">Wrong Network: </span>
              {wallet.isWrongNetwork ? '⚠️ Yes' : '✅ No'}
            </div>
            
            {wallet.error && (
              <div className="text-sm text-destructive">
                <span className="font-medium">Error: </span>
                {wallet.error.message}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {wallet.isConnected && (
          <div className="flex gap-2 pt-4 border-t border-border">
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Disconnect
            </button>
            
            {wallet.isWrongNetwork && (
              <button
                onClick={handleSwitchNetwork}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
              >
                Switch Network
              </button>
            )}
          </div>
        )}
      </div>

      {/* Activity Logs */}
      <div className="border border-border rounded-lg p-6 bg-card">
        <h2 className="text-2xl font-semibold mb-4">Activity Logs</h2>
        
        {logs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No activity yet. Connect your wallet to see logs.</p>
        ) : (
          <div className="space-y-1 font-mono text-sm">
            {logs.map((log, i) => (
              <div key={i} className="text-muted-foreground">
                {log}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Features */}
      <div className="border border-border rounded-lg p-6 bg-card">
        <h2 className="text-2xl font-semibold mb-4">Features Implemented</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-primary">✅ Core Features</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Custom WalletButton with state display</li>
              <li>• Shortened address formatting (0x1234...5678)</li>
              <li>• ETH balance display with loading state</li>
              <li>• Chain name and ID display</li>
              <li>• Connection/disconnection handling</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-primary">✅ Advanced Features</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Wrong network detection & switching</li>
              <li>• LocalStorage persistence</li>
              <li>• Custom useWallet hook with error handling</li>
              <li>• NetworkSwitcher component</li>
              <li>• Custom RainbowKit theme (#6366f1)</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-primary">✅ Wallet Support</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• MetaMask</li>
              <li>• Coinbase Wallet</li>
              <li>• WalletConnect v2</li>
              <li>• Rainbow Wallet</li>
              <li>• Mobile wallet support (QR codes)</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-primary">✅ Networks</h3>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• Arbitrum Sepolia (421614)</li>
              <li>• Base Sepolia (84532)</li>
              <li>• Auto-detection of unsupported chains</li>
              <li>• One-click network switching</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
