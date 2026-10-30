import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { 
  FileText, 
  Plus, 
  Upload, 
  Search, 
  Filter, 
  Layers, 
  Clock, 
  Sparkles,
  Info,
  X,
  FileCode,
  FileImage,
  FileSpreadsheet
} from 'lucide-react';

export const WorkspacePage: React.FC = () => {
  const { documents, createDocument } = useDemo();
  const navigate = useNavigate();

  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showNewModal, setShowNewModal] = useState<boolean>(false);

  // New Draft State with Intent Card
  const [draftTitle, setDraftTitle] = useState('');
  const [draftType, setDraftType] = useState<'plain_text' | 'docx' | 'html' | 'image'>('plain_text');
  const [draftContent, setDraftContent] = useState('');
  const [goal, setGoal] = useState('');
  const [audience, setAudience] = useState('');
  const [keyMessage, setKeyMessage] = useState('');
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTitle.trim()) return;

    const newDoc = createDocument({
      title: draftTitle,
      type: draftType,
      content: draftContent || 'Initial draft manuscript prepared for brand policy review.',
      intentCard: {
        goal: goal || 'Educate audience on core product capability.',
        audience: audience || 'Enterprise decision-makers.',
        keyMessage: keyMessage || 'Verified brand statements.'
      }
    });

    setShowNewModal(false);
    navigate(`/app/review/${newDoc.id}`);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadNotice(`Selected file: "${file.name}" (${(file.size / 1024).toFixed(1)} KB). In Phase 1 frontend demonstration, backend text parsing is pending. You can edit content directly in the manuscript editor.`);
      setDraftTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const filteredDocs = documents.filter(doc => {
    const matchesType = filterType === 'all' || doc.type === filterType;
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          doc.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesStatus && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.85rem', marginBottom: '4px' }}>Content Workspace</h1>
          <p style={{ color: 'var(--color-muted-slate)', fontSize: '0.9rem' }}>
            Draft, attach Intent Cards, and submit marketing assets for multi-vector brand governance.
          </p>
        </div>

        <button 
          onClick={() => setShowNewModal(true)} 
          className="btn btn-primary"
          style={{ gap: '6px' }}
        >
          <Plus size={16} />
          <span>New Content Draft</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div 
        className="card-panel" 
        style={{ 
          padding: '16px 20px', 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '14px', 
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: '240px' }}>
          <Search size={16} color="var(--color-muted-slate)" />
          <input 
            type="text" 
            placeholder="Search manuscripts or authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              border: 'none', 
              background: 'transparent',
              outline: 'none',
              fontSize: '0.9rem'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)}
            style={{ 
              padding: '6px 12px', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--color-border-gray)',
              backgroundColor: 'var(--color-surface-white)',
              fontSize: '0.85rem'
            }}
          >
            <option value="all">All Content Formats</option>
            <option value="plain_text">Plain Text</option>
            <option value="docx">DOCX Manuscript</option>
            <option value="html">HTML Campaign</option>
            <option value="image">Image Display Asset</option>
          </select>

          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ 
              padding: '6px 12px', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--color-border-gray)',
              backgroundColor: 'var(--color-surface-white)',
              fontSize: '0.85rem'
            }}
          >
            <option value="all">All Review Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_review">Pending Review</option>
            <option value="changes_requested">Changes Requested</option>
            <option value="approved">Approved</option>
          </select>
        </div>
      </div>

      {/* Manuscripts Table */}
      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--color-warm-ivory)', borderBottom: '1px solid var(--color-border-gray)' }}>
              <th style={{ padding: '14px 20px', fontWeight: 600 }}>Manuscript Title & Intent</th>
              <th style={{ padding: '14px 20px', fontWeight: 600 }}>Format</th>
              <th style={{ padding: '14px 20px', fontWeight: 600 }}>Author</th>
              <th style={{ padding: '14px 20px', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '14px 20px', fontWeight: 600 }}>Findings</th>
              <th style={{ padding: '14px 20px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.length > 0 ? (
              filteredDocs.map((doc) => {
                const openFindings = doc.findings.filter(f => f.status === 'open').length;
                const statusStyles: Record<string, { label: string; class: string }> = {
                  draft: { label: 'Draft', class: 'badge-neutral' },
                  pending_review: { label: 'Pending Review', class: 'badge-expiring' },
                  changes_requested: { label: 'Changes Req.', class: 'badge-critical' },
                  approved: { label: 'Approved', class: 'badge-verified' }
                };
                const badge = statusStyles[doc.status] || { label: doc.status, class: 'badge-neutral' };

                return (
                  <tr key={doc.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                    <td style={{ padding: '16px 20px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-deep-ink)', marginBottom: '4px' }}>
                        {doc.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)' }}>
                        Goal: {doc.intentCard.goal}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className="badge badge-neutral" style={{ fontSize: '0.7rem' }}>
                        {doc.type.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', fontSize: '0.82rem', color: 'var(--color-deep-ink)' }}>
                      {doc.author}
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      <span className={`badge ${badge.class}`} style={{ fontSize: '0.7rem' }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px' }}>
                      {openFindings > 0 ? (
                        <span style={{ color: 'var(--color-error)', fontWeight: 600, fontSize: '0.85rem' }}>
                          {openFindings} Open
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: '0.85rem' }}>
                          Clear
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <Link 
                        to={`/app/review/${doc.id}`} 
                        className="btn btn-secondary btn-sm"
                      >
                        Open Review
                      </Link>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--color-muted-slate)' }}>
                  No content manuscripts match your filter criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* New Draft Modal with Intent Card */}
      {showNewModal && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(20, 33, 43, 0.6)', 
            backdropFilter: 'blur(4px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 100,
            padding: '20px'
          }}
        >
          <div 
            style={{ 
              backgroundColor: 'var(--color-surface-white)', 
              borderRadius: 'var(--radius-xl)', 
              maxWidth: '680px', 
              width: '100%', 
              padding: '28px',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--color-border-gray)',
              color: 'var(--color-deep-ink)',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '1.3rem' }}>Create Content Draft & Intent Card</h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-muted-slate)' }}>
                  Intent Cards anchor the verification engine against your intended goal and audience.
                </span>
              </div>
              <button 
                onClick={() => setShowNewModal(false)}
                style={{ padding: '6px', borderRadius: '50%' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              {/* Title & Format */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Manuscript Title *
                  </label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Q4 Cloud Security Platform Brief"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    style={{ 
                      width: '100%', 
                      padding: '8px 12px', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px solid var(--color-border-gray)' 
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                    Asset Format
                  </label>
                  <select 
                    value={draftType}
                    onChange={(e) => setDraftType(e.target.value as any)}
                    style={{ 
                      width: '100%', 
                      padding: '8px 12px', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px solid var(--color-border-gray)' 
                    }}
                  >
                    <option value="plain_text">Plain Text</option>
                    <option value="docx">DOCX File</option>
                    <option value="html">HTML Email/Ad</option>
                    <option value="image">Image Ad</option>
                  </select>
                </div>
              </div>

              {/* Upload interface notice for binary formats */}
              {draftType !== 'plain_text' && (
                <div 
                  style={{ 
                    padding: '14px', 
                    backgroundColor: 'var(--color-warm-ivory)', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px dashed var(--color-evidence-teal)',
                    marginBottom: '16px',
                    textAlign: 'center'
                  }}
                >
                  <Upload size={22} color="var(--color-evidence-teal)" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-deep-ink)' }}>
                    Upload {draftType.toUpperCase()} Source File
                  </div>
                  <input 
                    type="file" 
                    onChange={handleFileSelect}
                    style={{ marginTop: '8px', fontSize: '0.75rem' }}
                  />
                  {uploadNotice && (
                    <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--color-muted-slate)', textAlign: 'left' }}>
                      <Info size={12} style={{ display: 'inline', marginRight: '4px' }} />
                      {uploadNotice}
                    </div>
                  )}
                </div>
              )}

              {/* Intent Card Box */}
              <div 
                style={{ 
                  backgroundColor: 'var(--color-warm-ivory)', 
                  border: '1px solid var(--color-border-gray)', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '16px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', fontWeight: 700, fontSize: '0.85rem', color: 'var(--color-evidence-teal)' }}>
                  <Sparkles size={16} />
                  <span>Mandatory Intent Card</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-deep-ink)', marginBottom: '4px' }}>
                      Campaign Goal
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Drive enterprise CIO trial signups for hybrid cloud deployment"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--color-border-gray)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-deep-ink)', marginBottom: '4px' }}>
                      Target Audience
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. Chief Information Officers, Security Directors, VP Cloud Operations"
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--color-border-gray)' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: 'var(--color-deep-ink)', marginBottom: '4px' }}>
                      Core Governed Message
                    </label>
                    <input 
                      type="text"
                      placeholder="e.g. BrandGuard provides 99.99% target uptime with assisted review controls"
                      value={keyMessage}
                      onChange={(e) => setKeyMessage(e.target.value)}
                      style={{ width: '100%', padding: '6px 10px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid var(--color-border-gray)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Manuscript Content */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '6px' }}>
                  Initial Manuscript Text
                </label>
                <textarea 
                  rows={5}
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  placeholder="Paste or write your initial marketing copy here..."
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    borderRadius: 'var(--radius-md)', 
                    border: '1px solid var(--color-border-gray)',
                    fontSize: '0.9rem',
                    lineHeight: 1.6
                  }}
                />
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button 
                  type="button" 
                  onClick={() => setShowNewModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  Initialize Manuscript & Run Checks
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

