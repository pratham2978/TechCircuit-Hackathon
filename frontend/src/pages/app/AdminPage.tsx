import React, { useState } from 'react';
import { useDemo } from '../../context/DemoContext';
import { 
  Server, 
  Users, 
  Mail, 
  Building, 
  ShieldCheck, 
  Check, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  GitPullRequest,
  Lock,
  Plus
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const { leads, changeRequests, updateChangeRequestStatus } = useDemo();
  const [activeTab, setActiveTab] = useState<'leads' | 'tenants' | 'requests' | 'audit'>('leads');
  const [adminActionNotice, setAdminActionNotice] = useState<string | null>(null);

  const tenants = [
    { id: 't-01', name: 'Acme Global Brands', tier: 'Enterprise', users: 48, status: 'Active', region: 'US-East (Isolated)' },
    { id: 't-02', name: 'BioHealth Diagnostics Inc.', tier: 'Enterprise', users: 124, status: 'Active', region: 'EU-Frankfurt (Sovereign)' },
    { id: 't-03', name: 'Nordic Financial Group', tier: 'Business', users: 22, status: 'Onboarding', region: 'SE-Stockholm' }
  ];

  const adminAuditLog = [
    { timestamp: '2026-10-30 09:12', actor: 'platform-admin-root', action: 'Provisioned Tenant Storage', target: 'BioHealth Diagnostics' },
    { timestamp: '2026-10-29 16:45', actor: 'ops-lead-02', action: 'Reviewed Inbound Lead', target: 'AstraHealth Global' },
    { timestamp: '2026-10-28 11:30', actor: 'security-director', action: 'Approved Policy Pack Extension', target: 'CR-802 (Mercosur Pack)' }
  ];

  const handleUpdateCR = (id: string, status: 'approved' | 'rejected') => {
    updateChangeRequestStatus(id, status, `Evaluated and ${status} by Platform Operations Director.`);
    setAdminActionNotice(`Change Request #${id} updated to ${status.toUpperCase()}. Audit event logged.`);
    setTimeout(() => setAdminActionNotice(null), 4000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Server size={22} color="#7C3AED" />
          <h1 style={{ fontSize: '1.85rem' }}>Platform Operations Console</h1>
        </div>
        <p style={{ color: 'var(--color-muted-slate)', fontSize: '0.9rem' }}>
          Global administration cockpit: Multi-tenant workspace provisioning, inbound enterprise leads, and systemic change requests.
        </p>
      </div>

      {/* Security Boundary Warning */}
      <div 
        style={{ 
          padding: '12px 16px', 
          backgroundColor: '#FAF5FF', 
          borderLeft: '4px solid #7C3AED', 
          borderRadius: 'var(--radius-md)', 
          border: '1px solid #E9D5FF',
          borderLeftWidth: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.82rem',
          color: '#581C87'
        }}
      >
        <Lock size={16} />
        <span>
          <strong>Zero-Trust Client Segregation:</strong> Platform administrators cannot read private client manuscripts or brand playbooks without an explicit cryptographic access grant and an unalterable tenant audit record.
        </span>
      </div>

      {adminActionNotice && (
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
          <CheckCircle2 size={16} />
          <span>{adminActionNotice}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button 
          onClick={() => setActiveTab('leads')}
          className={`btn btn-sm ${activeTab === 'leads' ? 'btn-dark' : 'btn-secondary'}`}
        >
          Inbound Contact Leads ({leads.length})
        </button>
        <button 
          onClick={() => setActiveTab('tenants')}
          className={`btn btn-sm ${activeTab === 'tenants' ? 'btn-dark' : 'btn-secondary'}`}
        >
          Tenant Workspaces ({tenants.length})
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          className={`btn btn-sm ${activeTab === 'requests' ? 'btn-dark' : 'btn-secondary'}`}
        >
          Global Change Requests ({changeRequests.length})
        </button>
        <button 
          onClick={() => setActiveTab('audit')}
          className={`btn btn-sm ${activeTab === 'audit' ? 'btn-dark' : 'btn-secondary'}`}
        >
          Admin Audit Trail
        </button>
      </div>

      {/* Tab 1: Inbound Contact Leads */}
      {activeTab === 'leads' && (
        <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-gray)', fontWeight: 600 }}>
            Enterprise Evaluation Leads from Public Website ({leads.length})
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-warm-ivory)', borderBottom: '1px solid var(--color-border-gray)' }}>
                <th style={{ padding: '12px 20px' }}>Contact Name</th>
                <th style={{ padding: '12px 20px' }}>Work Email</th>
                <th style={{ padding: '12px 20px' }}>Company & Scale</th>
                <th style={{ padding: '12px 20px' }}>Compliance Message</th>
                <th style={{ padding: '12px 20px' }}>Registered At</th>
              </tr>
            </thead>
            <tbody>
              {leads.map(lead => (
                <tr key={lead.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <td style={{ padding: '14px 20px', fontWeight: 600 }}>{lead.name}</td>
                  <td style={{ padding: '14px 20px', color: 'var(--color-evidence-teal)' }}>{lead.email}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <strong>{lead.company}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>{lead.teamSize}</div>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '0.82rem', color: 'var(--color-deep-ink)', maxWidth: '320px' }}>
                    "{lead.message}"
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '0.78rem', color: 'var(--color-muted-slate)' }}>
                    {lead.submittedAt}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 2: Tenant Workspaces */}
      {activeTab === 'tenants' && (
        <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-gray)', fontWeight: 600 }}>
            Active Isolated Client Tenants ({tenants.length})
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-warm-ivory)', borderBottom: '1px solid var(--color-border-gray)' }}>
                <th style={{ padding: '12px 20px' }}>Tenant Workspace</th>
                <th style={{ padding: '12px 20px' }}>Deployment Tier</th>
                <th style={{ padding: '12px 20px' }}>Active Users</th>
                <th style={{ padding: '12px 20px' }}>Data Residency Region</th>
                <th style={{ padding: '12px 20px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <strong>{t.name}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>{t.id}</div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className="badge badge-teal" style={{ fontSize: '0.7rem' }}>{t.tier}</span>
                  </td>
                  <td style={{ padding: '14px 20px' }}>{t.users} Reviewers</td>
                  <td style={{ padding: '14px 20px', fontSize: '0.8rem', color: 'var(--color-muted-slate)' }}>{t.region}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 3: Global Change Requests */}
      {activeTab === 'requests' && (
        <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-gray)', fontWeight: 600 }}>
            Client Change Requests Requiring Operations Signoff
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-warm-ivory)', borderBottom: '1px solid var(--color-border-gray)' }}>
                <th style={{ padding: '12px 20px' }}>Request Title & Scope</th>
                <th style={{ padding: '12px 20px' }}>Requested By</th>
                <th style={{ padding: '12px 20px' }}>Status</th>
                <th style={{ padding: '12px 20px', textAlign: 'right' }}>Admin Decision Actions</th>
              </tr>
            </thead>
            <tbody>
              {changeRequests.map(cr => (
                <tr key={cr.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <strong>{cr.title}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
                      {cr.id} • {cr.type} • Priority: {cr.priority.toUpperCase()}
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--color-deep-ink)', marginTop: '4px' }}>
                      {cr.description}
                    </p>
                  </td>
                  <td style={{ padding: '14px 20px', fontSize: '0.8rem' }}>
                    {cr.requestedBy}
                    <div style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>{cr.submittedAt}</div>
                  </td>
                  <td style={{ padding: '14px 20px' }}>
                    <span className={`badge ${cr.status === 'approved' ? 'badge-verified' : cr.status === 'rejected' ? 'badge-critical' : 'badge-expiring'}`}>
                      {cr.status}
                    </span>
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    {cr.status === 'pending_review' ? (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button 
                          onClick={() => handleUpdateCR(cr.id, 'rejected')} 
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem' }}
                        >
                          Decline
                        </button>
                        <button 
                          onClick={() => handleUpdateCR(cr.id, 'approved')} 
                          className="btn btn-teal btn-sm"
                          style={{ fontSize: '0.75rem' }}
                        >
                          Approve Request
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
                        Resolved
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Administrative Audit Trail */}
      {activeTab === 'audit' && (
        <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border-gray)', fontWeight: 600 }}>
            Platform Administrative Action Audit Log
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-warm-ivory)', borderBottom: '1px solid var(--color-border-gray)' }}>
                <th style={{ padding: '12px 20px' }}>Timestamp</th>
                <th style={{ padding: '12px 20px' }}>Administrator Account</th>
                <th style={{ padding: '12px 20px' }}>Action Executed</th>
                <th style={{ padding: '12px 20px' }}>Target Entity</th>
              </tr>
            </thead>
            <tbody>
              {adminAuditLog.map((log, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <td style={{ padding: '12px 20px', color: 'var(--color-muted-slate)' }}>{log.timestamp}</td>
                  <td style={{ padding: '12px 20px', fontWeight: 600 }}>{log.actor}</td>
                  <td style={{ padding: '12px 20px', color: 'var(--color-deep-ink)' }}>{log.action}</td>
                  <td style={{ padding: '12px 20px', color: 'var(--color-evidence-teal)' }}>{log.target}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

