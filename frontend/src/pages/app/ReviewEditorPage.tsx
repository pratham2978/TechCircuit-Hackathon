import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { 
  fetchSubmissionDetail, 
  recordOperationsDecision, 
  resubmitOperationsSubmission,
  ReviewSubmissionDetail,
  ReviewDecisionRecord 
} from '../../services/api';
import { VersionComparisonModal } from '../../components/review/VersionComparisonModal';
import { 
  FileText, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft, 
  Send, 
  RotateCcw, 
  Info, 
  ShieldCheck, 
  Check, 
  X, 
  Layers, 
  GitCompare,
  Edit3,
  Clock,
  User,
  Building,
  Loader2,
  AlertCircle,
  Award
} from 'lucide-react';

export const ReviewEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { documents, accountType } = useDemo();

  const isOperations = accountType === 'brandguard_operations';

  // Real backend submission state
  const [submission, setSubmission] = useState<ReviewSubmissionDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [contentText, setContentText] = useState<string>('');
  const [isResubmitting, setIsResubmitting] = useState(false);
  const [resubmissionNote, setResubmissionNote] = useState('');
  const [showResubmitModal, setShowResubmitModal] = useState(false);

  // Decision Modal state (for Operations Reviewer)
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState<'approved' | 'rejected' | 'changes_requested'>('approved');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [actionableInstructions, setActionableInstructions] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  // Version Diff Modal
  const [showDiffModal, setShowDiffModal] = useState(false);

  // Tabs for right side: Findings vs Decision History
  const [activeRightTab, setActiveRightTab] = useState<'findings' | 'history'>('findings');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  // Load real submission from backend or fallback to demo document
  const loadSubmissionData = async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await fetchSubmissionDetail(id);
      setSubmission(data);
      setContentText(data.content_text || '');
    } catch (err: any) {
      console.warn('Backend submission fetch notice, checking fallback:', err.message);
      // Fallback to demo document
      const fallbackDoc = documents.find(d => d.id === id) || documents[0];
      if (fallbackDoc) {
        setContentText(fallbackDoc.content);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissionData();
  }, [id, accountType]);

  const handleOpenDecision = (type: 'approved' | 'rejected' | 'changes_requested') => {
    setDecisionType(type);
    setDecisionNotes(
      type === 'approved'
        ? 'All claims and contractual clauses cross-verified against brand governance ledger. Approved for publication.'
        : type === 'changes_requested'
          ? 'Identified policy violations that must be amended before human signoff can be granted.'
          : 'Submission is rejected due to irreconcilable regulatory exposure.'
    );
    setActionableInstructions(
      type === 'changes_requested'
        ? 'Replace unsubstantiated superlatives with verified ledger claims and cap maximum liability at 12 months fees.'
        : ''
    );
    setShowDecisionModal(true);
  };

  const handleConfirmDecision = async () => {
    if (!submission) return;
    if (!decisionNotes.trim()) {
      alert('Reviewer comments are required.');
      return;
    }

    setIsSubmittingDecision(true);
    try {
      await recordOperationsDecision(submission.id, {
        decision: decisionType,
        comments: decisionNotes,
        actionable_instructions: decisionType === 'changes_requested' ? actionableInstructions : undefined
      });

      showToast(`Decision rendered: ${decisionType.toUpperCase()} for v${submission.version_number}`);
      setShowDecisionModal(false);
      await loadSubmissionData();
    } catch (err: any) {
      alert(err.message || 'Failed to record review decision.');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  const handleConfirmResubmission = async () => {
    if (!submission) return;
    if (!contentText.trim()) {
      alert('Revised manuscript content cannot be empty.');
      return;
    }

    setIsResubmitting(true);
    try {
      const res = await resubmitOperationsSubmission(submission.id, {
        revised_content: contentText,
        resubmission_notes: resubmissionNote || 'Revised content addressing reviewer instructions.'
      });

      showToast(`Revised manuscript (v${res.new_version_number}) resubmitted to Operations review queue!`);
      setShowResubmitModal(false);
      setResubmissionNote('');
      await loadSubmissionData();
    } catch (err: any) {
      alert(err.message || 'Resubmission failed.');
    } finally {
      setIsResubmitting(false);
    }
  };

  // Status badge formatting
  const statusBadgeMap: Record<string, { label: string; className: string }> = {
    submitted: { label: 'Submitted to Operations', className: 'badge-expiring' },
    under_review: { label: 'Under Review', className: 'badge-neutral' },
    changes_requested: { label: 'Changes Requested', className: 'badge-critical' },
    resubmitted: { label: 'Resubmitted to Queue', className: 'badge-expiring' },
    approved: { label: 'Approved (Certified)', className: 'badge-verified' },
    rejected: { label: 'Rejected', className: 'badge-critical' }
  };

  const currentStatus = submission?.status || 'submitted';
  const badgeInfo = statusBadgeMap[currentStatus] || { label: currentStatus, className: 'badge-neutral' };
  const findingsList = submission?.findings || [];
  const decisionsList = submission?.decisions || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

      {/* Top Header & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => navigate('/app/approvals')} 
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px' }}
            title="Return to Review Queue"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.45rem', margin: 0 }}>
                {submission?.project_name || 'Manuscript Review'}
              </h1>
              <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                v{submission?.version_number || '1.0'}
              </span>
              <span className={`badge ${badgeInfo.className}`} style={{ fontSize: '0.72rem' }}>
                {badgeInfo.label}
              </span>
              {submission?.company_name && (
                <span className="badge badge-neutral" style={{ fontSize: '0.72rem', gap: '4px' }}>
                  <Building size={11} /> {submission.company_name}
                </span>
              )}
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: 'var(--color-muted-slate)' }}>
              Tool: <strong>{submission?.review_type?.toUpperCase() || 'LEGAL'}</strong> &nbsp;|&nbsp; File: {submission?.file_name || 'Document.pdf'} &nbsp;|&nbsp; Submitter: {submission?.submitted_by || 'Client'}
            </p>
          </div>
        </div>

        {/* Top Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Version Diff Trigger */}
          <button
            type="button"
            onClick={() => setShowDiffModal(true)}
            className="btn btn-secondary btn-sm"
            style={{ gap: '5px', borderColor: 'var(--color-evidence-teal)', color: 'var(--color-evidence-teal)', fontWeight: 600 }}
          >
            <GitCompare size={14} />
            <span>Compare Versions (Diff)</span>
          </button>

          {/* Operations Reviewer Actions */}
          {isOperations ? (
            <>
              {currentStatus !== 'approved' && (
                <>
                  <button 
                    type="button"
                    onClick={() => handleOpenDecision('approved')}
                    className="btn btn-teal btn-sm"
                    style={{ gap: '5px', fontWeight: 600 }}
                  >
                    <Check size={14} />
                    <span>Approve Submission</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleOpenDecision('changes_requested')}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: '5px', color: 'var(--color-signal-coral)', borderColor: 'var(--color-signal-coral)', fontWeight: 600 }}
                  >
                    <Clock size={14} />
                    <span>Request Changes</span>
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleOpenDecision('rejected')}
                    className="btn btn-secondary btn-sm"
                    style={{ gap: '5px', color: 'var(--color-error)' }}
                  >
                    <X size={14} />
                    <span>Reject</span>
                  </button>
                </>
              )}
              {currentStatus === 'approved' && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className="badge badge-verified" style={{ padding: '6px 12px', fontSize: '0.8rem', gap: '6px' }}>
                    <ShieldCheck size={16} /> Certified Compliant (Approved v{submission?.approved_version_number || submission?.version_number})
                  </span>
                  <Link 
                    to={`/app/passport?submissionId=${submission?.id}`}
                    className="btn btn-primary btn-sm"
                    style={{ gap: '6px' }}
                    title="View or Issue Brand Passport Seal"
                  >
                    <Award size={14} />
                    <span>Brand Passport</span>
                  </Link>
                </div>
              )}
            </>
          ) : (
            /* Company Workspace Actions */
            <>
              {currentStatus === 'changes_requested' && (
                <button 
                  type="button"
                  onClick={() => setShowResubmitModal(true)}
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px', fontWeight: 600 }}
                >
                  <Send size={14} />
                  <span>Submit Revised Version (Resubmit)</span>
                </button>
              )}
              {currentStatus === 'approved' && (
                <Link 
                  to="/app/passport" 
                  className="btn btn-secondary btn-sm"
                  style={{ gap: '6px', color: 'var(--color-evidence-teal)' }}
                  title="View Cryptographically Sealed Brand Passport"
                >
                  <ShieldCheck size={16} />
                  <span>View Brand Passport Seal</span>
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      {/* Reviewer Actionable Instructions Alert Banner (When Changes Requested) */}
      {currentStatus === 'changes_requested' && (
        <div 
          style={{
            padding: '14px 18px',
            backgroundColor: 'rgba(241, 107, 80, 0.08)',
            border: '1px solid rgba(241, 107, 80, 0.35)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}
        >
          <Clock size={20} color="var(--color-signal-coral)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1, fontSize: '0.84rem' }}>
            <strong style={{ color: 'var(--color-signal-coral)', display: 'block', fontSize: '0.9rem', marginBottom: '4px' }}>
              Operations Reviewer Requested Revisions
            </strong>
            <p style={{ margin: '0 0 8px', color: 'var(--color-deep-ink)', lineHeight: 1.5 }}>
              {decisionsList[0]?.comments || submission?.content_summary || 'Please resolve the highlighted compliance findings and resubmit your revised version.'}
            </p>
            {decisionsList[0]?.actionable_instructions && (
              <div style={{ backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-deep-ink)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--color-signal-coral)', fontSize: '0.8rem' }}>
                <strong>Actionable Instructions:</strong> {decisionsList[0].actionable_instructions}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Split Interface: Manuscript Editor (Left) & Evidence Findings / Decision History (Right) */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '1.1fr 0.9fr', 
          gap: '24px',
          alignItems: 'start'
        }}
        className="editor-split-grid"
      >
        {/* Left Panel: Governed Manuscript Text */}
        <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--color-surface-white)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '10px', borderBottom: '1px solid var(--color-border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Edit3 size={16} color="var(--color-evidence-teal)" />
              <h3 style={{ fontSize: '1rem', margin: 0 }}>Governed Manuscript Content</h3>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
              Active Version: v{submission?.version_number || '1.0'} &nbsp;|&nbsp; Word Count: {contentText.split(/\s+/).filter(Boolean).length}
            </span>
          </div>

          <textarea 
            value={contentText}
            onChange={(e) => setContentText(e.target.value)}
            rows={16}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-gray)',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '0.85rem',
              lineHeight: 1.6,
              resize: 'vertical',
              backgroundColor: currentStatus === 'approved' ? 'rgba(16, 185, 129, 0.02)' : 'white'
            }}
            placeholder="Manuscript text..."
          />

          {currentStatus === 'changes_requested' && !isOperations && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '12px' }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--color-muted-slate)' }}>
                Edit text above to address reviewer instructions, then click resubmit.
              </span>
              <button 
                type="button"
                onClick={() => setShowResubmitModal(true)}
                className="btn btn-primary btn-sm"
                style={{ gap: '6px' }}
              >
                <Send size={14} />
                <span>Resubmit Revised Content</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Panel: Split between Findings and Decision History */}
        <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: 'var(--color-surface-white)', padding: '16px' }}>
          {/* Tab selector */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '10px' }}>
            <button
              type="button"
              onClick={() => setActiveRightTab('findings')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeRightTab === 'findings' ? '2px solid var(--color-evidence-teal)' : '2px solid transparent',
                color: activeRightTab === 'findings' ? 'var(--color-evidence-teal)' : 'var(--color-muted-slate)',
                fontWeight: activeRightTab === 'findings' ? 700 : 500,
                fontSize: '0.86rem',
                padding: '6px 10px',
                cursor: 'pointer'
              }}
            >
              Inspection Findings ({findingsList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveRightTab('history')}
              style={{
                background: 'none',
                border: 'none',
                borderBottom: activeRightTab === 'history' ? '2px solid var(--color-evidence-teal)' : '2px solid transparent',
                color: activeRightTab === 'history' ? 'var(--color-evidence-teal)' : 'var(--color-muted-slate)',
                fontWeight: activeRightTab === 'history' ? 700 : 500,
                fontSize: '0.86rem',
                padding: '6px 10px',
                cursor: 'pointer'
              }}
            >
              Decision History ({decisionsList.length})
            </button>
          </div>

          {/* TAB 1: Inspection Findings */}
          {activeRightTab === 'findings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {findingsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--color-muted-slate)' }}>
                  <CheckCircle2 size={32} color="var(--color-success)" style={{ marginBottom: '6px' }} />
                  <div style={{ fontWeight: 600, color: 'var(--color-deep-ink)' }}>No Outstanding Issues Detected</div>
                  <p style={{ fontSize: '0.78rem', margin: '4px 0 0' }}>All contractual and brand claims satisfy active rules.</p>
                </div>
              ) : (
                findingsList.map((f: any, idx: number) => {
                  const isCrit = f.severity === 'critical';
                  const isWarn = f.severity === 'warning';
                  const borderCol = isCrit ? 'var(--color-error)' : isWarn ? 'var(--color-warning)' : 'var(--color-evidence-teal)';

                  return (
                    <div 
                      key={f.id || idx}
                      style={{
                        padding: '12px',
                        borderLeft: `4px solid ${borderCol}`,
                        backgroundColor: 'var(--color-surface-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '0.86rem', color: 'var(--color-deep-ink)' }}>{f.title}</strong>
                        <span className={`badge ${isCrit ? 'badge-critical' : isWarn ? 'badge-expiring' : 'badge-teal'}`} style={{ fontSize: '0.64rem' }}>
                          {f.severity}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--color-deep-ink)', margin: 0, lineHeight: 1.45 }}>
                        {f.explanation}
                      </p>
                      {f.ruleReference && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>
                          <strong>Rule:</strong> {f.ruleReference}
                        </div>
                      )}
                      {f.suggestedCorrection && (
                        <div style={{ padding: '6px 8px', backgroundColor: 'rgba(22, 124, 120, 0.08)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', fontStyle: 'italic', color: 'var(--color-evidence-teal)' }}>
                          &ldquo;{f.suggestedCorrection}&rdquo;
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: Append-Only Immutable Decision History */}
          {activeRightTab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {decisionsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--color-muted-slate)' }}>
                  <Clock size={28} style={{ marginBottom: '6px' }} />
                  <div style={{ fontWeight: 600, color: 'var(--color-deep-ink)' }}>No Review Decisions Yet</div>
                  <p style={{ fontSize: '0.78rem', margin: '4px 0 0' }}>Decisions rendered by Human Operations reviewers will appear here chronologically.</p>
                </div>
              ) : (
                decisionsList.map((d: ReviewDecisionRecord, idx: number) => {
                  const isApp = d.decision === 'approved';
                  const isChg = d.decision === 'changes_requested';

                  return (
                    <div 
                      key={d.id || idx}
                      style={{
                        padding: '12px',
                        borderLeft: `4px solid ${isApp ? '#10b981' : isChg ? 'var(--color-signal-coral)' : 'var(--color-error)'}`,
                        backgroundColor: 'var(--color-surface-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                        <span className={`badge ${isApp ? 'badge-verified' : isChg ? 'badge-expiring' : 'badge-critical'}`} style={{ fontSize: '0.7rem' }}>
                          {d.decision.replace('_', ' ').toUpperCase()} (v{d.version_number})
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--color-muted-slate)' }}>
                          {d.created_at}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--color-muted-slate)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} /> {d.reviewer_name} ({d.reviewer_role})
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--color-deep-ink)', margin: '2px 0 0', lineHeight: 1.45 }}>
                        &ldquo;{d.comments}&rdquo;
                      </p>
                      {d.actionable_instructions && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--color-signal-coral)', backgroundColor: 'var(--color-surface-subtle)', padding: '6px 8px', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--color-signal-coral)' }}>
                          <strong>Instructions:</strong> {d.actionable_instructions}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reviewer Decision Modal */}
      {showDecisionModal && submission && (
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
              maxWidth: '540px',
              backgroundColor: 'var(--color-surface-card)',
              color: 'var(--color-deep-ink)',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-muted-slate)' }}>
                  Operations Review Decision
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: '1.2rem', color: 'var(--color-deep-ink)' }}>
                  Record Decision: {decisionType.toUpperCase()}
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowDecisionModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted-slate)' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '8px 12px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem' }}>
              Target Version: <strong>v{submission.version_number}</strong> &nbsp;|&nbsp; Project: <strong>{submission.project_name}</strong>
            </div>

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
              />
            </div>

            {decisionType === 'changes_requested' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-signal-coral)', marginBottom: '4px' }}>
                  Actionable Revision Instructions:
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
                  placeholder="Instructions for customer..."
                />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '14px' }}>
              <button
                type="button"
                onClick={() => setShowDecisionModal(false)}
                className="btn btn-secondary btn-sm"
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

      {/* Customer Resubmit Modal */}
      {showResubmitModal && submission && (
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
              maxWidth: '540px',
              backgroundColor: 'var(--color-surface-card)',
              color: 'var(--color-deep-ink)',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '24px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-evidence-teal)' }}>
                  Submit Revised Version
                </span>
                <h3 style={{ margin: '2px 0 0', fontSize: '1.2rem', color: 'var(--color-deep-ink)' }}>
                  Resubmit to Operations Review Queue
                </h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowResubmitModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted-slate)' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--color-deep-ink)', margin: 0 }}>
              Your revised manuscript will be assigned a new version number (e.g. v1.1) and returned to the BrandGuard Operations queue for reviewer re-evaluation.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-deep-ink)', marginBottom: '4px' }}>
                Revision Notes & Audit Justification:
              </label>
              <textarea
                value={resubmissionNote}
                onChange={(e) => setResubmissionNote(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '0.82rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--color-border-gray)',
                  fontFamily: 'inherit'
                }}
                placeholder="Explain the changes made in this revision to address reviewer feedback..."
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '14px' }}>
              <button
                type="button"
                onClick={() => setShowResubmitModal(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResubmission}
                disabled={isResubmitting}
                className="btn btn-primary btn-sm"
                style={{ gap: '6px', fontWeight: 600 }}
              >
                {isResubmitting ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                <span>Resubmit to Review Queue</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Version Comparison Modal */}
      {showDiffModal && submission && (
        <VersionComparisonModal
          projectId={submission.project_id}
          reviewType={submission.review_type}
          isOpen={showDiffModal}
          onClose={() => setShowDiffModal(false)}
          onVersionLoaded={(verText) => setContentText(verText)}
        />
      )}
    </div>
  );
};
