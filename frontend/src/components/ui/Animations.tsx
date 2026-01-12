import { motion, AnimatePresence } from 'framer-motion';
import type { Variants, HTMLMotionProps } from 'framer-motion';
import { useEffect, useState, useCallback, createContext, useContext } from 'react';
import type { FC, ReactNode } from 'react';

/**
 * Animation Variants Library
 * Reusable animation presets for consistent UX
 */

// Page transition variants
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  enter: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 1, 1],
    },
  },
};

// Fade variants
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  enter: { 
    opacity: 1,
    transition: { duration: 0.2 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.15 }
  },
};

// Scale variants (for modals, popovers)
export const scaleVariants: Variants = {
  initial: { 
    opacity: 0, 
    scale: 0.95,
  },
  enter: { 
    opacity: 1, 
    scale: 1,
    transition: {
      duration: 0.2,
      ease: [0, 0, 0.2, 1],
    },
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 1, 1],
    },
  },
};

// Slide variants
export const slideUpVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  enter: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  exit: { 
    opacity: 0, 
    y: -8,
    transition: { duration: 0.2, ease: 'easeIn' }
  },
};

export const slideDownVariants: Variants = {
  initial: { opacity: 0, y: -16 },
  enter: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  exit: { 
    opacity: 0, 
    y: 8,
    transition: { duration: 0.2, ease: 'easeIn' }
  },
};

export const slideLeftVariants: Variants = {
  initial: { opacity: 0, x: 16 },
  enter: { 
    opacity: 1, 
    x: 0,
    transition: { duration: 0.3, ease: 'easeOut' }
  },
  exit: { 
    opacity: 0, 
    x: -8,
    transition: { duration: 0.2, ease: 'easeIn' }
  },
};

// Stagger children variants
export const staggerContainerVariants: Variants = {
  initial: {},
  enter: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
};

export const staggerItemVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  enter: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  exit: { 
    opacity: 0, 
    y: -5,
    transition: { duration: 0.15, ease: 'easeIn' }
  },
};

/**
 * Animation Wrapper Components
 */

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

// Page transition wrapper
export const PageTransition: FC<PageTransitionProps> = ({ children, className = '' }) => (
  <motion.div
    initial="initial"
    animate="enter"
    exit="exit"
    variants={pageVariants}
    className={className}
  >
    {children}
  </motion.div>
);

// Fade wrapper
export const FadeIn: FC<PageTransitionProps & { delay?: number }> = ({ 
  children, 
  className = '',
  delay = 0,
}) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

// Stagger container
export const StaggerContainer: FC<PageTransitionProps> = ({ children, className = '' }) => (
  <motion.div
    initial="initial"
    animate="enter"
    exit="exit"
    variants={staggerContainerVariants}
    className={className}
  >
    {children}
  </motion.div>
);

// Stagger item
export const StaggerItem: FC<PageTransitionProps> = ({ children, className = '' }) => (
  <motion.div variants={staggerItemVariants} className={className}>
    {children}
  </motion.div>
);

/**
 * Interactive Animation Components
 */

// Hover scale effect
interface HoverScaleProps extends HTMLMotionProps<'div'> {
  scale?: number;
  children: ReactNode;
}

export const HoverScale: FC<HoverScaleProps> = ({ 
  scale = 1.02, 
  children, 
  className = '',
  ...props 
}) => (
  <motion.div
    whileHover={{ scale }}
    whileTap={{ scale: 0.98 }}
    transition={{ duration: 0.15, ease: 'easeOut' }}
    className={className}
    {...props}
  >
    {children}
  </motion.div>
);

// Hover lift effect (with shadow)
export const HoverLift: FC<PageTransitionProps> = ({ children, className = '' }) => (
  <motion.div
    whileHover={{ 
      y: -4,
      transition: { duration: 0.2, ease: 'easeOut' }
    }}
    className={`card-hover ${className}`}
  >
    {children}
  </motion.div>
);

// Pulse effect for notifications/badges
export const Pulse: FC<PageTransitionProps> = ({ children, className = '' }) => (
  <motion.div
    animate={{ scale: [1, 1.05, 1] }}
    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

// Shake effect for errors
export const Shake: FC<PageTransitionProps & { trigger?: boolean }> = ({ 
  children, 
  className = '',
  trigger = false,
}) => (
  <motion.div
    animate={trigger ? {
      x: [0, -8, 8, -8, 8, 0],
      transition: { duration: 0.5, ease: 'easeInOut' }
    } : {}}
    className={className}
  >
    {children}
  </motion.div>
);

/**
 * Confetti Celebration Component
 */

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotation: number;
  color: string;
  size: number;
  delay: number;
}

const CONFETTI_COLORS = [
  '#6366f1', // primary
  '#22c55e', // success
  '#f59e0b', // warning
  '#3b82f6', // info
  '#ec4899', // pink
  '#8b5cf6', // purple
];

interface ConfettiProps {
  isActive: boolean;
  onComplete?: () => void;
  particleCount?: number;
  duration?: number;
}

export const Confetti: FC<ConfettiProps> = ({
  isActive,
  onComplete,
  particleCount = 50,
  duration = 3000,
}) => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (isActive) {
      const newPieces: ConfettiPiece[] = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -10,
        rotation: Math.random() * 360,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        size: 8 + Math.random() * 8,
        delay: Math.random() * 0.5,
      }));
      setPieces(newPieces);

      const timer = setTimeout(() => {
        setPieces([]);
        onComplete?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isActive, particleCount, duration, onComplete]);

  if (!isActive && pieces.length === 0) return null;

  return (
    <div 
      className="fixed inset-0 pointer-events-none overflow-hidden z-50"
      aria-hidden="true"
    >
      <AnimatePresence>
        {pieces.map((piece) => (
          <motion.div
            key={piece.id}
            initial={{ 
              x: `${piece.x}vw`, 
              y: '-10vh',
              rotate: piece.rotation,
              opacity: 1,
            }}
            animate={{ 
              y: '110vh',
              rotate: piece.rotation + 720,
              opacity: [1, 1, 0],
            }}
            transition={{
              duration: 2 + Math.random(),
              delay: piece.delay,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            style={{
              position: 'absolute',
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

/**
 * Success Celebration Hook & Context
 */

interface CelebrationContextType {
  celebrate: () => void;
  isActive: boolean;
}

const CelebrationContext = createContext<CelebrationContextType | null>(null);

export const CelebrationProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState(false);

  const celebrate = useCallback(() => {
    setIsActive(true);
  }, []);

  const handleComplete = useCallback(() => {
    setIsActive(false);
  }, []);

  return (
    <CelebrationContext.Provider value={{ celebrate, isActive }}>
      {children}
      <Confetti isActive={isActive} onComplete={handleComplete} />
    </CelebrationContext.Provider>
  );
};

export const useCelebration = () => {
  const context = useContext(CelebrationContext);
  if (!context) {
    throw new Error('useCelebration must be used within CelebrationProvider');
  }
  return context;
};

/**
 * Number Counter Animation
 */

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

export const AnimatedCounter: FC<AnimatedCounterProps> = ({
  value,
  duration = 1,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const startTime = Date.now();
    const startValue = displayValue;
    const endValue = value;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (duration * 1000), 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue + (endValue - startValue) * easeOutQuart;

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return (
    <span className={className}>
      {prefix}
      {displayValue.toFixed(decimals)}
      {suffix}
    </span>
  );
};

/**
 * Typewriter Effect
 */

interface TypewriterProps {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}

export const Typewriter: FC<TypewriterProps> = ({
  text,
  speed = 50,
  className = '',
  onComplete,
}) => {
  const [displayText, setDisplayText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);

      return () => clearTimeout(timer);
    } else {
      onComplete?.();
    }
  }, [currentIndex, text, speed, onComplete]);

  useEffect(() => {
    setDisplayText('');
    setCurrentIndex(0);
  }, [text]);

  return (
    <span className={className}>
      {displayText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="inline-block w-0.5 h-[1em] bg-current ml-0.5 align-middle"
      />
    </span>
  );
};

/**
 * Ripple Effect for Buttons
 */

export const useRipple = (duration = 600) => {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const addRipple = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const id = Date.now();

    setRipples(prev => [...prev, { x, y, id }]);

    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== id));
    }, duration);
  }, [duration]);

  const RippleContainer: FC = () => (
    <span className="absolute inset-0 overflow-hidden pointer-events-none">
      <AnimatePresence>
        {ripples.map(ripple => (
          <motion.span
            key={ripple.id}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 4, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duration / 1000, ease: 'easeOut' }}
            className="absolute rounded-full bg-current"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: 20,
              height: 20,
              marginLeft: -10,
              marginTop: -10,
            }}
          />
        ))}
      </AnimatePresence>
    </span>
  );

  return { addRipple, RippleContainer };
};

/**
 * Floating Animation
 */

export const Float: FC<PageTransitionProps & { amplitude?: number; duration?: number }> = ({ 
  children, 
  className = '',
  amplitude = 8,
  duration = 3,
}) => (
  <motion.div
    animate={{ 
      y: [0, -amplitude, 0],
    }}
    transition={{ 
      duration,
      repeat: Infinity,
      ease: 'easeInOut',
    }}
    className={className}
  >
    {children}
  </motion.div>
);

/**
 * Skeleton shimmer animation keyframes are in design-tokens.css
 * This component adds a subtle loading pulse
 */

export const LoadingPulse: FC<PageTransitionProps> = ({ children, className = '' }) => (
  <motion.div
    animate={{ opacity: [1, 0.6, 1] }}
    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
    className={className}
  >
    {children}
  </motion.div>
);
