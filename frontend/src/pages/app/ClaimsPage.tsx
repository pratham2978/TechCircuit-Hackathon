import React, { useState, useEffect } from 'react';
import { useDemo } from '../../context/DemoContext';
import { ClaimRecord, ClaimStatus } from '../../types';
import { getClaims, createClaim } from '../../services/api';
import { 
  Database, 
  Search, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  X,
  Info,
  ShieldCheck,
  FileText,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

export const ClaimsPage: React.FC = () => {
  const { claims: demoClaims, addClaim, accountType } = useDemo();

  const [claimsList, setClaimsList] = useState<ClaimRecord[]>(demoClaims);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<ClaimRecord | null>(null);

  // New Claim Form State
  const [claimText, setClaimText] = useState('');
  const [sourceDoc, setSourceDoc] = useState('');
  const [sourcePage, setSourcePage] = useState(1);
  const [owner, setOwner] = useState('');
  const [validFrom, setValidFrom] = useState('2026-01-01');
  const [validTo, setValidTo] = useState('2026-12-31');
  const [status, setStatus] = useState<ClaimStatus>('VERIFIED');
  const [contextNotes, setContextNotes] = useState('');

  const isOperations = accountType === 'brandguard_operations';

  const loadClaimsFromBackend = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const backendClaims = await getClaims('acme-global-brands');
      if (backendClaims && backendClaims.length > 0) {
        const mapped: ClaimRecord[] = backendClaims.map(c => ({
          id: c.id,
          claimText: c.claim_text,
          sourceDoc: c.source_doc,
          sourcePage: c.source_page || 1,
          owner: c.owner,
          validFrom: c.valid_from,
          validTo: c.valid_to,
          status: c.status as ClaimStatus,
          contextNotes: c.context_notes || ''
        }));
        setClaimsList(mapped);
      } else {
        setClaimsList(demoClaims);
      }
    } catch (err: any) {
      setErrorMessage('Backend sync unavailable; operating from cached ledger.');
      setClaimsList(demoClaims);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadClaimsFromBackend();
  }, []);

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimText.trim()) return;

    setIsSaving(true);
    try {
      await createClaim({
        company_id: 'acme-global-brands',
        claim_text: claimText.trim(),
        source_doc: sourceDoc || 'Corporate Benchmarking Report 2026',
        source_page: Number(sourcePage) || 1,
        owner: owner || 'VP Product Governance',
        valid_from: validFrom,
        valid_to: validTo,
        status,
        context_notes: contextNotes || 'Verified under standard corporate auditing guidelines.'
      });

      addClaim({
        claimText: claimText.trim(),
        sourceDoc: sourceDoc || 'Corporate Benchmarking Report 2026',
        sourcePage: Number(sourcePage) || 1,
        owner: owner || 'VP Product Governance',
        validFrom,
        validTo,
        status,
        contextNotes: contextNotes || 'Verified under standard corporate auditing guidelines.'
      });

      await loadClaimsFromBackend();
      setShowAddModal(false);
      setClaimText('');
      setSourceDoc('');
      setOwner('');
      setContextNotes('');
    } catch (err: any) {
      setErrorMessage(`Failed to save claim: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const filteredClaims = claimsList.filter(c => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesSearch = c.claimText.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.sourceDoc.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const verifiedCount = claimsList.filter(c => c.status === 'VERIFIED').length;
  const expiringCount = claimsList.filter(c => c.status === 'EXPIRING_SOON').length;
  const needsVerificationCount = claimsList.filter(c => c.status === 'NEEDS_VERIFICATION' || c.status === 'EXPIRED').length;

  const getStatusBadge = (status: ClaimStatus) => {
    switch (status) {
      case 'VERIFIED':
        return <span className="badge badge-success">VERIFIED</span>;
      case 'EXPIRING_SOON':
        return <span className="badge badge-warning">EXPIRING SOON</span>;
      case 'EXPIRED':
        return <span className="badge badge-danger">EXPIRED</span>;
      case 'NEEDS_VERIFICATION':
        return <span className="badge badge-neutral">NEEDS VERIFICATION</span>;
      default:
        return <span className="badge badge-neutral">{status}</span>;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '1.75rem' }}>Approved Claim Ledger</h1>
            <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>
              {isOperations ? 'Operations Curation' : 'Company Read-Only'}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Enterprise registry of verified factual statements, authoritative citations, owners, and expiration dates.
          </p>
        </div>

        {isOperations ? (
          <button 
            onClick={() => setShowAddModal(true)} 
            className="btn btn-primary"
            style={{ gap: '6px' }}
          >
            <Plus size={16} />
            <span>Add Verified Claim</span>
          </button>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', backgroundColor: 'var(--surface-subtle)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            Read-only client view • Curation by BrandGuard Operations
          </div>
        )}
      </div>

      {/* Overview Stat Strip */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px' 
        }}
      >
        <div className="card-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'none' }}>Total Claims</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>{claimsList.length}</div>
          </div>
          <Database size={24} color="var(--info)" />
        </div>

        <div className="card-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'none' }}>Verified & Active</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>{verifiedCount}</div>
          </div>
          <CheckCircle2 size={24} color="var(--success)" />
        </div>

        <div className="card-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'none' }}>Expiring Soon</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--warning)' }}>{expiringCount}</div>
          </div>
          <Clock size={24} color="var(--warning)" />
        </div>

        <div className="card-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'none' }}>Attention Needed</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>{needsVerificationCount}</div>
          </div>
          <AlertTriangle size={24} color="var(--danger)" />
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div 
        className="card-panel" 
        style={{ 
          padding: '14px 18px', 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '12px', 
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="var(--text-muted)" />
          <input 
            type="text" 
            placeholder="Search claim statements, IDs, or executive owners..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', fontSize: '0.88rem', color: 'var(--text-primary)' }}
          />
        </div>

        <select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ 
            padding: '6px 12px', 
            borderRadius: 'var(--radius-md)', 
            border: '1px solid var(--border)', 
            fontSize: '0.82rem',
            backgroundColor: 'var(--surface)',
            color: 'var(--text-primary)'
          }}
        >
          <option value="all">All Statuses ({claimsList.length})</option>
          <option value="VERIFIED">Verified ({verifiedCount})</option>
          <option value="EXPIRING_SOON">Expiring Soon ({expiringCount})</option>
          <option value="EXPIRED">Expired</option>
          <option value="NEEDS_VERIFICATION">Needs Verification</option>
        </select>
      </div>

      {/* Structured Ledger Table */}
      <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', width: '100px' }}>ID</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)' }}>Claim Statement</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', width: '150px' }}>Status</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', width: '220px' }}>Evidence Source</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', width: '160px' }}>Authority / Owner</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', width: '120px' }}>Valid Until</th>
                <th style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-muted)', width: '80px', textAlign: 'right' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredClaims.length > 0 ? (
                filteredClaims.map((claim) => (
                  <tr 
                    key={claim.id} 
                    style={{ 
                      borderBottom: '1px solid var(--border)',
                      transition: 'background-color 0.15s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedClaim(claim)}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', color: 'var(--info)' }}>
                        {claim.id}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                        "{claim.claimText}"
                      </div>
                      {claim.contextNotes && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {claim.contextNotes}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', verticalAlign: 'top' }}>
                      {getStatusBadge(claim.status)}
                    </td>
                    <td style={{ padding: '14px 16px', verticalAlign: 'top', color: 'var(--text-primary)' }}>
                      <div style={{ fontWeight: 500, fontSize: '0.82rem' }}>{claim.sourceDoc}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Page / Table: {claim.sourcePage}</div>
                    </td>
                    <td style={{ padding: '14px 16px', verticalAlign: 'top', color: 'var(--text-primary)' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{claim.owner}</div>
                    </td>
                    <td style={{ padding: '14px 16px', verticalAlign: 'top', fontSize: '0.82rem', color: claim.status === 'EXPIRING_SOON' ? 'var(--warning)' : 'var(--text-muted)' }}>
                      <div style={{ fontWeight: claim.status === 'EXPIRING_SOON' ? 700 : 500 }}>{claim.validTo}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>From: {claim.validFrom}</div>
                    </td>
                    <td style={{ padding: '14px 16px', verticalAlign: 'top', textAlign: 'right' }}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClaim(claim);
                        }}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No claim records match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Claim Detail Drawer / Modal */}
      {selectedClaim && (
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
          onClick={() => setSelectedClaim(null)}
        >
          <div 
            style={{ 
              backgroundColor: 'var(--surface)', 
              borderRadius: 'var(--radius-xl)', 
              maxWidth: '600px', 
              width: '100%', 
              padding: '28px',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} color="var(--info)" />
                <h3 style={{ fontSize: '1.2rem' }}>Claim #{selectedClaim.id}</h3>
                {getStatusBadge(selectedClaim.status)}
              </div>
              <button onClick={() => setSelectedClaim(null)}><X size={18} /></button>
            </div>

            <div style={{ backgroundColor: 'var(--surface-subtle)', padding: '14px', borderRadius: 'var(--radius-md)', marginBottom: '16px', borderLeft: 'none' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'none' }}>Approved Claim Text</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 500, lineHeight: 1.5 }}>"{selectedClaim.claimText}"</div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '0.85rem', marginBottom: '16px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Source Document:</span>
                <strong>{selectedClaim.sourceDoc}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Page / Citation:</span>
                <strong>Page {selectedClaim.sourcePage}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Claim Authority:</span>
                <strong>{selectedClaim.owner}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.75rem' }}>Validity Horizon:</span>
                <strong>{selectedClaim.validFrom} → {selectedClaim.validTo}</strong>
              </div>
            </div>

            {selectedClaim.contextNotes && (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '10px 12px', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)', marginBottom: '20px' }}>
                <strong>Auditor Notes:</strong> {selectedClaim.contextNotes}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setSelectedClaim(null)} className="btn btn-secondary btn-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Claim Modal (BrandGuard Operations Only) */}
      {showAddModal && isOperations && (
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
          onClick={() => setShowAddModal(false)}
        >
          <div 
            style={{ 
              backgroundColor: 'var(--surface)', 
              borderRadius: 'var(--radius-xl)', 
              maxWidth: '640px', 
              width: '100%', 
              padding: '28px',
              boxShadow: 'var(--shadow-lg)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '1.25rem' }}>Register Verified Claim into Ledger</h3>
              <button onClick={() => setShowAddModal(false)}><X size={18} /></button>
            </div>

            <form onSubmit={handleCreateClaim}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>
                  Verifiable Claim Text *
                </label>
                <textarea 
                  rows={3} 
                  required
                  placeholder="e.g. Delivers 98.4% diagnostic sensitivity in multi-site clinical trials..."
                  value={claimText}
                  onChange={(e) => setClaimText(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.88rem', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Source Document *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Clinical Study Report 2026"
                    value={sourceDoc}
                    onChange={(e) => setSourceDoc(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.85rem', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Page / Table</label>
                  <input 
                    type="number" 
                    value={sourcePage}
                    onChange={(e) => setSourcePage(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.85rem', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Executive Claim Owner *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Dr. Robert Vance, Clinical VP"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.85rem', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Verification Status</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ClaimStatus)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.85rem', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                  >
                    <option value="VERIFIED">VERIFIED</option>
                    <option value="EXPIRING_SOON">EXPIRING_SOON</option>
                    <option value="NEEDS_VERIFICATION">NEEDS_VERIFICATION</option>
                    <option value="EXPIRED">EXPIRED</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Valid From</label>
                  <input 
                    type="date" 
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.85rem', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '4px' }}>Valid To (Expiration)</label>
                  <input 
                    type="date" 
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.85rem', backgroundColor: 'var(--surface)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Register into Claim Ledger</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
