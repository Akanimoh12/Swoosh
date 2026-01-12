// UI Component exports for easy importing
export { Button } from './Button';
export type { ButtonProps } from './Button';

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './Card';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Textarea } from './Textarea';
export type { TextareaProps } from './Textarea';

export { Badge } from './Badge';
export type { BadgeProps } from './Badge';

export { Progress } from './Progress';
export type { ProgressProps } from './Progress';

export { Separator } from './Separator';
export type { SeparatorProps } from './Separator';

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './Dialog';
export type { DialogProps } from './Dialog';

export { Toaster } from './Toaster';

export { Skeleton } from './Skeleton';
export type { SkeletonProps } from './Skeleton';

// Loading States
export {
  Skeleton as LoadingSkeleton,
  SkeletonText,
  SkeletonHeading,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonStatsCard,
  SkeletonTableRow,
  SkeletonChart,
  PageSkeleton,
  LoadingButton,
  ProgressBar,
  Spinner,
  DotsLoader,
  LoadingOverlay,
  InlineLoader,
  BrandedLoader,
} from './LoadingStates';

// Empty States
export {
  EmptyState,
  EmptyWalletIllustration,
  NoTransactionsIllustration,
  NoSearchResultsIllustration,
  ErrorIllustration,
  OfflineIllustration,
  SuccessIllustration,
  RocketIllustration,
  ConnectWalletIllustration,
  EmptyTransactions,
  EmptySearchResults,
  EmptyWallet,
  ErrorState,
  OfflineState,
  WelcomeState,
  SuccessState,
} from './EmptyStates';

// Animations
export {
  // Variants
  pageVariants,
  fadeVariants,
  scaleVariants,
  slideUpVariants,
  slideDownVariants,
  slideLeftVariants,
  staggerContainerVariants,
  staggerItemVariants,
  // Components
  PageTransition,
  FadeIn,
  StaggerContainer,
  StaggerItem,
  HoverScale,
  HoverLift,
  Pulse,
  Shake,
  Confetti,
  CelebrationProvider,
  useCelebration,
  AnimatedCounter,
  Typewriter,
  useRipple,
  Float,
  LoadingPulse,
} from './Animations';

// Theme
export {
  ThemeProvider,
  useTheme,
  ThemeToggle,
  ThemeSelector,
  ThemeSwitch,
} from './ThemeProvider';

// Accessibility
export {
  SkipLink,
  MainContent,
  VisuallyHidden,
  useLiveRegion,
  FocusTrap,
  useKeyboardNavigation,
  AccessibleDialog,
  LoadingAnnouncement,
  ErrorAnnouncement,
  IconButton,
  AccessibleProgress,
  Tooltip,
  useReducedMotion,
} from './Accessibility';

// Route Loading
export {
  PageLoader,
  NavigationLoader,
  RouteProgressBar,
  HistoryPageSkeleton,
  AnalyticsPageSkeleton,
  IntentPageSkeleton,
} from './RouteLoader';
