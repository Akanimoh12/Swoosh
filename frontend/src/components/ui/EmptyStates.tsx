import { motion } from 'framer-motion';
import type { FC, ReactNode } from 'react';
import { LoadingButton } from './LoadingStates';

/**
 * Empty State Components
 * Friendly, helpful empty states with illustrations
 */

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
    className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}
  >
    {icon && (
      <motion.div 
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="mb-6 text-muted-foreground"
      >
        {icon}
      </motion.div>
    )}
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground max-w-md mb-6">{description}</p>
    {(action || secondaryAction) && (
      <div className="flex items-center gap-3">
        {action && (
          <LoadingButton variant="primary" onClick={action.onClick}>
            {action.label}
          </LoadingButton>
        )}
        {secondaryAction && (
          <LoadingButton variant="ghost" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </LoadingButton>
        )}
      </div>
    )}
  </motion.div>
);

/**
 * SVG Illustrations for Empty States
 */

// Empty wallet illustration
export const EmptyWalletIllustration: FC<{ className?: string }> = ({ className = 'w-32 h-32' }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="100" r="80" className="fill-muted/50" />
    <rect x="50" y="70" width="100" height="70" rx="8" className="fill-card stroke-border" strokeWidth="2" />
    <rect x="60" y="82" width="40" height="8" rx="2" className="fill-muted" />
    <rect x="60" y="96" width="60" height="6" rx="2" className="fill-muted/60" />
    <rect x="60" y="108" width="50" height="6" rx="2" className="fill-muted/40" />
    <circle cx="130" cy="100" r="15" className="fill-primary/20" />
    <path d="M125 100h10M130 95v10" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// No transactions illustration
export const NoTransactionsIllustration: FC<{ className?: string }> = ({ className = 'w-32 h-32' }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="100" r="80" className="fill-muted/50" />
    <rect x="55" y="55" width="90" height="110" rx="8" className="fill-card stroke-border" strokeWidth="2" />
    <line x1="70" y1="75" x2="130" y2="75" className="stroke-muted" strokeWidth="2" strokeLinecap="round" />
    <line x1="70" y1="95" x2="110" y2="95" className="stroke-muted/60" strokeWidth="2" strokeLinecap="round" />
    <line x1="70" y1="115" x2="120" y2="115" className="stroke-muted/40" strokeWidth="2" strokeLinecap="round" />
    <line x1="70" y1="135" x2="100" y2="135" className="stroke-muted/30" strokeWidth="2" strokeLinecap="round" />
    <circle cx="140" cy="140" r="25" className="fill-background stroke-border" strokeWidth="2" />
    <path d="M132 140h16M140 132v16" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// No search results illustration
export const NoSearchResultsIllustration: FC<{ className?: string }> = ({ className = 'w-32 h-32' }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="100" r="80" className="fill-muted/50" />
    <circle cx="90" cy="90" r="35" className="fill-card stroke-border" strokeWidth="3" />
    <circle cx="90" cy="90" r="25" className="stroke-muted" strokeWidth="2" strokeDasharray="4 4" />
    <line x1="115" y1="115" x2="145" y2="145" className="stroke-border" strokeWidth="8" strokeLinecap="round" />
    <line x1="115" y1="115" x2="145" y2="145" className="stroke-muted-foreground" strokeWidth="4" strokeLinecap="round" />
    <path d="M80 85l20 10M80 95l10-10" className="stroke-muted-foreground/50" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Error illustration
export const ErrorIllustration: FC<{ className?: string }> = ({ className = 'w-32 h-32' }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="100" r="80" className="fill-destructive/10" />
    <circle cx="100" cy="100" r="50" className="fill-card stroke-destructive/50" strokeWidth="3" />
    <line x1="85" y1="85" x2="115" y2="115" className="stroke-destructive" strokeWidth="4" strokeLinecap="round" />
    <line x1="115" y1="85" x2="85" y2="115" className="stroke-destructive" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

// Offline illustration
export const OfflineIllustration: FC<{ className?: string }> = ({ className = 'w-32 h-32' }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="100" r="80" className="fill-muted/50" />
    <path 
      d="M60 120c0-22 18-40 40-40s40 18 40 40" 
      className="stroke-muted-foreground/30" 
      strokeWidth="4" 
      strokeLinecap="round"
      fill="none"
    />
    <path 
      d="M75 130c0-14 11-25 25-25s25 11 25 25" 
      className="stroke-muted-foreground/50" 
      strokeWidth="4" 
      strokeLinecap="round"
      fill="none"
    />
    <circle cx="100" cy="140" r="8" className="fill-muted-foreground" />
    <line x1="60" y1="60" x2="140" y2="140" className="stroke-destructive" strokeWidth="4" strokeLinecap="round" />
  </svg>
);

// Success/Celebration illustration
export const SuccessIllustration: FC<{ className?: string }> = ({ className = 'w-32 h-32' }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="100" r="80" className="fill-success/10" />
    <circle cx="100" cy="100" r="50" className="fill-success/20 stroke-success" strokeWidth="3" />
    <path d="M75 100l15 15 35-35" className="stroke-success" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* Confetti */}
    <rect x="45" y="55" width="8" height="8" rx="1" className="fill-primary" transform="rotate(15 45 55)" />
    <rect x="145" y="60" width="6" height="6" rx="1" className="fill-warning" transform="rotate(-10 145 60)" />
    <rect x="155" y="100" width="7" height="7" rx="1" className="fill-success" transform="rotate(25 155 100)" />
    <rect x="50" y="130" width="5" height="5" rx="1" className="fill-info" transform="rotate(-20 50 130)" />
    <circle cx="60" cy="80" r="4" className="fill-warning" />
    <circle cx="140" cy="135" r="3" className="fill-primary" />
  </svg>
);

// Rocket/Getting started illustration
export const RocketIllustration: FC<{ className?: string }> = ({ className = 'w-32 h-32' }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="100" r="80" className="fill-primary/10" />
    <path 
      d="M100 50c-10 20-15 40-15 60 0 15 5 25 15 35 10-10 15-20 15-35 0-20-5-40-15-60z" 
      className="fill-card stroke-primary" 
      strokeWidth="2"
    />
    <ellipse cx="100" cy="110" rx="8" ry="5" className="fill-primary/30" />
    <circle cx="100" cy="85" r="8" className="fill-primary" />
    <path d="M80 120l-15 25h20l-5-25z" className="fill-destructive/80" />
    <path d="M120 120l15 25h-20l5-25z" className="fill-destructive/80" />
    {/* Flame */}
    <path 
      d="M92 145c0-5 4-10 8-15 4 5 8 10 8 15 0 8-4 12-8 12s-8-4-8-12z" 
      className="fill-warning"
    />
    <path 
      d="M95 148c0-3 2.5-6 5-9 2.5 3 5 6 5 9 0 5-2.5 7-5 7s-5-2-5-7z" 
      className="fill-destructive"
    />
  </svg>
);

// Connect wallet illustration
export const ConnectWalletIllustration: FC<{ className?: string }> = ({ className = 'w-32 h-32' }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="100" cy="100" r="80" className="fill-muted/50" />
    {/* Wallet */}
    <rect x="40" y="70" width="70" height="50" rx="6" className="fill-card stroke-border" strokeWidth="2" />
    <rect x="50" y="82" width="30" height="6" rx="2" className="fill-muted" />
    <rect x="50" y="94" width="20" height="4" rx="1" className="fill-muted/60" />
    {/* Connection line */}
    <path d="M115 95h20" className="stroke-primary" strokeWidth="3" strokeLinecap="round" strokeDasharray="6 6">
      <animate attributeName="stroke-dashoffset" from="12" to="0" dur="1s" repeatCount="indefinite" />
    </path>
    {/* DApp circle */}
    <circle cx="155" cy="95" r="25" className="fill-primary/20 stroke-primary" strokeWidth="2" />
    <path d="M145 95h20M155 85v20" className="stroke-primary" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * Pre-built Empty State Components
 */

export const EmptyTransactions: FC<{ onCreateIntent?: () => void }> = ({ onCreateIntent }) => (
  <EmptyState
    icon={<NoTransactionsIllustration />}
    title="No transactions yet"
    description="Your transaction history will appear here once you start making swaps. Create your first intent to get started!"
    action={onCreateIntent ? { label: 'Create Intent', onClick: onCreateIntent } : undefined}
  />
);

export const EmptySearchResults: FC<{ query?: string; onClear?: () => void }> = ({ query, onClear }) => (
  <EmptyState
    icon={<NoSearchResultsIllustration />}
    title="No results found"
    description={query ? `We couldn't find anything matching "${query}". Try adjusting your search or filters.` : 'Try adjusting your search criteria.'}
    action={onClear ? { label: 'Clear Search', onClick: onClear } : undefined}
  />
);

export const EmptyWallet: FC<{ onConnect?: () => void }> = ({ onConnect }) => (
  <EmptyState
    icon={<ConnectWalletIllustration />}
    title="Connect your wallet"
    description="Connect your wallet to view your transaction history, analytics, and create new intents."
    action={onConnect ? { label: 'Connect Wallet', onClick: onConnect } : undefined}
  />
);

export const ErrorState: FC<{ 
  error?: string; 
  onRetry?: () => void;
  onGoHome?: () => void;
}> = ({ error, onRetry, onGoHome }) => (
  <EmptyState
    icon={<ErrorIllustration />}
    title="Something went wrong"
    description={error || "We encountered an unexpected error. Please try again or contact support if the problem persists."}
    action={onRetry ? { label: 'Try Again', onClick: onRetry } : undefined}
    secondaryAction={onGoHome ? { label: 'Go Home', onClick: onGoHome } : undefined}
  />
);

export const OfflineState: FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <EmptyState
    icon={<OfflineIllustration />}
    title="You're offline"
    description="It looks like you've lost your internet connection. Please check your connection and try again."
    action={onRetry ? { label: 'Retry Connection', onClick: onRetry } : undefined}
  />
);

export const WelcomeState: FC<{ 
  onGetStarted?: () => void;
  onLearnMore?: () => void;
}> = ({ onGetStarted, onLearnMore }) => (
  <EmptyState
    icon={<RocketIllustration />}
    title="Welcome to Swoosh"
    description="The intent-centric DEX aggregator that finds the best routes for your swaps across multiple chains and protocols."
    action={onGetStarted ? { label: 'Get Started', onClick: onGetStarted } : undefined}
    secondaryAction={onLearnMore ? { label: 'Learn More', onClick: onLearnMore } : undefined}
  />
);

export const SuccessState: FC<{ 
  title?: string;
  description?: string;
  onContinue?: () => void;
  onViewDetails?: () => void;
}> = ({ 
  title = 'Success!', 
  description = 'Your action was completed successfully.',
  onContinue,
  onViewDetails,
}) => (
  <EmptyState
    icon={<SuccessIllustration />}
    title={title}
    description={description}
    action={onContinue ? { label: 'Continue', onClick: onContinue } : undefined}
    secondaryAction={onViewDetails ? { label: 'View Details', onClick: onViewDetails } : undefined}
  />
);
