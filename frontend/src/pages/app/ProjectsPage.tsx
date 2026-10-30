import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { Project, ProjectStatus } from '../../types';
import {
  FolderKanban, Search, PlusCircle, FileText,
  Scale, Tag, Palette, Film, Archive,
  Building, User, X, AlertTriangle, ChevronRight
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const { projects, createProject, archiveProject, accountType } = useDemo();
  const navigate = useNavigate();
  const isOperations = accountType === 'brandguard_operations';

  const [searchQuery, setSearchQuery]     = useState('');
  const [statusFilter, setStatusFilter]   = useState<'all' | ProjectStatus>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName]   = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectClient, setNewProjectClient] = useState('Acme Global Brands');

  const clientFiltered = isOperations
    ? projects
    : projects.filter(p => p.clientName === 'Acme Global Brands');

  const filtered = clientFiltered.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.clientName.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const created = createProject({
      name: newProjectName.trim(),
      description: newProjectDescription.trim() || 'Marketing collateral and compliance documentation.',
      clientName: newProjectClient.trim() || 'Acme Global Brands',
      files: [{
        id: `f-${Date.now().toString().slice(-3)}`,
        name: 'Campaign_Brief_Initial.docx',
        type: 'docx', reviewType: 'content',
        uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        status: 'not_reviewed', size: '1.2 MB', findingsCount: 0,
      }],
    });
    setShowCreateModal(false);
    setNewProjectName('');
    setNewProjectDescription('');
    navigate(`/app/projects/${created.id}`);
  };

  const statusBadge: Record<string, { label: string; cls: string }> = {
    active:    { label: 'Active',    cls: 'badge-active' },
    in_review: { label: 'In review', cls: 'badge-warning' },
    approved:  { label: 'Approved',  cls: 'badge-approved' },
    archived:  { label: 'Archived',  cls: 'badge-neutral' },
  };

  const filterTabs: { id: 'all' | ProjectStatus; label: string }[] = [
    { id: 'all',       label: 'All' },
    { id: 'active',    label: 'Active' },
    { id: 'in_review', label: 'In review' },
    { id: 'approved',  label: 'Approved' },
    { id: 'archived',  label: 'Archived' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Projects</h1>
          <p className="page-header-desc">
            <span className="tabular">{clientFiltered.length}</span> project{clientFiltered.length !== 1 ? 's' : ''} ·{' '}
            {isOperations ? 'Multi-tenant view' : 'Acme Global Brands workspace'}
          </p>
        </div>
        <div className="page-header-actions">
          <button id="new-project-btn" onClick={() => setShowCreateModal(true)} className="btn btn-primary btn-sm">
            <PlusCircle size={14} strokeWidth={1.5} />
            <span>New project</span>
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '360px' }}>
          <Search size={14} strokeWidth={1.5} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text"
            className="form-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search projects…"
            style={{ paddingLeft: '32px', paddingRight: searchQuery ? '32px' : undefined }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', padding: '2px' }}>
              <X size={13} strokeWidth={1.5} />
            </button>
          )}
        </div>

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: '4px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', padding: '2px', backgroundColor: 'var(--surface)' }}>
          {filterTabs.map(t => (
            <button
              key={t.id}
              onClick={() => setStatusFilter(t.id)}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13px',
                fontWeight: statusFilter === t.id ? 600 : 400,
                backgroundColor: statusFilter === t.id ? 'var(--surface-hover)' : 'transparent',
                color: statusFilter === t.id ? 'var(--text-primary)' : 'var(--text-muted)',
                border: 'none',
                transition: 'all var(--t-fast)',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Project list */}
      {filtered.length === 0 ? (
        <div className="card-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <FolderKanban size={32} strokeWidth={1.5} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.5 }} />
          <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
            {searchQuery ? 'No projects match your search.' : 'No projects yet.'}
          </p>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary btn-sm">
            <PlusCircle size={14} strokeWidth={1.5} />
            <span>Create project</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(project => {
            const bd = statusBadge[project.status] ?? { label: project.status, cls: 'badge-neutral' };
            const counts = {
              legal:      project.files.filter(f => f.reviewType === 'legal').length,
              promotions: project.files.filter(f => f.reviewType === 'promotions').length,
              content:    project.files.filter(f => f.reviewType === 'content').length,
              images:     project.files.filter(f => f.reviewType === 'images').length,
              videos:     project.files.filter(f => f.reviewType === 'videos').length,
            };
            const totalFindings = project.files.reduce((a, f) => a + (f.findingsCount || 0), 0);
            const needsChanges  = project.files.some(f => f.status === 'needs_changes');

            return (
              <div key={project.id} className="card-panel" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  {/* Left info */}
                  <div style={{ flex: 1, minWidth: '260px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <Link
                        to={`/app/projects/${project.id}`}
                        style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}
                      >
                        {project.name}
                      </Link>
                      <span className={`badge ${bd.cls}`}>{bd.label}</span>
                      {needsChanges && (
                        <span className="badge badge-danger" style={{ gap: '4px' }}>
                          <AlertTriangle size={11} strokeWidth={1.5} />
                          <span>Revisions required</span>
                        </span>
                      )}
                      {totalFindings > 0 && (
                        <span className="badge badge-danger tabular">{totalFindings} findings</span>
                      )}
                    </div>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: 1.4 }}>
                      {project.description}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Building size={12} strokeWidth={1.5} />
                        <span>{project.clientName}</span>
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <User size={12} strokeWidth={1.5} />
                        <span>{project.owner}</span>
                      </span>
                      <span>Updated <span className="tabular">{project.updatedAt}</span></span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <button
                      onClick={() => archiveProject(project.id)}
                      className="btn btn-ghost btn-sm"
                      title={project.status === 'archived' ? 'Restore' : 'Archive'}
                    >
                      <Archive size={13} strokeWidth={1.5} />
                      <span>{project.status === 'archived' ? 'Restore' : 'Archive'}</span>
                    </button>
                    <Link to={`/app/projects/${project.id}`} className="btn btn-secondary btn-sm" style={{ gap: '4px' }}>
                      <span>Open</span>
                      <ChevronRight size={13} strokeWidth={1.5} />
                    </Link>
                  </div>
                </div>

                {/* Review tool breakdown */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap',
                  marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)',
                  fontSize: '12px', color: 'var(--text-muted)',
                }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Tools:</span>
                  {[
                    { icon: <Scale size={12} strokeWidth={1.5} />, label: 'Legal', n: counts.legal },
                    { icon: <Tag size={12} strokeWidth={1.5} />, label: 'Promos', n: counts.promotions },
                    { icon: <FileText size={12} strokeWidth={1.5} />, label: 'Content', n: counts.content },
                    { icon: <Palette size={12} strokeWidth={1.5} />, label: 'Images', n: counts.images },
                    { icon: <Film size={12} strokeWidth={1.5} />, label: 'Videos', n: counts.videos },
                  ].map(t => (
                    <span key={t.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: t.n > 0 ? 500 : 400, color: t.n > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {t.icon}
                      <span>{t.label}</span>
                      <span className="tabular">({t.n})</span>
                    </span>
                  ))}
                  <span className="tabular" style={{ marginLeft: 'auto' }}>
                    {project.files.length} asset{project.files.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-modal)', maxWidth: '480px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Create new project</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ padding: '4px', color: 'var(--text-muted)' }}>
                <X size={16} strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label className="form-label" htmlFor="p-name">Project name <span style={{ color: 'var(--danger)' }}>*</span></label>
                <input id="p-name" type="text" className="form-input" value={newProjectName} onChange={e => setNewProjectName(e.target.value)} placeholder="e.g. Q4 Global Enterprise Launch" required />
              </div>
              <div>
                <label className="form-label" htmlFor="p-client">Client organization</label>
                <input id="p-client" type="text" className="form-input" value={newProjectClient} onChange={e => setNewProjectClient(e.target.value)} placeholder="Acme Global Brands" />
              </div>
              <div>
                <label className="form-label" htmlFor="p-desc">Description</label>
                <textarea id="p-desc" className="form-textarea" value={newProjectDescription} onChange={e => setNewProjectDescription(e.target.value)} placeholder="Deliverables, target audience, key messaging…" rows={3} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">
                  <PlusCircle size={14} strokeWidth={1.5} />
                  <span>Create project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
