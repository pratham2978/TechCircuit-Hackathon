import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { 
  FolderKanban, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  PlusCircle, 
  ArrowRight, 
  ShieldCheck, 
  BookOpen, 
  History, 
  FileText, 
  Scale, 
  Tag, 
  Palette, 
  Film,
  Building,
  CheckSquare,
  Sparkles,
  ExternalLink,
  X
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { projects, createProject, accountType } = useDemo();
  const navigate = useNavigate();
  const isOperations = accountType === 'brandguard_operations';

  // Modal State for Create Project
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectClient, setNewProjectClient] = useState('Acme Global Brands');

  // Compute metrics across authorized projects and files
  const visibleProjects = isOperations 
    ? projects 
    : projects.filter(p => p.clientName === 'Acme Global Brands');

  const allFiles = visibleProjects.flatMap(p => p.files);
  const totalProjects = visibleProjects.length;
  const inProgressCount = allFiles.filter(f => f.status === 'in_progress').length;
  const awaitingVerificationCount = allFiles.filter(f => f.status === 'awaiting_verification').length;
  const approvedCount = allFiles.filter(f => f.status === 'approved').length;
  const needingChangesCount = allFiles.filter(f => f.status === 'needs_changes').length;

  // Handle Project Creation
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const created = createProject({
      name: newProjectName.trim(),
      description: newProjectDescription.trim() || 'Marketing and brand compliance review package.',
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 style={{ fontSize: '1.85rem', margin: 0 }}>
              {isOperations ? 'Operations Governance Dashboard' : 'Brand Governance Dashboard'}
            </h1>
            <span className={`badge ${isOperations ? 'badge-teal' : 'badge-verified'}`}>
              {isOperations ? 'BrandGuard Operations' : 'Company Workspace'}
            </span>
          </div>
          <p style={{ color: 'var(--color-muted-slate)', fontSize: '0.92rem', margin: 0 }}>
            {isOperations
              ? 'Triage client project review queues, verify legal & claim compliance, and certify brand assets.'
              : 'Manage project reviews across legal documents, promotion claims, copy, images, and videos.'}
          </p>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary btn-sm"
            style={{ gap: '6px' }}
            data-tour="create-project-btn"
          >
            <PlusCircle size={15} />
            <span>Create Project</span>
          </button>
          <button 
            onClick={() => navigate('/app/projects')}
            className="btn btn-secondary btn-sm"
            style={{ gap: '6px' }}
          >
            <FolderKanban size={15} color="var(--color-evidence-teal)" />
            <span>Open Projects</span>
          </button>
        </div>
      </div>

      {/* 5 Core Metric Cards */}
      <div 
        data-tour="metrics-panel"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px' 
        }}
      >
        {/* Metric 1: Total Projects */}
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-muted-slate)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Projects
            </span>
            <FolderKanban size={15} color="var(--color-deep-ink)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-deep-ink)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, marginBottom: '4px' }}>
            {totalProjects}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
            Active workspace repositories
          </span>
        </div>

        {/* Metric 2: Reviews In Progress */}
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-muted-slate)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              In Progress
            </span>
            <Clock size={15} color="var(--color-evidence-teal)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-evidence-teal)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, marginBottom: '4px' }}>
            {inProgressCount}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
            Assets currently under review
          </span>
        </div>

        {/* Metric 3: Awaiting Verification */}
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-muted-slate)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Awaiting Verification
            </span>
            <CheckSquare size={15} color="var(--color-warning)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-warning)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, marginBottom: '4px' }}>
            {awaitingVerificationCount}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
            {isOperations ? 'Requires reviewer signoff' : 'Pending Operations verification'}
          </span>
        </div>

        {/* Metric 4: Approved Reviews */}
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-muted-slate)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Approved Reviews
            </span>
            <CheckCircle2 size={15} color="var(--color-success)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-success)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, marginBottom: '4px' }}>
            {approvedCount}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
            Cleared for publication
          </span>
        </div>

        {/* Metric 5: Needing Changes */}
        <div className="card-panel">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--color-muted-slate)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Needing Changes
            </span>
            <AlertTriangle size={15} color="var(--color-error)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--color-error)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, marginBottom: '4px' }}>
            {needingChangesCount}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
            Policy or claim revisions flagged
          </span>
        </div>
      </div>

      {/* Main Split: Projects Overview & Review Queues */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '24px' }}>
        {/* Left Column: Projects Table */}
        <div className="card-panel" data-tour="projects-table" style={{ padding: 0, overflow: 'hidden' }}>
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
              <FolderKanban size={18} color="var(--color-signal-coral)" />
              <strong style={{ fontSize: '0.95rem' }}>Active Projects & Review Status</strong>
            </div>
            <Link 
              to="/app/projects" 
              style={{ fontSize: '0.8rem', color: 'var(--color-signal-coral)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <span>View All Projects</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--color-surface-subtle)', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <th style={{ padding: '10px 20px' }}>Project</th>
                  <th style={{ padding: '10px 16px' }}>Files & Tools</th>
                  <th style={{ padding: '10px 16px' }}>Status</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {visibleProjects.map(proj => {
                  const statusBadges: Record<string, { label: string; class: string }> = {
                    active: { label: 'Active', class: 'badge-verified' },
                    in_review: { label: 'In Review', class: 'badge-expiring' },
                    approved: { label: 'Approved', class: 'badge-teal' },
                    archived: { label: 'Archived', class: 'badge-neutral' }
                  };
                  const badge = statusBadges[proj.status] || { label: proj.status, class: 'badge-neutral' };

                  // Count files by review tool
                  const legalCount = proj.files.filter(f => f.reviewType === 'legal').length;
                  const promoCount = proj.files.filter(f => f.reviewType === 'promotions').length;
                  const contentCount = proj.files.filter(f => f.reviewType === 'content').length;
                  const imageCount = proj.files.filter(f => f.reviewType === 'images').length;
                  const videoCount = proj.files.filter(f => f.reviewType === 'videos').length;

                  return (
                    <tr key={proj.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <Link 
                          to={`/app/projects/${proj.id}`}
                          style={{ fontWeight: 600, color: 'var(--color-deep-ink)', textDecoration: 'none', display: 'block', marginBottom: '2px' }}
                        >
                          {proj.name}
                        </Link>
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>
                          {proj.clientName} • Updated {proj.updatedAt}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {legalCount > 0 && (
                            <span className="badge badge-neutral" style={{ fontSize: '0.65rem', gap: '3px' }} title="Legal Documents">
                              <Scale size={11} /> {legalCount}
                            </span>
                          )}
                          {promoCount > 0 && (
                            <span className="badge badge-neutral" style={{ fontSize: '0.65rem', gap: '3px' }} title="Promotions & Claims">
                              <Tag size={11} /> {promoCount}
                            </span>
                          )}
                          {contentCount > 0 && (
                            <span className="badge badge-neutral" style={{ fontSize: '0.65rem', gap: '3px' }} title="Content Articles">
                              <FileText size={11} /> {contentCount}
                            </span>
                          )}
                          {imageCount > 0 && (
                            <span className="badge badge-neutral" style={{ fontSize: '0.65rem', gap: '3px' }} title="Images & Designs">
                              <Palette size={11} /> {imageCount}
                            </span>
                          )}
                          {videoCount > 0 && (
                            <span className="badge badge-neutral" style={{ fontSize: '0.65rem', gap: '3px' }} title="Video Assets">
                              <Film size={11} /> {videoCount}
                            </span>
                          )}
                          {proj.files.length === 0 && (
                            <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>0 files</span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge ${badge.class}`} style={{ fontSize: '0.65rem' }}>
                          {badge.label}
                        </span>
                      </td>

                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <Link 
                          to={`/app/projects/${proj.id}`}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                        >
                          Open Review
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Five Review Tools Gateway & Priorities */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Operations Review Priority Box OR Company Guide */}
          <div className="card-panel" style={{ backgroundColor: 'var(--color-surface-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <ShieldCheck size={18} color="var(--color-evidence-teal)" />
              <strong style={{ fontSize: '0.95rem' }}>
                {isOperations ? 'Operations Review Priority Queue' : 'Five Core Governance Tools'}
              </strong>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-muted-slate)', marginBottom: '16px', lineHeight: 1.5 }}>
              {isOperations
                ? 'Files submitted by client teams awaiting verification sign-off before publication.'
                : 'Every project includes dedicated review tools engineered for specific content formats.'}
            </p>

            {/* List of 5 Core Review Tools with quick explanation */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '10px 12px', 
                  backgroundColor: 'var(--color-surface-white)', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-subtle)'
                }}
              >
                <div style={{ padding: '6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-evidence-teal-subtle)', color: 'var(--color-evidence-teal)' }}>
                  <Scale size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--color-deep-ink)' }}>Legal Document Review</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>Contract clauses, absolute SLA restrictions, disclaimers.</span>
                </div>
              </div>

              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '10px 12px', 
                  backgroundColor: 'var(--color-surface-white)', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-subtle)'
                }}
              >
                <div style={{ padding: '6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-signal-coral-subtle)', color: 'var(--color-signal-coral)' }}>
                  <Tag size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--color-deep-ink)' }}>Promotion & Offer Claim Review</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>Discount percentages & dates checked against ledger facts.</span>
                </div>
              </div>

              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '10px 12px', 
                  backgroundColor: 'var(--color-surface-white)', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-subtle)'
                }}
              >
                <div style={{ padding: '6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-warning-subtle)', color: 'var(--color-warning)' }}>
                  <FileText size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--color-deep-ink)' }}>Content Review</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>Tone, terminology, and 1-click evidence corrections.</span>
                </div>
              </div>

              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '10px 12px', 
                  backgroundColor: 'var(--color-surface-white)', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-subtle)'
                }}
              >
                <div style={{ padding: '6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-evidence-teal-subtle)', color: 'var(--color-evidence-teal)' }}>
                  <Palette size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--color-deep-ink)' }}>Image & Design Review</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>Brand color tokens, WCAG contrast (4.5:1), alt-text check.</span>
                </div>
              </div>

              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px', 
                  padding: '10px 12px', 
                  backgroundColor: 'var(--color-surface-white)', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border-subtle)'
                }}
              >
                <div style={{ padding: '6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-muted-slate)' }}>
                  <Film size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <strong style={{ fontSize: '0.85rem', display: 'block', color: 'var(--color-deep-ink)' }}>Video Review</strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-muted-slate)' }}>Asset organization & manual checklist (automated AI planned).</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Guidelines & Claims Bridge */}
          <div className="card-panel" data-tour="guidelines-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={16} color="var(--color-evidence-teal)" />
                <strong style={{ fontSize: '0.9rem' }}>Guidelines & Approved Claims</strong>
              </div>
              <Link to="/app/guidelines" style={{ fontSize: '0.78rem', color: 'var(--color-signal-coral)', fontWeight: 600 }}>
                Manage →
              </Link>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)', margin: '0 0 12px', lineHeight: 1.4 }}>
              Pre-approved claims, brand color tokens, and mandatory clauses that power all 5 review tools.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Link to="/app/guidelines" className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: '0.75rem', justifyContent: 'center' }}>
                View Claim Ledger
              </Link>
              <Link to="/app/history" className="btn btn-secondary btn-sm" style={{ flex: 1, fontSize: '0.75rem', justifyContent: 'center' }}>
                Brand Passports
              </Link>
            </div>
          </div>
        </div>
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
                <strong style={{ fontSize: '1.1rem' }}>Create New Project</strong>
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
                  Description & Campaign Objective
                </label>
                <textarea 
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  placeholder="Describe the campaign collateral, deliverables, and target audience..."
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
