import React, { useState } from 'react';
import { useDemo } from '../../context/DemoContext';
import {
  Palette, Users, ShieldCheck, Building, Save, Check
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { accountType } = useDemo();

  const [savedNotice, setSavedNotice]           = useState(false);
  const [workspaceName, setWorkspaceName]       = useState('Acme Global Brands');
  const [tenantSlug]                            = useState('acme-global-prod');
  const [requireHumanSignoff, setRequireHumanSignoff] = useState(true);
  const [discloseAI, setDiscloseAI]             = useState(true);

  const teamMembers = [
    { name: 'Sarah Chen',         email: 's.chen@acmeglobal.com',      role: 'Content Creator',                    status: 'Active' },
    { name: 'Elena Rostova',      email: 'e.rostova@acmeglobal.com',   role: 'Senior Brand Governance Reviewer',   status: 'Active' },
    { name: 'Marcus Vance, MD',   email: 'm.vance@acmeglobal.com',     role: 'Brand Custodian',                    status: 'Active' },
    { name: 'Alex Henderson',     email: 'a.henderson@acmeglobal.com', role: 'Client Administrator',               status: 'Active' },
  ];

  const brandColors = [
    { name: 'Deep Ink',      hex: '#14212B', role: 'Primary typography, dark navigation' },
    { name: 'Warm Ivory',    hex: '#F7F5F0', role: 'Editorial surface and page background' },
    { name: 'Signal Coral',  hex: 'var(--primary)', role: 'Primary actions and urgent warnings' },
    { name: 'Evidence Teal', hex: 'var(--info)', role: 'Verification seals, claim citations' },
    { name: 'Muted Slate',   hex: '#64727D', role: 'Secondary copy, borders' },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 4000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '900px' }}>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Settings</h1>
          <p className="page-header-desc">Manage tenant profile, brand palette tokens, team access, and governance controls.</p>
        </div>
      </div>

      {/* Save notice */}
      {savedNotice && (
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius)',
          backgroundColor: 'var(--success-subtle)', color: 'var(--success)',
          border: '1px solid rgba(21,128,61,0.2)',
          fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <Check size={14} /> Settings saved (demo state only — backend persistence pending).
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Tenant Profile */}
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
            <Building size={15} color="var(--text-muted)" />
            <h2 style={{ fontSize: '14px', fontWeight: 600 }}>Tenant profile</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div>
              <label className="form-label" htmlFor="ws-name">Workspace name</label>
              <input id="ws-name" type="text" className="form-input" value={workspaceName} onChange={e => setWorkspaceName(e.target.value)} />
            </div>
            <div>
              <label className="form-label" htmlFor="ws-slug">Tenant domain identifier</label>
              <input id="ws-slug" type="text" className="form-input" disabled value={tenantSlug}
                style={{ backgroundColor: 'var(--surface-subtle)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
              <p className="form-helper">Cannot be changed after provisioning.</p>
            </div>
          </div>
        </div>

        {/* Brand Colour Tokens */}
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '6px' }}>
            <Palette size={15} color="var(--text-muted)" />
            <h2 style={{ fontSize: '14px', fontWeight: 600 }}>Approved brand colour tokens</h2>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '14px' }}>
            BrandGuard validates submitted assets against these hex standards automatically.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {brandColors.map(c => (
              <div key={c.hex} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '10px', backgroundColor: 'var(--surface-subtle)' }}>
                <div style={{ height: '28px', borderRadius: '4px', backgroundColor: c.hex, marginBottom: '8px', border: '1px solid rgba(0,0,0,0.08)' }} />
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{c.name}</div>
                <code style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.hex}</code>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{c.role}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Governance controls */}
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px' }}>
            <ShieldCheck size={15} color="var(--text-muted)" />
            <h2 style={{ fontSize: '14px', fontWeight: 600 }}>Governance controls</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[
              {
                id: 'req-human',
                checked: requireHumanSignoff,
                onChange: setRequireHumanSignoff,
                label: 'Enforce mandatory human reviewer authorisation',
                desc: 'Blocks publication of any collateral not approved by a human reviewer.',
              },
              {
                id: 'disclose-ai',
                checked: discloseAI,
                onChange: setDiscloseAI,
                label: 'Mandate AI involvement disclosure on brand passports',
                desc: 'Appends an audit statement detailing model versions and automated check scopes.',
              },
            ].map(ctrl => (
              <label key={ctrl.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
                <input
                  id={ctrl.id}
                  type="checkbox"
                  checked={ctrl.checked}
                  onChange={e => ctrl.onChange(e.target.checked)}
                  style={{ width: '15px', height: '15px', marginTop: '2px', accentColor: 'var(--primary)', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{ctrl.label}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{ctrl.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Team members table */}
        <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '7px' }}>
            <Users size={15} color="var(--text-muted)" />
            <h2 style={{ fontSize: '14px', fontWeight: 600 }}>Team members & role-based access</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Name & email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((m, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{m.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{m.email}</div>
                  </td>
                  <td><span className="badge badge-info">{m.role}</span></td>
                  <td><span className="badge badge-success">{m.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Save */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary btn-sm">
            <Save size={14} /> Save settings
          </button>
        </div>
      </form>
    </div>
  );
};
