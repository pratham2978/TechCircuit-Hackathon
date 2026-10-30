import React, { useState } from 'react';
import { AnalysisFinding, ReportData, generateAnalysisPdf, downloadPdf } from '../../utils/pdfGenerator';
import { 
  downloadBackendPdfReport, 
  downloadDirectPdfReport,
  suggestCorrection,
  acceptCorrection,
  rejectCorrection,
  createOperationsSubmission
} from '../../services/api';
import { VersionComparisonModal } from './VersionComparisonModal';
import { 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ShieldCheck, 
  FileText, 
  Clock, 
  Check, 
  Copy, 
  Loader2, 
  RefreshCw, 
  AlertCircle, 
  GitCompare, 
  Sparkles, 
  Edit3, 
  X, 
  MessageSquare, 
  ThumbsDown, 
  ChevronDown,
  Send
} from 'lucide-react';

interface AnalysisResultsLayoutProps {
  projectName: string;
  reviewType: string;
  overallResult: string;
  projectId?: string;
  fileName?: string;
  author?: string;
  reviewDate?: string;
  summaryNarration?: string;
  limitationNotice?: string;
  keyFindings: string[];
  findings: AnalysisFinding[];
  content?: string;
  onApplyCorrection?: (findingId: string, correction: string) => void;
  onRequestFollowupChat?: (prompt: string) => void;
}

export const AnalysisResultsLayout: React.FC<AnalysisResultsLayoutProps> = ({
  projectName,
  reviewType,
  overallResult,
  projectId = 'proj-1',
  fileName,
  author,
  reviewDate,
  summaryNarration,
  limitationNotice,
  keyFindings,
  findings,
  content = '',
  onApplyCorrection,
  onRequestFollowupChat
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Phase 8: Version Diff & Persistent Corrections State
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  
  // Local finding resolution and edited state
  const [findingStatuses, setFindingStatuses] = useState<Record<string, 'open' | 'accepted' | 'dismissed'>>({});
  const [generatedCorrections, setGeneratedCorrections] = useState<Record<string, string>>({});
  const [editingFindingId, setEditingFindingId] = useState<string | null>(null);
  const [editTextMap, setEditTextMap] = useState<Record<string, string>>({});
  const [isGeneratingMap, setIsGeneratingMap] = useState<Record<string, boolean>>({});
  const [isApplyingMap, setIsApplyingMap] = useState<Record<string, boolean>>({});
  
  // Dismissal modal / popover state
  const [dismissingFindingId, setDismissingFindingId] = useState<string | null>(null);
  const [dismissalReason, setDismissalReason] = useState<string>('false_positive');
  const [dismissalNote, setDismissalNote] = useState<string>('');
  const [isDismissing, setIsDismissing] = useState<boolean>(false);

  // Success / Info notifications
  const [actionNotification, setActionNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setActionNotification({ type, message });
    setTimeout(() => setActionNotification(null), 4500);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Phase 9: Operations Queue state
  const [isSubmittingToOps, setIsSubmittingToOps] = useState(false);
  const [isSubmittedToOps, setIsSubmittedToOps] = useState(false);

  const handleQueueToOperations = async () => {
    setIsSubmittingToOps(true);
    try {
      await createOperationsSubmission({
        project_id: projectId,
        review_type: reviewType,
        file_name: fileName,
        content_text: content,
        content_summary: summaryNarration,
        findings: findings
      });
      setIsSubmittedToOps(true);
      showToast('success', 'Manuscript queued for Human Operations Review & Certification!');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to queue for human operations review.');
    } finally {
      setIsSubmittingToOps(false);
    }
  };

  // Phase 8: Generate AI-suggested correction (grounded in DB rules)
  const handleGenerateCorrection = async (findingId: string, finding: AnalysisFinding) => {
    setIsGeneratingMap(prev => ({ ...prev, [findingId]: true }));
    try {
      const res = await suggestCorrection({
        finding: {
          id: findingId,
          title: finding.title,
          explanation: finding.explanation,
          ruleReference: finding.ruleReference,
          severity: finding.severity,
          sourceDoc: finding.sourceDoc,
          original_text_span: finding.title || finding.explanation
        },
        content: content,
        review_type: reviewType
      });

      if (res && res.suggestedCorrection) {
        setGeneratedCorrections(prev => ({ ...prev, [findingId]: res.suggestedCorrection }));
        setEditTextMap(prev => ({ ...prev, [findingId]: res.suggestedCorrection }));
        showToast('info', 'AI proposed compliant correction. Review before applying.');
      } else {
        showToast('error', 'Unable to generate suggestion from rule base.');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Correction generation failed.');
    } finally {
      setIsGeneratingMap(prev => ({ ...prev, [findingId]: false }));
    }
  };

  // Phase 8: Accept Correction & Persist to Content Version
  const handleAcceptCorrection = async (
    findingId: string, 
    finding: AnalysisFinding, 
    customText?: string
  ) => {
    const textToApply = customText !== undefined 
      ? customText 
      : (generatedCorrections[findingId] || finding.suggestedCorrection || '');

    if (!textToApply.trim()) {
      showToast('error', 'Cannot apply empty correction.');
      return;
    }

    setIsApplyingMap(prev => ({ ...prev, [findingId]: true }));

    try {
      const isEdited = customText !== undefined && customText !== (finding.suggestedCorrection || '');
      
      const res = await acceptCorrection(projectId, reviewType, {
        finding_id: findingId,
        original_text_span: finding.title || finding.explanation,
        correction_text: textToApply,
        is_user_edited: isEdited,
        rule_reference: finding.ruleReference,
        explanation: finding.explanation,
        author: author || 'Brand Specialist'
      });

      setFindingStatuses(prev => ({ ...prev, [findingId]: 'accepted' }));
      setEditingFindingId(null);

      // Invoke optional parent callback
      if (onApplyCorrection) {
        onApplyCorrection(findingId, textToApply);
      }

      showToast('success', `Correction applied & saved to Version ${res.new_version || '1.1'}!`);
    } catch (err: any) {
      showToast('error', err.message || 'Failed to persist version update.');
    } finally {
      setIsApplyingMap(prev => ({ ...prev, [findingId]: false }));
    }
  };

  // Phase 8: Reject / Dismiss Correction without modifying version or text
  const handleConfirmDismissal = async () => {
    if (!dismissingFindingId) return;

    setIsDismissing(true);
    try {
      const activeFinding = findings.find(f => (f.id || String(findings.indexOf(f))) === dismissingFindingId);
      
      await rejectCorrection(projectId, reviewType, {
        finding_id: dismissingFindingId,
        dismissal_reason: dismissalReason,
        dismissal_note: dismissalNote,
        original_text_span: activeFinding?.title || activeFinding?.explanation,
        rule_reference: activeFinding?.ruleReference
      });

      setFindingStatuses(prev => ({ ...prev, [dismissingFindingId]: 'dismissed' }));
      setDismissingFindingId(null);
      setDismissalNote('');
      showToast('info', 'Finding dismissed without modifying document content.');
    } catch (err: any) {
      showToast('error', err.message || 'Failed to record dismissal.');
    } finally {
      setIsDismissing(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    setDownloadError(null);

    // 1. Attempt official backend PDF generation
    try {
      if (projectId) {
        await downloadBackendPdfReport(projectId, reviewType);
        setIsDownloading(false);
        return;
      }
    } catch (backendErr: any) {
      console.warn('Backend stored report endpoint notice:', backendErr.message);
    }

    // 2. Attempt backend direct payload generator
    try {
      await downloadDirectPdfReport({
        project_name: projectName,
        review_type: reviewType,
        overall_result: overallResult,
        file_name: fileName,
        review_date: reviewDate,
        summary_narration: summaryNarration,
        key_findings: keyFindings,
        findings: findings,
        limitation_notice: limitationNotice,
        reviewer: author
      });
      setIsDownloading(false);
      return;
    } catch (payloadErr: any) {
      console.warn('Backend direct PDF generator notice:', payloadErr.message);
    }

    // 3. Resilient client-side PDF 1.4 generation fallback
    try {
      const reportData: ReportData = {
        projectName,
        reviewType,
        overallResult,
        fileName,
        author,
        analysisDate: reviewDate || new Date().toISOString().slice(0, 10),
        keyFindings,
        findings
      };

      const pdfBlob = generateAnalysisPdf(reportData);
      const cleanProject = projectName.replace(/[^a-zA-Z0-9_-]/g, '-');
      const cleanTool = reviewType.replace(/[^a-zA-Z0-9_-]/g, '-');
      const filename = `${cleanProject}-${cleanTool}-Review.pdf`;

      downloadPdf(pdfBlob, filename);
    } catch (fallbackErr: any) {
      setDownloadError(fallbackErr.message || 'Unable to generate PDF report. Please verify connection and retry.');
    } finally {
      setIsDownloading(false);
    }
  };

  const isApproved = overallResult.toLowerCase().includes('approved') || overallResult.toLowerCase().includes('pass');
  const isCritical = findings.some(f => f.severity === 'critical') || overallResult.toLowerCase().includes('changes required');

  // Calculate actual severity breakdown strictly from findings
  const criticalCount = findings.filter(f => f.severity === 'critical').length;
  const warningCount = findings.filter(f => f.severity === 'warning').length;
  const advisoryCount = findings.filter(f => f.severity === 'advisory').length;

  // Prioritize critical and warning issues in the Key Findings sidebar
  const prioritizedKeyFindings = [...keyFindings].sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const aIsHigh = aLower.includes('critical') || aLower.includes('prohibited') || aLower.includes('waiver') || aLower.includes('violation');
    const bIsHigh = bLower.includes('critical') || bLower.includes('prohibited') || bLower.includes('waiver') || bLower.includes('violation');
    if (aIsHigh && !bIsHigh) return -1;
    if (!aIsHigh && bIsHigh) return 1;
    return 0;
  });

  return (
    <div 
      className="analysis-results-grid"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 340px',
        gap: '24px',
        alignItems: 'start',
        marginTop: '16px',
        position: 'relative'
      }}
    >
      {/* Action Notification Banner */}
      {actionNotification && (
        <div 
          style={{
            gridColumn: '1 / -1',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: actionNotification.type === 'success' 
              ? 'rgba(16, 185, 129, 0.12)' 
              : actionNotification.type === 'error' 
                ? 'rgba(239, 68, 68, 0.12)' 
                : 'rgba(22, 124, 120, 0.12)',
            border: `1px solid ${
              actionNotification.type === 'success' 
                ? '#10b981' 
                : actionNotification.type === 'error' 
                  ? '#ef4444' 
                  : '#167c78'
            }`,
            color: 'var(--color-deep-ink)',
            fontSize: '0.84rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {actionNotification.type === 'success' && <CheckCircle2 size={16} color="#10b981" />}
            {actionNotification.type === 'error' && <AlertCircle size={16} color="#ef4444" />}
            {actionNotification.type === 'info' && <Info size={16} color="#167c78" />}
            <strong>{actionNotification.message}</strong>
          </div>
          <button 
            type="button" 
            onClick={() => setActionNotification(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted-slate)' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEFT COLUMN: Detailed Analysis Report                                     */}
      {/* ========================================================================= */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Overall Verdict Banner */}
        <div 
          className="card-panel" 
          style={{ 
            padding: '16px 20px', 
            backgroundColor: 'var(--color-surface-white)',
            borderLeft: `5px solid ${isCritical ? 'var(--color-error)' : isApproved ? 'var(--color-evidence-teal)' : 'var(--color-warning)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-muted-slate)' }}>
              Compliance Verdict
            </span>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-deep-ink)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
              {isCritical ? (
                <AlertTriangle size={20} color="var(--color-error)" />
              ) : (
                <CheckCircle2 size={20} color="var(--color-evidence-teal)" />
              )}
              <span>{overallResult}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
              {findings.length} {findings.length === 1 ? 'Finding' : 'Findings'}
            </span>
            {fileName && (
              <span className="badge badge-neutral" style={{ fontSize: '0.72rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={fileName}>
                <FileText size={11} style={{ marginRight: '4px' }} />
                {fileName}
              </span>
            )}
            <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
              {reviewDate || new Date().toISOString().slice(0, 10)}
            </span>

            {/* Phase 8: Version Diff & History Trigger Button */}
            <button 
              type="button"
              onClick={() => setIsCompareModalOpen(true)}
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '0.72rem',
                gap: '5px',
                borderColor: 'var(--color-evidence-teal)',
                color: 'var(--color-evidence-teal)',
                fontWeight: 600
              }}
              title="Compare original vs revised versions with visual additions and deletions diff"
            >
              <GitCompare size={13} />
              <span>Compare Versions (Diff)</span>
            </button>

            {/* Phase 9: Queue to Operations Review Trigger */}
            <button
              type="button"
              onClick={handleQueueToOperations}
              disabled={isSubmittingToOps || isSubmittedToOps}
              className="btn btn-primary btn-sm"
              style={{
                fontSize: '0.72rem',
                gap: '5px',
                fontWeight: 600
              }}
              title="Submit this reviewed manuscript to Human Operations Review Queue"
            >
              {isSubmittingToOps ? (
                <Loader2 size={13} className="animate-spin" />
              ) : isSubmittedToOps ? (
                <CheckCircle2 size={13} />
              ) : (
                <Send size={13} />
              )}
              <span>{isSubmittedToOps ? 'Queued to Operations' : 'Submit for Human Signoff'}</span>
            </button>
          </div>
        </div>

        {/* Executive Summary */}
        {summaryNarration && (
          <div 
            className="card-panel"
            style={{
              padding: '16px 20px',
              backgroundColor: 'var(--color-surface-white)',
              border: '1px solid var(--color-border-gray)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-evidence-teal)' }}>
              <ShieldCheck size={16} />
              <strong style={{ fontSize: '0.88rem' }}>Executive Summary</strong>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-deep-ink)', margin: 0, lineHeight: 1.5 }}>
              {summaryNarration}
            </p>
          </div>
        )}

        {/* Analysis Limitation Notice Callout (if applicable) */}
        {limitationNotice && (
          <div 
            style={{
              padding: '12px 16px',
              backgroundColor: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border-gray)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px'
            }}
          >
            <Info size={16} color="var(--color-muted-slate)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)', lineHeight: 1.45 }}>
              <strong>Scope Notice:</strong> {limitationNotice}
            </div>
          </div>
        )}

        {/* Detailed Inspection Findings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <strong style={{ fontSize: '0.95rem', color: 'var(--color-deep-ink)' }}>
              Detailed Inspection Findings
            </strong>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
              Evidence-Linked Analysis & Versioning
            </span>
          </div>

          {findings.length === 0 ? (
            <div className="card-panel" style={{ textAlign: 'center', padding: '36px', backgroundColor: 'var(--color-surface-white)' }}>
              <CheckCircle2 size={36} color="var(--color-success)" style={{ marginBottom: '8px' }} />
              <div style={{ fontWeight: 600, color: 'var(--color-deep-ink)', fontSize: '1rem' }}>No Compliance Issues Detected</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)', margin: '4px 0 0' }}>
                Content fully aligns with active brand rules, tone guidelines, and verified claim records.
              </p>
            </div>
          ) : (
            findings.map((finding, idx) => {
              const findingId = finding.id || `f-${idx}`;
              const isCrit = finding.severity === 'critical';
              const isWarn = finding.severity === 'warning';
              const borderColor = isCrit ? 'var(--color-error)' : isWarn ? 'var(--color-warning)' : 'var(--color-evidence-teal)';

              const status = findingStatuses[findingId] || 'open';
              const isAccepted = status === 'accepted';
              const isDismissed = status === 'dismissed';

              const activeCorrectionText = generatedCorrections[findingId] || finding.suggestedCorrection || '';
              const isEditing = editingFindingId === findingId;
              const isGenerating = !!isGeneratingMap[findingId];
              const isApplying = !!isApplyingMap[findingId];

              return (
                <div 
                  key={findingId}
                  className="card-panel"
                  style={{
                    padding: '16px',
                    backgroundColor: isAccepted 
                      ? 'rgba(16, 185, 129, 0.03)' 
                      : isDismissed 
                        ? 'rgba(148, 163, 184, 0.05)' 
                        : 'var(--color-surface-white)',
                    borderLeft: `4px solid ${isAccepted ? '#10b981' : isDismissed ? 'var(--color-muted-slate)' : borderColor}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    opacity: isDismissed ? 0.8 : 1,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Finding Title & Badges */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span 
                        className={`badge ${isCrit ? 'badge-critical' : isWarn ? 'badge-expiring' : 'badge-teal'}`}
                        style={{ fontSize: '0.68rem', textTransform: 'uppercase' }}
                      >
                        {finding.severity}
                      </span>
                      {finding.timestamp && (
                        <span className="badge badge-neutral" style={{ fontSize: '0.68rem', gap: '3px' }}>
                          <Clock size={11} /> {finding.timestamp}
                        </span>
                      )}
                      <strong style={{ fontSize: '0.92rem', color: 'var(--color-deep-ink)' }}>
                        {finding.title}
                      </strong>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {isAccepted && (
                        <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#047857', border: '1px solid rgba(16, 185, 129, 0.3)', gap: '4px', fontSize: '0.72rem' }}>
                          <CheckCircle2 size={12} /> Resolved (Applied to Version)
                        </span>
                      )}
                      {isDismissed && (
                        <span className="badge badge-neutral" style={{ fontSize: '0.72rem', gap: '4px', color: 'var(--color-muted-slate)' }}>
                          <X size={12} /> Dismissed
                        </span>
                      )}
                      {!isAccepted && !isDismissed && (
                        <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                          Open Finding
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Problem Explanation */}
                  <p style={{ fontSize: '0.84rem', color: 'var(--color-deep-ink)', margin: 0, lineHeight: 1.5 }}>
                    {finding.explanation}
                  </p>

                  {/* Evidence / Source Citation / Applicable Rule */}
                  {(finding.sourceDoc || finding.ruleReference || finding.claimOwner) && (
                    <div 
                      style={{ 
                        display: 'flex', 
                        flexWrap: 'wrap', 
                        gap: '12px', 
                        fontSize: '0.75rem', 
                        color: 'var(--color-muted-slate)', 
                        backgroundColor: 'var(--color-surface-subtle)', 
                        padding: '6px 10px', 
                        borderRadius: 'var(--radius-sm)' 
                      }}
                    >
                      {finding.ruleReference && (
                        <span>
                          <strong>Rule:</strong> {finding.ruleReference}
                        </span>
                      )}
                      {finding.sourceDoc && (
                        <span>
                          <strong>Evidence Source:</strong> {finding.sourceDoc} {finding.sourcePage ? `(p. ${finding.sourcePage})` : ''}
                        </span>
                      )}
                      {finding.claimOwner && (
                        <span>
                          <strong>Owner:</strong> {finding.claimOwner}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Phase 8: Recommended Correction & Suggested Replacement Interface */}
                  {!isDismissed && !isAccepted && (
                    <div 
                      style={{ 
                        marginTop: '4px',
                        padding: '12px', 
                        backgroundColor: 'rgba(22, 124, 120, 0.06)', 
                        border: '1px solid rgba(22, 124, 120, 0.2)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-evidence-teal)' }}>
                          AI-Suggested Correction / Compliant Replacement
                        </span>
                        
                        {/* Action buttons on suggested fix */}
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {activeCorrectionText && (
                            <button 
                              type="button"
                              onClick={() => handleCopy(findingId, activeCorrectionText)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', fontSize: '0.7rem', gap: '4px' }}
                              title="Copy replacement text"
                            >
                              {copiedId === findingId ? <Check size={11} color="var(--color-success)" /> : <Copy size={11} />}
                              <span>{copiedId === findingId ? 'Copied' : 'Copy'}</span>
                            </button>
                          )}

                          {/* Ask AI for Better Fix button */}
                          <button 
                            type="button"
                            onClick={() => handleGenerateCorrection(findingId, finding)}
                            disabled={isGenerating}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 8px', fontSize: '0.7rem', gap: '4px' }}
                            title="Generate or improve correction using company brand guidelines and claim records"
                          >
                            {isGenerating ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} color="var(--color-evidence-teal)" />}
                            <span>{activeCorrectionText ? 'Ask AI for Better Fix' : 'Generate AI Fix'}</span>
                          </button>

                          {/* Edit Fix Button */}
                          {activeCorrectionText && !isEditing && (
                            <button 
                              type="button"
                              onClick={() => {
                                setEditingFindingId(findingId);
                                setEditTextMap(prev => ({ ...prev, [findingId]: activeCorrectionText }));
                              }}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', fontSize: '0.7rem', gap: '4px' }}
                              title="Edit proposed wording before accepting"
                            >
                              <Edit3 size={11} />
                              <span>Edit Fix</span>
                            </button>
                          )}

                          {/* Dismiss Button */}
                          <button 
                            type="button"
                            onClick={() => setDismissingFindingId(findingId)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 8px', fontSize: '0.7rem', gap: '4px', color: 'var(--color-muted-slate)' }}
                            title="Dismiss finding without mutating content or creating versions"
                          >
                            <X size={11} />
                            <span>Dismiss...</span>
                          </button>

                          {/* Accept Fix Button (Immediate if not editing) */}
                          {activeCorrectionText && !isEditing && (
                            <button 
                              type="button"
                              onClick={() => handleAcceptCorrection(findingId, finding)}
                              disabled={isApplying}
                              className="btn btn-teal btn-sm"
                              style={{ padding: '2px 10px', fontSize: '0.72rem', gap: '4px', fontWeight: 600 }}
                            >
                              {isApplying ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                              <span>Accept Fix</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Editing Area */}
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                          <textarea 
                            value={editTextMap[findingId] !== undefined ? editTextMap[findingId] : activeCorrectionText}
                            onChange={(e) => setEditTextMap(prev => ({ ...prev, [findingId]: e.target.value }))}
                            rows={3}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--color-evidence-teal)',
                              fontSize: '0.82rem',
                              fontFamily: 'inherit',
                              resize: 'vertical'
                            }}
                            placeholder="Enter tailored compliant wording..."
                          />
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                            <button 
                              type="button"
                              onClick={() => setEditingFindingId(null)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                            >
                              Cancel
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleAcceptCorrection(findingId, finding, editTextMap[findingId])}
                              disabled={isApplying}
                              className="btn btn-teal btn-sm"
                              style={{ fontSize: '0.72rem', padding: '2px 10px', fontWeight: 600, gap: '4px' }}
                            >
                              {isApplying ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                              <span>Save & Accept Fix</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.84rem', color: 'var(--color-deep-ink)', fontStyle: activeCorrectionText ? 'italic' : 'normal', lineHeight: 1.45 }}>
                          {activeCorrectionText ? (
                            <>&ldquo;{activeCorrectionText}&rdquo;</>
                          ) : (
                            <span style={{ color: 'var(--color-muted-slate)', fontSize: '0.78rem' }}>
                              No suggested replacement generated yet. Click &ldquo;Generate AI Fix&rdquo; to draft a rule-grounded revision.
                            </span>
                          )}
                        </div>
                      )}

                      {/* Review Chat Follow-up Tip */}
                      {onRequestFollowupChat && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', borderTop: '1px dashed rgba(22, 124, 120, 0.2)', paddingTop: '6px' }}>
                          <MessageSquare size={12} color="var(--color-muted-slate)" />
                          <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>
                            Need custom phrasing?{' '}
                            <button 
                              type="button"
                              onClick={() => onRequestFollowupChat(`Please provide a compliant alternative phrasing for finding "${finding.title}" that satisfies ${finding.ruleReference || 'brand guidelines'}.`)}
                              style={{ background: 'none', border: 'none', padding: 0, color: 'var(--color-evidence-teal)', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.72rem' }}
                            >
                              Ask review assistant in chat
                            </button>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dismissal Reason Selector Form (if active for this finding) */}
                  {dismissingFindingId === findingId && (
                    <div 
                      style={{
                        padding: '12px',
                        backgroundColor: 'var(--color-surface-subtle)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border-gray)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <strong style={{ fontSize: '0.8rem', color: 'var(--color-deep-ink)' }}>
                          Dismiss Finding Without Content Modification
                        </strong>
                        <button 
                          type="button"
                          onClick={() => setDismissingFindingId(null)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted-slate)' }}
                        >
                          <X size={14} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--color-muted-slate)', minWidth: '80px' }}>
                          Reason:
                        </label>
                        <select 
                          value={dismissalReason}
                          onChange={(e) => setDismissalReason(e.target.value)}
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.78rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border-gray)',
                            backgroundColor: 'var(--color-surface-subtle)',
                            color: 'var(--color-deep-ink)',
                            flex: 1
                          }}
                        >
                          <option value="false_positive">False Positive (Complies with Rule)</option>
                          <option value="legal_approved_exception">Legal Approved Exception</option>
                          <option value="brand_approved_variance">Brand Approved Variance</option>
                          <option value="business_accepted_risk">Business Accepted Risk</option>
                          <option value="not_applicable">Not Applicable to Market / Format</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--color-muted-slate)', minWidth: '80px' }}>
                          Audit Note:
                        </label>
                        <input 
                          type="text"
                          value={dismissalNote}
                          onChange={(e) => setDismissalNote(e.target.value)}
                          placeholder="Optional audit trail justification..."
                          style={{
                            padding: '4px 8px',
                            fontSize: '0.78rem',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--color-border-gray)',
                            backgroundColor: 'var(--color-surface-subtle)',
                            color: 'var(--color-deep-ink)',
                            flex: 1
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '2px' }}>
                        <button 
                          type="button"
                          onClick={() => setDismissingFindingId(null)}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                        >
                          Cancel
                        </button>
                        <button 
                          type="button"
                          onClick={handleConfirmDismissal}
                          disabled={isDismissing}
                          className="btn btn-sm"
                          style={{
                            backgroundColor: 'var(--color-muted-slate)',
                            color: 'white',
                            fontSize: '0.72rem',
                            padding: '2px 10px',
                            fontWeight: 600,
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            cursor: 'pointer'
                          }}
                        >
                          {isDismissing ? 'Recording...' : 'Confirm Dismissal'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Summary row for resolved finding */}
                  {isAccepted && (
                    <div style={{ fontSize: '0.78rem', color: '#047857', padding: '4px 8px', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: 'var(--radius-sm)' }}>
                      <strong>Applied Wording:</strong> &ldquo;{activeCorrectionText}&rdquo;
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: Key Findings Sidebar & PDF Download                         */}
      {/* ========================================================================= */}
      <div 
        className="card-panel"
        style={{
          padding: '20px',
          backgroundColor: 'var(--color-surface-white)',
          border: '1px solid var(--color-border-gray)',
          position: 'sticky',
          top: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        <div>
          <h3 style={{ fontSize: '1.05rem', margin: '0 0 6px', color: 'var(--color-deep-ink)' }}>
            Key Findings
          </h3>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)', margin: 0 }}>
            Executive priority summary of critical risks and required changes.
          </p>
        </div>

        {/* Calculated Total Issues Counter */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            padding: '8px 12px',
            backgroundColor: 'var(--color-surface-subtle)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border-subtle)'
          }}
        >
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-deep-ink)' }}>
            Total Findings: {findings.length}
          </span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {criticalCount > 0 && (
              <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>
                {criticalCount} Critical
              </span>
            )}
            {warningCount > 0 && (
              <span className="badge badge-expiring" style={{ fontSize: '0.65rem' }}>
                {warningCount} Warning
              </span>
            )}
            {advisoryCount > 0 && (
              <span className="badge badge-teal" style={{ fontSize: '0.65rem' }}>
                {advisoryCount} Advisory
              </span>
            )}
          </div>
        </div>

        {/* Concise Bullet Points (Prioritizing High / Critical Issues First) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {prioritizedKeyFindings.length === 0 ? (
            <div style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)', fontStyle: 'italic' }}>
              No critical risks or policy exceptions detected.
            </div>
          ) : (
            prioritizedKeyFindings.map((bullet, idx) => {
              const isHigh = bullet.toLowerCase().includes('critical') || bullet.toLowerCase().includes('prohibited') || bullet.toLowerCase().includes('waiver');
              return (
                <div 
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '0.82rem',
                    lineHeight: 1.45,
                    color: 'var(--color-deep-ink)'
                  }}
                >
                  <div 
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: isHigh ? 'var(--color-error)' : 'var(--color-signal-coral)',
                      marginTop: '6px',
                      flexShrink: 0
                    }}
                  />
                  <span>{bullet}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Phase 8: Quick Action to Compare Version Diff */}
        <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '12px' }}>
          <button 
            type="button"
            onClick={() => setIsCompareModalOpen(true)}
            className="btn btn-secondary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '9px 14px',
              fontSize: '0.82rem',
              fontWeight: 600,
              gap: '6px',
              color: 'var(--color-evidence-teal)',
              borderColor: 'var(--color-evidence-teal)'
            }}
          >
            <GitCompare size={15} />
            <span>View Version Diff & History</span>
          </button>
          <span style={{ display: 'block', textAlign: 'center', fontSize: '0.68rem', color: 'var(--color-muted-slate)', marginTop: '4px' }}>
            Inspect additions, deletions, & addressed issues
          </span>
        </div>

        {/* Download PDF Error Notice (if failed) */}
        {downloadError && (
          <div 
            style={{ 
              padding: '8px 10px', 
              backgroundColor: 'var(--color-error-subtle)', 
              borderRadius: 'var(--radius-sm)', 
              border: '1px solid var(--color-error)',
              fontSize: '0.74rem',
              color: 'var(--color-error)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{downloadError}</span>
          </div>
        )}

        {/* Prominent PDF Download Button */}
        <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '12px' }}>
          <button 
            type="button"
            onClick={handleDownloadPdf}
            disabled={isDownloading}
            className="btn btn-primary"
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '11px 16px',
              fontSize: '0.88rem',
              fontWeight: 600,
              gap: '8px',
              boxShadow: 'var(--shadow-sm)',
              cursor: isDownloading ? 'not-allowed' : 'pointer',
              opacity: isDownloading ? 0.7 : 1
            }}
          >
            {isDownloading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Generating PDF Report...</span>
              </>
            ) : (
              <>
                <Download size={16} />
                <span>Download PDF Report</span>
              </>
            )}
          </button>
          <span style={{ display: 'block', textAlign: 'center', fontSize: '0.7rem', color: 'var(--color-muted-slate)', marginTop: '6px' }}>
            Multi-page certified report with severity, evidence citations, & replacement text
          </span>
        </div>
      </div>

      {/* Phase 8: Version Comparison & Diff Inspection Modal */}
      {isCompareModalOpen && (
        <VersionComparisonModal
          projectId={projectId}
          reviewType={reviewType}
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
        />
      )}
    </div>
  );
};
