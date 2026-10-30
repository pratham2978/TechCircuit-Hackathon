import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'light' | 'dark';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ 
  className = '', 
  size = 'md',
  variant = 'dark' 
}) => {
  const iconSizes = {
    sm: 24,
    md: 32,
    lg: 40
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  const isLight = variant === 'light';

  return (
    <div className={`flex items-center gap-2.5 font-bold tracking-tight select-none ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      <svg 
        width={iconSizes[size]} 
        height={iconSizes[size]} 
        viewBox="0 0 36 36" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Shield Outer with Deep Ink or White (Adapts to Dark Theme) */}
        <path 
          d="M18 3L4 8V17.5C4 26.2 9.9 31.8 18 34C26.1 31.8 32 26.2 32 17.5V8L18 3Z" 
          fill={isLight ? '#FFFFFF' : 'var(--color-deep-ink)'} 
        />
        {/* Evidence Verification Check with Signal Coral */}
        <path 
          d="M14 18.5L16.5 21L23 13" 
          stroke="#F16B50" 
          strokeWidth="3.2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        {/* Trust Evidence Indicator with Evidence Teal */}
        <circle cx="18" cy="8" r="2.5" fill="#167C78" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
        <span 
          style={{ 
            fontFamily: "var(--font-display)", 
            fontWeight: 700, 
            letterSpacing: '-0.03em',
            fontSize: size === 'lg' ? '1.5rem' : size === 'sm' ? '1rem' : '1.25rem',
            color: isLight ? '#FFFFFF' : 'var(--color-deep-ink)'
          }}
        >
          BrandGuard
        </span>
        <span 
          style={{ 
            fontSize: '0.65rem', 
            letterSpacing: '0.08em', 
            textTransform: 'uppercase',
            fontWeight: 600,
            color: isLight ? 'rgba(255,255,255,0.7)' : 'var(--color-evidence-teal)',
            marginTop: '2px'
          }}
        >
          Governance Ledger
        </span>
      </div>
    </div>
  );
};

