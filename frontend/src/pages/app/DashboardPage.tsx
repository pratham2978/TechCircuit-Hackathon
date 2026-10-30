import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import {
  FolderKanban,
  PlusCircle,
  ArrowRight,
  BookOpen,
  FileText,
  Scale,
  Tag,
  Palette,
  Film,
  X,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { projects, createProject, accountType } = useDemo();
  const navigate = useNavigate();
  const isOperations = accountType === 'brandguard_operations';

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectClient, setNewProjectClient] = useState('Acme Global Brands');

  const visibleProjects = isOperations
    ? projects
    : projects.filter(p => p.clientName === 'Acme Global Brands');

  const allFiles = visibleProjects.flatMap(p => p.files);
  const totalProjects           = visibleProjects.length;
  const inProgressCount         = allFiles.filter(f => f.status === 'in_progress').length;
  const awaitingVerificationCount = allFiles.filter(f => f.status === 'awaiting_verification').length;
  const approvedCount           = allFiles.filter(f => f.status === 'approved').length;
  const needingChangesCount     = allFiles.filter(f => f.status === 'needs_changes').length;

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const created = createProject({
      name: newProjectName.trim(),
      description: newProjectDescription.trim() || 'Marketing and brand compliance review package.',
      clientName: newProjectClient.trim() || 'Acme Global Brands',
      files: [{
        id: `f-${Date.now().toString().slice(-3)}`,
        name: 'Campaign_Brief_Initial.docx',
        type: 'docx',
        reviewType: 'content',
        uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        status: 'not_reviewed',
        size: '1.2 MB',
        findingsCount: 0,
      }],
    });
    setShowCreateModal(false);
    setNewProjectName('');
    setNewProjectDescription('');
    navigate(`/app/projects/${created.id}`);
  };

  // Status badge map — sentence case, text on tinted bg
  const statusBadge: Record<string, { label: string; cls: string }> = {
    active:    { label: 'Active',    cls: 'badge-active' },
    in_review: { label: 'In review', cls: 'badge-warning' },
    approved:  { label: 'Approved',  cls: 'badge-approved' },
    archived:  { label: 'Archived',  cls: 'badge-neutral' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* ── Page Header ── */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">
            {isOperations ? 'Operations dashboard' : 'Brand governance dashboard'}
          </h1>
          <p className="page-header-desc">
            {isOperations
              ? 'Triage review queues, verify legal and claim compliance, and certify brand assets.'
              : 'Manage project reviews across legal agreements, promotion claims, copy, images, and videos.'}
          </p>
        </div>
        <div className="page-header-actions">
          {!isOperations && (
            <button
              id="create-project-btn"
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary btn-sm"
            >
              <PlusCircle size={14} strokeWidth={1.5} />
              <span>Create project</span>
            </button>
          )}
          <button
            onClick={() => navigate('/app/projects')}
            className="btn btn-secondary btn-sm"
          >
            <FolderKanban size={14} strokeWidth={1.5} />
            <span>All projects</span>
          </button>
        </div>
      </div>

      {/* ── Stat Cards (5 across desktop -> 2-3 tablet -> 1-2 mobile) ── */}
      <div className="dashboard-stats-grid">
        {/* Total Projects */}
        <div className="stat-card">
          <div className="stat-card-label">Total projects</div>
          <div className="stat-card-value">{totalProjects}</div>
          <div className="stat-card-helper">
            <span className="status-dot status-dot-neutral" />
            Active workspace records
          </div>
        </div>

        {/* In Progress */}
        <div className="stat-card">
          <div className="stat-card-label">In progress</div>
          <div className="stat-card-value">{inProgressCount}</div>
          <div className="stat-card-helper">
            <span className="status-dot status-dot-info" />
            Under active review
          </div>
        </div>

        {/* Awaiting Verification */}
        <div className="stat-card">
          <div className="stat-card-label">Awaiting verification</div>
          <div className="stat-card-value">{awaitingVerificationCount}</div>
          <div className="stat-card-helper">
            <span className="status-dot status-dot-warning" />
            {isOperations ? 'Requires reviewer sign-off' : 'Pending operations sign-off'}
          </div>
        </div>

        {/* Approved */}
        <div className="stat-card">
          <div className="stat-card-label">Approved reviews</div>
          <div className="stat-card-value">{approvedCount}</div>
          <div className="stat-card-helper">
            <span className="status-dot status-dot-success" />
            Cleared for publication
          </div>
        </div>

        {/* Needing Changes */}
        <div className="stat-card">
          <div className="stat-card-label">Needing changes</div>
          <div className="stat-card-value">{needingChangesCount}</div>
          <div className="stat-card-helper">
            <span className="status-dot status-dot-danger" />
            Revisions flagged
          </div>
        </div>
      </div>

      {/* ── Main Two-Column Layout (Stacks under 1024px) ── */}
      <div className="dashboard-two-column-layout">
        
        {/* Left Column: Active Projects Table */}
        <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
          }}>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Active projects
            </h2>
            <Link
              to="/app/projects"
              style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>View all</span>
              <ArrowRight size={13} strokeWidth={1.5} />
            </Link>
          </div>

          {/* Desktop Table View */}
          <div className="desktop-table-container" style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Review tools</th>
                  <th>Status</th>
                  <th className="right">Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleProjects.map(proj => {
                  const bd = statusBadge[proj.status] ?? { label: proj.status, cls: 'badge-neutral' };
                  const legalCount   = proj.files.filter(f => f.reviewType === 'legal').length;
                  const promoCount   = proj.files.filter(f => f.reviewType === 'promotions').length;
                  const contentCount = proj.files.filter(f => f.reviewType === 'content').length;
                  const imageCount   = proj.files.filter(f => f.reviewType === 'images').length;
                  const videoCount   = proj.files.filter(f => f.reviewType === 'videos').length;

                  return (
                    <tr key={proj.id}>
                      <td>
                        <Link
                          to={`/app/projects/${proj.id}`}
                          style={{ fontWeight: 500, color: 'var(--text-primary)', display: 'block', marginBottom: '2px' }}
                        >
                          {proj.name}
                        </Link>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {proj.clientName} · <span className="tabular">{proj.updatedAt}</span>
                        </span>
                      </td>

                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {legalCount > 0 && (
                            <span className="review-tool-chip" title={`${legalCount} Legal document reviews`} aria-label={`${legalCount} Legal documents`}>
                              <Scale size={12} strokeWidth={1.5} />
                              <span>{legalCount}</span>
                            </span>
                          )}
                          {promoCount > 0 && (
                            <span className="review-tool-chip" title={`${promoCount} Promotion & offer claim audits`} aria-label={`${promoCount} Promotions`}>
                              <Tag size={12} strokeWidth={1.5} />
                              <span>{promoCount}</span>
                            </span>
                          )}
                          {contentCount > 0 && (
                            <span className="review-tool-chip" title={`${contentCount} Brand content & manuscript reviews`} aria-label={`${contentCount} Content files`}>
                              <FileText size={12} strokeWidth={1.5} />
                              <span>{contentCount}</span>
                            </span>
                          )}
                          {imageCount > 0 && (
                            <span className="review-tool-chip" title={`${imageCount} Image & design checks`} aria-label={`${imageCount} Images`}>
                              <Palette size={12} strokeWidth={1.5} />
                              <span>{imageCount}</span>
                            </span>
                          )}
                          {videoCount > 0 && (
                            <span className="review-tool-chip" title={`${videoCount} Video compliance checks`} aria-label={`${videoCount} Videos`}>
                              <Film size={12} strokeWidth={1.5} />
                              <span>{videoCount}</span>
                            </span>
                          )}
                          {proj.files.length === 0 && (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No files</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className={`badge ${bd.cls}`}>{bd.label}</span>
                      </td>

                      <td className="right">
                        <Link
                          to={`/app/projects/${proj.id}`}
                          className="btn btn-secondary btn-sm"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {visibleProjects.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px 16px' }}>
                      No projects currently available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View (under 640px) */}
          <div className="mobile-cards-container" style={{ display: 'none', flexDirection: 'column' }}>
            {visibleProjects.map(proj => {
              const bd = statusBadge[proj.status] ?? { label: proj.status, cls: 'badge-neutral' };
              return (
                <div key={proj.id} style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <Link to={`/app/projects/${proj.id}`} style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                        {proj.name}
                      </Link>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {proj.clientName} · <span className="tabular">{proj.updatedAt}</span>
                      </div>
                    </div>
                    <span className={`badge ${bd.cls}`}>{bd.label}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {proj.files.length} {proj.files.length === 1 ? 'asset' : 'assets'}
                    </span>
                    <Link to={`/app/projects/${proj.id}`} className="btn btn-secondary btn-sm">
                      Open
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Review Priority Queue & Quick Links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Review Priority Queue / Tools */}
          <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600 }}>
                {isOperations ? 'Review priority queue' : 'Five review tools'}
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.4 }}>
                {isOperations
                  ? 'Client submissions pending operations sign-off.'
                  : 'Automated compliance checkers configured for your brand.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { icon: <Scale size={14} strokeWidth={1.5} />, label: 'Legal document review', desc: 'SLA guarantees, SCC clauses, disclaimers.' },
                { icon: <Tag size={14} strokeWidth={1.5} />,   label: 'Promotion and offer claims', desc: 'Cross-checked against the approved claims ledger.' },
                { icon: <FileText size={14} strokeWidth={1.5} />, label: 'Brand content review', desc: 'Tone, voice consistency, and approved terminology.' },
                { icon: <Palette size={14} strokeWidth={1.5} />, label: 'Image and design review', desc: 'Color tokens, WCAG 2.1 AA contrast, clear-space.' },
                { icon: <Film size={14} strokeWidth={1.5} />,   label: 'Video review', desc: 'On-screen super titles, audio disclosures, bumpers.' },
              ].map((t, i, arr) => (
                <div key={t.label} style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '10px 16px',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: '2px' }}>{t.icon}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{t.label}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{t.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Guidelines & Passports Box */}
          <div className="card-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <BookOpen size={14} strokeWidth={1.5} color="var(--text-muted)" />
                <span>Guidelines and claims</span>
              </h2>
              <Link to="/app/guidelines" style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 500 }}>
                Manage →
              </Link>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '14px' }}>
              Pre-approved claims, brand tokens, and mandatory clauses that power all 5 review tools.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link to="/app/guidelines" className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                Claims ledger
              </Link>
              <Link to="/app/passport" className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                Brand passports
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Create Project Modal ── */}
      {showCreateModal && (
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
            maxWidth: '480px',
            width: '100%',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px',
              borderBottom: '1px solid var(--border)',
            }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Create new project</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ padding: '4px', borderRadius: 'var(--radius)', color: 'var(--text-muted)' }}
              >
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" htmlFor="proj-name">
                  Project name <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  id="proj-name"
                  type="text"
                  className="form-input"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  placeholder="e.g. Q4 Global Enterprise Launch"
                  required
                />
              </div>

              <div>
                <label className="form-label" htmlFor="proj-client">Client organization</label>
                <input
                  id="proj-client"
                  type="text"
                  className="form-input"
                  value={newProjectClient}
                  onChange={e => setNewProjectClient(e.target.value)}
                  placeholder="Acme Global Brands"
                />
              </div>

              <div>
                <label className="form-label" htmlFor="proj-desc">Description</label>
                <textarea
                  id="proj-desc"
                  className="form-textarea"
                  value={newProjectDescription}
                  onChange={e => setNewProjectDescription(e.target.value)}
                  placeholder="Brief description of project deliverables and audience..."
                  rows={3}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <PlusCircle size={14} strokeWidth={1.5} />
                  <span>Create project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .dashboard-stats-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 12px;
        }
        .dashboard-two-column-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 320px;
          gap: 16px;
          align-items: start;
        }
        @media (max-width: 1024px) {
          .dashboard-stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
          .dashboard-two-column-layout {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 640px) {
          .dashboard-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .desktop-table-container { display: none !important; }
          .mobile-cards-container { display: flex !important; }
        }
        @media (max-width: 420px) {
          .dashboard-stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};
