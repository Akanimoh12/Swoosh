import { 
  useCallback, 
  useEffect, 
  useRef, 
  useState,
  createContext,
} from 'react';
import type { FC, ReactNode, KeyboardEvent } from 'react';

/**
 * Accessibility Components & Utilities
 * Follows WCAG 2.1 AA guidelines
 */

/**
 * Skip Navigation Link
 * Allows keyboard users to skip to main content
 */
export const SkipLink: FC<{ href?: string; children?: ReactNode }> = ({ 
  href = '#main-content',
  children = 'Skip to main content',
}) => (
  <a
    href={href}
    className="
      skip-link
      fixed left-4 z-[100]
      px-4 py-2 rounded-lg
      bg-primary text-primary-foreground
      font-medium text-sm
      transform -translate-y-full
      focus:translate-y-4
      transition-transform duration-200
      focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2
    "
  >
    {children}
  </a>
);

/**
 * Main Content Landmark
 * Target for skip link
 */
export const MainContent: FC<{ children: ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => (
  <main 
    id="main-content" 
    className={className}
    tabIndex={-1}
    role="main"
    aria-label="Main content"
  >
    {children}
  </main>
);

/**
 * Screen Reader Only Text
 * Visually hidden but accessible to screen readers
 */
export const VisuallyHidden: FC<{ children: ReactNode; as?: 'span' | 'div' | 'p' }> = ({ 
  children,
  as: Tag = 'span',
}) => (
  <Tag className="sr-only">
    {children}
  </Tag>
);

/**
 * Live Region for Announcements
 * Announces dynamic content changes to screen readers
 */
export const useLiveRegion = () => {
  const [message, setMessage] = useState('');
  const [politeness, setPoliteness] = useState<'polite' | 'assertive'>('polite');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((
    text: string, 
    options: { politeness?: 'polite' | 'assertive'; clearAfter?: number } = {}
  ) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setPoliteness(options.politeness || 'polite');
    setMessage(text);

    if (options.clearAfter) {
      timeoutRef.current = setTimeout(() => {
        setMessage('');
      }, options.clearAfter);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const LiveRegion: FC = () => (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  );

  return { announce, LiveRegion };
};

/**
 * Focus Trap
 * Traps focus within a container (for modals, dialogs)
 */
interface FocusTrapProps {
  children: ReactNode;
  isActive?: boolean;
  onEscape?: () => void;
  initialFocus?: React.RefObject<HTMLElement>;
  returnFocus?: boolean;
}

export const FocusTrap: FC<FocusTrapProps> = ({
  children,
  isActive = true,
  onEscape,
  initialFocus,
  returnFocus = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Focus the initial element or the first focusable element
    const focusInitial = () => {
      if (initialFocus?.current) {
        initialFocus.current.focus();
      } else {
        const firstFocusable = getFocusableElements(containerRef.current)?.[0];
        firstFocusable?.focus();
      }
    };

    // Small delay to ensure the container is rendered
    const timer = setTimeout(focusInitial, 10);

    return () => {
      clearTimeout(timer);
      // Return focus when unmounting
      if (returnFocus && previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive, initialFocus, returnFocus]);

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    if (!isActive) return;

    if (event.key === 'Escape' && onEscape) {
      event.preventDefault();
      onEscape();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusableElements = getFocusableElements(containerRef.current);
    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, [isActive, onEscape]);

  return (
    <div ref={containerRef} onKeyDown={handleKeyDown}>
      {children}
    </div>
  );
};

/**
 * Get focusable elements within a container
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(', ');

function getFocusableElements(container: HTMLElement | null): HTMLElement[] | null {
  if (!container) return null;
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * Keyboard Navigation Hook
 * For custom dropdown menus, listboxes, etc.
 */
interface UseKeyboardNavigationOptions {
  items: HTMLElement[];
  loop?: boolean;
  orientation?: 'horizontal' | 'vertical' | 'both';
  onSelect?: (index: number) => void;
}

export const useKeyboardNavigation = ({
  items,
  loop = true,
  orientation = 'vertical',
  onSelect,
}: UseKeyboardNavigationOptions) => {
  const [activeIndex, setActiveIndex] = useState(-1);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const { key } = event;
    const isVertical = orientation === 'vertical' || orientation === 'both';
    const isHorizontal = orientation === 'horizontal' || orientation === 'both';

    let newIndex = activeIndex;

    switch (key) {
      case 'ArrowDown':
        if (isVertical) {
          event.preventDefault();
          newIndex = activeIndex + 1;
          if (newIndex >= items.length) {
            newIndex = loop ? 0 : items.length - 1;
          }
        }
        break;
      case 'ArrowUp':
        if (isVertical) {
          event.preventDefault();
          newIndex = activeIndex - 1;
          if (newIndex < 0) {
            newIndex = loop ? items.length - 1 : 0;
          }
        }
        break;
      case 'ArrowRight':
        if (isHorizontal) {
          event.preventDefault();
          newIndex = activeIndex + 1;
          if (newIndex >= items.length) {
            newIndex = loop ? 0 : items.length - 1;
          }
        }
        break;
      case 'ArrowLeft':
        if (isHorizontal) {
          event.preventDefault();
          newIndex = activeIndex - 1;
          if (newIndex < 0) {
            newIndex = loop ? items.length - 1 : 0;
          }
        }
        break;
      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        event.preventDefault();
        newIndex = items.length - 1;
        break;
      case 'Enter':
      case ' ':
        if (activeIndex >= 0) {
          event.preventDefault();
          onSelect?.(activeIndex);
        }
        break;
    }

    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < items.length) {
      setActiveIndex(newIndex);
      items[newIndex]?.focus();
    }
  }, [activeIndex, items, loop, orientation, onSelect]);

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
    getItemProps: (index: number) => ({
      tabIndex: index === activeIndex ? 0 : -1,
      'aria-selected': index === activeIndex,
      onFocus: () => setActiveIndex(index),
    }),
  };
};

/**
 * Accessible Dialog/Modal Context
 */
interface DialogContextType {
  isOpen: boolean;
  titleId: string;
  descriptionId: string;
}

const DialogContext = createContext<DialogContextType | null>(null);

interface AccessibleDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export const AccessibleDialog: FC<AccessibleDialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  className = '',
}) => {
  const titleId = `dialog-title-${Math.random().toString(36).substr(2, 9)}`;
  const descriptionId = `dialog-desc-${Math.random().toString(36).substr(2, 9)}`;

  if (!isOpen) return null;

  return (
    <DialogContext.Provider value={{ isOpen, titleId, descriptionId }}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Dialog */}
      <FocusTrap isActive={isOpen} onEscape={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descriptionId : undefined}
          className={`
            fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
            z-50 w-full max-w-lg p-6 rounded-2xl
            bg-card border border-border shadow-xl
            ${className}
          `}
        >
          <h2 id={titleId} className="text-xl font-semibold mb-2">
            {title}
          </h2>
          {description && (
            <p id={descriptionId} className="text-muted-foreground mb-4">
              {description}
            </p>
          )}
          {children}
        </div>
      </FocusTrap>
    </DialogContext.Provider>
  );
};

/**
 * Loading Announcement
 * Announces loading states to screen readers
 */
export const LoadingAnnouncement: FC<{ isLoading: boolean; loadingText?: string; completedText?: string }> = ({
  isLoading,
  loadingText = 'Loading, please wait...',
  completedText = 'Content loaded',
}) => (
  <div
    role="status"
    aria-live="polite"
    aria-atomic="true"
    className="sr-only"
  >
    {isLoading ? loadingText : completedText}
  </div>
);

/**
 * Error Announcement
 * Announces errors assertively to screen readers
 */
export const ErrorAnnouncement: FC<{ error: string | null }> = ({ error }) => (
  <div
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
    className="sr-only"
  >
    {error}
  </div>
);

/**
 * Accessible Icon Button
 * Button with proper accessibility for icon-only buttons
 */
interface IconButtonProps {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'ghost' | 'outline';
}

export const IconButton: FC<IconButtonProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
  className = '',
  size = 'md',
  variant = 'default',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }[size];

  const variantClasses = {
    default: 'bg-secondary hover:bg-secondary/80',
    ghost: 'hover:bg-accent',
    outline: 'border border-border hover:bg-accent',
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`
        inline-flex items-center justify-center rounded-lg
        transition-colors duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        focus-ring
        ${sizeClasses}
        ${variantClasses}
        ${className}
      `}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </button>
  );
};

/**
 * Progress Indicator with ARIA
 */
interface ProgressIndicatorProps {
  value: number;
  max?: number;
  label: string;
  showValue?: boolean;
}

export const AccessibleProgress: FC<ProgressIndicatorProps> = ({
  value,
  max = 100,
  label,
  showValue = true,
}) => {
  const percentage = Math.round((value / max) * 100);

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-sm text-muted-foreground">{label}</span>
        {showValue && (
          <span className="text-sm text-muted-foreground">{percentage}%</span>
        )}
      </div>
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={`${label}: ${percentage}% complete`}
        className="h-2 bg-muted rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

/**
 * Tooltip with accessibility
 */
interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = `tooltip-${Math.random().toString(36).substr(2, 9)}`;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position];

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      <div aria-describedby={isVisible ? tooltipId : undefined}>
        {children}
      </div>
      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`
            absolute z-50 px-2 py-1 rounded
            bg-popover text-popover-foreground text-sm
            border border-border shadow-md
            whitespace-nowrap
            ${positionClasses}
          `}
        >
          {content}
        </div>
      )}
    </div>
  );
};

/**
 * Reduced Motion Hook
 * Respects user's motion preferences
 */
export const useReducedMotion = (): boolean => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return reducedMotion;
};
