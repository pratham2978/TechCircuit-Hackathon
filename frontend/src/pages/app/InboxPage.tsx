import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import {
  fetchInboxSubmissions,
  fetchInboxSubmissionDetail,
  updateInboxSubmission,
  convertInboxSubmissionToProject,
  InboxSubmissionItem,
  InboxSummary
} from '../../services/api';
import {
  Inbox,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  User,
  Building,
  Mail,
  Phone,
  Globe,
  Tag,
  ArrowRight,
  Eye,
  Edit3,
  Check,
  RefreshCw,
  FolderPlus,
  Lock,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Paperclip,
  ShieldCheck,
  Layers,
  Calendar
} from 'lucide-react';

export const InboxPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accountType } = useDemo();
  const isOperations = accountType === 'brandguard_operations';

  // Submissions and Summary state
  const [submissions, setSubmissions] = useState<InboxSubmissionItem[]>([]);
  const [summary, setSummary] = useState<InboxSummary>({
    total: 0,
    new: 0,
    in_review: 0,
    awaiting_info: 0,
    converted: 0,
    closed: 0
  });

  // Selected Submission Detail state
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(id || null);
  const [activeSubmission, setActiveSubmission] = useState<InboxSubmissionItem | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [requestTypeFilter, setRequestTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  // Loading & Action states
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Edit notes state
  const [internalNotesText, setInternalNotesText] = useState('');

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // 1. Load submissions list
  const loadSubmissions = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchInboxSubmissions({
        status: statusFilter,
        request_type: requestTypeFilter,
        search: searchQuery,
        sort_by: sortBy
      });
      setSubmissions(data.submissions || []);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err: any) {
      console.warn('Inbox list notice:', err);
      if (err.message && !err.message.toLowerCase().includes('fetch')) {
        setErrorMessage(err.message || 'Unable to retrieve submissions from Operations Inbox.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOperations) {
      loadSubmissions();
    }
  }, [statusFilter, requestTypeFilter, sortBy, accountType]);

  // Handle URL param selection
  useEffect(() => {
    if (id && id !== selectedSubmissionId) {
      setSelectedSubmissionId(id);
    }
  }, [id]);

  // 2. Load detail when a submission is selected
  useEffect(() => {
    if (!selectedSubmissionId) {
      setActiveSubmission(null);
      return;
    }

    const loadDetail = async () => {
      setIsLoadingDetail(true);
      try {
        const detail = await fetchInboxSubmissionDetail(selectedSubmissionId);
        setActiveSubmission(detail);
        setInternalNotesText(detail.internal_notes || '');
      } catch (err: any) {
        setErrorMessage(err.message || `Unable to load submission ${selectedSubmissionId}`);
      } finally {
        setIsLoadingDetail(false);
      }
    };

    loadDetail();
  }, [selectedSubmissionId]);

  // 3. Update Submission Status
  const handleStatusChange = async (newStatus: string) => {
    if (!activeSubmission) return;
    setIsUpdatingStatus(true);
    try {
      await updateInboxSubmission(activeSubmission.id, { status: newStatus });
      showToast(`Status updated to ${newStatus.toUpperCase()}`);
      // Refresh both list and detail
      await loadSubmissions();
      const updated = await fetchInboxSubmissionDetail(activeSubmission.id);
      setActiveSubmission(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // 4. Update Assignee
  const handleAssigneeChange = async (newAssigneeName: string, newAssigneeId: string) => {
    if (!activeSubmission) return;
    try {
      await updateInboxSubmission(activeSubmission.id, {
        assigned_to_name: newAssigneeName,
        assigned_to_id: newAssigneeId
      });
      showToast(`Assigned to ${newAssigneeName}`);
      await loadSubmissions();
      const updated = await fetchInboxSubmissionDetail(activeSubmission.id);
      setActiveSubmission(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to update assignment.');
    }
  };

  // 5. Save Internal Notes
  const handleSaveInternalNotes = async () => {
    if (!activeSubmission) return;
    setIsSavingNotes(true);
    try {
      await updateInboxSubmission(activeSubmission.id, {
        internal_notes: internalNotesText
      });
      showToast('Internal administrator notes saved successfully.');
      const updated = await fetchInboxSubmissionDetail(activeSubmission.id);
      setActiveSubmission(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to save notes.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // 6. Convert to Project
  const handleConvertToProject = async () => {
    if (!activeSubmission) return;
    if (!window.confirm(`Convert inquiry from "${activeSubmission.company_name}" into an active managed project?`)) {
      return;
    }

    setIsConverting(true);
    try {
      const res = await convertInboxSubmissionToProject(activeSubmission.id);
      showToast(res.message);
      await loadSubmissions();
      const updated = await fetchInboxSubmissionDetail(activeSubmission.id);
      setActiveSubmission(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to convert submission to project.');
    } finally {
      setIsConverting(false);
    }
  };

  // Status badge styling helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return {
          label: 'New Inquiry',
          className: 'badge-primary',
          bg: 'rgba(241, 107, 80, 0.1)',
          color: 'var(--color-signal-coral)',
          border: 'var(--color-signal-coral)'
        };
      case 'in_review':
        return {
          label: 'In Review',
          className: 'badge-warning',
          bg: 'rgba(217, 119, 6, 0.1)',
          color: '#d97706',
          border: '#d97706'
        };
      case 'awaiting_info':
        return {
          label: 'Awaiting Info',
          className: 'badge-neutral',
          bg: 'rgba(124, 58, 237, 0.1)',
          color: '#7c3aed',
          border: '#7c3aed'
        };
      case 'converted':
        return {
          label: 'Converted to Project',
          className: 'badge-verified',
          bg: 'rgba(5, 150, 105, 0.1)',
          color: '#059669',
          border: '#059669'
        };
      case 'closed':
        return {
          label: 'Closed',
          className: 'badge-neutral',
          bg: '#f3f4f6',
          color: '#4b5563',
          border: '#9ca3af'
        };
      default:
        return {
          label: status,
          className: 'badge-neutral',
          bg: '#f3f4f6',
          color: '#4b5563',
          border: '#9ca3af'
        };
    }
  };

  // Restrict access for company workspace users
  if (!isOperations) {
    return (
      <div className="card-panel" style={{ padding: '60px', textAlign: 'center', backgroundColor: 'var(--color-surface-white)' }}>
        <Lock size={44} color="var(--color-signal-coral)" style={{ margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Access Restricted</h2>
        <p style={{ color: 'var(--color-muted-slate)', maxWidth: '520px', margin: '0 auto 24px', lineHeight: 1.6 }}>
          The Admin Inbox is an internal Operations console for managing inbound enterprise inquiries and evaluation requests. Your account does not have administrator clearance.
        </p>
        <Link to="/app/dashboard" className="btn btn-primary btn-sm">
          Return to Company Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Inbox size={24} color="var(--color-evidence-teal)" />
            <h1 style={{ fontSize: '1.85rem' }}>Operations Admin Inbox</h1>
          </div>
          <p style={{ color: 'var(--color-muted-slate)', fontSize: '0.9rem' }}>
            Centralized queue for inbound enterprise evaluation requests, sales inquiries, and workflow consultations.
          </p>
        </div>

        <button
          onClick={loadSubmissions}
          className="btn btn-secondary btn-sm"
          style={{ gap: '6px' }}
        >
          <RefreshCw size={14} className={isLoading ? 'spin-animate' : ''} />
          <span>Refresh Inbox</span>
        </button>
      </div>

      {/* Notifications */}
      {successToast && (
        <div 
          style={{ 
            padding: '12px 16px', 
            borderRadius: 'var(--radius-md)', 
            backgroundColor: 'rgba(6, 95, 70, 0.08)',
            color: '#065f46',
            border: '1px solid #059669',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={18} color="#059669" />
          <span>{successToast}</span>
        </div>
      )}

      {errorMessage && (
        <div 
          style={{ 
            padding: '12px 16px', 
            borderRadius: 'var(--radius-md)', 
            backgroundColor: 'rgba(220, 38, 38, 0.08)',
            color: '#991b1b',
            border: '1px solid #dc2626',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertTriangle size={18} color="#dc2626" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Summary KPI Indicators (Derived from database) */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px' 
        }}
      >
        <div className="card-panel" style={{ padding: '20px', backgroundColor: 'var(--color-surface-white)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-muted-slate)', letterSpacing: '0.04em' }}>Total Inquiries</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-deep-ink)', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', marginTop: '6px' }}>
            {summary.total}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)', marginTop: '4px' }}>All captured submissions</div>
        </div>

        <div className="card-panel" style={{ padding: '20px', backgroundColor: 'var(--color-surface-white)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-muted-slate)', letterSpacing: '0.04em' }}>New / Unreviewed</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-signal-coral)', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', marginTop: '6px' }}>
            {summary.new}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)', marginTop: '4px' }}>Awaiting initial triage</div>
        </div>

        <div className="card-panel" style={{ padding: '20px', backgroundColor: 'var(--color-surface-white)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-muted-slate)', letterSpacing: '0.04em' }}>In Review</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-warning)', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', marginTop: '6px' }}>
            {summary.in_review}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)', marginTop: '4px' }}>Active evaluation in progress</div>
        </div>

        <div className="card-panel" style={{ padding: '20px', backgroundColor: 'var(--color-surface-white)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-muted-slate)', letterSpacing: '0.04em' }}>Awaiting Info</div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-evidence-teal)', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', marginTop: '6px' }}>
            {summary.awaiting_info}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)', marginTop: '4px' }}>Pending client specifications</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div 
        className="card-panel"
        style={{ 
          padding: '16px 20px', 
          backgroundColor: 'var(--color-surface-white)',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          flexWrap: 'wrap', 
          gap: '14px' 
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '300px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} color="var(--color-muted-slate)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by contact name, company, email, or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadSubmissions()}
              className="form-control form-control-sm"
              style={{ paddingLeft: '32px', fontSize: '0.84rem' }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-control form-control-sm"
            style={{ width: '150px', fontSize: '0.84rem' }}
          >
            <option value="all">All Statuses</option>
            <option value="new">New ({summary.new})</option>
            <option value="in_review">In Review ({summary.in_review})</option>
            <option value="awaiting_info">Awaiting Info ({summary.awaiting_info})</option>
            <option value="converted">Converted ({summary.converted})</option>
            <option value="closed">Closed ({summary.closed})</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="form-control form-control-sm"
            style={{ width: '140px', fontSize: '0.84rem' }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        <button
          onClick={loadSubmissions}
          className="btn btn-primary btn-sm"
          style={{ gap: '6px' }}
        >
          <Filter size={13} />
          <span>Apply Filters</span>
        </button>
      </div>

      {/* Main Split Interface: List (Left/Main) & Selected Detail (Right/Drawer) */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: activeSubmission ? '1.15fr 0.85fr' : '1fr', 
          gap: '24px',
          alignItems: 'start'
        }}
      >
        {/* Left Panel: Submissions Table */}
        <div className="card-panel" style={{ padding: 0, overflow: 'hidden', backgroundColor: 'var(--color-surface-white)' }}>
          {isLoading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-muted-slate)' }}>
              <Loader2 size={28} className="spin-animate" color="var(--color-evidence-teal)" style={{ margin: '0 auto 12px' }} />
              <div>Loading requests from database...</div>
            </div>
          ) : submissions.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-muted-slate)' }}>
              <Inbox size={36} color="var(--color-muted-slate)" style={{ margin: '0 auto 12px' }} />
              <h4>No Submissions Found</h4>
              <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>
                {searchQuery || statusFilter !== 'all' ? 'Try adjusting your search criteria.' : 'Public request forms will populate this inbox automatically.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--color-warm-ivory)', borderBottom: '1px solid var(--color-border-gray)' }}>
                    <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-deep-ink)' }}>Contact & Company</th>
                    <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-deep-ink)' }}>Request Type</th>
                    <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-deep-ink)' }}>Submitted At</th>
                    <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-deep-ink)' }}>Status</th>
                    <th style={{ padding: '14px 18px', fontWeight: 600, color: 'var(--color-deep-ink)' }}>Assignee</th>
                    <th style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 600, color: 'var(--color-deep-ink)' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => {
                    const isSelected = selectedSubmissionId === sub.id;
                    const badge = getStatusBadge(sub.status || 'new');
                    return (
                      <tr 
                        key={sub.id}
                        onClick={() => {
                          setSelectedSubmissionId(sub.id);
                          navigate(`/app/inbox/${sub.id}`);
                        }}
                        style={{ 
                          borderBottom: '1px solid var(--color-border-subtle)',
                          backgroundColor: isSelected ? 'rgba(22, 124, 120, 0.05)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s'
                        }}
                      >
                        {/* Contact & Company */}
                        <td style={{ padding: '14px 18px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--color-deep-ink)' }}>{sub.contact_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-evidence-teal)' }}>{sub.email}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Building size={11} />
                            <span>{sub.company_name}</span>
                          </div>
                        </td>

                        {/* Request Type */}
                        <td style={{ padding: '14px 18px' }}>
                          <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                            {sub.request_type}
                          </span>
                          {sub.team_size && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)', marginTop: '3px' }}>
                              Scale: {sub.team_size}
                            </div>
                          )}
                        </td>

                        {/* Submitted At */}
                        <td style={{ padding: '14px 18px', fontSize: '0.78rem', color: 'var(--color-muted-slate)', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} />
                            <span>{sub.created_at || 'Recently'}</span>
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--color-muted-slate)' }}>
                            Source: {sub.source_page || 'Website'}
                          </div>
                        </td>

                        {/* Status */}
                        <td style={{ padding: '14px 18px' }}>
                          <span 
                            style={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 700, 
                              padding: '3px 8px', 
                              borderRadius: '4px',
                              backgroundColor: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`
                            }}
                          >
                            {badge.label}
                          </span>
                        </td>

                        {/* Assignee */}
                        <td style={{ padding: '14px 18px', fontSize: '0.78rem' }}>
                          {sub.assigned_to_name ? (
                            <span style={{ color: 'var(--color-deep-ink)' }}>{sub.assigned_to_name}</span>
                          ) : (
                            <span style={{ color: 'var(--color-muted-slate)', fontStyle: 'italic' }}>Unassigned</span>
                          )}
                        </td>

                        {/* Action */}
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSubmissionId(sub.id);
                              navigate(`/app/inbox/${sub.id}`);
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '4px' }}
                          >
                            <Eye size={12} />
                            <span>Inspect</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right Panel: Selected Submission Detail View */}
        {activeSubmission && (
          <div 
            className="card-panel" 
            style={{ 
              backgroundColor: 'var(--color-surface-white)', 
              borderRadius: 'var(--radius-xl)', 
              padding: '24px',
              border: '2px solid var(--color-evidence-teal)',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px'
            }}
          >
            {/* Detail Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border-gray)', paddingBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: 'var(--color-muted-slate)', letterSpacing: '0.05em' }}>
                  Inbound Submission • ID: {activeSubmission.id}
                </div>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--color-deep-ink)', margin: '4px 0 2px' }}>
                  {activeSubmission.contact_name}
                </h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-evidence-teal)', fontWeight: 600 }}>
                  {activeSubmission.company_name}
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedSubmissionId(null);
                  navigate('/app/inbox');
                }}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              >
                Close
              </button>
            </div>

            {/* Quick Status Bar */}
            <div style={{ backgroundColor: 'var(--color-warm-ivory)', padding: '14px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)', display: 'block' }}>Current Status:</span>
                <strong style={{ fontSize: '0.85rem', color: 'var(--color-deep-ink)' }}>{getStatusBadge(activeSubmission.status || 'new').label}</strong>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  disabled={isUpdatingStatus || activeSubmission.status === 'in_review'}
                  onClick={() => handleStatusChange('in_review')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                >
                  Mark In Review
                </button>
                <button
                  type="button"
                  disabled={isUpdatingStatus || activeSubmission.status === 'awaiting_info'}
                  onClick={() => handleStatusChange('awaiting_info')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                >
                  Request Info
                </button>
                <button
                  type="button"
                  disabled={isUpdatingStatus || activeSubmission.status === 'closed'}
                  onClick={() => handleStatusChange('closed')}
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.72rem', padding: '3px 8px', color: '#dc2626' }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Contact & Organization Metadata Grid */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-evidence-teal)', marginBottom: '10px' }}>
                Customer Contact Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '0.82rem' }}>
                <div style={{ padding: '10px', backgroundColor: 'var(--color-warm-ivory)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--color-muted-slate)', display: 'block', fontSize: '0.7rem' }}>Email Address</span>
                  <strong style={{ color: 'var(--color-deep-ink)' }}>{activeSubmission.email}</strong>
                </div>

                {activeSubmission.job_title && (
                  <div style={{ padding: '10px', backgroundColor: 'var(--color-warm-ivory)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ color: 'var(--color-muted-slate)', display: 'block', fontSize: '0.7rem' }}>Job Title / Role</span>
                    <strong style={{ color: 'var(--color-deep-ink)' }}>{activeSubmission.job_title}</strong>
                  </div>
                )}

                {activeSubmission.phone && (
                  <div style={{ padding: '10px', backgroundColor: 'var(--color-warm-ivory)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ color: 'var(--color-muted-slate)', display: 'block', fontSize: '0.7rem' }}>Phone Number</span>
                    <strong style={{ color: 'var(--color-deep-ink)' }}>{activeSubmission.phone}</strong>
                  </div>
                )}

                {activeSubmission.website && (
                  <div style={{ padding: '10px', backgroundColor: 'var(--color-warm-ivory)', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ color: 'var(--color-muted-slate)', display: 'block', fontSize: '0.7rem' }}>Company Website</span>
                    <a href={activeSubmission.website} target="_blank" rel="noreferrer" style={{ color: 'var(--color-evidence-teal)', fontWeight: 600 }}>
                      {activeSubmission.website}
                    </a>
                  </div>
                )}

                <div style={{ padding: '10px', backgroundColor: 'var(--color-warm-ivory)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--color-muted-slate)', display: 'block', fontSize: '0.7rem' }}>Team Size / Scale</span>
                  <strong style={{ color: 'var(--color-deep-ink)' }}>{activeSubmission.team_size || 'Standard'}</strong>
                </div>

                <div style={{ padding: '10px', backgroundColor: 'var(--color-warm-ivory)', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ color: 'var(--color-muted-slate)', display: 'block', fontSize: '0.7rem' }}>Source Page / Form</span>
                  <strong style={{ color: 'var(--color-deep-ink)' }}>{activeSubmission.source_page}</strong>
                </div>
              </div>
            </div>

            {/* Full Untruncated Customer Message */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-evidence-teal)', marginBottom: '8px' }}>
                Full Message & Compliance Requirements
              </div>
              <div 
                style={{ 
                  padding: '16px', 
                  backgroundColor: 'var(--color-warm-ivory)', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-gray)',
                  fontSize: '0.85rem',
                  lineHeight: 1.6,
                  color: 'var(--color-deep-ink)',
                  whiteSpace: 'pre-wrap'
                }}
              >
                {activeSubmission.message}
              </div>
            </div>

            {/* Campaign / Service Interest Details */}
            {(activeSubmission.service_interest || activeSubmission.campaign_details) && (
              <div style={{ fontSize: '0.8rem', padding: '12px', backgroundColor: 'var(--color-warm-ivory)', borderRadius: 'var(--radius-sm)' }}>
                {activeSubmission.service_interest && (
                  <div style={{ marginBottom: '4px' }}>
                    <strong style={{ color: 'var(--color-muted-slate)' }}>Requested Service: </strong>
                    <span style={{ color: 'var(--color-deep-ink)' }}>{activeSubmission.service_interest}</span>
                  </div>
                )}
                {activeSubmission.campaign_details && (
                  <div>
                    <strong style={{ color: 'var(--color-muted-slate)' }}>Campaign Scope: </strong>
                    <span style={{ color: 'var(--color-deep-ink)' }}>{activeSubmission.campaign_details}</span>
                  </div>
                )}
              </div>
            )}

            {/* Attachments Section */}
            {activeSubmission.attachments && activeSubmission.attachments.length > 0 && (
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-evidence-teal)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Paperclip size={14} />
                  <span>Submitted File Attachments ({activeSubmission.attachments.length})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {activeSubmission.attachments.map((att, idx) => (
                    <div 
                      key={idx}
                      style={{ 
                        padding: '8px 12px', 
                        backgroundColor: 'var(--color-warm-ivory)', 
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--color-border-gray)',
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{att.filename}</span>
                      <span style={{ color: 'var(--color-muted-slate)' }}>{(att.size / 1024).toFixed(1)} KB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Operations Reviewer Assignment */}
            <div style={{ borderTop: '1px solid var(--color-border-gray)', paddingTop: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-deep-ink)', marginBottom: '6px' }}>
                Assign to Operations Reviewer:
              </label>
              <select
                value={activeSubmission.assigned_to_name || ''}
                onChange={(e) => handleAssigneeChange(e.target.value, e.target.value === 'Elena Rostova (Operations Reviewer)' ? 'usr-elena' : 'usr-admin')}
                className="form-control form-control-sm"
                style={{ fontSize: '0.82rem' }}
              >
                <option value="">Unassigned</option>
                <option value="Elena Rostova (Operations Reviewer)">Elena Rostova (Operations Reviewer)</option>
                <option value="Operations Administrator">Operations Administrator</option>
              </select>
            </div>

            {/* Internal Admin Notes (Strictly internal) */}
            <div style={{ backgroundColor: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: 'var(--radius-md)', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: '#6B21A8' }}>
                <Lock size={14} />
                <strong style={{ fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  Internal Operations Notes (Confidential)
                </strong>
              </div>
              <p style={{ fontSize: '0.72rem', color: '#7E22CE', margin: '0 0 8px', lineHeight: 1.4 }}>
                Internal notes are restricted to BrandGuard Operations staff and are never exposed in customer-facing views or reports.
              </p>
              <textarea
                rows={3}
                value={internalNotesText}
                onChange={(e) => setInternalNotesText(e.target.value)}
                placeholder="Log internal triage evaluation, compliance observations, or follow-up notes..."
                className="form-control form-control-sm"
                style={{ fontSize: '0.82rem', marginBottom: '8px' }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleSaveInternalNotes}
                  disabled={isSavingNotes}
                  className="btn btn-sm btn-dark"
                  style={{ backgroundColor: '#6B21A8', borderColor: '#6B21A8', fontSize: '0.75rem', gap: '4px' }}
                >
                  {isSavingNotes ? <Loader2 size={12} className="spin-animate" /> : <Check size={12} />}
                  <span>Save Internal Notes</span>
                </button>
              </div>
            </div>

            {/* Conversion to Active Project Action */}
            <div style={{ borderTop: '1px solid var(--color-border-gray)', paddingTop: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                {activeSubmission.converted_project_id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontSize: '0.8rem', fontWeight: 600 }}>
                    <CheckCircle2 size={16} />
                    <span>Converted to Project: {activeSubmission.converted_project_id}</span>
                  </div>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
                    Inquiry ready for formal project onboarding.
                  </span>
                )}
              </div>

              {!activeSubmission.converted_project_id && (
                <button
                  type="button"
                  onClick={handleConvertToProject}
                  disabled={isConverting}
                  className="btn btn-teal btn-sm"
                  style={{ gap: '6px' }}
                >
                  {isConverting ? <Loader2 size={14} className="spin-animate" /> : <FolderPlus size={14} />}
                  <span>Convert to Project</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

