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
  AlertTriangle,
  Check,
  X,
  FileText,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  Filter,
  Loader2,
  RefreshCw,
  FolderKanban,
  Tag,
  Calendar,
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
      console.warn('Approvals list notice:', err);
      if (err.message && !err.message.toLowerCase().includes('fetch')) {
        setErrorNotice(err.message || 'Unable to retrieve submissions from Operations Review Queue.');
      }
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

      showToast(`Decision recorded: ${decisionType.toUpperCase()} for ${activeDecisionSubmission.project_name} (v${activeDecisionSubmission.version_number})`);
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
    submitted: { label: 'Submitted', className: 'badge-expiring' },
    under_review: { label: 'Under Review', className: 'badge-neutral' },
    changes_requested: { label: 'Changes Requested', className: 'badge-critical' },
    resubmitted: { label: 'Resubmitted', className: 'badge-expiring' },
    approved: { label: 'Approved', className: 'badge-verified' },
    rejected: { label: 'Rejected', className: 'badge-critical' }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast Notification */}
      {successToast && (
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
          <strong>{successToast}</strong>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.75rem', margin: 0 }}>Human Operations Review Queue</h1>
            <span className={`badge ${isOperations ? 'badge-teal' : 'badge-neutral'}`} style={{ fontSize: '0.72rem' }}>
              {isOperations ? 'Operations Decision Cockpit' : 'Company Submission Status'}
            </span>
          </div>
          <p style={{ color: 'var(--color-muted-slate)', fontSize: '0.88rem', margin: 0 }}>
            Strict publishing gate: evaluate evidentiary citations, examine version diffs, and issue binding compliance decisions.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={loadSubmissions} 
            disabled={isLoading}
            className="btn btn-secondary btn-sm"
            style={{ gap: '6px' }}
            title="Refresh submissions"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <span className="badge badge-expiring" style={{ fontSize: '0.78rem', padding: '6px 12px' }}>
            {pendingCount} Pending Signoff{pendingCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Account Type Notice */}
      {!isOperations && (
        <div 
          style={{ 
            padding: '12px 16px', 
            backgroundColor: 'var(--color-surface-subtle)', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--color-border-subtle)',
            fontSize: '0.82rem',
            color: 'var(--color-muted-slate)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <UserCheck size={16} color="var(--color-evidence-teal)" />
          <span>
            <strong>Company Workspace:</strong> Your submitted manuscripts are tracked in this queue. Binding authorization decisions (Approved, Changes Requested, Rejected) are executed exclusively by authorized BrandGuard Operations reviewers.
          </span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div 
        className="card-panel" 
        style={{ 
          padding: '14px 18px', 
          backgroundColor: 'var(--color-surface-white)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '14px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-deep-ink)', fontSize: '0.84rem', fontWeight: 600 }}>
          <Filter size={15} color="var(--color-evidence-teal)" />
          <span>Filter Queue:</span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', flex: 1, justifyContent: 'flex-end' }}>
          {/* Status Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--color-muted-slate)' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '4px 8px',
                fontSize: '0.78rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-gray)',
                backgroundColor: 'white'
              }}
            >
              <option value="all">All Statuses</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="changes_requested">Changes Requested</option>
              <option value="resubmitted">Resubmitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Review Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--color-muted-slate)' }}>Review Type:</span>
            <select
              value={reviewTypeFilter}
              onChange={(e) => setReviewTypeFilter(e.target.value)}
              style={{
                padding: '4px 8px',
                fontSize: '0.78rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-gray)',
                backgroundColor: 'white'
              }}
            >
              <option value="all">All Types</option>
              <option value="legal">Legal Document</option>
              <option value="promotions">Promotion & Claims</option>
              <option value="content">Content Review</option>
              <option value="images">Image & Design</option>
              <option value="videos">Video Review</option>
            </select>
          </div>

          {/* Company Filter (Operations only) */}
          {isOperations && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--color-muted-slate)' }}>Company:</span>
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.78rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-gray)',
                  backgroundColor: 'white'
                }}
              >
                <option value="all">All Companies</option>
                <option value="acme-global-brands">Acme Global Brands</option>
                <option value="brandguard-ops">BrandGuard Operations Hub</option>
              </select>
            </div>
          )}

          {/* Date Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--color-muted-slate)' }}>Since:</span>
            <input 
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                padding: '3px 8px',
                fontSize: '0.78rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border-gray)',
                backgroundColor: 'white'
              }}
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
              style={{ padding: '3px 8px', fontSize: '0.72rem' }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
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

      {/* Operations Submissions Table */}
      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 20px',
            backgroundColor: 'var(--color-surface-subtle)',
            borderBottom: '1px solid var(--color-border-gray)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <strong style={{ fontSize: '0.95rem', color: 'var(--color-deep-ink)' }}>
            Operations Review Queue Records ({submissions.length})
          </strong>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)' }}>
            Database-backed submissions with version tracking
          </span>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-muted-slate)' }}>
            <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 500 }}>Loading review queue submissions...</div>
          </div>
        ) : submissions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 20px', backgroundColor: 'var(--color-surface-white)' }}>
            <CheckSquare size={36} color="var(--color-evidence-teal)" style={{ marginBottom: '10px' }} />
            <div style={{ fontWeight: 600, color: 'var(--color-deep-ink)', fontSize: '1.05rem', marginBottom: '4px' }}>
              No Submissions Match Filters
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--color-muted-slate)', margin: '0 auto', maxWidth: '420px', lineHeight: 1.5 }}>
              There are currently no active submissions matching your filter criteria. Completed AI reviews submitted from client workspaces will appear here for Human Operations signoff.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-subtle)', borderBottom: '1px solid var(--color-border-gray)' }}>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--color-muted-slate)' }}>Project & Company</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--color-muted-slate)' }}>Review Tool</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--color-muted-slate)' }}>Version</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--color-muted-slate)' }}>Submitted Date</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--color-muted-slate)' }}>Status</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--color-muted-slate)' }}>Findings</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--color-muted-slate)' }}>Reviewer</th>
                  <th style={{ padding: '12px 18px', fontWeight: 600, color: 'var(--color-muted-slate)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => {
                  const badgeInfo = statusBadgeMap[sub.status] || { label: sub.status, className: 'badge-neutral' };

                  return (
                    <tr 
                      key={sub.id}
                      style={{ 
                        borderBottom: '1px solid var(--color-border-subtle)',
                        backgroundColor: 'white',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* Project & Company */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--color-deep-ink)', fontSize: '0.9rem' }}>
                          {sub.project_name}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--color-muted-slate)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Building size={11} /> {sub.company_name}
                        </div>
                      </td>

                      {/* Review Tool */}
                      <td style={{ padding: '14px 18px' }}>
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>
                          {sub.review_type}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)', marginTop: '2px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={sub.file_name}>
                          {sub.file_name}
                        </div>
                      </td>

                      {/* Version */}
                      <td style={{ padding: '14px 18px' }}>
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                          v{sub.version_number}
                        </span>
                        {sub.approved_version_number && (
                          <div style={{ fontSize: '0.7rem', color: '#047857', marginTop: '2px' }}>
                            Approved: v{sub.approved_version_number}
                          </div>
                        )}
                      </td>

                      {/* Submitted Date & Submitter */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ color: 'var(--color-deep-ink)', fontSize: '0.8rem' }}>
                          {sub.submitted_at || 'Recently'}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={11} /> {sub.submitted_by}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 18px' }}>
                        <span className={`badge ${badgeInfo.className}`} style={{ fontSize: '0.72rem' }}>
                          {badgeInfo.label}
                        </span>
                      </td>

                      {/* Findings */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          {sub.critical_count > 0 && (
                            <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>
                              {sub.critical_count} Crit
                            </span>
                          )}
                          <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
                            {sub.findings_count} Issue{sub.findings_count === 1 ? '' : 's'}
                          </span>
                        </div>
                      </td>

                      {/* Reviewer */}
                      <td style={{ padding: '14px 18px', fontSize: '0.78rem', color: 'var(--color-deep-ink)' }}>
                        {sub.assigned_reviewer || (
                          <span style={{ color: 'var(--color-muted-slate)', fontStyle: 'italic' }}>Unassigned</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                          {/* Inspect & Review Button */}
                          <button
                            type="button"
                            onClick={() => navigate(`/app/review/${sub.id}`)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '0.72rem', gap: '4px' }}
                            title="Inspect manuscript, evidence findings, and decision history"
                          >
                            <Eye size={12} />
                            <span>Inspect</span>
                          </button>

                          {/* If approved, show Brand Passport button */}
                          {sub.status === 'approved' && (
                            <button
                              type="button"
                              onClick={() => navigate(`/app/passport?submissionId=${sub.id}`)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 8px', fontSize: '0.72rem', gap: '4px', color: 'var(--color-evidence-teal)', borderColor: 'var(--color-evidence-teal)' }}
                              title="View or Issue Cryptographic Brand Passport"
                            >
                              <ShieldCheck size={12} />
                              <span>Passport</span>
                            </button>
                          )}

                          {/* Quick decision buttons for Operations Reviewer */}
                          {isOperations && sub.status !== 'approved' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenDecision(sub, 'approved')}
                                className="btn btn-teal btn-sm"
                                style={{ padding: '3px 8px', fontSize: '0.72rem', gap: '4px' }}
                                title="Authorize and approve this version"
                              >
                                <Check size={12} />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDecision(sub, 'changes_requested')}
                                className="btn btn-secondary btn-sm"
                                style={{ padding: '3px 8px', fontSize: '0.72rem', gap: '4px', color: 'var(--color-signal-coral)', borderColor: 'var(--color-signal-coral)' }}
                                title="Request revisions with instructions"
                              >
                                <Clock size={12} />
                                <span>Request Fix</span>
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
              maxWidth: '560px',
              backgroundColor: 'white',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '24px'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-muted-slate)' }}>
                  Record Binding Review Decision
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: '1.2rem', color: 'var(--color-deep-ink)' }}>
                  {decisionType === 'approved' && 'Authorize & Approve Submission'}
                  {decisionType === 'changes_requested' && 'Request Actionable Changes'}
                  {decisionType === 'rejected' && 'Reject Submission'}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setActiveDecisionSubmission(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted-slate)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Target Submission Details */}
            <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div><strong>Project:</strong> {activeDecisionSubmission.project_name} ({activeDecisionSubmission.review_type.toUpperCase()})</div>
              <div><strong>Reviewed Version:</strong> v{activeDecisionSubmission.version_number} &nbsp;|&nbsp; <strong>Company:</strong> {activeDecisionSubmission.company_name}</div>
            </div>

            {/* Decision Type Selector */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDecisionType('approved')}
                className={`btn btn-sm ${decisionType === 'approved' ? 'btn-teal' : 'btn-secondary'}`}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Approve (v{activeDecisionSubmission.version_number})
              </button>
              <button
                type="button"
                onClick={() => setDecisionType('changes_requested')}
                className={`btn btn-sm ${decisionType === 'changes_requested' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Request Changes
              </button>
              <button
                type="button"
                onClick={() => setDecisionType('rejected')}
                className={`btn btn-sm ${decisionType === 'rejected' ? 'btn-critical' : 'btn-secondary'}`}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Reject
              </button>
            </div>

            {/* Reviewer Comments */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-deep-ink)', marginBottom: '4px' }}>
                Reviewer Evaluation & Notes:
              </label>
              <textarea
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '0.82rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-gray)',
                  fontFamily: 'inherit'
                }}
                placeholder="Enter regulatory justification or rationale..."
              />
            </div>

            {/* Actionable Instructions (required if changes_requested) */}
            {decisionType === 'changes_requested' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-signal-coral)', marginBottom: '4px' }}>
                  Actionable Revision Instructions for Customer:
                </label>
                <textarea
                  value={actionableInstructions}
                  onChange={(e) => setActionableInstructions(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '0.82rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-signal-coral)',
                    fontFamily: 'inherit'
                  }}
                  placeholder="Specify exact wording fixes, claim ledger citations, or duration requirements needed for signoff..."
                />
              </div>
            )}

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '14px' }}>
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
                className="btn btn-teal btn-sm"
                style={{ gap: '6px', fontWeight: 600 }}
              >
                {isSubmittingDecision ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                <span>Confirm {decisionType.toUpperCase()} Decision</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
