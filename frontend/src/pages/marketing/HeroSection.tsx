import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Lock,
  Layers,
  Database,
  UserCheck,
  Award
} from 'lucide-react';

export const HeroSection: React.FC = () => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(-2);
  const [rotateY, setRotateY] = useState(3);
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
    if (prefersReducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Restrained subtle tilt (max ±5 degrees)
    const tiltX = -((y - centerY) / centerY) * 4.5;
    const tiltY = ((x - centerX) / centerX) * 5.5;

    setRotateX(tiltX);
    setRotateY(tiltY);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (prefersReducedMotion) return;
    setIsHovered(false);
    // Smoothly return to natural resting perspective
    setRotateX(-2);
    setRotateY(3);
  };

  return (
    <section 
      style={{ 
        padding: '72px 24px 84px', 
        maxWidth: '1280px', 
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '56px',
        alignItems: 'center'
      }}
    >
      {/* Left Column: Brand Positioning & CTAs */}
      <div>
        <h1 
          style={{ 
            fontSize: 'clamp(2.4rem, 4vw, 3.4rem)', 
            lineHeight: 1.15, 
            marginBottom: '20px',
            color: 'var(--color-deep-ink)',
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            letterSpacing: '-0.03em'
          }}
        >
          Every claim accountable. <br />
          <span style={{ color: 'var(--color-signal-coral)' }}>Every asset on-brand.</span>
        </h1>

        <p 
          style={{ 
            fontSize: '1.15rem', 
            lineHeight: 1.6, 
            color: 'var(--color-muted-slate)', 
            marginBottom: '32px',
            maxWidth: '540px'
          }}
        >
          Keep every piece of content aligned with your approved guidelines, verified claims, and brand standards—with evidence-backed reviews and human-controlled approvals.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '36px' }}>
          <Link 
            to="/login" 
            className="btn btn-primary btn-lg"
            style={{ boxShadow: 'var(--shadow-md)' }}
          >
            <span>Explore Workspace</span>
            <ArrowRight size={18} />
          </Link>
          <a 
            href="#demo" 
            className="btn btn-secondary btn-lg"
          >
            <span>Interactive Demo</span>
          </a>
        </div>

        {/* Institutional Trust Badges */}
        <div 
          style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '20px', 
            paddingTop: '20px', 
            borderTop: '1px solid var(--color-border-gray)',
            fontSize: '0.85rem',
            color: 'var(--color-deep-ink)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Lock size={15} color="var(--color-evidence-teal)" />
            <span>Company Tenant Isolation</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={15} color="var(--color-success)" />
            <span>Human-in-the-Loop Signoff</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={15} color="var(--color-signal-coral)" />
            <span>Immutable Brand Passport</span>
          </div>
        </div>
      </div>

      {/* Right Column: Redesigned 3D Perspective Review Artifact */}
      <div 
        style={{ 
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          perspective: '1200px'
        }}
      >
        <div 
          ref={cardRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="card-panel" 
          style={{ 
            width: '100%', 
            maxWidth: '560px',
            backgroundColor: 'var(--color-surface-white)',
            border: '1px solid var(--color-border-gray)',
            boxShadow: isHovered ? 'var(--shadow-lg)' : 'var(--shadow-md)',
            padding: '28px',
            borderRadius: 'var(--radius-xl)',
            transform: prefersReducedMotion 
              ? 'none' 
              : `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`,
            transition: isHovered 
              ? 'transform 0.12s ease-out, box-shadow 0.2s ease' 
              : 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.5s ease',
            cursor: 'default',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            willChange: 'transform'
          }}
        >
          {/* 1. Document title and review status */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--color-border-subtle)',
              paddingBottom: '14px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="var(--color-evidence-teal)" />
              <strong style={{ fontSize: '0.95rem', color: 'var(--color-deep-ink)' }}>
                Enterprise Cloud Migration Brief
              </strong>
            </div>
            <span className="badge badge-expiring" style={{ fontSize: '0.7rem' }}>
              In Review
            </span>
          </div>

          {/* 2. Original content with problematic claim highlighted */}
          <div 
            style={{ 
              fontSize: '0.92rem', 
              lineHeight: 1.65, 
              color: 'var(--color-deep-ink)',
              padding: '14px',
              backgroundColor: 'var(--color-surface-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-subtle)',
              userSelect: 'text'
            }}
          >
            <p>
              "BrandGuard Cloud is an enterprise governance platform. Our platform is engineered to deliver{' '}
              <mark 
                style={{ 
                  backgroundColor: 'rgba(241, 107, 80, 0.18)', 
                  color: 'var(--color-error)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  borderBottom: '2px solid var(--color-error)',
                  fontWeight: 600
                }}
              >
                guaranteed 100% uptime across all hybrid cloud deployments
              </mark>
              {' '}with assisted evidence verification while keeping your team in final approval control."
            </p>
          </div>

          {/* 3. Finding severity and explanation (Elevation Layer) */}
          <div 
            style={{ 
              backgroundColor: 'var(--color-warm-ivory)', 
              border: '1px solid var(--color-border-gray)',
              borderLeft: '4px solid var(--color-error)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={16} color="var(--color-error)" />
                <strong style={{ fontSize: '0.88rem', color: 'var(--color-error)' }}>
                  Finding #CLM-101: Absolute SLA Prohibited
                </strong>
              </div>
              <span className="badge badge-critical" style={{ fontSize: '0.68rem' }}>
                Critical
              </span>
            </div>

            <p style={{ color: 'var(--color-deep-ink)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '12px' }}>
              Corporate Claim Ledger limits maximum availability quote to 99.99%. Absolute 100% statements create binding legal exposure.
            </p>

            {/* 4. Approved alternative */}
            <div 
              style={{ 
                backgroundColor: 'var(--color-surface-white)', 
                padding: '10px 14px', 
                borderRadius: '6px', 
                border: '1px solid var(--color-border-gray)',
                marginBottom: '12px',
                fontSize: '0.84rem'
              }}
            >
              <span style={{ color: 'var(--color-evidence-teal)', fontWeight: 700 }}>Approved Alternative: </span>
              <span style={{ fontWeight: 500, color: 'var(--color-deep-ink)' }}>
                "engineered for 99.99% target uptime under enterprise SLA"
              </span>
            </div>

            {/* 5. Evidence source and page reference */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                fontSize: '0.8rem', 
                color: 'var(--color-evidence-teal)',
                fontWeight: 600,
                marginBottom: '8px'
              }}
            >
              <Database size={14} />
              <span>Ledger: MSA 2026, Section 4.2 (p. 12)</span>
            </div>

            {/* 6. Ownership and review metadata */}
            <div 
              style={{ 
                display: 'flex', 
                flexWrap: 'wrap', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                fontSize: '0.78rem', 
                color: 'var(--color-muted-slate)',
                borderTop: '1px solid var(--color-border-subtle)',
                paddingTop: '8px',
                marginTop: '4px'
              }}
            >
              <span>Owner: <strong style={{ color: 'var(--color-deep-ink)' }}>DevOps Legal</strong></span>
              <span>Human Reviewer: <strong style={{ color: 'var(--color-deep-ink)' }}>Elena Rostova</strong></span>
            </div>
          </div>

          {/* 7. Brand Passport status */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              paddingTop: '8px',
              borderTop: '1px solid var(--color-border-subtle)',
              fontSize: '0.82rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-muted-slate)' }}>
              <UserCheck size={15} color="var(--color-evidence-teal)" />
              <span>Awaiting final reviewer authorization</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-evidence-teal)', fontWeight: 700 }}>
              <Award size={16} />
              <span>Brand Passport #BP-9921 Pending</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
