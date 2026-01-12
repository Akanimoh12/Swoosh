import { useState } from 'react';
import { Link, useNavigation } from 'react-router-dom';
import { WalletButton } from '@/components/wallet/WalletButton';
import { ThemeToggle } from './ThemeToggle';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/brand/Logo';
import { cn } from '@/lib/utils';
import { isTestnetMode } from '@/lib/icons';
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/intent', label: 'Create Intent' },
  { to: '/history', label: 'History' },
  { to: '/analytics', label: 'Analytics' },
];

// Testnet badge component
function TestnetBadge() {
  if (!isTestnetMode()) return null;
  
  return (
    <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
      <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
      <span className="text-xs font-medium text-yellow-600 dark:text-yellow-400">
        TESTNET
      </span>
    </div>
  );
}

// Testnet banner for mobile
function TestnetBanner() {
  if (!isTestnetMode()) return null;
  
  return (
    <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2">
      <div className="container mx-auto max-w-7xl flex items-center justify-center gap-2 text-xs">
        <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
        <span className="text-yellow-600 dark:text-yellow-400 font-medium">
          Testnet Mode
        </span>
        <span className="text-muted-foreground">—</span>
        <a 
          href="https://www.alchemy.com/faucets/arbitrum-sepolia" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-yellow-600 dark:text-yellow-400 hover:underline inline-flex items-center gap-1"
        >
          Get testnet ETH
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigation = useNavigation();
  const isNavigating = navigation.state === 'loading';

  const toggleMobileMenu = () => {
    setMobileMenuOpen((prev) => !prev);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Testnet Banner */}
      <TestnetBanner />
      
      <header className="border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 max-w-7xl">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-4 lg:gap-8">
              <Link
                to="/"
                className="hover:opacity-80 transition-opacity"
                onClick={closeMobileMenu}
              >
                <Logo size={36} variant="full" />
              </Link>
              
              {/* Testnet Badge (Desktop) */}
              <TestnetBadge />
              
              {/* Navigation Loading Indicator */}
              {isNavigating && (
                <div className="hidden sm:flex items-center gap-1.5 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-xs">Loading...</span>
                </div>
              )}

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center gap-6">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <WalletButton />
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
              aria-expanded={mobileMenuOpen}
              className="w-10 px-0"
            >
              {mobileMenuOpen ? (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div
          className={cn(
            'md:hidden overflow-hidden transition-all duration-300 ease-in-out',
            mobileMenuOpen ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'
          )}
        >
          <nav className="flex flex-col gap-4 pb-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors py-2 px-2 rounded-lg hover:bg-accent"
                onClick={closeMobileMenu}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-border">
              <WalletButton />
            </div>
          </nav>
        </div>
      </div>
    </header>
    </>
  );
}
