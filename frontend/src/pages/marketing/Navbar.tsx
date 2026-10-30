import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { BrandLogo } from '../../components/common/BrandLogo';
import { 
  Menu, 
  X, 
  ArrowRight, 
  ShieldCheck, 
  Sun, 
  Moon, 
  LogIn 
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useDemo();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.location.pathname === '/') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header 
      style={{ 
        position: 'sticky', 
        top: 0, 
        zIndex: 50, 
        backgroundColor: 'var(--color-warm-ivory)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--color-border-gray)',
        padding: '14px 24px',
        transition: 'background-color var(--transition-normal), border-color var(--transition-normal)'
      }}
    >
      <div 
        style={{ 
          maxWidth: '1280px', 
          margin: '0 auto', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          gap: '24px'
        }}
      >
        {/* Left-Aligned Clickable Logo & Brand Name */}
        <Link 
          to="/" 
          onClick={handleLogoClick}
          aria-label="BrandGuard Home - Return to top"
          style={{ 
            textDecoration: 'none', 
            display: 'inline-flex', 
            alignItems: 'center',
            padding: '2px 4px',
            borderRadius: 'var(--radius-md)',
            transition: 'opacity var(--transition-fast)'
          }}
          className="brand-logo-link"
        >
          <BrandLogo size="md" />
        </Link>

        {/* Desktop Nav Links */}
        <nav 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '28px',
            fontSize: '0.92rem',
            fontWeight: 500
          }}
          className="desktop-nav"
        >
          <a href="#how-it-works" style={{ color: 'var(--color-deep-ink)', transition: 'color 0.2s' }}>How It Works</a>
          <a href="#features" style={{ color: 'var(--color-deep-ink)', transition: 'color 0.2s' }}>Features</a>
          <a href="#demo" style={{ color: 'var(--color-deep-ink)', transition: 'color 0.2s' }}>Interactive Demo</a>
          <a href="#plans" style={{ color: 'var(--color-deep-ink)', transition: 'color 0.2s' }}>Plans</a>
          <a href="#trust" style={{ color: 'var(--color-deep-ink)', transition: 'color 0.2s' }}>Trust & Compliance</a>
          <a href="#contact" style={{ color: 'var(--color-deep-ink)', transition: 'color 0.2s' }}>Contact</a>
        </nav>

        {/* Right Action Buttons */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px' 
          }}
        >
          {/* Light / Dark Mode Toggle */}
          <button 
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            style={{ 
              padding: '8px', 
              borderRadius: 'var(--radius-full)', 
              backgroundColor: 'var(--color-surface-white)',
              border: '1px solid var(--color-border-gray)',
              color: 'var(--color-deep-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)'
            }}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} color="var(--color-warning)" />}
          </button>

          {/* Sign In Link */}
          <Link 
            to="/login" 
            className="btn btn-secondary btn-sm"
            style={{ 
              border: '1px solid var(--color-border-gray)', 
              display: 'flex', 
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogIn size={15} color="var(--color-evidence-teal)" />
            <span>Sign In</span>
          </Link>

          {/* Primary CTA */}
          <a 
            href="#contact" 
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>Request Demo</span>
            <ArrowRight size={15} />
          </a>

          {/* Mobile Hamburger Button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            aria-label="Toggle navigation menu"
            style={{ 
              display: 'none', 
              padding: '6px', 
              borderRadius: '6px',
              border: '1px solid var(--color-border-gray)',
              color: 'var(--color-deep-ink)'
            }}
            className="mobile-toggle"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div 
          style={{ 
            borderTop: '1px solid var(--color-border-gray)', 
            marginTop: '12px', 
            paddingTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            backgroundColor: 'var(--color-warm-ivory)'
          }}
        >
          <a 
            href="#how-it-works" 
            onClick={() => setMobileMenuOpen(false)} 
            style={{ padding: '8px 0', fontWeight: 500 }}
          >
            How It Works
          </a>
          <a 
            href="#features" 
            onClick={() => setMobileMenuOpen(false)} 
            style={{ padding: '8px 0', fontWeight: 500 }}
          >
            Features
          </a>
          <a 
            href="#demo" 
            onClick={() => setMobileMenuOpen(false)} 
            style={{ padding: '8px 0', fontWeight: 500 }}
          >
            Interactive Demo
          </a>
          <a 
            href="#plans" 
            onClick={() => setMobileMenuOpen(false)} 
            style={{ padding: '8px 0', fontWeight: 500 }}
          >
            Plans
          </a>
          <a 
            href="#trust" 
            onClick={() => setMobileMenuOpen(false)} 
            style={{ padding: '8px 0', fontWeight: 500 }}
          >
            Trust & Compliance
          </a>
          <a 
            href="#contact" 
            onClick={() => setMobileMenuOpen(false)} 
            style={{ padding: '8px 0', fontWeight: 500 }}
          >
            Contact & Leads
          </a>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '10px' }}>
            <Link 
              to="/login" 
              className="btn btn-dark" 
              onClick={() => setMobileMenuOpen(false)}
            >
              Sign In to Workspace
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
