import React, { useState } from 'react';
import { useDemo } from '../../context/DemoContext';
import { 
  Settings, 
  Palette, 
  Users, 
  ShieldCheck, 
  Sparkles, 
  Building, 
  Save, 
  Check, 
  Info,
  Lock
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { accountType } = useDemo();

  const [savedNotice, setSavedNotice] = useState(false);
  const [workspaceName, setWorkspaceName] = useState('Acme Global Brands');
  const [tenantSlug, setTenantSlug] = useState('acme-global-prod');
  const [requireHumanSignoff, setRequireHumanSignoff] = useState(true);
  const [discloseAI, setDiscloseAI] = useState(true);

  const teamMembers = [
    { name: 'Sarah Chen', email: 's.chen@acmeglobal.com', role: 'Content Creator', status: 'Active' },
    { name: 'Elena Rostova', email: 'e.rostova@acmeglobal.com', role: 'Senior Brand Governance Reviewer', status: 'Active' },
    { name: 'Marcus Vance, MD', email: 'm.vance@acmeglobal.com', role: 'Brand Custodian', status: 'Active' },
    { name: 'Alex Henderson', email: 'a.henderson@acmeglobal.com', role: 'Client Administrator', status: 'Active' }
  ];

  const brandColors = [
    { name: 'Deep Ink', hex: '#14212B', role: 'Primary typography, dark navigation' },
    { name: 'Warm Ivory', hex: '#F7F5F0', role: 'Editorial surface and page background' },
    { name: 'Signal Coral', hex: '#F16B50', role: 'Primary actions and urgent warnings' },
    { name: 'Evidence Teal', hex: '#167C78', role: 'Verification seals, claim citations' },
    { name: 'Muted Slate', hex: '#64727D', role: 'Secondary copy, borders' }
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 4000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '1000px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.85rem', marginBottom: '4px' }}>Workspace Governance Settings</h1>
        <p style={{ color: 'var(--color-muted-slate)', fontSize: '0.9rem' }}>
          Manage your tenant brand profile, approved color palette tokens, team access matrix, and verification boundaries.
        </p>
      </div>

      {savedNotice && (
        <div 
          style={{ 
            padding: '12px 16px', 
            borderRadius: 'var(--radius-md)', 
            backgroundColor: 'var(--color-success-subtle)', 
            color: 'var(--color-success)',
            border: '1px solid rgba(40,125,88,0.25)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Check size={16} />
          <span>Workspace preferences updated in demonstration state. Backend persistent storage pending in later phases.</span>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Workspace Identity Profile */}
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Building size={18} color="var(--color-evidence-teal)" />
            <h3 style={{ fontSize: '1.1rem' }}>Tenant Profile & Identity</h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                Company / Workspace Name
              </label>
              <input 
                type="text" 
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-gray)', fontSize: '0.88rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                Tenant Domain Identifier
              </label>
              <input 
                type="text" 
                disabled
                value={tenantSlug}
                style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-warm-ivory)', fontSize: '0.88rem', color: 'var(--color-muted-slate)' }}
              />
            </div>
          </div>
        </div>

        {/* Brand Palette Tokens */}
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Palette size={18} color="var(--color-evidence-teal)" />
            <h3 style={{ fontSize: '1.1rem' }}>Approved Brand Color Palette Tokens</h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)', marginBottom: '16px' }}>
            BrandGuard's automated visual checker validates submitted assets against these designated hex standards.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            {brandColors.map(c => (
              <div 
                key={c.hex}
                style={{ 
                  padding: '12px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--color-border-gray)',
                  backgroundColor: 'var(--color-warm-ivory)'
                }}
              >
                <div style={{ height: '36px', borderRadius: '4px', backgroundColor: c.hex, marginBottom: '8px', border: '1px solid rgba(0,0,0,0.1)' }} />
                <strong style={{ fontSize: '0.85rem', color: 'var(--color-deep-ink)', display: 'block' }}>{c.name}</strong>
                <code style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>{c.hex}</code>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-muted-slate)', marginTop: '4px' }}>{c.role}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Governance & Policy Preferences */}
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <ShieldCheck size={18} color="var(--color-evidence-teal)" />
            <h3 style={{ fontSize: '1.1rem' }}>Mandatory Governance Controls</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={requireHumanSignoff}
                onChange={(e) => setRequireHumanSignoff(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <div>
                <strong style={{ fontSize: '0.88rem', color: 'var(--color-deep-ink)', display: 'block' }}>
                  Enforce Mandatory Human Reviewer Authorization
                </strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)' }}>
                  Completely blocks publication of any collateral that has not been approved by a human reviewer.
                </span>
              </div>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={discloseAI}
                onChange={(e) => setDiscloseAI(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              <div>
                <strong style={{ fontSize: '0.88rem', color: 'var(--color-deep-ink)', display: 'block' }}>
                  Mandate AI Involvement Disclosure on Brand Passports
                </strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)' }}>
                  Appends an explicit audit statement detailing retrieval model versions and automated check scopes.
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Team RBAC Matrix */}
        <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-gray)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="var(--color-evidence-teal)" />
            <h3 style={{ fontSize: '1.05rem' }}>Team Members & Role-Based Access</h3>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-warm-ivory)', borderBottom: '1px solid var(--color-border-gray)' }}>
                <th style={{ padding: '12px 20px' }}>Name & Email</th>
                <th style={{ padding: '12px 20px' }}>Assigned Persona</th>
                <th style={{ padding: '12px 20px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((m, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <td style={{ padding: '12px 20px' }}>
                    <strong>{m.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>{m.email}</div>
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <span className="badge badge-teal" style={{ fontSize: '0.7rem' }}>{m.role}</span>
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}>{m.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Save button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" style={{ gap: '6px' }}>
            <Save size={16} />
            <span>Save Workspace Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};

