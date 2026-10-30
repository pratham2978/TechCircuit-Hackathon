import React, { useState } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Sparkles, 
  RotateCcw, 
  Check,
  ImageIcon,
  Eye,
  Info,
  ShieldCheck,
  Layers,
  Palette,
  AlertCircle
} from 'lucide-react';

export const InteractiveProductDemo: React.FC = () => {
  const initialText = `BrandGuard Cloud is an all-in-one revolutionary AI platform built to eliminate compliance risk with guaranteed 100% uptime.`;

  const [content, setContent] = useState(initialText);
  const [fixedFinding1, setFixedFinding1] = useState(false);
  const [fixedFinding2, setFixedFinding2] = useState(false);
  const [demoMode, setDemoMode] = useState<'text' | 'image'>('text');

  const handleFix1 = () => {
    setContent(prev => prev.replace('revolutionary AI platform', 'enterprise-grade governance system'));
    setFixedFinding1(true);
  };

  const handleFix2 = () => {
    setContent(prev => prev.replace('guaranteed 100% uptime', '99.99% target availability SLA'));
    setFixedFinding2(true);
  };

  const handleReset = () => {
    setContent(initialText);
    setFixedFinding1(false);
    setFixedFinding2(false);
  };

  const textScore = (fixedFinding1 ? 50 : 0) + (fixedFinding2 ? 50 : 0);

  return (
    <section 
      id="demo"
      style={{ 
        padding: '84px 24px', 
        backgroundColor: 'var(--bg)',
        transition: 'background-color var(--transition-normal)'
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: '740px', margin: '0 auto 40px' }}>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '16px', letterSpacing: '-0.02em' }}>
            Experience evidence-linked verification in real time
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6 }}>
            BrandGuard verifies both written content and brand visual assets against approved corporate guidelines. Test live text resolution or explore the planned visual asset review capability below.
          </p>
          <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <em>Sample illustrative data. Never fabricated as real customer records.</em>
          </div>
        </div>

        {/* Demo Mode Switcher: Written Content vs Brand Visual Assets */}
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '12px', 
            marginBottom: '32px' 
          }}
        >
          <button
            onClick={() => setDemoMode('text')}
            className={`btn ${demoMode === 'text' ? 'btn-dark' : 'btn-secondary'}`}
            style={{ 
              borderRadius: 'var(--radius-full)', 
              gap: '8px',
              padding: '10px 20px',
              fontSize: '0.9rem'
            }}
          >
            <FileText size={16} />
            <span>Written Content Review</span>
          </button>

          <button
            onClick={() => setDemoMode('image')}
            className={`btn ${demoMode === 'image' ? 'btn-dark' : 'btn-secondary'}`}
            style={{ 
              borderRadius: 'var(--radius-full)', 
              gap: '8px',
              padding: '10px 20px',
              fontSize: '0.9rem'
            }}
          >
            <ImageIcon size={16} />
            <span>Brand Visual & Image Review (Preview)</span>
          </button>
        </div>

        {/* MODE 1: Written Content Demo */}
        {demoMode === 'text' && (
          <div 
            className="card-panel"
            style={{ 
              backgroundColor: 'var(--surface)', 
              borderRadius: 'var(--radius-xl)', 
              boxShadow: 'var(--shadow-lg)',
              padding: '28px',
              border: '1px solid var(--border)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '32px'
            }}
          >
            {/* Left Column: Editable Manuscript */}
            <div>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="var(--info)" />
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Submitted Written Content</span>
                  <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Draft #DEMO-01</span>
                </div>
                <button 
                  onClick={handleReset} 
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', gap: '4px' }}
                  title="Reset manuscript to initial state"
                >
                  <RotateCcw size={12} />
                  <span>Reset Demo</span>
                </button>
              </div>

              {/* Content Window */}
              <div 
                style={{ 
                  minHeight: '160px', 
                  padding: '18px', 
                  backgroundColor: 'var(--surface-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  fontSize: '0.96rem',
                  lineHeight: 1.7,
                  color: 'var(--text-primary)'
                }}
              >
                {content}
              </div>

              {/* Live Governance Score Bar */}
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Brand Governance Score:</span>
                  <span 
                    style={{ 
                      fontWeight: 700, 
                      color: textScore === 100 ? 'var(--success)' : textScore > 0 ? 'var(--warning)' : 'var(--danger)' 
                    }}
                  >
                    {textScore}% {textScore === 100 ? '— Ready for Human Review' : '— Action Required'}
                  </span>
                </div>
                <div 
                  style={{ 
                    height: '8px', 
                    backgroundColor: 'var(--border)', 
                    borderRadius: 'var(--radius-full)',
                    overflow: 'hidden'
                  }}
                >
                  <div 
                    style={{ 
                      height: '100%', 
                      width: `${textScore}%`, 
                      backgroundColor: textScore === 100 ? 'var(--success)' : textScore > 0 ? 'var(--warning)' : 'var(--danger)',
                      transition: 'width 0.4s ease, background-color 0.4s ease'
                    }} 
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Evidence-Linked Findings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  paddingBottom: '12px',
                  borderBottom: '1px solid var(--border)'
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  Detected Issues ({(fixedFinding1 ? 0 : 1) + (fixedFinding2 ? 0 : 1)} Active)
                </span>
                <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                  Audited Rules Engine
                </span>
              </div>

              {/* Finding Card 1: Terminology */}
              <div 
                className="interactive-card"
                style={{ 
                  padding: '16px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border)',
                  backgroundColor: fixedFinding1 ? 'var(--success-subtle)' : 'var(--surface-subtle)',
                  opacity: fixedFinding1 ? 0.8 : 1,
                  transition: 'all 0.25s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {fixedFinding1 ? (
                      <CheckCircle2 size={16} color="var(--success)" />
                    ) : (
                      <AlertTriangle size={16} color="var(--warning)" />
                    )}
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {fixedFinding1 ? 'Term Corrected' : 'Prohibited Superlative'}
                    </strong>
                  </div>
                  <span className={`badge ${fixedFinding1 ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.68rem' }}>
                    {fixedFinding1 ? 'Resolved' : 'Warning'}
                  </span>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.45 }}>
                  "revolutionary AI platform" violates Corporate Stylebook Section 2.1 prohibiting unsupported tech superlatives.
                </p>

                <div style={{ fontSize: '0.74rem', color: 'var(--info)', marginBottom: '10px' }}>
                  Rule Citation: Brand Stylebook v4, Sec 2.1 | Authority: Brand Governance Desk
                </div>

                {!fixedFinding1 ? (
                  <button 
                    onClick={handleFix1} 
                    className="btn btn-primary btn-sm"
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <Sparkles size={14} />
                    <span>Accept Suggested Fix: "enterprise-grade governance system"</span>
                  </button>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={14} /> Replaced with approved alternative
                  </div>
                )}
              </div>

              {/* Finding Card 2: SLA Claim */}
              <div 
                className="interactive-card"
                style={{ 
                  padding: '16px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border)',
                  backgroundColor: fixedFinding2 ? 'var(--success-subtle)' : 'var(--surface-subtle)',
                  opacity: fixedFinding2 ? 0.8 : 1,
                  transition: 'all 0.25s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {fixedFinding2 ? (
                      <CheckCircle2 size={16} color="var(--success)" />
                    ) : (
                      <AlertTriangle size={16} color="var(--danger)" />
                    )}
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      {fixedFinding2 ? 'Claim Verified' : 'Unverifiable SLA Claim'}
                    </strong>
                  </div>
                  <span className={`badge ${fixedFinding2 ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.68rem' }}>
                    {fixedFinding2 ? 'Resolved' : 'Critical'}
                  </span>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '8px', lineHeight: 1.45 }}>
                  "guaranteed 100% uptime" contradicts Infrastructure Claim Ledger (maximum verified SLA is 99.99%).
                </p>

                <div style={{ fontSize: '0.74rem', color: 'var(--info)', marginBottom: '10px' }}>
                  Source: Master SLA Standard, Table 3.2 | Owner: VP Infrastructure
                </div>

                {!fixedFinding2 ? (
                  <button 
                    onClick={handleFix2} 
                    className="btn btn-teal btn-sm"
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <Sparkles size={14} />
                    <span>Accept Suggested Fix: "99.99% target availability SLA"</span>
                  </button>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={14} /> Synced with approved claim ledger
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: Brand Visual Asset & Image Review (Planned Capability Preview) */}
        {demoMode === 'image' && (
          <div 
            className="card-panel"
            style={{ 
              backgroundColor: 'var(--surface)', 
              borderRadius: 'var(--radius-xl)', 
              boxShadow: 'var(--shadow-lg)',
              padding: '28px',
              border: '1px solid var(--border)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '32px'
            }}
          >
            {/* Left Column: Visual Asset Preview */}
            <div>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ImageIcon size={18} color="var(--info)" />
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Submitted Brand Asset Preview</span>
                  <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Asset #IMG-882</span>
                </div>
                <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                  Planned Capability Preview
                </span>
              </div>

              {/* Graphic Asset Mock Container with Visual Inspection Markers */}
              <div 
                style={{ 
                  position: 'relative',
                  backgroundColor: '#0E1620',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  padding: '28px 24px',
                  color: '#FFFFFF',
                  overflow: 'hidden'
                }}
              >
                {/* Banner Header Simulation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  {/* Logo with Distortion Bounding Box */}
                  <div 
                    style={{ 
                      border: '2px dashed var(--warning)', 
                      padding: '6px 12px', 
                      borderRadius: '4px',
                      position: 'relative'
                    }}
                  >
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.04em' }}>
                      BrandGuard Cloud
                    </span>
                    <span 
                      style={{ 
                        position: 'absolute', 
                        top: '-10px', 
                        right: '-10px', 
                        backgroundColor: 'var(--warning)', 
                        color: '#000000', 
                        fontSize: '0.62rem', 
                        fontWeight: 700, 
                        padding: '1px 5px', 
                        borderRadius: '3px' 
                      }}
                    >
                      Issue #1
                    </span>
                  </div>

                  <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>1200 × 630 px</span>
                </div>

                {/* Banner Body */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px', lineHeight: 1.25 }}>
                    Unified Brand Governance Across Every Channel
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#CBD5E1', lineHeight: 1.5 }}>
                    Automated guideline enforcement with human-controlled signoffs and evidence-linked Brand Passports.
                  </div>
                </div>

                {/* Banner CTA with Contrast Issue Marker */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div 
                    style={{ 
                      position: 'relative',
                      border: '2px dashed var(--danger)',
                      borderRadius: '6px',
                      padding: '2px'
                    }}
                  >
                    <button 
                      style={{ 
                        backgroundColor: 'var(--primary)', 
                        color: '#FFFFFF', 
                        padding: '8px 16px', 
                        borderRadius: '4px',
                        fontSize: '0.82rem',
                        fontWeight: 600
                      }}
                    >
                      Get Started Today
                    </button>
                    <span 
                      style={{ 
                        position: 'absolute', 
                        top: '-10px', 
                        right: '-10px', 
                        backgroundColor: 'var(--danger)', 
                        color: '#FFFFFF', 
                        fontSize: '0.62rem', 
                        fontWeight: 700, 
                        padding: '1px 5px', 
                        borderRadius: '3px' 
                      }}
                    >
                      Issue #3
                    </span>
                  </div>

                  {/* Accent Swatch with Palette Deviation Marker */}
                  <div 
                    style={{ 
                      position: 'relative',
                      border: '2px dashed var(--warning)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.72rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#FF2A6D', display: 'inline-block' }} />
                    <span style={{ color: '#FF2A6D', fontWeight: 600 }}>#FF2A6D</span>
                    <span 
                      style={{ 
                        position: 'absolute', 
                        top: '-10px', 
                        right: '-10px', 
                        backgroundColor: 'var(--warning)', 
                        color: '#000000', 
                        fontSize: '0.62rem', 
                        fontWeight: 700, 
                        padding: '1px 5px', 
                        borderRadius: '3px' 
                      }}
                    >
                      Issue #2
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Note */}
              <div 
                style={{ 
                  marginTop: '16px', 
                  padding: '12px', 
                  backgroundColor: 'var(--surface-subtle)', 
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Info size={16} color="var(--info)" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Planned Capability Preview:</strong> Computer vision logo bounding, palette extraction, and WCAG pixel checks are architected for the Image Engine Phase. Displayed checks reflect planned production specifications.
                </span>
              </div>
            </div>

            {/* Right Column: Visual Findings (Planned Checks Specification) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  paddingBottom: '12px',
                  borderBottom: '1px solid var(--border)'
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  Planned Visual Brand Checks (3 Issues Identified)
                </span>
                <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                  Illustrative Specification
                </span>
              </div>

              {/* Visual Check 1: Logo Distortion */}
              <div 
                className="interactive-card"
                style={{ 
                  padding: '14px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={15} color="var(--warning)" />
                    <strong style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>Issue #1: Logo Aspect Ratio & Clearspace</strong>
                  </div>
                  <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Warning</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', lineHeight: 1.45 }}>
                  Brand mark horizontal scale altered by +12%, violating corporate logo lockup proportions.
                </p>
                <div style={{ fontSize: '0.74rem', color: 'var(--info)', marginBottom: '4px' }}>
                  Supporting Rule: Brand Identity Guidelines 2026, Sec 1.4 (Zero Distortion Policy)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', backgroundColor: 'var(--surface)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <strong>Planned Remediation:</strong> Auto-restore master 1:1 vector proportions with 24px clearspace perimeter.
                </div>
              </div>

              {/* Visual Check 2: Color Palette */}
              <div 
                className="interactive-card"
                style={{ 
                  padding: '14px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Palette size={15} color="var(--warning)" />
                    <strong style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>Issue #2: Off-Palette Accent Color</strong>
                  </div>
                  <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>Advisory</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', lineHeight: 1.45 }}>
                  Accent color hex <code style={{ fontSize: '0.75rem' }}>#FF2A6D</code> is not registered in the approved corporate token library.
                </p>
                <div style={{ fontSize: '0.74rem', color: 'var(--info)', marginBottom: '4px' }}>
                  Supporting Rule: Color Token Registry #PAL-02 (Permitted Accent Palette)
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', backgroundColor: 'var(--surface)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <strong>Planned Remediation:</strong> Remap to approved token <code style={{ color: 'var(--primary)' }}>#F16B50</code> (Signal Coral).
                </div>
              </div>

              {/* Visual Check 3: WCAG Accessibility */}
              <div 
                className="interactive-card"
                style={{ 
                  padding: '14px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--surface-subtle)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangle size={15} color="var(--danger)" />
                    <strong style={{ fontSize: '0.84rem', color: 'var(--text-primary)' }}>Issue #3: WCAG 2.1 AA Contrast Failure</strong>
                  </div>
                  <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Critical</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', lineHeight: 1.45 }}>
                  White text on coral CTA button achieves only 2.8:1 contrast, failing the mandatory 4.5:1 AA standard.
                </p>
                <div style={{ fontSize: '0.74rem', color: 'var(--info)', marginBottom: '4px' }}>
                  Supporting Rule: Digital Accessibility Standard #ACC-101 & WCAG 2.1 AA
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)', backgroundColor: 'var(--surface)', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                  <strong>Planned Remediation:</strong> Darken button surface to achieve ≥ 4.5:1 ratio or apply Deep Ink typography.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
