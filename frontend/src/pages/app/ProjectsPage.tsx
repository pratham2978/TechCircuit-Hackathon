import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { Project, ProjectStatus, ReviewToolType } from '../../types';
import { 
  FolderKanban, 
  Search, 
  Filter, 
  PlusCircle, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Folder, 
  FileText, 
  Scale, 
  Tag, 
  Palette, 
  Film, 
  ArrowRight, 
  Archive, 
  Building, 
  User, 
  X,
  Layers,
  ChevronRight
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const { projects, createProject, archiveProject, accountType } = useDemo();
  const navigate = useNavigate();
  const isOperations = accountType === 'brandguard_operations';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProjectStatus>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectClient, setNewProjectClient] = useState('Acme Global Brands');

  // Multi-tenant Company Isolation: Company Workspace users only see Acme Global Brands projects
  const clientFilteredProjects = isOperations 
    ? projects 
    : projects.filter(p => p.clientName === 'Acme Global Brands');

  // Filter projects by search and status
  const filteredProjects = clientFilteredProjects.filter(project => {
    const matchesSearch = 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || project.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const created = createProject({
      name: newProjectName.trim(),
      description: newProjectDescription.trim() || 'Marketing collateral, promotional assets, and compliance documentation.',
      clientName: newProjectClient.trim() || 'Acme Global Brands',
      files: [
        {
          id: `f-${Date.now().toString().slice(-3)}`,
          name: 'Campaign_Brief_Initial.docx',
          type: 'docx',
          reviewType: 'content',
          uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          status: 'not_reviewed',
          size: '1.2 MB',
          findingsCount: 0
        }
      ]
    });

    setShowCreateModal(false);
    setNewProjectName('');
    setNewProjectDescription('');
    navigate(`/app/projects/${created.id}`);
  };

  const getToolIcon = (tool: ReviewToolType) => {
    switch (tool) {
      case 'legal': return <Scale size={13} color="var(--color-evidence-teal)" />;
      case 'promotions': return <Tag size={13} color="var(--color-signal-coral)" />;
      case 'content': return <FileText size={13} color="var(--color-warning)" />;
      case 'images': return <Palette size={13} color="var(--color-evidence-teal)" />;
      case 'videos': return <Film size={13} color="var(--color-muted-slate)" />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '1.85rem', margin: 0 }}>Projects Repository</h1>
            <span className={`badge ${isOperations ? 'badge-teal' : 'badge-verified'}`} style={{ fontSize: '0.75rem' }}>
              {isOperations ? 'Operations Multi-Tenant View' : 'Acme Global Brands Workspace'}
            </span>
            <span className="badge badge-neutral" style={{ fontSize: '0.8rem' }}>
              {clientFilteredProjects.length} Projects
            </span>
          </div>
          <p style={{ color: 'var(--color-muted-slate)', fontSize: '0.92rem', margin: 0 }}>
            Structured folders organizing assets across the five core review tools: Legal, Promotions, Content, Images, and Videos.
          </p>
        </div>

        <button 
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary btn-sm"
          style={{ gap: '6px' }}
        >
          <PlusCircle size={15} />
          <span>New Project</span>
        </button>
      </div>

      {/* Search & Status Filter Bar */}
      <div 
        className="card-panel" 
        style={{ 
          padding: '12px 18px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        {/* Search input */}
        <div style={{ position: 'relative', flex: '1', minWidth: '240px', maxWidth: '420px' }}>
          <Search 
            size={16} 
            color="var(--color-muted-slate)" 
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} 
          />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by name, description, or client..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--color-border-gray)',
              backgroundColor: 'var(--color-surface-subtle)',
              color: 'var(--color-deep-ink)',
              fontSize: '0.85rem'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-muted-slate)'
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
          {(['all', 'active', 'in_review', 'approved', 'archived'] as const).map(status => {
            const labels: Record<string, string> = {
              all: 'All Projects',
              active: 'Active',
              in_review: 'In Review',
              approved: 'Approved',
              archived: 'Archived'
            };
            const isSelected = statusFilter === status;

            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 600 : 500,
                  backgroundColor: isSelected ? 'var(--color-signal-coral)' : 'var(--color-surface-subtle)',
                  color: isSelected ? '#FFFFFF' : 'var(--color-muted-slate)',
                  border: isSelected ? '1px solid var(--color-signal-coral)' : '1px solid var(--color-border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {labels[status]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Projects Grid / List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filteredProjects.length === 0 ? (
          <div className="card-panel" style={{ textAlign: 'center', padding: '48px 24px' }}>
            <Folder size={40} color="var(--color-muted-slate)" style={{ marginBottom: '12px', opacity: 0.5 }} />
            <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>No projects found</h3>
            <p style={{ color: 'var(--color-muted-slate)', fontSize: '0.85rem', marginBottom: '16px' }}>
              {searchQuery ? 'Try clearing your search filters.' : 'Get started by creating your first project.'}
            </p>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-primary btn-sm">
              <PlusCircle size={15} />
              <span>Create Project</span>
            </button>
          </div>
        ) : (
          filteredProjects.map(project => {
            const statusConfig: Record<ProjectStatus, { label: string; class: string }> = {
              active: { label: 'Active', class: 'badge-verified' },
              in_review: { label: 'In Review', class: 'badge-expiring' },
              approved: { label: 'Approved', class: 'badge-teal' },
              archived: { label: 'Archived', class: 'badge-neutral' }
            };
            const status = statusConfig[project.status] || { label: project.status, class: 'badge-neutral' };

            // Group files by review tool
            const filesByTool: Record<ReviewToolType, number> = {
              legal: project.files.filter(f => f.reviewType === 'legal').length,
              promotions: project.files.filter(f => f.reviewType === 'promotions').length,
              content: project.files.filter(f => f.reviewType === 'content').length,
              images: project.files.filter(f => f.reviewType === 'images').length,
              videos: project.files.filter(f => f.reviewType === 'videos').length
            };

            const totalFindings = project.files.reduce((acc, f) => acc + (f.findingsCount || 0), 0);
            const needsChanges = project.files.some(f => f.status === 'needs_changes');

            return (
              <div 
                key={project.id}
                className="card-panel"
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '16px',
                  padding: '20px 24px',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  position: 'relative'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: '1', minWidth: '280px' }}>
                    <div 
                      style={{ 
                        padding: '10px', 
                        borderRadius: 'var(--radius-md)', 
                        backgroundColor: 'var(--color-surface-subtle)',
                        color: 'var(--color-signal-coral)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <FolderKanban size={24} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                        <Link 
                          to={`/app/projects/${project.id}`}
                          style={{ 
                            fontSize: '1.2rem', 
                            fontWeight: 700, 
                            color: 'var(--color-deep-ink)', 
                            textDecoration: 'none' 
                          }}
                        >
                          {project.name}
                        </Link>
                        <span className={`badge ${status.class}`} style={{ fontSize: '0.7rem' }}>
                          {status.label}
                        </span>
                        {needsChanges && (
                          <span className="badge badge-critical" style={{ fontSize: '0.68rem', gap: '4px' }}>
                            <AlertTriangle size={11} /> Revisions Required
                          </span>
                        )}
                      </div>

                      <p style={{ color: 'var(--color-muted-slate)', fontSize: '0.86rem', margin: '0 0 8px', maxWidth: '720px', lineHeight: 1.45 }}>
                        {project.description}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.75rem', color: 'var(--color-muted-slate)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Building size={12} color="var(--color-evidence-teal)" />
                          <strong>Client:</strong> {project.clientName}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={12} />
                          <strong>Lead:</strong> {project.owner}
                        </span>
                        <span>
                          <strong>Updated:</strong> {project.updatedAt}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions right */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button 
                      onClick={() => archiveProject(project.id)}
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '6px 10px', fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}
                      title={project.status === 'archived' ? 'Restore Project' : 'Archive Project'}
                    >
                      <Archive size={14} />
                      <span>{project.status === 'archived' ? 'Restore' : 'Archive'}</span>
                    </button>

                    <Link 
                      to={`/app/projects/${project.id}`}
                      className="btn btn-primary btn-sm"
                      style={{ gap: '6px', fontSize: '0.8rem' }}
                    >
                      <span>Open Workspace</span>
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>

                {/* Bottom Bar: 5 Review Tool Breakdown */}
                <div 
                  style={{ 
                    padding: '10px 14px', 
                    backgroundColor: 'var(--color-surface-subtle)', 
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted-slate)', textTransform: 'uppercase' }}>
                      Review Tools:
                    </span>

                    <span 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '0.78rem',
                        color: filesByTool.legal > 0 ? 'var(--color-deep-ink)' : 'var(--color-muted-slate)',
                        fontWeight: filesByTool.legal > 0 ? 600 : 400
                      }}
                    >
                      <Scale size={13} color="var(--color-evidence-teal)" />
                      <span>Legal ({filesByTool.legal})</span>
                    </span>

                    <span 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '0.78rem',
                        color: filesByTool.promotions > 0 ? 'var(--color-deep-ink)' : 'var(--color-muted-slate)',
                        fontWeight: filesByTool.promotions > 0 ? 600 : 400
                      }}
                    >
                      <Tag size={13} color="var(--color-signal-coral)" />
                      <span>Promotions ({filesByTool.promotions})</span>
                    </span>

                    <span 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '0.78rem',
                        color: filesByTool.content > 0 ? 'var(--color-deep-ink)' : 'var(--color-muted-slate)',
                        fontWeight: filesByTool.content > 0 ? 600 : 400
                      }}
                    >
                      <FileText size={13} color="var(--color-warning)" />
                      <span>Content ({filesByTool.content})</span>
                    </span>

                    <span 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '0.78rem',
                        color: filesByTool.images > 0 ? 'var(--color-deep-ink)' : 'var(--color-muted-slate)',
                        fontWeight: filesByTool.images > 0 ? 600 : 400
                      }}
                    >
                      <Palette size={13} color="var(--color-evidence-teal)" />
                      <span>Images ({filesByTool.images})</span>
                    </span>

                    <span 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        fontSize: '0.78rem',
                        color: filesByTool.videos > 0 ? 'var(--color-deep-ink)' : 'var(--color-muted-slate)',
                        fontWeight: filesByTool.videos > 0 ? 600 : 400
                      }}
                    >
                      <Film size={13} color="var(--color-muted-slate)" />
                      <span>Videos ({filesByTool.videos})</span>
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--color-muted-slate)' }}>
                      Total Assets: <strong>{project.files.length}</strong>
                    </span>
                    {totalFindings > 0 && (
                      <span className="badge badge-critical" style={{ fontSize: '0.65rem' }}>
                        {totalFindings} Findings
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
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
              maxWidth: '520px', 
              width: '100%', 
              backgroundColor: 'var(--color-surface-white)',
              boxShadow: 'var(--shadow-xl)',
              animation: 'slideUp 0.2s ease-out'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderKanban size={18} color="var(--color-signal-coral)" />
                <strong style={{ fontSize: '1.1rem' }}>Create New Project Repository</strong>
              </div>
              <button 
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted-slate)' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Project Name *
                </label>
                <input 
                  type="text" 
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Q4 Global Enterprise Launch"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-gray)',
                    backgroundColor: 'var(--color-surface-subtle)',
                    color: 'var(--color-deep-ink)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Client / Organization Name
                </label>
                <input 
                  type="text" 
                  value={newProjectClient}
                  onChange={(e) => setNewProjectClient(e.target.value)}
                  placeholder="Acme Global Brands"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-gray)',
                    backgroundColor: 'var(--color-surface-subtle)',
                    color: 'var(--color-deep-ink)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Description & Campaign Scope
                </label>
                <textarea 
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Details on deliverables, target audience, and key messaging..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-gray)',
                    backgroundColor: 'var(--color-surface-subtle)',
                    color: 'var(--color-deep-ink)',
                    fontSize: '0.88rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px' }}
                >
                  <PlusCircle size={15} />
                  <span>Create Project</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

