import React, { useState, useEffect } from 'react';
import { 
  getVersionHistory, 
  compareVersions, 
  VersionRecordItem, 
  VersionComparisonResult 
} from '../../services/api';
import { 
  X, 
  GitCompare, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Sparkles, 
  User, 
  ArrowRight,
  Layers,
  Eye,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Video as VideoIcon
} from 'lucide-react';

interface VersionComparisonModalProps {
  projectId: string;
  reviewType: string;
  isOpen: boolean;
  onClose: () => void;
  onVersionLoaded?: (versionText: string) => void;
}

export const VersionComparisonModal: React.FC<VersionComparisonModalProps> = ({
  projectId,
  reviewType,
  isOpen,
  onClose,
  onVersionLoaded
}) => {
  const [versions, setVersions] = useState<VersionRecordItem[]>([]);
  const [selectedFromId, setSelectedFromId] = useState<string>('');
  const [selectedToId, setSelectedToId] = useState<string>('');
  const [comparison, setComparison] = useState<VersionComparisonResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load version list
  useEffect(() => {
    if (!isOpen) return;

    setIsLoading(true);
    setErrorMessage(null);

    getVersionHistory(projectId, reviewType)
      .then(vers => {
        setVersions(vers);
        if (vers.length > 0) {
          const v1 = vers[0].id;
          const vLatest = vers[vers.length - 1].id;
          setSelectedFromId(v1);
          setSelectedToId(vLatest);
          return compareVersions(projectId, reviewType, v1, vLatest);
        }
        return null;
      })
      .then(comp => {
        if (comp) setComparison(comp);
      })
      .catch(err => {
        setErrorMessage(err.message || 'Unable to retrieve version history.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isOpen, projectId, reviewType]);

  const handleRunCompare = async (fromId: string, toId: string) => {
    setIsComparing(true);
    setErrorMessage(null);
    try {
      const comp = await compareVersions(projectId, reviewType, fromId, toId);
      setComparison(comp);
    } catch (err: any) {
      setErrorMessage(err.message || 'Comparison failed.');
    } finally {
      setIsComparing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div 
        className="card-panel"
        style={{
          width: '100%',
          maxWidth: '1050px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-surface-white)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-2xl)',
          overflow: 'hidden',
          padding: 0
        }}
      >
        {/* Modal Header */}
        <div 
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--color-border-gray)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--color-surface-subtle)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div 
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(22, 124, 120, 0.1)',
                color: 'var(--color-evidence-teal)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <GitCompare size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--color-deep-ink)' }}>
                Version Comparison & Revision History
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)', margin: 0 }}>
                Compare original baseline (v1.0) against accepted compliance corrections.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px', borderRadius: 'var(--radius-full)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {errorMessage && (
            <div 
              style={{
                padding: '12px 16px',
                backgroundColor: 'rgba(230, 57, 70, 0.1)',
                border: '1px solid var(--color-error)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-error)',
                fontSize: '0.84rem'
              }}
            >
              {errorMessage}
            </div>
          )}

          {/* Version Selector Bar */}
          <div 
            style={{
              padding: '14px 18px',
              backgroundColor: 'var(--color-surface-subtle)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--color-border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted-slate)' }}>Base:</span>
                <select 
                  value={selectedFromId} 
                  onChange={(e) => {
                    setSelectedFromId(e.target.value);
                    handleRunCompare(e.target.value, selectedToId);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border-gray)',
                    fontSize: '0.82rem',
                    backgroundColor: 'var(--color-surface-white)'
                  }}
                >
                  {versions.map(v => (
                    <option key={v.id} value={v.id}>
                      v{v.version_number} ({v.change_source})
                    </option>
                  ))}
                </select>
              </div>

              <ArrowRight size={14} color="var(--color-muted-slate)" />

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-muted-slate)' }}>Compared to:</span>
                <select 
                  value={selectedToId} 
                  onChange={(e) => {
                    setSelectedToId(e.target.value);
                    handleRunCompare(selectedFromId, e.target.value);
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--color-border-gray)',
                    fontSize: '0.82rem',
                    backgroundColor: 'var(--color-surface-white)'
                  }}
                >
                  {versions.map(v => (
                    <option key={v.id} value={v.id}>
                      v{v.version_number} ({v.change_source})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Diff Stats Badge */}
            {comparison && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span 
                  style={{
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(40, 125, 88, 0.12)',
                    color: 'var(--color-success)',
                    fontSize: '0.74rem',
                    fontWeight: 700
                  }}
                >
                  +{comparison.diff.additions_count} additions
                </span>
                <span 
                  style={{
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'rgba(230, 57, 70, 0.12)',
                    color: 'var(--color-error)',
                    fontSize: '0.74rem',
                    fontWeight: 700
                  }}
                >
                  -{comparison.diff.deletions_count} deletions
                </span>
              </div>
            )}
          </div>

          {/* Side-by-Side or Unified Diff Display */}
          {comparison && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Media Comparison Notice if Image or Video */}
              {comparison.media_comparison && comparison.media_comparison.media_type !== 'text' && (
                <div 
                  style={{
                    padding: '12px 16px',
                    backgroundColor: 'var(--color-surface-subtle)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}
                >
                  {comparison.media_comparison.media_type === 'image' ? (
                    <ImageIcon size={18} color="var(--color-evidence-teal)" />
                  ) : (
                    <VideoIcon size={18} color="var(--color-signal-coral)" />
                  )}
                  <span style={{ fontSize: '0.82rem', color: 'var(--color-deep-ink)' }}>
                    {comparison.media_comparison.media_editing_pipeline_note}
                  </span>
                </div>
              )}

              {/* Inline Colored Diff View */}
              <div 
                className="card-panel"
                style={{
                  padding: '18px 20px',
                  backgroundColor: 'var(--color-surface-white)',
                  border: '1px solid var(--color-border-gray)',
                  borderRadius: 'var(--radius-lg)',
                  fontSize: '0.9rem',
                  lineHeight: 1.7,
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  maxHeight: '380px',
                  overflowY: 'auto'
                }}
              >
                {comparison.diff.segments.map((seg, idx) => {
                  if (seg.type === 'added') {
                    return (
                      <span 
                        key={idx}
                        style={{
                          backgroundColor: 'rgba(40, 125, 88, 0.18)',
                          color: '#166534',
                          fontWeight: 600,
                          padding: '1px 3px',
                          borderRadius: '3px',
                          textDecoration: 'none'
                        }}
                      >
                        {seg.text}
                      </span>
                    );
                  }
                  if (seg.type === 'deleted') {
                    return (
                      <span 
                        key={idx}
                        style={{
                          backgroundColor: 'rgba(230, 57, 70, 0.18)',
                          color: '#991B1B',
                          textDecoration: 'line-through',
                          padding: '1px 3px',
                          borderRadius: '3px',
                          opacity: 0.85
                        }}
                      >
                        {seg.text}
                      </span>
                    );
                  }
                  return <span key={idx}>{seg.text}</span>;
                })}
              </div>

              {/* Addressed Findings Strip */}
              {comparison.addressed_findings && comparison.addressed_findings.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-deep-ink)', textTransform: 'uppercase' }}>
                    Addressed Compliance Findings in this Revision:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {comparison.addressed_findings.map((f, i) => (
                      <div 
                        key={i}
                        style={{
                          padding: '8px 12px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'rgba(22, 124, 120, 0.08)',
                          border: '1px solid rgba(22, 124, 120, 0.2)',
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <CheckCircle2 size={13} color="var(--color-evidence-teal)" />
                        <strong>{f.finding_id}:</strong>
                        <span>{f.rule_reference || 'Governance Standard'}</span>
                        <span className="badge badge-verified" style={{ fontSize: '0.62rem', padding: '1px 4px' }}>
                          {f.is_user_edited ? 'User Edited' : 'AI Suggested'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Persistent Version Timeline */}
          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-deep-ink)', textTransform: 'uppercase' }}>
              Full Version History:
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {versions.map(v => (
                <div 
                  key={v.id}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-border-subtle)',
                    backgroundColor: v.status === 'current' ? 'var(--color-surface-subtle)' : 'var(--color-surface-white)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-deep-ink)' }}>v{v.version_number}</span>
                    <span className={`badge ${v.status === 'current' ? 'badge-verified' : 'badge-neutral'}`} style={{ fontSize: '0.65rem' }}>
                      {v.status}
                    </span>
                    <span style={{ color: 'var(--color-muted-slate)' }}>{v.change_summary}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--color-muted-slate)', fontSize: '0.74rem' }}>
                    <span>By: {v.author}</span>
                    <span>{v.created_at}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div 
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--color-border-gray)',
            backgroundColor: 'var(--color-surface-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px'
          }}
        >
          <button 
            type="button" 
            onClick={onClose} 
            className="btn btn-primary btn-sm"
          >
            Close Comparison
          </button>
        </div>
      </div>
    </div>
  );
};

