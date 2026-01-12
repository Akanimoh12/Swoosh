import { Separator } from '@/components/ui/Separator';
import { isTestnetMode } from '@/lib/icons';

// Get version from package.json (injected via Vite)
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '0.1.0';

const footerLinks = {
  product: [
    { label: 'Home', href: '/' },
    { label: 'Create Intent', href: '/intent' },
    { label: 'Documentation', href: 'https://docs.swoosh.app', external: true },
  ],
  resources: [
    { label: 'API Docs', href: 'https://docs.swoosh.app/api', external: true },
    { label: 'GitHub', href: 'https://github.com/Akan-Datascience/Swoosh', external: true },
    ...(isTestnetMode() ? [
      { label: 'Arbitrum Faucet', href: 'https://www.alchemy.com/faucets/arbitrum-sepolia', external: true },
      { label: 'Base Faucet', href: 'https://www.alchemy.com/faucets/base-sepolia', external: true },
    ] : []),
  ],
  contracts: [
    {
      label: 'IntentValidator',
      href: 'https://sepolia.arbiscan.io/address/0x6C28363C60Ff3bcc509eeA37Cce473B919947b9C',
      external: true,
    },
    {
      label: 'RouteExecutor',
      href: 'https://sepolia.arbiscan.io/address/0x7c13D90950F542B297179e09f3A36EaA917A40C1',
      external: true,
    },
    {
      label: 'SettlementVerifier',
      href: 'https://sepolia.arbiscan.io/address/0x20E8307cFe2C5CF7E434b5Cb2C92494fa4BAF01C',
      external: true,
    },
  ],
  social: [
    {
      label: 'Twitter',
      href: 'https://twitter.com/swoosh_app',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    {
      label: 'Discord',
      href: 'https://discord.gg/swoosh',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      ),
    },
    {
      label: 'Telegram',
      href: 'https://t.me/swoosh_community',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
        </svg>
      ),
    },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border mt-auto bg-card/50">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Product */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Product</h3>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Resources</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.label}>
                  {link.external ? (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Contracts */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Contracts</h3>
            <ul className="space-y-3">
              {footerLinks.contracts.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    {link.label}
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h3 className="font-semibold text-sm mb-4">Community</h3>
            <div className="flex items-center gap-3">
              {footerLinks.social.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={link.label}
                >
                  {link.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary">Swoosh</span>
            <span className="text-sm text-muted-foreground">
              · Cross-Chain Intent Solver
            </span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
              v{APP_VERSION}
            </span>
            {isTestnetMode() && (
              <span className="text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/30">
                Testnet
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground text-center md:text-right">
            © {new Date().getFullYear()} Swoosh. Built for Arbitrum APAC Hackathon.
            <br className="md:hidden" />
            <span className="hidden md:inline"> · </span>
            Powered by Arbitrum & CCIP.
          </div>
        </div>
      </div>
    </footer>
  );
}
