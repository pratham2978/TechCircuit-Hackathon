import React, { useState } from 'react';
import { useDemo } from '../../context/DemoContext';
import { 
  Server, 
  CheckCircle2, 
  Lock
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
    const statusText = status === 'approved' ? 'Approved' : 'Rejected';
    setAdminActionNotice(`Change request #${id} updated to ${statusText}. Audit event logged.`);
    setTimeout(() => setAdminActionNotice(null), 4000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Server size={20} strokeWidth={1.5} color="var(--primary)" />
            <h1 className="page-header-title">Platform operations console</h1>
          </div>
          <p className="page-header-desc">
            Global administration cockpit: Multi-tenant workspace provisioning, inbound enterprise leads, and systemic change requests.
          </p>
        </div>
      </div>

      {/* Security Boundary Warning */}
      <div 
        style={{ 
          padding: '12px 16px', 
          backgroundColor: 'var(--surface-subtle)', 
          borderRadius: 'var(--radius)', 
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '13px',
          color: 'var(--text-secondary)'
        }}
      >
        <Lock size={16} strokeWidth={1.5} color="var(--primary)" />
        <span>
          <strong>Zero-trust tenant segregation:</strong> Platform administrators cannot read private client manuscripts or brand playbooks without an explicit cryptographic access grant and an unalterable tenant audit record.
        </span>
      </div>

      {adminActionNotice && (
        <div 
          style={{ 
            padding: '10px 16px', 
            borderRadius: 'var(--radius)', 
            backgroundColor: 'var(--success-subtle)', 
            color: 'var(--success)',
            border: '1px solid var(--success)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={16} strokeWidth={1.5} />
          <span>{adminActionNotice}</span>
        </div>
      )}

      {/* Underline Tabs */}
      <div className="tab-underline-container">
        <button 
          onClick={() => setActiveTab('leads')}
          className={`tab-underline-item ${activeTab === 'leads' ? 'active' : ''}`}
        >
          <span>Inbound contact leads</span>
          <span className="tabular" style={{ fontSize: '11px', padding: '1px 6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-hover)' }}>
            {leads.length}
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('tenants')}
          className={`tab-underline-item ${activeTab === 'tenants' ? 'active' : ''}`}
        >
          <span>Tenant workspaces</span>
          <span className="tabular" style={{ fontSize: '11px', padding: '1px 6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-hover)' }}>
            {tenants.length}
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          className={`tab-underline-item ${activeTab === 'requests' ? 'active' : ''}`}
        >
          <span>Global change requests</span>
          <span className="tabular" style={{ fontSize: '11px', padding: '1px 6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--surface-hover)' }}>
            {changeRequests.length}
          </span>
        </button>
        <button 
          onClick={() => setActiveTab('audit')}
          className={`tab-underline-item ${activeTab === 'audit' ? 'active' : ''}`}
        >
          <span>Admin audit trail</span>
        </button>
      </div>

      {/* Tab 1: Inbound Contact Leads */}
      {activeTab === 'leads' && (
        <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600 }}>
              Enterprise evaluation leads from public website (<span className="tabular">{leads.length}</span>)
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Contact name</th>
                  <th>Work email</th>
                  <th>Company & scale</th>
                  <th>Compliance message</th>
                  <th>Registered date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => (
                  <tr key={lead.id}>
                    <td style={{ fontWeight: 500 }}>{lead.name}</td>
                    <td style={{ color: 'var(--primary)' }}>{lead.email}</td>
                    <td>
                      <div>{lead.company}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lead.teamSize}</div>
                    </td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '320px' }}>
                      "{lead.message}"
                    </td>
                    <td className="tabular" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {lead.submittedAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Tenant Workspaces */}
      {activeTab === 'tenants' && (
        <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600 }}>
              Active isolated client tenants (<span className="tabular">{tenants.length}</span>)
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Tenant workspace</th>
                  <th>Deployment tier</th>
                  <th>Active users</th>
                  <th>Data residency region</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{t.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.id}</div>
                    </td>
                    <td>
                      <span className="badge badge-info">{t.tier}</span>
                    </td>
                    <td className="tabular">{t.users} reviewers</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t.region}</td>
                    <td>
                      <span className="badge badge-success">{t.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Global Change Requests */}
      {activeTab === 'requests' && (
        <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600 }}>
              Client change requests requiring operations sign-off
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request title & scope</th>
                  <th>Requested by</th>
                  <th>Status</th>
                  <th className="right">Admin decision actions</th>
                </tr>
              </thead>
              <tbody>
                {changeRequests.map(cr => (
                  <tr key={cr.id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{cr.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {cr.id} · {cr.type} · Priority: {cr.priority}
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {cr.description}
                      </p>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px' }}>{cr.requestedBy}</div>
                      <div className="tabular" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cr.submittedAt}</div>
                    </td>
                    <td>
                      <span className={`badge ${cr.status === 'approved' ? 'badge-success' : cr.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                        {cr.status === 'approved' ? 'Approved' : cr.status === 'rejected' ? 'Rejected' : 'In review'}
                      </span>
                    </td>
                    <td className="right">
                      {cr.status === 'pending_review' ? (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                          <button 
                            onClick={() => handleUpdateCR(cr.id, 'rejected')} 
                            className="btn btn-secondary btn-sm"
                          >
                            Decline
                          </button>
                          <button 
                            onClick={() => handleUpdateCR(cr.id, 'approved')} 
                            className="btn btn-primary btn-sm"
                          >
                            Approve
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Resolved
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Administrative Audit Trail */}
      {activeTab === 'audit' && (
        <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600 }}>
              Platform administrative action audit log
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Administrator account</th>
                  <th>Action executed</th>
                  <th>Target entity</th>
                </tr>
              </thead>
              <tbody>
                {adminAuditLog.map((log, idx) => (
                  <tr key={idx}>
                    <td className="tabular" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{log.timestamp}</td>
                    <td style={{ fontWeight: 500 }}>{log.actor}</td>
                    <td style={{ color: 'var(--text-primary)' }}>{log.action}</td>
                    <td style={{ color: 'var(--primary)' }}>{log.target}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
