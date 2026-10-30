import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { AccountType } from '../../types';
import { 
  Building2, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Lock
} from 'lucide-react';

export const DemoRolesSection: React.FC = () => {
  const { setAccountType } = useDemo();
  const navigate = useNavigate();

  const handleLaunch = (type: AccountType) => {
    setAccountType(type);
    navigate('/app/dashboard');
  };

  return (
    <section 
      id="accounts"
      style={{ 
        padding: '84px 24px', 
        backgroundColor: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        transition: 'background-color var(--transition-normal), border-color var(--transition-normal)'
      }}
    >
      <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px' }}>
          <h2 style={{ fontSize: '2.2rem', marginBottom: '16px', letterSpacing: '-0.02em' }}>
            Two purpose-built account models
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', lineHeight: 1.6 }}>
            BrandGuard cleanly separates client content drafting and review requests from institutional verification, claim ledger governance, and platform administration.
          </p>
        </div>

        <div 
          style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', 
            gap: '32px',
            maxWidth: '1000px',
            margin: '0 auto'
          }}
        >
          {/* Account 1: Company Workspace */}
          <div 
            className="card-panel interactive-card"
            style={{ 
              backgroundColor: 'var(--surface-subtle)',
              borderRadius: 'var(--radius-xl)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '24px',
              border: '1px solid var(--border)',
              borderTop: '4px solid var(--primary)'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                <div 
                  style={{ 
                    padding: '10px', 
                    borderRadius: 'var(--radius-md)', 
                    backgroundColor: 'var(--surface)', 
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <Building2 size={24} color="var(--primary)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', fontWeight: 700 }}>Company Workspace</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Client Organization Environment</span>
                </div>
              </div>

              <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '20px' }}>
                For enterprise teams managing marketing collateral, product messaging, and campaign launches. Draft content with Intent Cards, accept 1-click evidence fixes, and track certified Brand Passports.
              </p>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color="var(--success)" style={{ flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-primary)' }}>Content workspace & Intent Card authoring</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color="var(--success)" style={{ flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-primary)' }}>1-click compliant alternative fix acceptance</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color="var(--success)" style={{ flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-primary)' }}>Guideline and verified claim viewing (Read-Only)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color="var(--success)" style={{ flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-primary)' }}>Brand Passport audit certification records</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  <Lock size={14} style={{ flexShrink: 0 }} />
                  <span>Cannot silently alter approved ledger claims</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => handleLaunch('company_workspace')}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'space-between', padding: '12px 18px' }}
            >
              <span>Explore Company Workspace</span>
              <ArrowRight size={16} />
            </button>
          </div>

          {/* Account 2: BrandGuard Operations */}
          <div 
            className="card-panel interactive-card"
            style={{ 
              backgroundColor: 'var(--surface-subtle)',
              borderRadius: 'var(--radius-xl)',
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '24px',
              border: '1px solid var(--border)',
              borderTop: '4px solid var(--info)'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                <div 
                  style={{ 
                    padding: '10px', 
                    borderRadius: 'var(--radius-md)', 
                    backgroundColor: 'var(--surface)', 
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <ShieldCheck size={24} color="var(--info)" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.35rem', color: 'var(--text-primary)', fontWeight: 700 }}>BrandGuard Operations</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 500 }}>Governance & Verification Team</span>
                </div>
              </div>

              <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: '20px' }}>
                For the internal governance team responsible for customer onboarding, review queue decisions, claim ledger curation, and platform administration.
              </p>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color="var(--info)" style={{ flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-primary)' }}>Human Review Queue & binding publishing signoff</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color="var(--info)" style={{ flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-primary)' }}>Approved Fact & Claim Ledger curation</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color="var(--info)" style={{ flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-primary)' }}>Guideline document ingestion & proposed rule approvals</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color="var(--info)" style={{ flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-primary)' }}>Guideline Health & policy dismissal analytics</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} color="var(--info)" style={{ flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-primary)' }}>Tenant workspace management & inbound leads</span>
                </div>
              </div>
            </div>

            <button 
              onClick={() => handleLaunch('brandguard_operations')}
              className="btn btn-dark"
              style={{ width: '100%', justifyContent: 'space-between', padding: '12px 18px' }}
            >
              <span>Explore BrandGuard Operations</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
