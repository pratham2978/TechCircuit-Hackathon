import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { BrandPassportRecord, ChangeRequest, ProjectFile } from '../../types';
import { 
  Award, 
  History, 
  CheckCircle2, 
  FileText, 
  Activity, 
  GitPullRequest, 
  Search, 
  Download, 
  ExternalLink, 
  ShieldCheck, 
  AlertTriangle, 
  Check, 
  X, 
  Clock, 
  ArrowRight,
  Eye,
  PlusCircle,
  Copy,
  ChevronRight
} from 'lucide-react';

export const HistoryReportsPage: React.FC = () => {
  const { 
    passports, 
    documents, 
    projects,
    rules,
    claims,
    guidelines,
    changeRequests, 
    updateChangeRequestStatus,
    addChangeRequest,
    accountType 
  } = useDemo();

  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');

  type HistoryTab = 'reviews' | 'passports' | 'versions' | 'health' | 'requests';

  // Normalize tab input for backward compatibility
  const normalizeTab = (tabStr: string | null): HistoryTab => {
    if (!tabStr) return 'reviews';
    if (tabStr === 'reviews' || tabStr === 'decisions') return 'reviews';
    if (tabStr === 'passports') return 'passports';
    if (tabStr === 'versions' || tabStr === 'diffs') return 'versions';
    if (tabStr === 'health' || tabStr === 'reports') return 'health';
    if (tabStr === 'requests' || tabStr === 'change-requests') return 'requests';
    return 'reviews';
  };

  const [activeTab, setActiveTab] = useState<HistoryTab>(() => normalizeTab(requestedTab));
  const isOperations = accountType === 'brandguard_operations';

  // Modal & inspection states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedPassport, setSelectedPassport] = useState<BrandPassportRecord | null>(null);
  const [selectedChangeRequest, setSelectedChangeRequest] = useState<ChangeRequest | null>(null);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);

  // Search & Filter state for Review History
  const [reviewsSearch, setReviewsSearch] = useState('');
  const [reviewsStatusFilter, setReviewsStatusFilter] = useState<string>('ALL');

  // Search state for Passports
  const [passportsSearch, setPassportsSearch] = useState('');

  // Selected document for Version Changes
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  const activeDiffDoc = documents.find(d => d.id === selectedDocId) || documents[0];

  // New Change Request Form State
  const [newReqTitle, setNewReqTitle] = useState('');
  const [newReqType, setNewReqType] = useState<ChangeRequest['type']>('Rule Exception');
  const [newReqDescription, setNewReqDescription] = useState('');
  const [newReqPriority, setNewReqPriority] = useState<ChangeRequest['priority']>('medium');

  const switchTab = (tab: HistoryTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard`);
  };

  // Compile Review History records across Projects & Documents
  interface ReviewHistoryItem {
    id: string;
    projectId?: string;
    projectName: string;
    itemName: string;
    reviewType: string;
    status: 'approved' | 'changes_requested' | 'in_progress' | 'awaiting_verification' | 'draft';
    reviewerOrAuthor: string;
    date: string;
    notes?: string;
    linkUrl: string;
  }

  const reviewHistoryItems: ReviewHistoryItem[] = [];

  // Add project files
  projects.forEach(proj => {
    proj.files.forEach(file => {
      const toolNames: Record<string, string> = {
        legal: 'Legal Document Review',
        promotions: 'Promotion & Offer Claims',
        content: 'Content Review',
        images: 'Image & Design Review',
        videos: 'Video Review'
      };
      
      const statusMap: Record<string, ReviewHistoryItem['status']> = {
        approved: 'approved',
        changes_requested: 'changes_requested',
        in_progress: 'in_progress',
        awaiting_verification: 'awaiting_verification',
        draft: 'draft',
        not_started: 'draft'
      };

      reviewHistoryItems.push({
        id: `${proj.id}-${file.id}`,
        projectId: proj.id,
        projectName: proj.name,
        itemName: file.name,
        reviewType: toolNames[file.reviewType] || file.reviewType || 'Content Review',
        status: statusMap[file.status] || 'in_progress',
        reviewerOrAuthor: file.reviewer || proj.owner || 'Lead Reviewer',
        date: file.uploadedAt?.slice(0, 10) || proj.updatedAt,
        notes: file.reviewerNotes || `${file.findingsCount || 0} policy findings inspected`,
        linkUrl: `/app/projects/${proj.id}`
      });
    });
  });

  // Add root review documents
  documents.forEach(doc => {
    const docStatusMap: Record<string, ReviewHistoryItem['status']> = {
      approved: 'approved',
      changes_requested: 'changes_requested',
      pending_review: 'awaiting_verification',
      draft: 'draft',
      rejected: 'changes_requested'
    };

    reviewHistoryItems.push({
      id: doc.id,
      projectName: 'Global Collateral',
      itemName: doc.title,
      reviewType: 'Content Review',
      status: docStatusMap[doc.status] || 'draft',
      reviewerOrAuthor: doc.reviewer || doc.author,
      date: doc.updatedAt?.slice(0, 10) || doc.submittedAt?.slice(0, 10),
      notes: doc.reviewerNotes || 'Standard pre-flight verification checks applied',
      linkUrl: `/app/review/${doc.id}`
    });
  });

  // Filter Review History
  const filteredReviewHistory = reviewHistoryItems.filter(item => {
    const q = reviewsSearch.toLowerCase();
    const matchesSearch = item.projectName.toLowerCase().includes(q) ||
                          item.itemName.toLowerCase().includes(q) ||
                          item.reviewType.toLowerCase().includes(q) ||
                          item.reviewerOrAuthor.toLowerCase().includes(q);
    const matchesStatus = reviewsStatusFilter === 'ALL' || item.status.toLowerCase() === reviewsStatusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // Filter Passports
  const filteredPassports = passports.filter(p => {
    const q = passportsSearch.toLowerCase();
    return p.id.toLowerCase().includes(q) ||
           p.documentTitle.toLowerCase().includes(q) ||
           p.reviewer.toLowerCase().includes(q) ||
           p.author.toLowerCase().includes(q);
  });

  // Handle New Change Request Submission
  const handleAddRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReqTitle.trim() || !newReqDescription.trim()) return;

    addChangeRequest({
      title: newReqTitle.trim(),
      type: newReqType,
      description: newReqDescription.trim(),
      priority: newReqPriority,
      requestedBy: accountType === 'company_workspace' ? 'Sarah Chen (Lead Marketer)' : 'Elena Rostova (Operations Reviewer)'
    });

    setShowNewRequestModal(false);
    setNewReqTitle('');
    setNewReqDescription('');
    showToast('Change request submitted for review');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            backgroundColor: 'var(--color-deep-ink)',
            color: '#FFFFFF',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            fontSize: '0.85rem',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={16} color="var(--color-evidence-teal)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--color-deep-ink)' }}>
            History & Reports
          </h1>
          <p style={{ color: 'var(--color-muted-slate)', fontSize: '0.9rem', margin: 0 }}>
            View past reviews, approval decisions, document changes, and outstanding change requests.
          </p>
        </div>

        {activeTab === 'requests' && (
          <button 
            onClick={() => setShowNewRequestModal(true)}
            className="btn btn-primary btn-sm"
            style={{ gap: '6px' }}
          >
            <PlusCircle size={14} />
            <span>New Change Request</span>
          </button>
        )}
      </div>

      {/* 5 Simple Category Tabs */}
      <div 
        style={{ 
          display: 'flex', 
          borderBottom: '1px solid var(--color-border-gray)', 
          gap: '4px',
          overflowX: 'auto',
          paddingBottom: '0px'
        }}
      >
        <button
          onClick={() => switchTab('reviews')}
          style={{
            padding: '10px 16px',
            fontSize: '0.86rem',
            fontWeight: activeTab === 'reviews' ? 700 : 500,
            color: activeTab === 'reviews' ? 'var(--color-signal-coral)' : 'var(--color-muted-slate)',
            borderBottom: activeTab === 'reviews' ? '2px solid var(--color-signal-coral)' : '2px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <History size={16} />
          <span>Review History ({reviewHistoryItems.length})</span>
        </button>

        <button
          onClick={() => switchTab('passports')}
          style={{
            padding: '10px 16px',
            fontSize: '0.86rem',
            fontWeight: activeTab === 'passports' ? 700 : 500,
            color: activeTab === 'passports' ? 'var(--color-signal-coral)' : 'var(--color-muted-slate)',
            borderBottom: activeTab === 'passports' ? '2px solid var(--color-signal-coral)' : '2px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <Award size={16} />
          <span>Brand Passports ({passports.length})</span>
        </button>

        <button
          onClick={() => switchTab('versions')}
          style={{
            padding: '10px 16px',
            fontSize: '0.86rem',
            fontWeight: activeTab === 'versions' ? 700 : 500,
            color: activeTab === 'versions' ? 'var(--color-signal-coral)' : 'var(--color-muted-slate)',
            borderBottom: activeTab === 'versions' ? '2px solid var(--color-signal-coral)' : '2px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <FileText size={16} />
          <span>Version Changes</span>
        </button>

        <button
          onClick={() => switchTab('health')}
          style={{
            padding: '10px 16px',
            fontSize: '0.86rem',
            fontWeight: activeTab === 'health' ? 700 : 500,
            color: activeTab === 'health' ? 'var(--color-signal-coral)' : 'var(--color-muted-slate)',
            borderBottom: activeTab === 'health' ? '2px solid var(--color-signal-coral)' : '2px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <Activity size={16} />
          <span>Guideline Health</span>
        </button>

        <button
          onClick={() => switchTab('requests')}
          style={{
            padding: '10px 16px',
            fontSize: '0.86rem',
            fontWeight: activeTab === 'requests' ? 700 : 500,
            color: activeTab === 'requests' ? 'var(--color-signal-coral)' : 'var(--color-muted-slate)',
            borderBottom: activeTab === 'requests' ? '2px solid var(--color-signal-coral)' : '2px solid transparent',
            background: 'none',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap'
          }}
        >
          <GitPullRequest size={16} />
          <span>Change Requests ({changeRequests.length})</span>
        </button>
      </div>

      {/* =========================================================================
          CATEGORY 1: REVIEW HISTORY
          ========================================================================= */}
      {activeTab === 'reviews' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search & Filter Bar */}
          <div className="card-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '380px' }}>
              <Search size={15} color="var(--color-muted-slate)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                value={reviewsSearch}
                onChange={(e) => setReviewsSearch(e.target.value)}
                placeholder="Search by project, file, or reviewer..."
                style={{ 
                  width: '100%', 
                  padding: '7px 12px 7px 32px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--color-border-gray)', 
                  fontSize: '0.84rem', 
                  backgroundColor: 'var(--color-surface-subtle)',
                  color: 'var(--color-deep-ink)'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { key: 'ALL', label: 'All Reviews' },
                { key: 'approved', label: 'Approved' },
                { key: 'in_progress', label: 'In Review' },
                { key: 'changes_requested', label: 'Changes Requested' }
              ].map(f => (
                <button
                  key={f.key}
                  onClick={() => setReviewsStatusFilter(f.key)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.74rem',
                    fontWeight: reviewsStatusFilter === f.key ? 700 : 500,
                    backgroundColor: reviewsStatusFilter === f.key ? 'var(--color-evidence-teal)' : 'var(--color-surface-subtle)',
                    color: reviewsStatusFilter === f.key ? '#FFFFFF' : 'var(--color-muted-slate)',
                    border: '1px solid var(--color-border-gray)',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Review History Table */}
          {filteredReviewHistory.length === 0 ? (
            <div className="card-panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <History size={36} color="var(--color-muted-slate)" style={{ marginBottom: '10px', opacity: 0.7 }} />
              <div style={{ fontWeight: 600, color: 'var(--color-deep-ink)', fontSize: '0.95rem' }}>No reviews recorded</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)', margin: '6px 0 16px' }}>
                {reviewsSearch || reviewsStatusFilter !== 'ALL' 
                  ? 'No review records match your current filter settings.' 
                  : 'Start a review inside any project to generate audit history.'}
              </p>
              <Link to="/app/projects" className="btn btn-primary btn-sm">
                Open Projects
              </Link>
            </div>
          ) : (
            <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-surface-subtle)', borderBottom: '1px solid var(--color-border-gray)' }}>
                    <th style={{ padding: '12px 20px', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Project & Asset</th>
                    <th style={{ padding: '12px 16px', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Review Type</th>
                    <th style={{ padding: '12px 16px', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Decision / Status</th>
                    <th style={{ padding: '12px 16px', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Reviewer / Submitter</th>
                    <th style={{ padding: '12px 16px', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Date</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReviewHistory.map(item => {
                    const badgeStyles: Record<string, { label: string; class: string }> = {
                      approved: { label: 'Approved', class: 'badge-verified' },
                      changes_requested: { label: 'Changes Requested', class: 'badge-critical' },
                      in_progress: { label: 'In Review', class: 'badge-expiring' },
                      awaiting_verification: { label: 'Awaiting Sign-off', class: 'badge-expiring' },
                      draft: { label: 'Draft', class: 'badge-neutral' }
                    };
                    const badge = badgeStyles[item.status] || { label: item.status, class: 'badge-neutral' };

                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                        <td style={{ padding: '14px 20px', maxWidth: '280px' }}>
                          <strong style={{ display: 'block', color: 'var(--color-deep-ink)', fontSize: '0.88rem' }}>
                            {item.itemName}
                          </strong>
                          <span style={{ fontSize: '0.74rem', color: 'var(--color-muted-slate)' }}>
                            Project: {item.projectName}
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ fontSize: '0.82rem', color: 'var(--color-deep-ink)' }}>
                            {item.reviewType}
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <span className={`badge ${badge.class}`} style={{ fontSize: '0.68rem' }}>
                            {badge.label}
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px', color: 'var(--color-muted-slate)', fontSize: '0.8rem' }}>
                          {item.reviewerOrAuthor}
                        </td>

                        <td style={{ padding: '14px 16px', fontSize: '0.78rem', color: 'var(--color-muted-slate)', whiteSpace: 'nowrap' }}>
                          {item.date}
                        </td>

                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <Link 
                            to={item.linkUrl}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '4px' }}
                          >
                            <span>Open</span>
                            <ArrowRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          CATEGORY 2: BRAND PASSPORTS
          ========================================================================= */}
      {activeTab === 'passports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search bar */}
          <div className="card-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '380px' }}>
              <Search size={15} color="var(--color-muted-slate)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                value={passportsSearch}
                onChange={(e) => setPassportsSearch(e.target.value)}
                placeholder="Search Brand Passports..."
                style={{ 
                  width: '100%', 
                  padding: '7px 12px 7px 32px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--color-border-gray)', 
                  fontSize: '0.84rem', 
                  backgroundColor: 'var(--color-surface-subtle)',
                  color: 'var(--color-deep-ink)'
                }}
              />
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-muted-slate)' }}>
              Showing {filteredPassports.length} of {passports.length} certified records
            </span>
          </div>

          {/* Passports Table */}
          {filteredPassports.length === 0 ? (
            <div className="card-panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Award size={36} color="var(--color-muted-slate)" style={{ marginBottom: '10px', opacity: 0.7 }} />
              <div style={{ fontWeight: 600, color: 'var(--color-deep-ink)', fontSize: '0.95rem' }}>No Brand Passports found</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)', margin: '6px 0 16px' }}>
                Brand Passports are generated when content is approved and certified against brand rules.
              </p>
            </div>
          ) : (
            <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-surface-subtle)', borderBottom: '1px solid var(--color-border-gray)' }}>
                    <th style={{ padding: '12px 20px', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Passport ID & Title</th>
                    <th style={{ padding: '12px 16px', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Governance Score</th>
                    <th style={{ padding: '12px 16px', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Reviewer</th>
                    <th style={{ padding: '12px 16px', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Date Certified</th>
                    <th style={{ padding: '12px 16px', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Checks Passed</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPassports.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Award size={18} color="var(--color-evidence-teal)" style={{ flexShrink: 0 }} />
                          <div>
                            <strong style={{ display: 'block', color: 'var(--color-deep-ink)', fontSize: '0.88rem' }}>
                              {p.documentTitle}
                            </strong>
                            <span style={{ fontSize: '0.74rem', color: 'var(--color-muted-slate)' }}>
                              Passport ID: {p.id} • Author: {p.author}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span className="badge badge-teal" style={{ fontSize: '0.74rem', fontWeight: 700 }}>
                          {p.governanceScore}/100
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', color: 'var(--color-muted-slate)', fontSize: '0.8rem' }}>
                        {p.reviewer}
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: '0.78rem', color: 'var(--color-muted-slate)', whiteSpace: 'nowrap' }}>
                        {p.approvedAt.slice(0, 10)}
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: 'var(--color-deep-ink)' }}>
                        {p.totalChecks} checks ({p.criticalIssuesResolved + p.warningsResolved} resolved)
                      </td>

                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedPassport(p)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '4px' }}
                        >
                          <Eye size={12} />
                          <span>View Certificate</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          CATEGORY 3: VERSION CHANGES
          ========================================================================= */}
      {activeTab === 'versions' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Document Selector */}
          <div className="card-panel" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', backgroundColor: 'var(--color-surface-subtle)' }}>
            <div>
              <strong style={{ fontSize: '0.9rem', color: 'var(--color-deep-ink)' }}>Select Document to Compare:</strong>
              <span style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)', display: 'block' }}>
                Inspect revisions between original drafts and approved versions.
              </span>
            </div>
            <select 
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              style={{ 
                padding: '6px 12px', 
                borderRadius: 'var(--radius-md)', 
                border: '1px solid var(--color-border-gray)', 
                fontSize: '0.84rem',
                backgroundColor: 'var(--color-surface-white)',
                color: 'var(--color-deep-ink)'
              }}
            >
              {documents.map(d => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>

          {/* Comparison Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
            {/* Left: Original Draft */}
            <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '8px' }}>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--color-error)' }}>ORIGINAL DRAFT (v0.9)</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)', display: 'block' }}>
                    Author: {activeDiffDoc?.author || 'Lead Marketer'}
                  </span>
                </div>
                <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>
                  Issues Detected
                </span>
              </div>

              <div 
                style={{ 
                  padding: '16px', 
                  backgroundColor: 'rgba(241, 107, 80, 0.05)', 
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'monospace',
                  fontSize: '0.84rem',
                  lineHeight: 1.6,
                  color: 'var(--color-deep-ink)',
                  border: '1px solid rgba(241, 107, 80, 0.2)'
                }}
              >
                &quot;BrandGuard Cloud is an enterprise governance platform. Our platform is engineered to deliver{' '}
                <mark style={{ backgroundColor: 'rgba(241, 107, 80, 0.3)', color: 'var(--color-signal-coral)', fontWeight: 700, padding: '2px 4px', borderRadius: '2px' }}>
                  guaranteed 100% uptime
                </mark>{' '}
                across all hybrid cloud deployments with assisted evidence verification while keeping your team in final approval control.&quot;
              </div>

              <div style={{ fontSize: '0.76rem', color: 'var(--color-muted-slate)', lineHeight: 1.45 }}>
                <strong>Flagged finding:</strong> Unqualified absolute SLA guarantee violates Master Customer Agreement standard.
              </div>
            </div>

            {/* Right: Verified & Approved */}
            <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '8px' }}>
                <div>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--color-evidence-teal)' }}>VERIFIED & APPROVED (v1.0)</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)', display: 'block' }}>
                    Reviewer: {activeDiffDoc?.reviewer || 'Senior Reviewer'}
                  </span>
                </div>
                <span className="badge badge-teal" style={{ fontSize: '0.65rem' }}>
                  Passport Certified
                </span>
              </div>

              <div 
                style={{ 
                  padding: '16px', 
                  backgroundColor: 'rgba(22, 124, 120, 0.05)', 
                  borderRadius: 'var(--radius-md)',
                  fontFamily: 'monospace',
                  fontSize: '0.84rem',
                  lineHeight: 1.6,
                  color: 'var(--color-deep-ink)',
                  border: '1px solid rgba(22, 124, 120, 0.2)'
                }}
              >
                &quot;BrandGuard Cloud is an enterprise governance platform. Our platform{' '}
                <mark style={{ backgroundColor: 'rgba(22, 124, 120, 0.25)', color: 'var(--color-evidence-teal)', fontWeight: 700, padding: '2px 4px', borderRadius: '2px' }}>
                  delivers enterprise-grade high availability
                </mark>{' '}
                across hybrid cloud deployments with assisted evidence verification while keeping your team in final approval control.&quot;
              </div>

              <div style={{ fontSize: '0.76rem', color: 'var(--color-muted-slate)', lineHeight: 1.45 }}>
                <strong>Approved correction:</strong> Preferred high availability terminology applied with legal disclaimer reference.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          CATEGORY 4: GUIDELINE HEALTH
          ========================================================================= */}
      {activeTab === 'health' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Summary Metric Counters (derived from real data) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
            <div className="card-panel" style={{ padding: '16px 20px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-muted-slate)', textTransform: 'uppercase', fontWeight: 600 }}>Active Playbooks</span>
              <strong style={{ fontSize: '1.6rem', display: 'block', color: 'var(--color-deep-ink)', margin: '4px 0' }}>
                {guidelines.length}
              </strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-evidence-teal)' }}>All indexed & verified</span>
            </div>

            <div className="card-panel" style={{ padding: '16px 20px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-muted-slate)', textTransform: 'uppercase', fontWeight: 600 }}>Enforced Rules</span>
              <strong style={{ fontSize: '1.6rem', display: 'block', color: 'var(--color-evidence-teal)', margin: '4px 0' }}>
                {rules.filter(r => r.status === 'approved').length}
              </strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>
                {rules.filter(r => r.status === 'proposed').length} proposed rules
              </span>
            </div>

            <div className="card-panel" style={{ padding: '16px 20px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-muted-slate)', textTransform: 'uppercase', fontWeight: 600 }}>Verified Claims</span>
              <strong style={{ fontSize: '1.6rem', display: 'block', color: 'var(--color-evidence-teal)', margin: '4px 0' }}>
                {claims.filter(c => c.status === 'VERIFIED').length}
              </strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>
                {claims.filter(c => c.status === 'EXPIRING_SOON').length} expiring soon
              </span>
            </div>

            <div className="card-panel" style={{ padding: '16px 20px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--color-muted-slate)', textTransform: 'uppercase', fontWeight: 600 }}>Total Projects</span>
              <strong style={{ fontSize: '1.6rem', display: 'block', color: 'var(--color-deep-ink)', margin: '4px 0' }}>
                {projects.length}
              </strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>
                {projects.flatMap(p => p.files).length} reviewed assets
              </span>
            </div>
          </div>

          {/* Rules Health Table */}
          <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border-gray)', backgroundColor: 'var(--color-surface-subtle)' }}>
              <strong style={{ fontSize: '0.96rem', color: 'var(--color-deep-ink)' }}>Rule Performance & Dismissal Health</strong>
              <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--color-muted-slate)' }}>
                Rules with high reviewer dismissals may indicate unclear policy definitions needing refinement.
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-subtle)', borderBottom: '1px solid var(--color-border-gray)' }}>
                  <th style={{ padding: '10px 20px', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Rule Name</th>
                  <th style={{ padding: '10px 16px', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '10px 16px', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Severity</th>
                  <th style={{ padding: '10px 16px', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Reviewer Dismissals</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Health Status</th>
                </tr>
              </thead>
              <tbody>
                {rules.map(rule => {
                  const isHealthy = rule.dismissalCount < 3;
                  return (
                    <tr key={rule.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <td style={{ padding: '12px 20px' }}>
                        <strong style={{ display: 'block', color: 'var(--color-deep-ink)', fontSize: '0.86rem' }}>
                          {rule.title}
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>
                          ID: {rule.id} • {rule.sourceDoc}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--color-deep-ink)', textTransform: 'capitalize' }}>
                        {rule.category.replace('_', ' ')}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span className={`badge ${rule.severity === 'critical' ? 'badge-critical' : rule.severity === 'warning' ? 'badge-expiring' : 'badge-neutral'}`} style={{ fontSize: '0.65rem' }}>
                          {rule.severity}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--color-muted-slate)' }}>
                        {rule.dismissalCount} {rule.dismissalCount === 1 ? 'dismissal' : 'dismissals'}
                      </td>

                      <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                        <span className={`badge ${isHealthy ? 'badge-verified' : 'badge-expiring'}`} style={{ fontSize: '0.68rem' }}>
                          {isHealthy ? 'Healthy' : 'Needs Review'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          CATEGORY 5: CHANGE REQUESTS
          ========================================================================= */}
      {activeTab === 'requests' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Change Requests Table */}
          {changeRequests.length === 0 ? (
            <div className="card-panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <GitPullRequest size={36} color="var(--color-muted-slate)" style={{ marginBottom: '10px', opacity: 0.7 }} />
              <div style={{ fontWeight: 600, color: 'var(--color-deep-ink)', fontSize: '0.95rem' }}>No change requests found</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)', margin: '6px 0 16px' }}>
                No active rule exceptions, new disclaimer proposals, or expiry extension requests.
              </p>
              <button onClick={() => setShowNewRequestModal(true)} className="btn btn-primary btn-sm">
                Submit Change Request
              </button>
            </div>
          ) : (
            <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-surface-subtle)', borderBottom: '1px solid var(--color-border-gray)' }}>
                    <th style={{ padding: '12px 20px', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Request Title</th>
                    <th style={{ padding: '12px 16px', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Request Type</th>
                    <th style={{ padding: '12px 16px', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Requested By</th>
                    <th style={{ padding: '12px 16px', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Priority</th>
                    <th style={{ padding: '12px 16px', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', color: 'var(--color-deep-ink)', fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {changeRequests.map(cr => (
                    <tr key={cr.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <td style={{ padding: '14px 20px', maxWidth: '300px' }}>
                        <strong style={{ display: 'block', color: 'var(--color-deep-ink)', fontSize: '0.88rem' }}>
                          {cr.title}
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>
                          {cr.description}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                          {cr.type}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', color: 'var(--color-muted-slate)', fontSize: '0.8rem' }}>
                        {cr.requestedBy}
                        <span style={{ display: 'block', fontSize: '0.72rem' }}>{cr.submittedAt}</span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge ${cr.priority === 'critical' ? 'badge-critical' : cr.priority === 'high' ? 'badge-expiring' : 'badge-neutral'}`} style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>
                          {cr.priority}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge ${cr.status === 'approved' ? 'badge-teal' : cr.status === 'rejected' ? 'badge-critical' : 'badge-expiring'}`} style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
                          {cr.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        {cr.status === 'pending_review' && isOperations ? (
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button 
                              onClick={() => { updateChangeRequestStatus(cr.id, 'approved'); showToast('Change request approved'); }} 
                              className="btn btn-teal btn-sm" 
                              style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => { updateChangeRequestStatus(cr.id, 'rejected'); showToast('Change request rejected'); }} 
                              className="btn btn-secondary btn-sm" 
                              style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedChangeRequest(cr)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '4px' }}
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODALS & INSPECTOR DRAWERS
          ========================================================================= */}

      {/* Modal: Brand Passport Certificate Inspector */}
      {selectedPassport && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.55)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
          }}
        >
          <div 
            className="card-panel" 
            style={{ 
              maxWidth: '600px', width: '100%', 
              backgroundColor: 'var(--color-surface-white)',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex', flexDirection: 'column', gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={20} color="var(--color-evidence-teal)" />
                <strong style={{ fontSize: '1.05rem', color: 'var(--color-deep-ink)' }}>Brand Passport #{selectedPassport.id}</strong>
              </div>
              <button onClick={() => setSelectedPassport(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted-slate)' }}>
                <X size={18} />
              </button>
            </div>

            <div>
              <strong style={{ fontSize: '1.1rem', color: 'var(--color-deep-ink)', display: 'block' }}>{selectedPassport.documentTitle}</strong>
              <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)' }}>
                Certified on {selectedPassport.approvedAt} by {selectedPassport.reviewer}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-muted-slate)', textTransform: 'uppercase' }}>Governance Score</span>
                <strong style={{ fontSize: '1.5rem', display: 'block', color: 'var(--color-evidence-teal)' }}>
                  {selectedPassport.governanceScore}%
                </strong>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-muted-slate)', textTransform: 'uppercase' }}>Total Checks</span>
                <strong style={{ fontSize: '1.5rem', display: 'block', color: 'var(--color-deep-ink)' }}>
                  {selectedPassport.totalChecks}
                </strong>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--color-muted-slate)', textTransform: 'uppercase' }}>Issues Resolved</span>
                <strong style={{ fontSize: '1.5rem', display: 'block', color: 'var(--color-signal-coral)' }}>
                  {selectedPassport.criticalIssuesResolved + selectedPassport.warningsResolved}
                </strong>
              </div>
            </div>

            <div>
              <strong style={{ fontSize: '0.84rem', color: 'var(--color-deep-ink)', display: 'block', marginBottom: '6px' }}>
                Verified Supporting Evidence:
              </strong>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {selectedPassport.evidenceCitations.map((cite, i) => (
                  <div key={i} style={{ padding: '8px 12px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--color-evidence-teal)', fontSize: '0.8rem' }}>
                    <strong style={{ display: 'block', color: 'var(--color-deep-ink)' }}>&quot;{cite.claim}&quot;</strong>
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>Source: {cite.source} • Owner: {cite.owner}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '10px 12px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.74rem', color: 'var(--color-muted-slate)' }}>
              <strong>AI Disclosure: </strong>{selectedPassport.aiDisclosure}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <Link to="/app/passport" className="btn btn-teal btn-sm" style={{ textDecoration: 'none' }}>
                Full Cryptographic Seal &rarr;
              </Link>
              <button 
                onClick={() => { copyToClipboard(JSON.stringify(selectedPassport, null, 2), 'Passport JSON proof'); }}
                className="btn btn-secondary btn-sm"
              >
                Copy Audit Proof
              </button>
              <button onClick={() => setSelectedPassport(null)} className="btn btn-primary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Change Request Details */}
      {selectedChangeRequest && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.55)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
          }}
        >
          <div 
            className="card-panel" 
            style={{ 
              maxWidth: '500px', width: '100%', 
              backgroundColor: 'var(--color-surface-white)',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex', flexDirection: 'column', gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '12px' }}>
              <strong style={{ fontSize: '1rem', color: 'var(--color-deep-ink)' }}>Change Request Details</strong>
              <button onClick={() => setSelectedChangeRequest(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted-slate)' }}>
                <X size={18} />
              </button>
            </div>

            <div>
              <strong style={{ fontSize: '1.05rem', color: 'var(--color-deep-ink)', display: 'block' }}>{selectedChangeRequest.title}</strong>
              <span style={{ fontSize: '0.76rem', color: 'var(--color-muted-slate)' }}>
                Type: {selectedChangeRequest.type} • Requested by {selectedChangeRequest.requestedBy} ({selectedChangeRequest.submittedAt})
              </span>
            </div>

            <div style={{ padding: '12px', backgroundColor: 'var(--color-surface-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.84rem', color: 'var(--color-deep-ink)', lineHeight: 1.5 }}>
              {selectedChangeRequest.description}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
              <span>Priority: <strong>{selectedChangeRequest.priority}</strong></span>
              <span>Status: <strong>{selectedChangeRequest.status}</strong></span>
            </div>

            {selectedChangeRequest.adminResponse && (
              <div style={{ padding: '10px 12px', backgroundColor: 'var(--color-evidence-teal-subtle)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem', color: 'var(--color-deep-ink)' }}>
                <strong>Admin Decision Note: </strong>{selectedChangeRequest.adminResponse}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setSelectedChangeRequest(null)} className="btn btn-primary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Change Request Form */}
      {showNewRequestModal && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.55)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
          }}
        >
          <div 
            className="card-panel" 
            style={{ 
              maxWidth: '520px', width: '100%', 
              backgroundColor: 'var(--color-surface-white)',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex', flexDirection: 'column', gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <GitPullRequest size={18} color="var(--color-signal-coral)" />
                <strong style={{ fontSize: '1rem', color: 'var(--color-deep-ink)' }}>Submit Change Request</strong>
              </div>
              <button onClick={() => setShowNewRequestModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted-slate)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddRequestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-deep-ink)' }}>
                  Request Title *
                </label>
                <input 
                  type="text" 
                  value={newReqTitle}
                  onChange={(e) => setNewReqTitle(e.target.value)}
                  placeholder="e.g. Exemption request for specialized terminology"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-gray)',
                    fontSize: '0.84rem',
                    backgroundColor: 'var(--color-surface-subtle)',
                    color: 'var(--color-deep-ink)'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-deep-ink)' }}>
                    Request Type
                  </label>
                  <select 
                    value={newReqType}
                    onChange={(e) => setNewReqType(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border-gray)',
                      fontSize: '0.82rem',
                      backgroundColor: 'var(--color-surface-subtle)',
                      color: 'var(--color-deep-ink)'
                    }}
                  >
                    <option value="Rule Exception">Rule Exception</option>
                    <option value="New Disclaimer">New Disclaimer</option>
                    <option value="Claim Expiry Extension">Claim Expiry Extension</option>
                    <option value="Role Elevation">Role Elevation</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-deep-ink)' }}>
                    Priority
                  </label>
                  <select 
                    value={newReqPriority}
                    onChange={(e) => setNewReqPriority(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border-gray)',
                      fontSize: '0.82rem',
                      backgroundColor: 'var(--color-surface-subtle)',
                      color: 'var(--color-deep-ink)'
                    }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-deep-ink)' }}>
                  Reason & Description *
                </label>
                <textarea 
                  value={newReqDescription}
                  onChange={(e) => setNewReqDescription(e.target.value)}
                  placeholder="Describe why this exception or change is needed and include reference details."
                  required
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-gray)',
                    fontSize: '0.84rem',
                    backgroundColor: 'var(--color-surface-subtle)',
                    color: 'var(--color-deep-ink)'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowNewRequestModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
