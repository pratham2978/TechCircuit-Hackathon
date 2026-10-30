import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { 
  fetchOperationsChangeRequests, 
  createOperationsChangeRequest, 
  ChangeRequestRecord 
} from '../../services/api';
import { 
  GitPullRequest, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  MessageSquare,
  X,
  Send,
  Info,
  Loader2,
  RefreshCw,
  ExternalLink,
  Tag
} from 'lucide-react';

export const ChangeRequestsPage: React.FC = () => {
  const { accountType } = useDemo();
  const navigate = useNavigate();
  const isOperations = accountType === 'brandguard_operations';

  const [requests, setRequests] = useState<ChangeRequestRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Submit modal state
  const [showModal, setShowModal] = useState(false);
  const [requestType, setRequestType] = useState<string>('Rule Exception');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('medium');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadRequests = async () => {
    setIsLoading(true);
    setErrorNotice(null);
    try {
      const data = await fetchOperationsChangeRequests(statusFilter);
      setRequests(data);
    } catch (err: any) {
      console.warn('Change requests load notice:', err);
      if (err.message && !err.message.toLowerCase().includes('fetch')) {
        setErrorNotice(err.message || 'Unable to load change requests.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter, accountType]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      await createOperationsChangeRequest({
        title,
        request_type: requestType,
        description,
        priority
      });
      showToast('Change request submitted successfully.');
      setShowModal(false);
      setTitle('');
      setDescription('');
      await loadRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to submit change request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusBadges: Record<string, { label: string; class: string }> = {
    pending_review: { label: 'Pending Admin Review', class: 'badge-expiring' },
    changes_requested: { label: 'Revision Required', class: 'badge-critical' },
    resubmitted: { label: 'Resubmitted to Queue', class: 'badge-expiring' },
    approved: { label: 'Approved & Merged', class: 'badge-verified' },
    rejected: { label: 'Declined', class: 'badge-critical' },
    in_progress: { label: 'Under Legal Review', class: 'badge-teal' }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {toastMsg && (
        <div 
          style={{
            padding: '12px 18px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid #10b981',
            borderRadius: 'var(--radius-md)',
            color: '#065f46',
            fontSize: '0.86rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <CheckCircle2 size={18} color="#10b981" />
          <strong>{toastMsg}</strong>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', margin: '0 0 4px' }}>Change Requests & Revision Queue</h1>
          <p style={{ color: 'var(--color-muted-slate)', fontSize: '0.9rem', margin: 0 }}>
            Audit reviewer feedback, submit revised manuscripts, and track structural policy amendments.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button 
            type="button" 
            onClick={loadRequests} 
            disabled={isLoading}
            className="btn btn-secondary btn-sm"
            style={{ gap: '6px' }}
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <button 
            onClick={() => setShowModal(true)} 
            className="btn btn-primary"
            style={{ gap: '6px' }}
          >
            <Plus size={16} />
            <span>Submit Change Request</span>
          </button>
        </div>
      </div>

      {/* Filter and Scope Banner */}
      <div 
        style={{ 
          padding: '12px 16px', 
          backgroundColor: 'var(--color-warm-ivory)', 
          borderRadius: 'var(--radius-md)', 
          border: '1px solid var(--color-border-gray)',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={16} color="var(--color-evidence-teal)" />
          <span>
            <strong>Scope Distinction:</strong> Reviewer requested changes are linked to your submissions. Structural policy amendments require Platform Administrator signoff.
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)' }}>Filter Status:</span>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '3px 8px',
              fontSize: '0.78rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--color-border-gray)',
              backgroundColor: 'var(--color-surface-subtle)',
              color: 'var(--color-deep-ink)'
            }}
          >
            <option value="all">All Statuses</option>
            <option value="changes_requested">Changes Requested</option>
            <option value="pending_review">Pending Review</option>
            <option value="resubmitted">Resubmitted</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Error Notice */}
      {errorNotice && (
        <div 
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--color-error-subtle)',
            border: '1px solid var(--color-error)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-error)',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertCircle size={16} />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Requests Table */}
      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-muted-slate)' }}>
            <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>Loading change requests from database...</div>
          </div>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 20px', backgroundColor: 'var(--color-surface-white)' }}>
            <GitPullRequest size={36} color="var(--color-evidence-teal)" style={{ marginBottom: '10px' }} />
            <div style={{ fontWeight: 600, color: 'var(--color-deep-ink)', fontSize: '1.05rem', marginBottom: '4px' }}>
              No Change Requests Found
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--color-muted-slate)', margin: '0 auto', maxWidth: '420px', lineHeight: 1.5 }}>
              There are currently no active change requests or revision notices matching your selection.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-subtle)', borderBottom: '1px solid var(--color-border-gray)' }}>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-muted-slate)' }}>Request Title & Feedback</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-muted-slate)' }}>Type</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-muted-slate)' }}>Priority</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-muted-slate)' }}>Requested By & Date</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-muted-slate)' }}>Status</th>
                  <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-muted-slate)', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((cr) => {
                  const badge = statusBadges[cr.status] || { label: cr.status, class: 'badge-neutral' };

                  return (
                    <tr key={cr.id} style={{ borderBottom: '1px solid var(--color-border-subtle)', backgroundColor: 'var(--color-surface-card)' }}>
                      <td style={{ padding: '14px 18px', maxWidth: '380px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-deep-ink)', fontSize: '0.9rem' }}>{cr.title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)', marginTop: '3px', lineHeight: 1.45 }}>
                          {cr.description}
                        </div>
                        {cr.reviewer_feedback && (
                          <div style={{ marginTop: '6px', padding: '6px 10px', backgroundColor: 'var(--color-signal-coral-subtle)', border: '1px solid rgba(241, 107, 80, 0.25)', borderRadius: 'var(--radius-sm)', fontSize: '0.76rem', color: 'var(--color-deep-ink)' }}>
                            <strong>Reviewer Note:</strong> {cr.reviewer_feedback}
                          </div>
                        )}
                        {cr.target_version && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)', marginTop: '4px' }}>
                            Target Version: <strong>v{cr.target_version}</strong> {cr.resubmitted_version && `→ Resubmitted as v${cr.resubmitted_version}`}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                          {cr.request_type}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span className={`badge ${cr.priority === 'critical' || cr.priority === 'high' ? 'badge-critical' : 'badge-neutral'}`} style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>
                          {cr.priority}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-deep-ink)' }}>{cr.requested_by}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>{cr.submitted_at}</div>
                      </td>

                      <td style={{ padding: '14px 18px' }}>
                        <span className={`badge ${badge.class}`} style={{ fontSize: '0.72rem' }}>
                          {badge.label}
                        </span>
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        {cr.submission_id ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/app/review/${cr.submission_id}`)}
                            className="btn btn-secondary btn-sm"
                            style={{ gap: '4px', fontSize: '0.74rem' }}
                          >
                            <ExternalLink size={12} />
                            <span>Inspect Manuscript</span>
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>Policy Review</span>
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

      {/* Submit Change Request Modal */}
      {showModal && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            backgroundColor: 'rgba(15, 23, 42, 0.65)', 
            backdropFilter: 'blur(3px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 1000,
            padding: '20px'
          }}
        >
          <div 
            className="card-panel" 
            style={{ 
              width: '100%', 
              maxWidth: '520px', 
              backgroundColor: 'var(--color-surface-card)',
              color: 'var(--color-deep-ink)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--color-deep-ink)' }}>Submit Change Request</h3>
              <button 
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted-slate)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-deep-ink)', marginBottom: '4px' }}>
                  Classification:
                </label>
                <select 
                  value={requestType} 
                  onChange={(e) => setRequestType(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-gray)', fontSize: '0.84rem' }}
                >
                  <option value="Rule Exception">Rule Exception / Temporary Waiver</option>
                  <option value="New Disclaimer">Mandatory Disclaimer Insertion</option>
                  <option value="Claim Expiry Extension">Claim Validity Expiry Extension</option>
                  <option value="Policy Amendment">Platform Governance Policy Amendment</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-deep-ink)', marginBottom: '4px' }}>
                  Request Title:
                </label>
                <input 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="e.g. Q3 EMEA Liability Cap Variance" 
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-gray)', fontSize: '0.84rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-deep-ink)', marginBottom: '4px' }}>
                  Priority:
                </label>
                <select 
                  value={priority} 
                  onChange={(e) => setPriority(e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-gray)', fontSize: '0.84rem' }}
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                  <option value="critical">Critical / Executive Escalation</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-deep-ink)', marginBottom: '4px' }}>
                  Justification & Detailed Context:
                </label>
                <textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  rows={4} 
                  placeholder="Provide contract references, commercial justification, and evidentiary substantiation..."
                  required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border-gray)', fontSize: '0.84rem', fontFamily: 'inherit' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '14px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px' }}
                >
                  {isSubmitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  <span>Submit to Platform Administrator</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
