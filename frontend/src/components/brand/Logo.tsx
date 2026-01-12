interface LogoProps {
  size?: number;
  className?: string;
  variant?: 'full' | 'icon';
}

export function Logo({ size = 40, className = '', variant = 'full' }: LogoProps) {
  if (variant === 'icon') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        {/* Gradient Definitions */}
        <defs>
          <linearGradient id="swooshGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>

        {/* Background Circle */}
        <circle cx="50" cy="50" r="48" fill="url(#swooshGradient)" opacity="0.1" />

        {/* Main Swoosh Path - represents fluid cross-chain flow */}
        <path
          d="M 20 35 Q 35 25, 50 30 T 80 35"
          stroke="url(#swooshGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Second Swoosh - parallel flow */}
        <path
          d="M 20 50 Q 35 40, 50 45 T 80 50"
          stroke="url(#swooshGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />

        {/* Third Swoosh - bottom flow */}
        <path
          d="M 20 65 Q 35 55, 50 60 T 80 65"
          stroke="url(#accentGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />

        {/* Connection Nodes - representing different chains */}
        <circle cx="20" cy="50" r="5" fill="#6366f1" />
        <circle cx="50" cy="45" r="5" fill="#8b5cf6" />
        <circle cx="80" cy="50" r="5" fill="#06b6d4" />

        {/* Sparkle/Splash effect */}
        <circle cx="70" cy="35" r="2" fill="#06b6d4" opacity="0.8">
          <animate
            attributeName="opacity"
            values="0.8;0.3;0.8"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="75" cy="30" r="1.5" fill="#3b82f6" opacity="0.6">
          <animate
            attributeName="opacity"
            values="0.6;0.2;0.6"
            dur="2.5s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="65" cy="32" r="1.5" fill="#8b5cf6" opacity="0.7">
          <animate
            attributeName="opacity"
            values="0.7;0.3;0.7"
            dur="1.8s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Icon */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="swooshGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>

        <circle cx="50" cy="50" r="48" fill="url(#swooshGradient)" opacity="0.1" />

        <path
          d="M 20 35 Q 35 25, 50 30 T 80 35"
          stroke="url(#swooshGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
        
        <path
          d="M 20 50 Q 35 40, 50 45 T 80 50"
          stroke="url(#swooshGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          opacity="0.7"
        />

        <path
          d="M 20 65 Q 35 55, 50 60 T 80 65"
          stroke="url(#accentGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
          opacity="0.5"
        />

        <circle cx="20" cy="50" r="5" fill="#6366f1" />
        <circle cx="50" cy="45" r="5" fill="#8b5cf6" />
        <circle cx="80" cy="50" r="5" fill="#06b6d4" />

        <circle cx="70" cy="35" r="2" fill="#06b6d4" opacity="0.8">
          <animate
            attributeName="opacity"
            values="0.8;0.3;0.8"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="75" cy="30" r="1.5" fill="#3b82f6" opacity="0.6">
          <animate
            attributeName="opacity"
            values="0.6;0.2;0.6"
            dur="2.5s"
            repeatCount="indefinite"
          />
        </circle>
        <circle cx="65" cy="32" r="1.5" fill="#8b5cf6" opacity="0.7">
          <animate
            attributeName="opacity"
            values="0.7;0.3;0.7"
            dur="1.8s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>

      {/* Text */}
      <div className="flex flex-col">
        <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
          Swoosh
        </span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Intent Solver
        </span>
      </div>
    </div>
  );
}
