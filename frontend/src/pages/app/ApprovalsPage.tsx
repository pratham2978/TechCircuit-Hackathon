import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { 
  fetchOperationsSubmissions, 
  recordOperationsDecision, 
  ReviewSubmissionItem 
} from '../../services/api';
import {
  CheckSquare,
  UserCheck,
  Clock,
  Check,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  Building,
  User
} from 'lucide-react';

export const ApprovalsPage: React.FC = () => {
  const { accountType } = useDemo();
  const navigate = useNavigate();

  const isOperations = accountType === 'brandguard_operations';

  // Submissions state from real backend API
  const [submissions, setSubmissions] = useState<ReviewSubmissionItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [reviewTypeFilter, setReviewTypeFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Decision Modal state
  const [activeDecisionSubmission, setActiveDecisionSubmission] = useState<ReviewSubmissionItem | null>(null);
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected' | 'changes_requested'>('approved');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [actionableInstructions, setActionableInstructions] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Load submissions from real backend
  const loadSubmissions = async () => {
    setIsLoading(true);
    setErrorNotice(null);
    try {
      const data = await fetchOperationsSubmissions({
        status: statusFilter,
        review_type: reviewTypeFilter,
        company_id: companyFilter,
        date_from: dateFilter
      });
      setSubmissions(data);
    } catch (err: any) {
      setErrorNotice(err.message || 'Unable to retrieve submissions from Operations Review Queue.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [statusFilter, reviewTypeFilter, companyFilter, dateFilter, accountType]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleOpenDecision = (sub: ReviewSubmissionItem, type: 'approved' | 'rejected' | 'changes_requested') => {
    setActiveDecisionSubmission(sub);
    setDecisionType(type);
    setDecisionNotes(
      type === 'approved'
        ? 'All evidentiary claims cross-verified against corporate ledger. Version certified compliant.'
        : type === 'changes_requested'
          ? 'Please revise unsubstantiated performance claims and update disclaimer visibility.'
          : 'Submission violates corporate branding and regulatory guidelines.'
    );
    setActionableInstructions(
      type === 'changes_requested'
        ? 'Reference authorized claim record CLM-2026-081 and ensure disclaimer is displayed for >= 4.0s.'
        : ''
    );
  };

  const handleConfirmDecision = async () => {
    if (!activeDecisionSubmission) return;

    if (!decisionNotes.trim()) {
      alert('Reviewer comments are required.');
      return;
    }

    setIsSubmittingDecision(true);
    try {
      await recordOperationsDecision(activeDecisionSubmission.id, {
        decision: decisionType,
        comments: decisionNotes,
        actionable_instructions: decisionType === 'changes_requested' ? actionableInstructions : undefined
      });

      const label = decisionType === 'approved' ? 'Approved' : decisionType === 'changes_requested' ? 'Changes requested' : 'Rejected';
      showToast(`Decision recorded: ${label} for ${activeDecisionSubmission.project_name} (v${activeDecisionSubmission.version_number})`);
      setActiveDecisionSubmission(null);
      await loadSubmissions();
    } catch (err: any) {
      alert(err.message || 'Failed to record review decision.');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const pendingCount = submissions.filter(s => s.status === 'submitted' || s.status === 'under_review' || s.status === 'resubmitted').length;

  const statusBadgeMap: Record<string, { label: string; className: string }> = {
    submitted:         { label: 'Submitted',         className: 'badge-warning' },
    under_review:      { label: 'In review',         className: 'badge-warning' },
    changes_requested: { label: 'Needs changes',     className: 'badge-danger' },
    resubmitted:       { label: 'Resubmitted',       className: 'badge-warning' },
    approved:          { label: 'Approved',          className: 'badge-approved' },
    rejected:          { label: 'Rejected',          className: 'badge-danger' }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast Notification */}
      {successToast && (
        <div 
          style={{
            padding: '10px 16px',
            backgroundColor: 'var(--success-subtle)',
            border: '1px solid var(--success)',
            borderRadius: 'var(--radius)',
            color: 'var(--success)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={16} strokeWidth={1.5} />
          <strong>{successToast}</strong>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 className="page-header-title">Human operations review queue</h1>
            <span className={`badge ${isOperations ? 'badge-info' : 'badge-neutral'}`}>
              {isOperations ? 'Operations cockpit' : 'Company view'}
            </span>
          </div>
          <p className="page-header-desc">
            Strict publishing gate: evaluate evidentiary citations, examine version diffs, and issue binding compliance decisions.
          </p>
        </div>

        <div className="page-header-actions">
          <button 
            onClick={loadSubmissions} 
            disabled={isLoading}
            className="btn btn-secondary btn-sm"
            style={{ gap: '6px' }}
            title="Refresh submissions"
          >
            <RefreshCw size={13} strokeWidth={1.5} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <span className="badge badge-warning tabular" style={{ height: '30px', padding: '0 10px' }}>
            {pendingCount} Pending sign-off{pendingCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Account Type Notice */}
      {!isOperations && (
        <div 
          style={{ 
            padding: '12px 16px', 
            backgroundColor: 'var(--surface-subtle)', 
            borderRadius: 'var(--radius)', 
            border: '1px solid var(--border)',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <UserCheck size={16} strokeWidth={1.5} color="var(--primary)" />
          <span>
            <strong>Company workspace:</strong> Your submitted manuscripts are tracked in this queue. Binding authorization decisions (Approved, Needs changes, Rejected) are executed exclusively by authorized BrandGuard Operations reviewers.
          </span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div 
        className="card-panel" 
        style={{ 
          padding: '12px 16px', 
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>
          <Filter size={14} strokeWidth={1.5} color="var(--primary)" />
          <span>Filter queue:</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-select"
              style={{ width: 'auto', height: '30px', padding: '0 8px', fontSize: '12px' }}
            >
              <option value="all">All statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">In review</option>
              <option value="changes_requested">Needs changes</option>
              <option value="resubmitted">Resubmitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Review Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Tool:</span>
            <select
              value={reviewTypeFilter}
              onChange={(e) => setReviewTypeFilter(e.target.value)}
              className="form-select"
              style={{ width: 'auto', height: '30px', padding: '0 8px', fontSize: '12px' }}
            >
              <option value="all">All tools</option>
              <option value="legal">Legal document</option>
              <option value="promotions">Promotion & claims</option>
              <option value="content">Content review</option>
              <option value="images">Image & design</option>
              <option value="videos">Video review</option>
            </select>
          </div>

          {/* Company Filter (Operations only) */}
          {isOperations && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Company:</span>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="form-select"
                style={{ width: 'auto', height: '30px', padding: '0 8px', fontSize: '12px' }}
              >
                <option value="all">All companies</option>
                <option value="acme-global-brands">Acme Global Brands</option>
                <option value="brandguard-ops">BrandGuard Operations Hub</option>
              </select>
            </div>
          )}

          {/* Date Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Since:</span>
            <input 
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="form-input"
              style={{ width: 'auto', height: '30px', padding: '0 8px', fontSize: '12px' }}
            />
          </div>

          {(statusFilter !== 'all' || reviewTypeFilter !== 'all' || companyFilter !== 'all' || dateFilter) && (
            <button 
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setReviewTypeFilter('all');
                setCompanyFilter('all');
                setDateFilter('');
              }}
              className="btn btn-secondary btn-sm"
              style={{ height: '30px', padding: '0 8px', fontSize: '12px' }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {errorNotice && (
        <div className="alert-inline-error">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={15} strokeWidth={1.5} />
            <span>{errorNotice}</span>
          </div>
          <button onClick={() => setErrorNotice(null)} style={{ color: 'inherit' }}>
            <X size={14} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* Operations Submissions Table */}
      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Review queue records (<span className="tabular">{submissions.length}</span>)
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Database-backed submissions with version tracking
          </span>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
            <Loader2 size={24} strokeWidth={1.5} className="animate-spin" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '13px' }}>Loading review queue submissions...</div>
          </div>
        ) : submissions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <CheckSquare size={32} strokeWidth={1.5} color="var(--primary)" style={{ marginBottom: '8px' }} />
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '15px', marginBottom: '4px' }}>
              No submissions match filters
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 auto', maxWidth: '420px', lineHeight: 1.5 }}>
              There are currently no active submissions matching your filter criteria. Completed AI reviews submitted from client workspaces will appear here for Human Operations sign-off.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project & company</th>
                  <th>Review tool</th>
                  <th>Version</th>
                  <th>Submitted date</th>
                  <th>Status</th>
                  <th>Findings</th>
                  <th>Reviewer</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => {
                  const badgeInfo = statusBadgeMap[sub.status] || { label: sub.status, className: 'badge-neutral' };

                  return (
                    <tr key={sub.id}>
                      {/* Project & Company */}
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {sub.project_name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Building size={11} strokeWidth={1.5} />
                          <span>{sub.company_name}</span>
                        </div>
                      </td>

                      {/* Review Tool */}
                      <td>
                        <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                          {sub.review_type}
                        </span>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sub.file_name}>
                          {sub.file_name}
                        </div>
                      </td>

                      {/* Version */}
                      <td>
                        <span className="badge badge-neutral tabular" style={{ fontWeight: 600 }}>
                          v{sub.version_number}
                        </span>
                        {sub.approved_version_number && (
                          <div className="tabular" style={{ fontSize: '11px', color: 'var(--success)', marginTop: '2px' }}>
                            Approved: v{sub.approved_version_number}
                          </div>
                        )}
                      </td>

                      {/* Submitted Date & Submitter */}
                      <td>
                        <div className="tabular" style={{ color: 'var(--text-primary)', fontSize: '13px' }}>
                          {sub.submitted_at || 'Recently'}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={11} strokeWidth={1.5} />
                          <span>{sub.submitted_by}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <span className={`badge ${badgeInfo.className}`}>
                          {badgeInfo.label}
                        </span>
                      </td>

                      {/* Findings */}
                      <td>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          {sub.critical_count > 0 && (
                            <span className="badge badge-danger tabular">
                              {sub.critical_count} critical
                            </span>
                          )}
                          <span className="badge badge-neutral tabular">
                            {sub.findings_count} {sub.findings_count === 1 ? 'issue' : 'issues'}
                          </span>
                        </div>
                      </td>

                      {/* Reviewer */}
                      <td style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                        {sub.assigned_reviewer || (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="right">
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => navigate(`/app/review/${sub.id}`)}
                            className="btn btn-secondary btn-sm"
                            title="Inspect manuscript, evidence findings, and decision history"
                          >
                            <Eye size={12} strokeWidth={1.5} />
                            <span>Inspect</span>
                          </button>

                          {sub.status === 'approved' && (
                            <button
                              type="button"
                              onClick={() => navigate(`/app/passport?submissionId=${sub.id}`)}
                              className="btn btn-secondary btn-sm"
                              title="View or issue cryptographic brand passport"
                            >
                              <ShieldCheck size={12} strokeWidth={1.5} />
                              <span>Passport</span>
                            </button>
                          )}

                          {isOperations && sub.status !== 'approved' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenDecision(sub, 'approved')}
                                className="btn btn-primary btn-sm"
                                title="Authorize and approve this version"
                              >
                                <Check size={12} strokeWidth={1.5} />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDecision(sub, 'changes_requested')}
                                className="btn btn-secondary btn-sm"
                                title="Request revisions with instructions"
                              >
                                <Clock size={12} strokeWidth={1.5} />
                                <span>Request fix</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Review Decision Modal */}
      {activeDecisionSubmission && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              backgroundColor: 'var(--surface)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-modal)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Operations authorization
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: '16px', color: 'var(--text-primary)' }}>
                  {decisionType === 'approved' && 'Authorize and approve submission'}
                  {decisionType === 'changes_requested' && 'Request actionable changes'}
                  {decisionType === 'rejected' && 'Reject submission'}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveDecisionSubmission(null)}
                style={{ padding: '4px', color: 'var(--text-muted)' }}
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Target Submission Details */}
              <div style={{ padding: '10px 14px', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius)', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '3px', border: '1px solid var(--border)' }}>
                <div><strong>Project:</strong> {activeDecisionSubmission.project_name} ({activeDecisionSubmission.review_type})</div>
                <div><strong>Version:</strong> v{activeDecisionSubmission.version_number} · <strong>Company:</strong> {activeDecisionSubmission.company_name}</div>
              </div>

              {/* Decision Type Selector */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setDecisionType('approved')}
                  className={`btn btn-sm ${decisionType === 'approved' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                >
                  Approve (v{activeDecisionSubmission.version_number})
                </button>
                <button
                  type="button"
                  onClick={() => setDecisionType('changes_requested')}
                  className={`btn btn-sm ${decisionType === 'changes_requested' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                >
                  Request changes
                </button>
                <button
                  type="button"
                  onClick={() => setDecisionType('rejected')}
                  className={`btn btn-sm ${decisionType === 'rejected' ? 'btn-destructive' : 'btn-secondary'}`}
                  style={{ flex: 1 }}
                >
                  Reject
                </button>
              </div>

              {/* Reviewer Comments */}
              <div>
                <label className="form-label">Reviewer evaluation notes:</label>
                <textarea
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  rows={3}
                  className="form-textarea"
                  placeholder="Enter regulatory justification or rationale..."
                />
              </div>

              {/* Actionable Instructions */}
              {decisionType === 'changes_requested' && (
                <div>
                  <label className="form-label" style={{ color: 'var(--warning)' }}>
                    Actionable revision instructions for customer:
                  </label>
                  <textarea
                    value={actionableInstructions}
                    onChange={(e) => setActionableInstructions(e.target.value)}
                    rows={3}
                    className="form-textarea"
                    placeholder="Specify exact wording fixes, claim ledger citations, or duration requirements needed for signoff..."
                  />
                </div>
              )}

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '14px', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={() => setActiveDecisionSubmission(null)}
                  className="btn btn-secondary btn-sm"
                  disabled={isSubmittingDecision}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDecision}
                  disabled={isSubmittingDecision}
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px' }}
                >
                  {isSubmittingDecision ? <Loader2 size={13} strokeWidth={1.5} className="animate-spin" /> : <Check size={13} strokeWidth={1.5} />}
                  <span>Confirm decision</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
