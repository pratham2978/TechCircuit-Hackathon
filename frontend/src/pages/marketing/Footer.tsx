import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../../components/common/BrandLogo';
import { ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="site-footer">
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', 
            gap: '40px',
            marginBottom: '48px'
          }}
        >
          {/* Brand Info */}
          <div style={{ maxWidth: '320px' }}>
            <BrandLogo size="md" variant="light" className="mb-3" />
            <p style={{ color: 'var(--text-disabled)', fontSize: '0.88rem', lineHeight: 1.6, marginTop: '12px' }}>
              The evidence-first B2B brand governance and claim verification platform. Every claim accountable. Every asset on-brand.
            </p>
            <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--info)' }}>
              <ShieldCheck size={15} />
              <span>Zero-autonomous publishing guarantee</span>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 style={{ color: 'var(--surface)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '16px', letterSpacing: '0.02em' }}>
              Platform
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', padding: 0 }}>
              <li>
                <a href="#how-it-works" className="footer-link">How It Works</a>
              </li>
              <li>
                <a href="#features" className="footer-link">Feature Architecture</a>
              </li>
              <li>
                <a href="#demo" className="footer-link">Interactive Sandbox</a>
              </li>
              <li>
                <a href="#plans" className="footer-link">Enterprise Plans</a>
              </li>
              <li>
                <Link to="/app/dashboard" className="footer-link" style={{ color: 'var(--primary)', fontWeight: 600 }}>
                  Launch Demo App →
                </Link>
              </li>
            </ul>
          </div>

          {/* Governance & Architecture */}
          <div>
            <h4 style={{ color: 'var(--surface)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '16px', letterSpacing: '0.02em' }}>
              Governance
            </h4>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', padding: 0 }}>
              <li>
                <a href="#trust" className="footer-link">Trust & Ethics Charter</a>
              </li>
              <li>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Claim Ledger Standard (v2.4)</span>
              </li>
              <li>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Brand Passport Specification</span>
              </li>
              <li>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Multi-Tenant Security Architecture</span>
              </li>
            </ul>
          </div>

          {/* Legal Disclaimers & Disclosures */}
          <div>
            <h4 style={{ color: 'var(--surface)', fontSize: '0.95rem', fontWeight: 600, marginBottom: '16px', letterSpacing: '0.02em' }}>
              Regulatory Disclosure
            </h4>
            <div 
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.04)', 
                padding: '14px 16px', 
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                fontSize: '0.78rem',
                lineHeight: 1.55,
                color: 'var(--text-disabled)'
              }}
            >
              <strong style={{ color: '#FFFFFF', display: 'block', marginBottom: '6px' }}>
                Legal & AI Advisory Notice:
              </strong>
              BrandGuard provides brand identity verification and factual claims governance software. BrandGuard does not provide formal legal counsel or statutory compliance certification. AI-assisted indexing is strictly grounded in client-approved evidentiary sources.
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div 
          style={{ 
            borderTop: '1px solid rgba(255, 255, 255, 0.12)', 
            paddingTop: '24px',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: 'var(--text-disabled)',
            gap: '16px'
          }}
        >
          <div>
            © {new Date().getFullYear()} BrandGuard Technologies Inc. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-muted)' }}>Tenant Data Privacy Policy (Demo)</span>
            <span style={{ color: 'var(--text-muted)' }}>Terms of Service (Demo)</span>
            <span style={{ color: 'var(--text-muted)' }}>Security Statement</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
