import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { AccountType } from '../../types';
import { BrandLogo } from '../../components/common/BrandLogo';
import { 
  Building2, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ArrowLeft, 
  Sun, 
  Moon,
  Info,
  FileText,
  Database,
  CheckCircle2,
  AlertTriangle,
  Award,
  Sparkles,
  Lock
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { accountType, setAccountType, theme, toggleTheme } = useDemo();
  const navigate = useNavigate();

  const [selectedType, setSelectedType] = useState<AccountType>(accountType);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 3D Perspective Visual Tilt State
  const visualRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(-1.5);
  const [rotateY, setRotateY] = useState(2);
  const [isHovered, setIsHovered] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReducedMotion || !visualRef.current) return;
    const rect = visualRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Restrained subtle tilt (max ±3 degrees)
    const tiltX = -((y - centerY) / centerY) * 3;
    const tiltY = ((x - centerX) / centerX) * 4;

    setRotateX(tiltX);
    setRotateY(tiltY);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (prefersReducedMotion) return;
    setIsHovered(false);
    setRotateX(-1.5);
    setRotateY(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter a valid work email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email format (e.g. name@company.com).');
      return;
    }
    if (!password.trim() || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setError(null);
    setLoading(true);

    setTimeout(() => {
      setAccountType(selectedType);
      setLoading(false);
      navigate('/app/dashboard');
    }, 400);
  };

  const handleQuickDemo = (type: AccountType) => {
    setSelectedType(type);
    if (type === 'company_workspace') {
      setEmail('sarah.chen@acmeglobal.com');
      setPassword('AcmeSecure2026!');
    } else {
      setEmail('elena.rostova@brandguard.internal');
      setPassword('OpsGovernance2026!');
    }
    setError(null);
  };

  const isCompany = selectedType === 'company_workspace';

  return (
    <div 
      style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        backgroundColor: 'var(--bg)',
        transition: 'background-color var(--transition-normal)'
      }}
    >
      {/* Top Header Bar */}
      <header 
        style={{ 
          padding: '16px 24px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box'
        }}
      >
        <Link 
          to="/" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            color: 'var(--text-primary)', 
            fontSize: '0.88rem', 
            fontWeight: 500,
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            transition: 'border-color var(--transition-fast)'
          }}
        >
          <ArrowLeft size={16} />
          <span>Return to Homepage</span>
        </Link>

        <button 
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          style={{ 
            padding: '8px', 
            borderRadius: 'var(--radius-full)', 
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={16} /> : <Sun size={16} color="var(--warning)" />}
        </button>
      </header>

      {/* Main Two-Panel Sign-In Layout */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px 24px 48px' }}>
        <div className="signin-page-container">
          
          {/* LEFT PANEL — BRAND EXPERIENCE & RESTRAINED INTERACTIVE VISUAL */}
          <div 
            className="signin-visual-panel"
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '24px',
              padding: '12px 0'
            }}
          >
            <div>
              <div 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  backgroundColor: 'var(--info-subtle)',
                  border: '1px solid rgba(22, 124, 120, 0.25)',
                  color: 'var(--info)',
                  padding: '4px 12px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  marginBottom: '14px'
                }}
              >
                <ShieldCheck size={15} />
                <span>Evidence-Backed Governance Network</span>
              </div>
              <h2 style={{ fontSize: '1.95rem', color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.25, marginBottom: '10px' }}>
                Every claim accountable. <br />
                <span style={{ color: isCompany ? 'var(--primary)' : 'var(--info)' }}>
                  Every asset on-brand.
                </span>
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.55 }}>
                BrandGuard connects enterprise manuscripts directly to audited claim ledgers, automated rule checks, and certified human signoffs.
              </p>
            </div>

            {/* Layered Document & Evidence Interface (Interactive 3D Visual) */}
            <div 
              className="brand-visual-canvas"
              ref={visualRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{
                perspective: '1000px',
                cursor: 'default'
              }}
            >
              <div 
                className="brand-visual-stack"
                style={{
                  transform: prefersReducedMotion 
                    ? 'none' 
                    : `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`,
                  transition: isHovered 
                    ? 'transform 0.12s ease-out, box-shadow 0.2s ease' 
                    : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.5s ease'
                }}
              >
                {/* Surface 1: Governed Marketing Document Card */}
                <div 
                  className="card-panel"
                  style={{
                    padding: '18px 20px',
                    borderRadius: 'var(--radius-lg)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} color="var(--info)" />
                      <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                        Enterprise Cloud Migration Brief
                      </strong>
                    </div>
                    <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>
                      In Review
                    </span>
                  </div>

                  <div 
                    style={{ 
                      fontSize: '0.82rem', 
                      lineHeight: 1.55, 
                      padding: '10px 12px',
                      backgroundColor: 'var(--surface-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-primary)',
                      borderLeft: isCompany ? '3px solid var(--danger)' : '3px solid var(--success)'
                    }}
                  >
                    "Delivers enterprise governance with{' '}
                    <span 
                      style={{ 
                        backgroundColor: isCompany ? 'rgba(241, 107, 80, 0.2)' : 'rgba(40, 125, 88, 0.2)',
                        color: isCompany ? 'var(--danger)' : 'var(--success)',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: '3px'
                      }}
                    >
                      {isCompany ? 'guaranteed 100% uptime SLA' : '99.99% target availability SLA'}
                    </span>
                    {' '}while preserving complete evidence citations."
                  </div>
                </div>

                {/* Surface 2: Connected Evidence Ledger Card with Connector */}
                <div className="evidence-connector">
                  <div 
                    className="card-panel"
                    style={{
                      padding: '14px 18px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--surface)',
                      boxShadow: 'var(--shadow-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div 
                        style={{ 
                          width: '32px', 
                          height: '32px', 
                          borderRadius: '6px', 
                          backgroundColor: 'var(--info-subtle)',
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        <Database size={16} color="var(--info)" />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Claim Ledger: Master SLA Table 4.2
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Authority: DevOps Legal • Valid through 2026
                        </div>
                      </div>
                    </div>
                    <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                      Verified Ground Truth
                    </span>
                  </div>
                </div>

                {/* Surface 3: Certified Human Approval & Brand Passport */}
                <div 
                  className="card-panel"
                  style={{
                    padding: '14px 18px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Award size={18} color="var(--info)" />
                    <div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
                        Brand Passport #BP-9921
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Human Reviewer: Elena Rostova (BrandGuard Operations)
                      </span>
                    </div>
                  </div>
                  <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>
                    Certified Seal
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Environment Context Indicator */}
            <div 
              style={{ 
                padding: '12px 16px', 
                backgroundColor: isCompany ? 'var(--primary-subtle)' : 'var(--info-subtle)',
                borderRadius: 'var(--radius-md)',
                border: isCompany ? '1px solid rgba(241, 107, 80, 0.3)' : '1px solid rgba(22, 124, 120, 0.3)',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                transition: 'all var(--transition-normal)'
              }}
            >
              {isCompany ? (
                <Building2 size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
              ) : (
                <ShieldCheck size={18} color="var(--info)" style={{ flexShrink: 0 }} />
              )}
              <div style={{ color: 'var(--text-primary)' }}>
                <strong>{isCompany ? 'Company Workspace Mode:' : 'BrandGuard Operations Mode:'}</strong>{' '}
                <span style={{ color: 'var(--text-muted)' }}>
                  {isCompany 
                    ? 'Client access for content authors, Intent Cards, and review submissions.' 
                    : 'Internal access for claim ledger curation, rule reviews, and binding signoffs.'}
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL — POLISHED ENTERPRISE SIGN-IN FORM */}
          <div 
            className="card-panel"
            style={{ 
              padding: '36px',
              borderRadius: 'var(--radius-xl)',
              backgroundColor: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-md)',
              boxSizing: 'border-box'
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'inline-flex', marginBottom: '12px' }}>
                <BrandLogo size="md" />
              </div>
              <h1 style={{ fontSize: '1.65rem', color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '6px' }}>
                Sign in to BrandGuard
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Select an environment to access your governance dashboard.
              </p>
            </div>

            {/* Account Environment Selector */}
            <div style={{ marginBottom: '22px' }}>
              <label 
                style={{ 
                  display: 'block', 
                  fontSize: '0.78rem', 
                  fontWeight: 700, 
                  textTransform: 'uppercase', 
                  color: 'var(--text-muted)', 
                  letterSpacing: '0.04em', 
                  marginBottom: '8px' 
                }}
              >
                Account Environment
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {/* Option 1: Company Workspace */}
                <button
                  type="button"
                  onClick={() => setSelectedType('company_workspace')}
                  style={{ 
                    padding: '12px', 
                    borderRadius: 'var(--radius-md)', 
                    border: isCompany ? '2px solid var(--primary)' : '1px solid var(--border)',
                    backgroundColor: isCompany ? 'var(--primary-subtle)' : 'var(--surface-subtle)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'border-color var(--transition-fast), background-color var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Building2 size={16} color="var(--primary)" />
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Company</strong>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                    Client content workspace & drafts
                  </span>
                </button>

                {/* Option 2: BrandGuard Operations */}
                <button
                  type="button"
                  onClick={() => setSelectedType('brandguard_operations')}
                  style={{ 
                    padding: '12px', 
                    borderRadius: 'var(--radius-md)', 
                    border: !isCompany ? '2px solid var(--info)' : '1px solid var(--border)',
                    backgroundColor: !isCompany ? 'var(--info-subtle)' : 'var(--surface-subtle)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'border-color var(--transition-fast), background-color var(--transition-fast)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={16} color="var(--info)" />
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Operations</strong>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                    Review queue, claim ledger & approvals
                  </span>
                </button>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate>
              {error && (
                <div 
                  style={{ 
                    padding: '10px 14px', 
                    borderRadius: 'var(--radius-md)', 
                    backgroundColor: 'var(--danger-subtle)', 
                    color: 'var(--danger)',
                    fontSize: '0.82rem', 
                    marginBottom: '16px',
                    border: '1px solid rgba(198,61,79,0.25)',
                    fontWeight: 500
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label 
                  htmlFor="login-email"
                  style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '6px' }}
                >
                  Work Email Address
                </label>
                <input 
                  id="login-email"
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isCompany ? 'sarah.chen@acmeglobal.com' : 'elena.rostova@brandguard.internal'}
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--border)',
                    fontSize: '0.9rem',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label 
                    htmlFor="login-password"
                    style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}
                  >
                    Password
                  </label>
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  >
                    {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    <span>{showPassword ? 'Hide' : 'Show'}</span>
                  </button>
                </div>
                <input 
                  id="login-password"
                  type={showPassword ? 'text' : 'password'} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{ 
                    width: '100%', 
                    padding: '10px 12px', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--border)',
                    fontSize: '0.9rem',
                    backgroundColor: 'var(--surface)',
                    color: 'var(--text-primary)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className={`btn ${isCompany ? 'btn-primary' : 'btn-teal'}`}
                style={{ width: '100%', padding: '12px', fontSize: '0.92rem', gap: '8px' }}
              >
                {loading ? (
                  <span>Accessing Environment...</span>
                ) : (
                  <>
                    <span>Sign In to {isCompany ? 'Company Workspace' : 'BrandGuard Operations'}</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            {/* Demonstration Helper Strip */}
            <div 
              style={{ 
                marginTop: '24px', 
                paddingTop: '18px', 
                borderTop: '1px solid var(--border)',
                fontSize: '0.8rem',
                color: 'var(--text-muted)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', color: 'var(--text-primary)', fontWeight: 600 }}>
                <Info size={14} color="var(--info)" />
                <span>Demonstration Exploration Access</span>
              </div>
              <p style={{ marginBottom: '10px', fontSize: '0.76rem', lineHeight: 1.45 }}>
                Authentication is simulated in this demonstration. Use the quick-fill buttons below to populate sample credentials:
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button 
                  type="button"
                  onClick={() => handleQuickDemo('company_workspace')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.74rem', gap: '6px', justifyContent: 'center' }}
                >
                  <Building2 size={13} color="var(--primary)" />
                  <span>Quick-Fill Client</span>
                </button>
                <button 
                  type="button"
                  onClick={() => handleQuickDemo('brandguard_operations')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.74rem', gap: '6px', justifyContent: 'center' }}
                >
                  <ShieldCheck size={13} color="var(--info)" />
                  <span>Quick-Fill Operations</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};
