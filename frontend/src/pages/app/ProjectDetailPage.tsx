import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { ProjectFile, ReviewToolType, ReviewItemStatus } from '../../types';
import { ChatReviewInterface } from '../../components/review/ChatReviewInterface';
import { ImageReviewInterface } from '../../components/review/ImageReviewInterface';
import { VideoReviewInterface } from '../../components/review/VideoReviewInterface';
import { 
  FolderKanban, 
  ArrowLeft, 
  Scale, 
  Tag, 
  FileText, 
  Palette, 
  Film, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Upload, 
  History, 
  X, 
  Building,
  ShieldAlert,
  ChevronRight,
  PlusCircle
} from 'lucide-react';

export const ProjectDetailPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { 
    projects, 
    addFileToProject, 
    acceptFileFinding,
    accountType,
    setAccountType
  } = useDemo();

  const isOperations = accountType === 'brandguard_operations';

  // Find project
  const project = projects.find(p => p.id === projectId) || projects[0];

  // Active tab inside Project Detail
  const [activeTab, setActiveTab] = useState<'overview' | 'legal' | 'promotions' | 'content' | 'images' | 'videos' | 'history'>('overview');

  // Multi-tenant Company Isolation check
  const isUnauthorizedCompany = !isOperations && project && project.clientName !== 'Acme Global Brands';

  // Group files by review tool
  const legalFiles = project ? project.files.filter(f => f.reviewType === 'legal') : [];
  const promoFiles = project ? project.files.filter(f => f.reviewType === 'promotions') : [];
  const contentFiles = project ? project.files.filter(f => f.reviewType === 'content') : [];
  const imageFiles = project ? project.files.filter(f => f.reviewType === 'images') : [];
  const videoFiles = project ? project.files.filter(f => f.reviewType === 'videos') : [];

  // Active files
  const activeLegalFile = legalFiles[0];
  const activePromoFile = promoFiles[0];
  const activeContentFile = contentFiles[0];
  const activeImageFile = imageFiles[0];
  const activeVideoFile = videoFiles[0];

  // Add Asset Modal
  const [showAddFileModal, setShowAddFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileType, setNewFileType] = useState<'docx' | 'pdf' | 'png' | 'jpg' | 'mp4' | 'txt' | 'html'>('docx');
  const [newFileReviewType, setNewFileReviewType] = useState<ReviewToolType>('content');
  const [newFileInitialText, setNewFileInitialText] = useState('');

  // If unauthorized company in Company Workspace
  if (isUnauthorizedCompany) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <button 
          onClick={() => navigate('/app/projects')}
          className="btn btn-secondary btn-sm"
          style={{ width: 'fit-content', gap: '6px' }}
        >
          <ArrowLeft size={14} />
          <span>Back to Projects</span>
        </button>

        <div className="card-panel" style={{ border: '1px solid rgba(198, 61, 79, 0.3)', padding: '28px', backgroundColor: 'var(--color-surface-white)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <ShieldAlert size={28} color="var(--color-error)" />
            <h2 style={{ fontSize: '1.35rem', margin: 0, color: 'var(--color-deep-ink)' }}>
              Access Denied: Enterprise Company Isolation Boundary
            </h2>
          </div>
          <p style={{ color: 'var(--color-muted-slate)', fontSize: '0.92rem', lineHeight: 1.5, margin: '0 0 16px' }}>
            This project belongs to <strong>{project.clientName}</strong>. Your current active session is scoped to <strong>Acme Global Brands</strong>.
            Cross-tenant project data, manuscripts, and audit logs are strictly isolated to protect client confidentiality.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/app/projects')} className="btn btn-secondary btn-sm">
              Return to Acme Global Brands Projects
            </button>
            <button 
              onClick={() => {
                setAccountType('brandguard_operations');
              }} 
              className="btn btn-teal btn-sm"
            >
              Switch to BrandGuard Operations (Multi-Tenant Team)
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleAddFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;

    const sampleContent = newFileInitialText.trim() || `Draft content for ${newFileName}. Ready for AI compliance verification.`;

    addFileToProject(project.id, {
      name: newFileName.trim(),
      type: newFileType,
      reviewType: newFileReviewType,
      status: 'not_reviewed',
      size: '1.2 MB',
      version: '1.0',
      originalText: sampleContent,
      currentText: sampleContent,
      versionHistory: [
        {
          version: '1.0',
          text: sampleContent,
          modifiedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          modifiedBy: isOperations ? 'Operations Lead' : 'Client Submitter',
          findingsCount: 1
        }
      ],
      findings: [
        {
          id: `fnd-${Date.now().toString().slice(-4)}`,
          category: 'brand_rules',
          severity: 'advisory',
          textSpan: 'Draft content',
          explanation: 'Initial verification check recommended before submitting for sign-off.',
          ruleReference: 'BRAND-INIT-01: Asset Onboarding Check',
          suggestedCorrection: 'Approved brand content',
          status: 'open'
        }
      ],
      findingsCount: 1
    });

    setShowAddFileModal(false);
    setNewFileName('');
    setNewFileInitialText('');
    setActiveTab(newFileReviewType);
  };

  const getStatusBadge = (status: ReviewItemStatus) => {
    switch (status) {
      case 'approved':
        return <span className="badge badge-teal" style={{ fontSize: '0.68rem' }}>Approved</span>;
      case 'awaiting_verification':
        return <span className="badge badge-expiring" style={{ fontSize: '0.68rem' }}>Awaiting Verification</span>;
      case 'in_progress':
        return <span className="badge badge-verified" style={{ fontSize: '0.68rem' }}>In Progress</span>;
      case 'needs_changes':
        return <span className="badge badge-critical" style={{ fontSize: '0.68rem' }}>Needs Changes</span>;
      case 'rejected':
        return <span className="badge badge-critical" style={{ fontSize: '0.68rem' }}>Rejected</span>;
      default:
        return <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>Not Reviewed</span>;
    }
  };

  // Aggregate project audit events
  const projectHistory = [
    ...(project.auditLog || []),
    ...project.files.flatMap(f => (f.history || []).map(h => ({
      ...h,
      assetName: f.name
    })))
  ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => navigate('/app/projects')}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px', gap: '6px' }}
          >
            <ArrowLeft size={14} />
            <span>All Projects</span>
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.65rem', margin: 0 }}>{project.name}</h1>
              <span className={`badge ${project.status === 'approved' ? 'badge-teal' : project.status === 'in_review' ? 'badge-expiring' : 'badge-verified'}`}>
                {project.status.toUpperCase()}
              </span>
            </div>
            <span style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)' }}>
              {project.clientName} • Owner: {project.owner} • Last activity: {project.updatedAt}
            </span>
          </div>
        </div>

        <button 
          onClick={() => setShowAddFileModal(true)}
          className="btn btn-primary btn-sm"
          style={{ gap: '6px' }}
        >
          <Upload size={14} />
          <span>Add Asset</span>
        </button>
      </div>

      {/* Main Tab Navigation: Overview + The 5 Core Review Tools + History */}
      <div 
        style={{ 
          display: 'flex', 
          borderBottom: '2px solid var(--color-border-subtle)', 
          gap: '8px',
          overflowX: 'auto',
          paddingBottom: '2px'
        }}
      >
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '10px 16px',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'overview' ? 700 : 500,
            color: activeTab === 'overview' ? 'var(--color-signal-coral)' : 'var(--color-muted-slate)',
            borderBottom: activeTab === 'overview' ? '3px solid var(--color-signal-coral)' : '3px solid transparent',
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
          <FolderKanban size={16} />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('legal')}
          style={{
            padding: '10px 16px',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'legal' ? 700 : 500,
            color: activeTab === 'legal' ? 'var(--color-signal-coral)' : 'var(--color-muted-slate)',
            borderBottom: activeTab === 'legal' ? '3px solid var(--color-signal-coral)' : '3px solid transparent',
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
          <Scale size={16} />
          <span>Legal Document Review</span>
        </button>

        <button
          onClick={() => setActiveTab('promotions')}
          style={{
            padding: '10px 16px',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'promotions' ? 700 : 500,
            color: activeTab === 'promotions' ? 'var(--color-signal-coral)' : 'var(--color-muted-slate)',
            borderBottom: activeTab === 'promotions' ? '3px solid var(--color-signal-coral)' : '3px solid transparent',
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
          <Tag size={16} />
          <span>Promotion & Offer Claims</span>
        </button>

        <button
          onClick={() => setActiveTab('content')}
          style={{
            padding: '10px 16px',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'content' ? 700 : 500,
            color: activeTab === 'content' ? 'var(--color-signal-coral)' : 'var(--color-muted-slate)',
            borderBottom: activeTab === 'content' ? '3px solid var(--color-signal-coral)' : '3px solid transparent',
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
          <span>Content Review</span>
        </button>

        <button
          onClick={() => setActiveTab('images')}
          style={{
            padding: '10px 16px',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'images' ? 700 : 500,
            color: activeTab === 'images' ? 'var(--color-signal-coral)' : 'var(--color-muted-slate)',
            borderBottom: activeTab === 'images' ? '3px solid var(--color-signal-coral)' : '3px solid transparent',
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
          <Palette size={16} />
          <span>Image & Design Review</span>
        </button>

        <button
          onClick={() => setActiveTab('videos')}
          style={{
            padding: '10px 16px',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'videos' ? 700 : 500,
            color: activeTab === 'videos' ? 'var(--color-signal-coral)' : 'var(--color-muted-slate)',
            borderBottom: activeTab === 'videos' ? '3px solid var(--color-signal-coral)' : '3px solid transparent',
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
          <Film size={16} />
          <span>Video Review</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          style={{
            padding: '10px 16px',
            fontSize: '0.85rem',
            fontWeight: activeTab === 'history' ? 700 : 500,
            color: activeTab === 'history' ? 'var(--color-signal-coral)' : 'var(--color-muted-slate)',
            borderBottom: activeTab === 'history' ? '3px solid var(--color-signal-coral)' : '3px solid transparent',
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
          <span>Audit Log ({projectHistory.length})</span>
        </button>
      </div>

      {/* TAB CONTENT 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Files Table for this project */}
          <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div 
              style={{ 
                padding: '16px 20px', 
                backgroundColor: 'var(--color-surface-subtle)', 
                borderBottom: '1px solid var(--color-border-gray)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <strong style={{ fontSize: '0.95rem' }}>Project Assets & Verification Status ({project.files.length})</strong>
              <button 
                onClick={() => setShowAddFileModal(true)}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', gap: '4px' }}
              >
                <PlusCircle size={13} />
                <span>Add Asset</span>
              </button>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-subtle)', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <th style={{ padding: '10px 20px' }}>File Name</th>
                  <th style={{ padding: '10px 16px' }}>Version</th>
                  <th style={{ padding: '10px 16px' }}>Review Tool</th>
                  <th style={{ padding: '10px 16px' }}>Status</th>
                  <th style={{ padding: '10px 16px' }}>Issues</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {project.files.map(file => (
                  <tr key={file.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <strong style={{ display: 'block', color: 'var(--color-deep-ink)' }}>{file.name}</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>
                        {file.size} • Uploaded {file.uploadedAt}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                        v{file.version || '1.0'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '0.72rem', textTransform: 'capitalize' }}>
                        {file.reviewType}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      {getStatusBadge(file.status)}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      {file.findingsCount > 0 ? (
                        <span className="badge badge-critical" style={{ fontSize: '0.68rem' }}>
                          {file.findingsCount} Issues
                        </span>
                      ) : (
                        <span className="badge badge-teal" style={{ fontSize: '0.68rem' }}>
                          0 Issues
                        </span>
                      )}
                    </td>

                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                      <button 
                        onClick={() => setActiveTab(file.reviewType)}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '4px 10px', gap: '4px' }}
                      >
                        <span>Open Tool</span>
                        <ChevronRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: LEGAL DOCUMENT REVIEW (Chat Interface) */}
      {activeTab === 'legal' && (
        <ChatReviewInterface 
          toolType="legal"
          projectName={project.name}
          projectId={project.id}
          defaultDocumentName={activeLegalFile?.name || 'Master_Enterprise_Legal_Terms.docx'}
          initialContent={activeLegalFile?.currentText || activeLegalFile?.originalText}
          initialFindings={activeLegalFile?.findings as any}
          onApplyCorrection={(id, corr) => {
            if (activeLegalFile) acceptFileFinding(project.id, activeLegalFile.id, id);
          }}
        />
      )}

      {/* TAB CONTENT 3: PROMOTION & OFFER CLAIMS (Chat Interface) */}
      {activeTab === 'promotions' && (
        <ChatReviewInterface 
          toolType="promotions"
          projectName={project.name}
          projectId={project.id}
          defaultDocumentName={activePromoFile?.name || 'Promotional_Discount_Terms_Addendum.pdf'}
          initialContent={activePromoFile?.currentText || activePromoFile?.originalText}
          initialFindings={activePromoFile?.findings as any}
          onApplyCorrection={(id, corr) => {
            if (activePromoFile) acceptFileFinding(project.id, activePromoFile.id, id);
          }}
        />
      )}

      {/* TAB CONTENT 4: CONTENT REVIEW (Chat Interface) */}
      {activeTab === 'content' && (
        <ChatReviewInterface 
          toolType="content"
          projectName={project.name}
          projectId={project.id}
          defaultDocumentName={activeContentFile?.name || 'Summer_Sale_Promotional_Brief.docx'}
          initialContent={activeContentFile?.currentText || activeContentFile?.originalText}
          initialFindings={activeContentFile?.findings as any}
          onApplyCorrection={(id, corr) => {
            if (activeContentFile) acceptFileFinding(project.id, activeContentFile.id, id);
          }}
        />
      )}

      {/* TAB CONTENT 5: IMAGE & DESIGN REVIEW (Visual Media Upload) */}
      {activeTab === 'images' && (
        <ImageReviewInterface 
          projectName={project.name}
          projectId={project.id}
          defaultImageName={activeImageFile?.name || 'Campaign_Hero_Banner_1200x630.png'}
        />
      )}

      {/* TAB CONTENT 6: VIDEO REVIEW (Visual Media Upload) */}
      {activeTab === 'videos' && (
        <VideoReviewInterface 
          projectName={project.name}
          projectId={project.id}
          defaultVideoName={activeVideoFile?.name || 'Summer_Promotion_Teaser_30s.mp4'}
        />
      )}

      {/* TAB CONTENT 7: AUDIT LOG */}
      {activeTab === 'history' && (
        <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div 
            style={{ 
              padding: '16px 20px', 
              backgroundColor: 'var(--color-surface-subtle)', 
              borderBottom: '1px solid var(--color-border-gray)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <History size={18} color="var(--color-evidence-teal)" />
              <strong style={{ fontSize: '0.95rem' }}>Project Audit & Review Decision Trail ({projectHistory.length})</strong>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
              Tamper-evident log of changes, revisions, and human decisions
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--color-surface-subtle)', borderBottom: '1px solid var(--color-border-subtle)' }}>
                <th style={{ padding: '10px 20px' }}>Timestamp</th>
                <th style={{ padding: '10px 16px' }}>Actor & Role</th>
                <th style={{ padding: '10px 16px' }}>Action</th>
                <th style={{ padding: '10px 20px' }}>Audit Details</th>
              </tr>
            </thead>
            <tbody>
              {projectHistory.map((entry: any, index) => (
                <tr key={entry.id || index} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <td style={{ padding: '12px 20px', color: 'var(--color-muted-slate)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                    {entry.timestamp}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <strong>{entry.actor}</strong>{' '}
                    <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>({entry.role})</span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
                      {entry.action}
                    </span>
                  </td>
                  <td style={{ padding: '12px 20px', color: 'var(--color-deep-ink)' }}>
                    {entry.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add File to Project */}
      {showAddFileModal && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.55)', 
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
              maxWidth: '480px', 
              width: '100%', 
              backgroundColor: 'var(--color-surface-white)',
              boxShadow: 'var(--shadow-xl)',
              animation: 'slideUp 0.2s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={18} color="var(--color-signal-coral)" />
                <strong style={{ fontSize: '1.05rem' }}>Add Asset to Project</strong>
              </div>
              <button 
                onClick={() => setShowAddFileModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted-slate)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddFile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Target Review Tool *
                </label>
                <select 
                  value={newFileReviewType}
                  onChange={(e) => setNewFileReviewType(e.target.value as ReviewToolType)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-gray)',
                    backgroundColor: 'var(--color-surface-subtle)',
                    color: 'var(--color-deep-ink)',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="legal">Legal Document Review (chat & doc upload)</option>
                  <option value="promotions">Promotion & Offer Claim Review (chat & doc upload)</option>
                  <option value="content">Content Review (chat & doc upload)</option>
                  <option value="images">Image & Design Review (image upload & preview)</option>
                  <option value="videos">Video Review (video upload & preview)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  File Name *
                </label>
                <input 
                  type="text" 
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  placeholder="e.g. Master_Agreement_Addendum.docx"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-gray)',
                    backgroundColor: 'var(--color-surface-subtle)',
                    color: 'var(--color-deep-ink)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                  Format
                </label>
                <select 
                  value={newFileType}
                  onChange={(e) => setNewFileType(e.target.value as any)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-gray)',
                    backgroundColor: 'var(--color-surface-subtle)',
                    color: 'var(--color-deep-ink)',
                    fontSize: '0.85rem'
                  }}
                >
                  <option value="docx">Microsoft Word (.docx)</option>
                  <option value="pdf">Adobe PDF (.pdf)</option>
                  <option value="png">PNG Image (.png)</option>
                  <option value="jpg">JPEG Image (.jpg)</option>
                  <option value="mp4">MPEG-4 Video (.mp4)</option>
                  <option value="html">HTML Manuscript (.html)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddFileModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px' }}
                >
                  <Upload size={14} />
                  <span>Attach to Project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
