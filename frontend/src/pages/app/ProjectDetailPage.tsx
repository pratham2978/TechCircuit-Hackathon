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
  ShieldAlert,
  ChevronRight,
  PlusCircle,
  FileCheck2
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
          <ArrowLeft size={14} strokeWidth={1.5} />
          <span>Back to projects</span>
        </button>

        <div className="card-panel" style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <ShieldAlert size={24} strokeWidth={1.5} color="var(--danger)" />
            <h2 style={{ fontSize: '18px', margin: 0, color: 'var(--text-primary)' }}>
              Access denied: Enterprise tenant isolation boundary
            </h2>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: 1.5, margin: '0 0 16px' }}>
            This project belongs to <strong>{project.clientName}</strong>. Your current active session is scoped to <strong>Acme Global Brands</strong>.
            Cross-tenant project data, manuscripts, and audit logs are strictly isolated to protect client confidentiality.
          </p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/app/projects')} className="btn btn-secondary btn-sm">
              Return to Acme Global Brands projects
            </button>
            <button 
              onClick={() => {
                setAccountType('brandguard_operations');
              }} 
              className="btn btn-primary btn-sm"
            >
              Switch to BrandGuard operations
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
          modifiedBy: isOperations ? 'Operations lead' : 'Client author',
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
          ruleReference: 'BRAND-INIT-01: Asset onboarding check',
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
        return <span className="badge badge-approved">Approved</span>;
      case 'awaiting_verification':
        return <span className="badge badge-warning">Awaiting verification</span>;
      case 'in_progress':
        return <span className="badge badge-info">In progress</span>;
      case 'needs_changes':
        return <span className="badge badge-danger">Needs changes</span>;
      case 'rejected':
        return <span className="badge badge-danger">Rejected</span>;
      default:
        return <span className="badge badge-neutral">Not reviewed</span>;
    }
  };

  const tabs = [
    { id: 'overview',   label: 'Overview',                icon: <FolderKanban size={15} strokeWidth={1.5} />, count: project.files.length },
    { id: 'legal',      label: 'Legal documents',         icon: <Scale size={15} strokeWidth={1.5} />,        count: legalFiles.length },
    { id: 'promotions', label: 'Promotions & claims',     icon: <Tag size={15} strokeWidth={1.5} />,          count: promoFiles.length },
    { id: 'content',    label: 'Brand content',           icon: <FileText size={15} strokeWidth={1.5} />,     count: contentFiles.length },
    { id: 'images',     label: 'Images & design',         icon: <Palette size={15} strokeWidth={1.5} />,      count: imageFiles.length },
    { id: 'videos',     label: 'Video assets',            icon: <Film size={15} strokeWidth={1.5} />,         count: videoFiles.length },
    { id: 'history',    label: 'Audit history',           icon: <History size={15} strokeWidth={1.5} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Top Header: Responsive Wrap and Stack */}
      <div className="project-detail-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            onClick={() => navigate('/app/projects')}
            className="btn btn-secondary btn-sm"
            style={{ gap: '6px' }}
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            <span>All projects</span>
          </button>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '22px', margin: 0, fontWeight: 600 }}>{project.name}</h1>
              <span className={`badge ${project.status === 'approved' ? 'badge-approved' : project.status === 'in_review' ? 'badge-warning' : 'badge-active'}`}>
                {project.status === 'in_review' ? 'In review' : project.status === 'approved' ? 'Approved' : 'Active'}
              </span>
            </div>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              {project.clientName} · Owner: {project.owner} · Last updated: <span className="tabular">{project.updatedAt}</span>
            </span>
          </div>
        </div>

        <button 
          onClick={() => setShowAddFileModal(true)}
          className="btn btn-primary btn-sm add-asset-btn"
          style={{ gap: '6px' }}
        >
          <Upload size={14} strokeWidth={1.5} />
          <span>Add asset</span>
        </button>
      </div>

      {/* Underline Tabs with fade edges and scroll */}
      <div className="tabs-scroll-wrapper">
        <div className="tab-underline-container">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`tab-underline-item ${isActive ? 'active' : ''}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="tabular" style={{ 
                    fontSize: '11px', 
                    padding: '1px 6px', 
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isActive ? 'var(--primary-subtle)' : 'var(--surface-hover)',
                    color: isActive ? 'var(--primary)' : 'var(--text-muted)'
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Project Summary Card */}
          <div className="card-panel">
            <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px' }}>Project description</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {project.description || 'Campaign collateral package pending brand verification and multi-department approval.'}
            </p>
          </div>

          {/* Asset Register Table */}
          <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
            }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Registered assets</h2>
              <span className="tabular" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {project.files.length} total files
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset name</th>
                    <th>Tool</th>
                    <th>Status</th>
                    <th>Findings</th>
                    <th className="right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {project.files.map((file) => (
                    <tr key={file.id}>
                      <td>
                        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{file.name}</div>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {file.type.toUpperCase()} · <span className="tabular">{file.size}</span>
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
                          {file.reviewType}
                        </span>
                      </td>
                      <td>{getStatusBadge(file.status)}</td>
                      <td>
                        <span className="tabular" style={{
                          fontSize: '12px',
                          color: file.findingsCount > 0 ? 'var(--danger)' : 'var(--success)',
                          fontWeight: 500
                        }}>
                          {file.findingsCount} {file.findingsCount === 1 ? 'finding' : 'findings'}
                        </span>
                      </td>
                      <td className="right">
                        <button
                          onClick={() => setActiveTab(file.reviewType as any)}
                          className="btn btn-secondary btn-sm"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                  {project.files.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px' }}>
                        No files added yet. Click "Add asset" to begin compliance review.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Review Tools Tabs (Legal, Promotions, Content) */}
      {(activeTab === 'legal' || activeTab === 'promotions' || activeTab === 'content') && (
        <ChatReviewInterface 
          toolType={activeTab}
          projectName={project.name}
          projectId={project.id}
          defaultDocumentName={
            activeTab === 'legal' ? activeLegalFile?.name :
            activeTab === 'promotions' ? activePromoFile?.name :
            activeContentFile?.name
          }
          initialContent={
            activeTab === 'legal' ? activeLegalFile?.currentText :
            activeTab === 'promotions' ? activePromoFile?.currentText :
            activeContentFile?.currentText
          }
        />
      )}

      {/* Images Review Tool */}
      {activeTab === 'images' && (
        <ImageReviewInterface 
          projectName={project.name}
          initialImageName={activeImageFile?.name || 'campaign_banner.png'}
        />
      )}

      {/* Video Review Tool */}
      {activeTab === 'videos' && (
        <VideoReviewInterface 
          projectName={project.name}
          initialVideoName={activeVideoFile?.name || 'launch_spot_30s.mp4'}
        />
      )}

      {/* Audit History Tab */}
      {activeTab === 'history' && (
        <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Project audit history</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Immutable ledger of all version changes, compliance evaluations, and reviewer actions.
            </p>
          </div>

          <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {project.auditLog && project.auditLog.length > 0 ? (
              project.auditLog.map((log: any, idx: number) => (
                <div key={idx} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  paddingBottom: '12px',
                  borderBottom: idx < project.auditLog.length - 1 ? '1px solid var(--border)' : 'none'
                }}>
                  <div style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--primary)',
                    marginTop: '6px',
                    flexShrink: 0
                  }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                      {log.action}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      By {log.actor} · <span className="tabular">{log.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                No recorded audit entries yet.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {showAddFileModal && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '16px',
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            boxShadow: 'var(--shadow-modal)',
            maxWidth: '520px',
            width: '100%',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: '1px solid var(--border)',
            }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Add asset to project</h2>
              <button
                onClick={() => setShowAddFileModal(false)}
                style={{ padding: '4px', borderRadius: 'var(--radius)', color: 'var(--text-muted)' }}
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleAddFile} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" htmlFor="asset-name">
                  Asset name <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  id="asset-name"
                  type="text"
                  className="form-input"
                  value={newFileName}
                  onChange={e => setNewFileName(e.target.value)}
                  placeholder="e.g. Master_Services_Agreement_2026.docx"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label className="form-label" htmlFor="review-tool-type">Review category</label>
                  <select
                    id="review-tool-type"
                    className="form-select"
                    value={newFileReviewType}
                    onChange={e => setNewFileReviewType(e.target.value as ReviewToolType)}
                  >
                    <option value="legal">Legal document</option>
                    <option value="promotions">Promotion & claims</option>
                    <option value="content">Brand content</option>
                    <option value="images">Image & design</option>
                    <option value="videos">Video asset</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" htmlFor="asset-format">File format</label>
                  <select
                    id="asset-format"
                    className="form-select"
                    value={newFileType}
                    onChange={e => setNewFileType(e.target.value as any)}
                  >
                    <option value="docx">DOCX document</option>
                    <option value="pdf">PDF document</option>
                    <option value="txt">Plain text</option>
                    <option value="png">PNG image</option>
                    <option value="jpg">JPEG image</option>
                    <option value="mp4">MP4 video</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="form-label" htmlFor="asset-initial-text">Manuscript or clause draft</label>
                <textarea
                  id="asset-initial-text"
                  className="form-textarea"
                  value={newFileInitialText}
                  onChange={e => setNewFileInitialText(e.target.value)}
                  placeholder="Paste initial text, copy, or contract clauses to audit..."
                  rows={4}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddFileModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <Upload size={14} strokeWidth={1.5} />
                  <span>Onboard asset</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .project-detail-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
        }
        .tabs-scroll-wrapper {
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 640px) {
          .project-detail-header {
            flex-direction: column;
            align-items: stretch;
          }
          .add-asset-btn {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
