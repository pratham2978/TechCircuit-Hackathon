import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import {
  fetchOperationsChangeRequests,
  createOperationsChangeRequest,
  ChangeRequestRecord
} from '../../services/api';
import {
  GitPullRequest, Plus, CheckCircle2, AlertCircle,
  X, Send, Loader2, RefreshCw, ExternalLink
} from 'lucide-react';

export const ChangeRequestsPage: React.FC = () => {
  const { accountType } = useDemo();
  const navigate = useNavigate();

  const [requests, setRequests]       = useState<ChangeRequestRecord[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const [showModal, setShowModal]     = useState(false);
  const [requestType, setRequestType] = useState('Rule Exception');
  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority]       = useState('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg]       = useState<string | null>(null);

  const loadRequests = async () => {
    setIsLoading(true); setErrorNotice(null);
    try {
      setRequests(await fetchOperationsChangeRequests(statusFilter));
    } catch (err: any) {
      setErrorNotice(err.message || 'Unable to load change requests.');
    } finally { setIsLoading(false); }
  };

  useEffect(() => { loadRequests(); }, [statusFilter, accountType]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setIsSubmitting(true);
    try {
      await createOperationsChangeRequest({ title, request_type: requestType, description, priority });
      showToast('Change request submitted successfully.');
      setShowModal(false); setTitle(''); setDescription('');
      await loadRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to submit change request.');
    } finally { setIsSubmitting(false); }
  };

  const statusBadge: Record<string, { label: string; cls: string }> = {
    pending_review:    { label: 'Pending review',     cls: 'badge-warning' },
    changes_requested: { label: 'Revision required',  cls: 'badge-danger' },
    resubmitted:       { label: 'Resubmitted',        cls: 'badge-warning' },
    approved:          { label: 'Approved',           cls: 'badge-success' },
    rejected:          { label: 'Declined',           cls: 'badge-danger' },
    in_progress:       { label: 'Under review',       cls: 'badge-info' },
  };

  const priorityBadge = (p: string) =>
    (p === 'critical' || p === 'high') ? 'badge-danger' : 'badge-neutral';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Toast */}
      {toastMsg && (
        <div style={{ padding: '10px 14px', backgroundColor: 'var(--success-subtle)', border: '1px solid rgba(21,128,61,0.2)', borderRadius: 'var(--radius)', color: 'var(--success)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={14} /> {toastMsg}
        </div>
      )}

      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Change requests</h1>
          <p className="page-header-desc">Track reviewer feedback, submit revisions, and manage policy amendment requests.</p>
        </div>
        <div className="page-header-actions">
          <button type="button" onClick={loadRequests} disabled={isLoading} className="btn btn-secondary btn-sm">
            <RefreshCw size={13} style={isLoading ? { animation: 'spin 1s linear infinite' } : undefined} /> Refresh
          </button>
          <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm">
            <Plus size={14} /> New request
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Filter by status:</span>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="form-input"
          style={{ width: 'auto', height: '32px', padding: '0 8px', fontSize: '13px' }}
        >
          <option value="all">All statuses</option>
          <option value="changes_requested">Changes requested</option>
          <option value="pending_review">Pending review</option>
          <option value="resubmitted">Resubmitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Error */}
      {errorNotice && (
        <div style={{ padding: '10px 14px', backgroundColor: 'var(--danger-subtle)', border: '1px solid rgba(185,28,28,0.2)', borderRadius: 'var(--radius)', color: 'var(--danger)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={14} /> {errorNotice}
        </div>
      )}

      {/* Table */}
      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <Loader2 size={24} style={{ margin: '0 auto 10px', animation: 'spin 1s linear infinite' }} />
            <div style={{ fontSize: '13px' }}>Loading change requests…</div>
          </div>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 20px', color: 'var(--text-muted)' }}>
            <GitPullRequest size={28} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
            <p style={{ fontSize: '13px' }}>No change requests match your selection.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Type</th>
                  <th>Priority</th>
                  <th>Submitted by</th>
                  <th>Status</th>
                  <th className="right">Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(cr => {
                  const bd = statusBadge[cr.status] ?? { label: cr.status, cls: 'badge-neutral' };
                  return (
                    <tr key={cr.id}>
                      <td style={{ maxWidth: '340px' }}>
                        <div style={{ fontWeight: 500, marginBottom: '2px' }}>{cr.title}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>{cr.description}</div>
                        {cr.reviewer_feedback && (
                          <div style={{ marginTop: '6px', padding: '5px 8px', backgroundColor: 'var(--warning-subtle)', borderLeft: '2px solid var(--warning)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <strong>Reviewer note:</strong> {cr.reviewer_feedback}
                          </div>
                        )}
                        {cr.target_version && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                            Target v{cr.target_version}{cr.resubmitted_version ? ` → Resubmitted as v${cr.resubmitted_version}` : ''}
                          </div>
                        )}
                      </td>
                      <td><span className="badge badge-neutral">{cr.request_type}</span></td>
                      <td><span className={`badge ${priorityBadge(cr.priority)}`} style={{ textTransform: 'capitalize' }}>{cr.priority}</span></td>
                      <td>
                        <div style={{ fontSize: '13px' }}>{cr.requested_by}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{cr.submitted_at}</div>
                      </td>
                      <td><span className={`badge ${bd.cls}`}>{bd.label}</span></td>
                      <td className="right">
                        {cr.submission_id ? (
                          <button type="button" onClick={() => navigate(`/app/review/${cr.submission_id}`)} className="btn btn-secondary btn-sm" style={{ gap: '4px' }}>
                            <ExternalLink size={12} /> Inspect
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Policy review</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-modal)', maxWidth: '500px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Submit change request</h2>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '4px', borderRadius: 'var(--radius)', color: 'var(--text-muted)' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" htmlFor="cr-type">Classification</label>
                <select id="cr-type" className="form-input" style={{ height: '36px' }} value={requestType} onChange={e => setRequestType(e.target.value)}>
                  <option value="Rule Exception">Rule exception / temporary waiver</option>
                  <option value="New Disclaimer">Mandatory disclaimer insertion</option>
                  <option value="Claim Expiry Extension">Claim validity expiry extension</option>
                  <option value="Policy Amendment">Platform governance policy amendment</option>
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="cr-title">Request title <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input id="cr-title" type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Q3 EMEA Liability Cap Variance" required />
              </div>
              <div>
                <label className="form-label" htmlFor="cr-priority">Priority</label>
                <select id="cr-priority" className="form-input" style={{ height: '36px' }} value={priority} onChange={e => setPriority(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical / executive escalation</option>
                </select>
              </div>
              <div>
                <label className="form-label" htmlFor="cr-desc">Justification & context <span style={{ color: 'var(--danger)' }}>*</span></label>
                <textarea id="cr-desc" className="form-textarea" value={description} onChange={e => setDescription(e.target.value)} rows={4} placeholder="Contract references, commercial justification, and evidentiary substantiation…" required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-sm">
                  {isSubmitting ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={13} />}
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
