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

  const isLight = variant === 'light';

  return (
    <div className={`flex items-center gap-2.5 font-bold tracking-tight select-none ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      <svg 
        width={iconSizes[size]} 
        height={iconSizes[size]} 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
        aria-hidden="true"
      >
        {/* BrandGuard Orange Bot Mascot Shield */}
        <path d="M12 2l9 3v7c0 5-4 8-9 10-5-2-9-5-9-10V5z" fill="#e98a2e" />
        <circle cx="9" cy="11" r="2" fill="#22d3ee" />
        <circle cx="15" cy="11" r="2" fill="#22d3ee" />
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
