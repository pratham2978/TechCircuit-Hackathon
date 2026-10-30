import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import {
  fetchBrandPassports,
  fetchBrandPassportDetail,
  issueBrandPassport,
  verifyPassportIntegrity,
  revokeBrandPassport,
  downloadPassportExport,
  fetchOperationsSubmissions,
  BrandPassportItem,
  BrandPassportDetail,
  PassportVerificationResult,
  ReviewSubmissionItem
} from '../../services/api';
import { 
  Award, 
  ShieldCheck, 
  Download, 
  Calendar, 
  UserCheck, 
  CheckCircle2, 
  FileText, 
  Lock, 
  Clock, 
  Info,
  Check,
  ChevronRight,
  AlertTriangle,
  XCircle,
  Hash,
  Key,
  FileCode,
  ShieldAlert,
  Loader2,
  RefreshCw,
  PlusCircle,
  ExternalLink,
  Search,
  Filter,
  CheckSquare
} from 'lucide-react';

export const PassportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { accountType } = useDemo();
  const isOperations = accountType === 'brandguard_operations';

  // Passport list and selection state
  const [passports, setPassports] = useState<BrandPassportItem[]>([]);
  const [selectedPassportId, setSelectedPassportId] = useState<string | null>(id || null);
  const [activePassport, setActivePassport] = useState<BrandPassportDetail | null>(null);
  
  // Loading & Error states
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccessNotice, setActionSuccessNotice] = useState<string | null>(null);

  // Verification result state
  const [verificationResult, setVerificationResult] = useState<PassportVerificationResult | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCanonicalPayload, setShowCanonicalPayload] = useState<boolean>(false);

  // Revocation Modal state
  const [showRevokeModal, setShowRevokeModal] = useState<boolean>(false);
  const [revocationReason, setRevocationReason] = useState<string>('');
  const [isSubmittingRevocation, setIsSubmittingRevocation] = useState<boolean>(false);

  // Issuance Modal state (for Operations reviewers)
  const [showIssueModal, setShowIssueModal] = useState<boolean>(false);
  const [approvedSubmissions, setApprovedSubmissions] = useState<ReviewSubmissionItem[]>([]);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string>('');
  const [guidelineVersion, setGuidelineVersion] = useState<string>('2026.1');
  const [isSubmittingIssuance, setIsSubmittingIssuance] = useState<boolean>(false);

  // 1. Load passports list from backend
  const loadPassportsList = async () => {
    setIsLoadingList(true);
    setErrorMessage(null);
    try {
      const items = await fetchBrandPassports({
        status: statusFilter !== 'all' ? statusFilter : undefined
      });
      setPassports(items || []);
      
      // Auto-select passport if none selected, or if current selection is invalid
      if (items && items.length > 0) {
        if (!selectedPassportId || !items.some((p: BrandPassportItem) => p.id === selectedPassportId)) {
          const targetId = id || items[0].id;
          setSelectedPassportId(targetId);
        }
      } else {
        setSelectedPassportId(null);
        setActivePassport(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to retrieve Brand Passports.');
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    loadPassportsList();
  }, [statusFilter, accountType]);

  // Handle URL parameter sync
  useEffect(() => {
    if (id && id !== selectedPassportId) {
      setSelectedPassportId(id);
    }
  }, [id]);

  // Check if a ?submissionId= query param was supplied to automatically trigger issuance modal
  useEffect(() => {
    const submissionIdParam = searchParams.get('submissionId');
    if (submissionIdParam && isOperations) {
      setSelectedSubmissionId(submissionIdParam);
      setShowIssueModal(true);
    }
  }, [searchParams, isOperations]);

  // 2. Load detail when selectedPassportId changes
  useEffect(() => {
    if (!selectedPassportId) {
      setActivePassport(null);
      return;
    }

    const loadDetail = async () => {
      setIsLoadingDetail(true);
      setVerificationResult(null);
      try {
        const detail = await fetchBrandPassportDetail(selectedPassportId);
        setActivePassport(detail);
      } catch (err: any) {
        setErrorMessage(err.message || `Unable to load passport ${selectedPassportId}`);
      } finally {
        setIsLoadingDetail(false);
      }
    };

    loadDetail();
  }, [selectedPassportId]);

  // 3. Load approved submissions for issuance modal
  const loadApprovedSubmissions = async () => {
    try {
      const subs = await fetchOperationsSubmissions({ status: 'approved' });
      setApprovedSubmissions(subs);
      if (subs.length > 0 && !selectedSubmissionId) {
        setSelectedSubmissionId(subs[0].id);
      }
    } catch (e) {
      console.error('Failed to load approved submissions:', e);
    }
  };

  const openIssueModal = () => {
    loadApprovedSubmissions();
    setShowIssueModal(true);
  };

  // Helper notification toast
  const showNotice = (msg: string) => {
    setActionSuccessNotice(msg);
    setTimeout(() => setActionSuccessNotice(null), 5000);
  };

  // 4. Verify Cryptographic Integrity
  const handleVerifySeal = async () => {
    if (!activePassport) return;
    setIsVerifying(true);
    setErrorMessage(null);
    try {
      const res = await verifyPassportIntegrity(activePassport.id);
      setVerificationResult(res);
      if (res.is_valid) {
        showNotice(`Cryptographic verification PASSED: Ed25519 signature & SHA-256 byte seal valid.`);
      } else {
        setErrorMessage(`Verification ALERT: Passport status is ${res.status}. ${res.message}`);
      }
      // Refresh passport detail
      const refreshed = await fetchBrandPassportDetail(activePassport.id);
      setActivePassport(refreshed);
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification execution failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  // 5. Export Certificate (PDF / JSON)
  const handleExport = async (format: 'pdf' | 'json') => {
    if (!activePassport) return;
    setIsExporting(format);
    try {
      await downloadPassportExport(activePassport.id, format);
      showNotice(`Downloaded Brand Passport ${activePassport.passport_number} (${format.toUpperCase()})`);
    } catch (err: any) {
      setErrorMessage(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(null);
    }
  };

  // 6. Revoke Passport
  const handleConfirmRevocation = async () => {
    if (!activePassport) return;
    if (!revocationReason.trim()) {
      alert('A verified revocation reason is mandatory under governance charter.');
      return;
    }
    setIsSubmittingRevocation(true);
    try {
      await revokeBrandPassport(activePassport.id, revocationReason);
      showNotice(`Brand Passport ${activePassport.passport_number} has been revoked.`);
      setShowRevokeModal(false);
      setRevocationReason('');
      // Reload both list and current detail
      await loadPassportsList();
      const refreshed = await fetchBrandPassportDetail(activePassport.id);
      setActivePassport(refreshed);
    } catch (err: any) {
      alert(err.message || 'Revocation failed.');
    } finally {
      setIsSubmittingRevocation(false);
    }
  };

  // 7. Issue Brand Passport
  const handleConfirmIssuance = async () => {
    if (!selectedSubmissionId) {
      alert('Please select an approved submission.');
      return;
    }
    setIsSubmittingIssuance(true);
    try {
      const res = await issueBrandPassport(selectedSubmissionId, guidelineVersion);
      showNotice(`Brand Passport ${res.passport_number} issued and cryptographically sealed.`);
      setShowIssueModal(false);
      await loadPassportsList();
      setSelectedPassportId(res.passport_id);
    } catch (err: any) {
      alert(err.message || 'Issuance failed.');
    } finally {
      setIsSubmittingIssuance(false);
    }
  };

  // Filtered passports in selector
  const filteredPassports = passports.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchQ = p.passport_number.toLowerCase().includes(q) ||
      p.project_name.toLowerCase().includes(q) ||
      p.company_name.toLowerCase().includes(q) ||
      p.authorized_reviewer_name.toLowerCase().includes(q);
    return matchQ;
  });

  // Verification status UI helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return {
          label: 'CRYPTOGRAPHICALLY SEALED & VERIFIED',
          bg: '#ecfdf5',
          color: '#065f46',
          border: '#059669',
          icon: <ShieldCheck size={16} color="#059669" />
        };
      case 'REVOKED':
        return {
          label: 'REVOKED CERTIFICATE',
          bg: '#fef2f2',
          color: '#991b1b',
          border: '#dc2626',
          icon: <ShieldAlert size={16} color="#dc2626" />
        };
      case 'FILE_MODIFIED':
        return {
          label: 'FILE INTEGRITY COMPROMISED (HASH MISMATCH)',
          bg: '#fffbeb',
          color: '#92400e',
          border: '#d97706',
          icon: <AlertTriangle size={16} color="#d97706" />
        };
      case 'INVALID_SIGNATURE':
        return {
          label: 'TAMPER DETECTED: INVALID SIGNATURE',
          bg: '#fef2f2',
          color: '#b91c1c',
          border: '#b91c1c',
          icon: <XCircle size={16} color="#b91c1c" />
        };
      case 'VERIFICATION_UNAVAILABLE':
        return {
          label: 'SOURCE FILE UNAVAILABLE FOR RE-HASH',
          bg: '#f1f5f9',
          color: '#475569',
          border: '#94a3b8',
          icon: <Info size={16} color="#475569" />
        };
      default:
        return {
          label: status,
          bg: '#f3f4f6',
          color: '#374151',
          border: '#9ca3af',
          icon: <Info size={16} />
        };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header with Title and Global Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Award size={24} color="var(--color-evidence-teal)" />
            <h1 style={{ fontSize: '1.85rem' }}>Brand Passport Audit Certificates</h1>
          </div>
          <p style={{ color: 'var(--color-muted-slate)', fontSize: '0.9rem' }}>
            Asymmetric RFC 8032 Ed25519 digital signatures, SHA-256 byte hashes, and immutable human governance authorization.
          </p>
        </div>

        {/* Global Controls */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {isOperations && (
            <button
              onClick={openIssueModal}
              className="btn btn-primary btn-sm"
              style={{ gap: '6px' }}
            >
              <PlusCircle size={15} />
              <span>Issue Brand Passport</span>
            </button>
          )}

          {activePassport && (
            <>
              <button 
                onClick={() => handleExport('pdf')}
                disabled={isExporting !== null}
                className="btn btn-secondary btn-sm"
                style={{ gap: '6px' }}
                title="Download publication-grade ReportLab PDF Certificate"
              >
                {isExporting === 'pdf' ? <Loader2 size={14} className="spin-animate" /> : <Download size={14} />}
                <span>Certificate (PDF)</span>
              </button>
              <button 
                onClick={() => handleExport('json')}
                disabled={isExporting !== null}
                className="btn btn-dark btn-sm"
                style={{ gap: '6px' }}
                title="Download cryptographically verifiable canonical JSON audit envelope"
              >
                {isExporting === 'json' ? <Loader2 size={14} className="spin-animate" /> : <FileCode size={14} />}
                <span>Audit Proof (JSON)</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notifications / Alerts */}
      {actionSuccessNotice && (
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
          <span>{actionSuccessNotice}</span>
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

      {/* Selector & Filter Bar */}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} color="var(--color-muted-slate)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by passport #, project, company, reviewer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control form-control-sm"
              style={{ paddingLeft: '32px', fontSize: '0.84rem' }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-control form-control-sm"
            style={{ width: '160px', fontSize: '0.84rem' }}
          >
            <option value="all">All Statuses</option>
            <option value="VERIFIED">Verified Only</option>
            <option value="REVOKED">Revoked Only</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-muted-slate)' }}>
            {filteredPassports.length} certified passport{filteredPassports.length === 1 ? '' : 's'}
          </span>
          <button
            onClick={loadPassportsList}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 10px' }}
            title="Refresh passports"
          >
            <RefreshCw size={13} className={isLoadingList ? 'spin-animate' : ''} />
          </button>
        </div>
      </div>

      {/* Passports Selector Strip */}
      {filteredPassports.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
          {filteredPassports.map(p => {
            const isSelected = p.id === selectedPassportId;
            const badge = getStatusBadge(p.status);
            return (
              <button
                key={p.id}
                onClick={() => {
                  setSelectedPassportId(p.id);
                  navigate(`/app/passport/${p.id}`);
                }}
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isSelected ? 'var(--color-surface-white)' : 'rgba(255, 255, 255, 0.6)',
                  border: isSelected ? '2px solid var(--color-evidence-teal)' : '1px solid var(--color-border-gray)',
                  boxShadow: isSelected ? 'var(--shadow-sm)' : 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  minWidth: '220px',
                  flexShrink: 0
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '0.85rem', color: 'var(--color-deep-ink)' }}>{p.passport_number}</strong>
                  <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, fontWeight: 700 }}>
                    {p.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {p.project_name} (v{p.approved_version_number})
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-evidence-teal)', marginTop: '2px' }}>
                  {p.company_name} • {p.issued_at || 'Recently'}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Empty State when no passports exist */}
      {!isLoadingList && filteredPassports.length === 0 && (
        <div className="card-panel" style={{ padding: '48px', textAlign: 'center', backgroundColor: 'var(--color-surface-white)' }}>
          <Award size={40} color="var(--color-muted-slate)" style={{ margin: '0 auto 12px' }} />
          <h3>No Brand Passports Found</h3>
          <p style={{ color: 'var(--color-muted-slate)', marginTop: '8px', maxWidth: '500px', margin: '8px auto 0' }}>
            Brand Passports represent cryptographically sealed versions issued after human review authorization.
          </p>
          {isOperations ? (
            <button onClick={openIssueModal} className="btn btn-primary btn-sm" style={{ marginTop: '16px' }}>
              <PlusCircle size={14} style={{ marginRight: '6px' }} />
              Issue Brand Passport for Approved Submission
            </button>
          ) : (
            <Link to="/app/approvals" className="btn btn-primary btn-sm" style={{ marginTop: '16px' }}>
              Go to Approvals Queue
            </Link>
          )}
        </div>
      )}

      {/* Active Brand Passport Details */}
      {isLoadingDetail && (
        <div className="card-panel" style={{ padding: '60px', textAlign: 'center', backgroundColor: 'var(--color-surface-white)' }}>
          <Loader2 size={32} className="spin-animate" color="var(--color-evidence-teal)" style={{ margin: '0 auto 12px' }} />
          <div style={{ color: 'var(--color-muted-slate)' }}>Loading cryptographically signed passport data...</div>
        </div>
      )}

      {!isLoadingDetail && activePassport && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Certificate Main Card */}
          <div 
            className="card-panel"
            style={{ 
              backgroundColor: 'var(--color-surface-white)', 
              borderRadius: 'var(--radius-xl)', 
              padding: '36px',
              border: activePassport.status === 'REVOKED' ? '2px solid #dc2626' : '2px solid var(--color-evidence-teal)',
              boxShadow: 'var(--shadow-lg)',
              position: 'relative'
            }}
          >
            {/* Certificate Watermark Stamp */}
            {(() => {
              const badge = getStatusBadge(activePassport.status);
              return (
                <div 
                  style={{ 
                    position: 'absolute', 
                    top: '32px', 
                    right: '36px', 
                    border: `2px solid ${badge.border}`, 
                    borderRadius: 'var(--radius-md)',
                    padding: '8px 16px',
                    backgroundColor: badge.bg,
                    color: badge.color,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    fontSize: '0.82rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transform: 'rotate(1deg)'
                  }}
                >
                  {badge.icon}
                  <span>{badge.label}</span>
                </div>
              );
            })()}

            {/* Certificate Header */}
            <div style={{ borderBottom: '1px solid var(--color-border-gray)', paddingBottom: '24px', marginBottom: '28px' }}>
              <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--color-muted-slate)', letterSpacing: '0.06em', marginBottom: '6px' }}>
                BrandGuard Governance Charter • Ed25519 Cryptographic Proof v{activePassport.schema_version}
              </div>
              <h2 style={{ fontSize: '1.8rem', color: 'var(--color-deep-ink)', marginBottom: '8px' }}>
                {activePassport.project_name}
              </h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '0.85rem', color: 'var(--color-muted-slate)' }}>
                <span>Passport ID: <strong style={{ color: 'var(--color-deep-ink)' }}>{activePassport.passport_number}</strong></span>
                <span>Company: <strong style={{ color: 'var(--color-deep-ink)' }}>{activePassport.company_name}</strong></span>
                <span>Approved Version: <strong>v{activePassport.approved_version_number}</strong></span>
                <span>Review Tool: <strong style={{ textTransform: 'capitalize' }}>{activePassport.review_type}</strong></span>
                <span>Issued: <strong>{activePassport.issued_at}</strong></span>
              </div>
            </div>

            {/* Revocation Banner (If Revoked) */}
            {activePassport.status === 'REVOKED' && (
              <div 
                style={{ 
                  backgroundColor: '#fef2f2', 
                  border: '1px solid #dc2626', 
                  borderRadius: 'var(--radius-md)', 
                  padding: '16px 20px',
                  marginBottom: '28px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                <ShieldAlert size={22} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: '#991b1b', fontSize: '0.95rem', display: 'block', marginBottom: '4px' }}>
                    Revoked Brand Passport
                  </strong>
                  <p style={{ color: '#7f1d1d', margin: 0, fontSize: '0.85rem', lineHeight: 1.5 }}>
                    This passport was formally revoked by <strong>{activePassport.revoked_by || 'Operations'}</strong> on <strong>{activePassport.revoked_at}</strong>.
                    <br />
                    Reason: <em>"{activePassport.revocation_reason}"</em>
                  </p>
                </div>
              </div>
            )}

            {/* Real-time Verification Result Banner */}
            {verificationResult && (
              <div 
                style={{ 
                  backgroundColor: verificationResult.is_valid ? 'rgba(6, 95, 70, 0.06)' : 'rgba(220, 38, 38, 0.06)',
                  border: `1px solid ${verificationResult.is_valid ? '#059669' : '#dc2626'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 20px',
                  marginBottom: '28px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {verificationResult.is_valid ? (
                      <CheckCircle2 size={20} color="#059669" />
                    ) : (
                      <AlertTriangle size={20} color="#dc2626" />
                    )}
                    <strong style={{ fontSize: '0.95rem', color: verificationResult.is_valid ? '#065f46' : '#991b1b' }}>
                      Cryptographic Verification: {verificationResult.status}
                    </strong>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>
                    Recalculated: {verificationResult.verified_at || 'Just now'}
                  </span>
                </div>

                <p style={{ margin: '0 0 10px', fontSize: '0.85rem', color: 'var(--color-deep-ink)' }}>
                  {verificationResult.message}
                </p>

                {/* Audit Checks Checklist */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.78rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={14} color={verificationResult.status === 'INVALID_SIGNATURE' ? '#dc2626' : '#059669'} />
                    <span>Ed25519 Curve25519 Signature: {verificationResult.status === 'INVALID_SIGNATURE' ? 'TAMPERED / FAILED' : 'VALID'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={14} color={verificationResult.status === 'FILE_MODIFIED' ? '#dc2626' : '#059669'} />
                    <span>SHA-256 Byte Hash: {verificationResult.status === 'FILE_MODIFIED' ? 'ALTERED' : verificationResult.status === 'VERIFICATION_UNAVAILABLE' ? 'FILE_UNAVAILABLE' : 'MATCHED'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={14} color={verificationResult.status === 'REVOKED' ? '#dc2626' : '#059669'} />
                    <span>Revocation State: {verificationResult.status === 'REVOKED' ? 'REVOKED' : 'ACTIVE / UNREVOKED'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Metrics Grid */}
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                gap: '16px',
                marginBottom: '32px'
              }}
            >
              <div style={{ padding: '16px', backgroundColor: 'var(--color-warm-ivory)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#047857', fontFamily: 'var(--font-display)' }}>
                  {activePassport.governance_score}%
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>Governance Score</div>
              </div>

              <div style={{ padding: '16px', backgroundColor: 'var(--color-warm-ivory)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-deep-ink)', fontFamily: 'var(--font-display)' }}>
                  v{activePassport.approved_version_number}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>Certified Version</div>
              </div>

              <div style={{ padding: '16px', backgroundColor: 'var(--color-warm-ivory)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-evidence-teal)', fontFamily: 'var(--font-display)' }}>
                  {activePassport.algorithm}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>Asymmetric Curve</div>
              </div>

              <div style={{ padding: '16px', backgroundColor: 'var(--color-warm-ivory)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-deep-ink)', fontFamily: 'var(--font-display)' }}>
                  {activePassport.guideline_version}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted-slate)' }}>Brand Policy Standard</div>
              </div>
            </div>

            {/* Cryptographic Proof Box */}
            <div 
              style={{ 
                backgroundColor: '#0d1b2a', 
                borderRadius: 'var(--radius-md)', 
                padding: '24px', 
                color: '#e2e8f0', 
                fontFamily: 'monospace', 
                fontSize: '0.82rem',
                marginBottom: '32px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.15)', paddingBottom: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8' }}>
                  <Lock size={16} />
                  <strong style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Cryptographic Seal (RFC 8032 Ed25519)
                  </strong>
                </div>
                <button
                  onClick={handleVerifySeal}
                  disabled={isVerifying}
                  className="btn btn-teal btn-sm"
                  style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '5px' }}
                >
                  <RefreshCw size={12} className={isVerifying ? 'spin-animate' : ''} />
                  <span>Verify Cryptographic Seal</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Approved File Reference & SHA-256 Byte Hash:</span>
                  <div style={{ color: '#fbbf24', wordBreak: 'break-all', marginTop: '2px' }}>
                    {activePassport.approved_file_name} &rarr; <span style={{ color: '#34d399' }}>{activePassport.approved_file_hash}</span>
                  </div>
                </div>

                <div>
                  <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Digital Signature (64-byte Ed25519 signature in Hex):</span>
                  <div style={{ color: '#e2e8f0', wordBreak: 'break-all', backgroundColor: 'rgba(0,0,0,0.3)', padding: '6px 8px', borderRadius: '4px', marginTop: '2px' }}>
                    {activePassport.signature}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Public Key (32-byte Hex):</span>
                    <div style={{ color: '#cbd5e1', wordBreak: 'break-all', marginTop: '2px' }}>
                      {activePassport.public_key}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: '#94a3b8', display: 'block', fontSize: '0.72rem', textTransform: 'uppercase' }}>Key Identifier:</span>
                    <div style={{ color: '#cbd5e1', marginTop: '2px' }}>
                      {activePassport.key_id}
                    </div>
                  </div>
                </div>

                {/* Canonical Signed Payload Toggle */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', marginTop: '6px' }}>
                  <button
                    onClick={() => setShowCanonicalPayload(!showCanonicalPayload)}
                    style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.75rem', padding: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span>{showCanonicalPayload ? 'Hide' : 'Inspect'} Deterministic Canonical Signed Payload</span>
                    <ChevronRight size={12} style={{ transform: showCanonicalPayload ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>

                  {showCanonicalPayload && (
                    <pre style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '4px', marginTop: '8px', color: '#94a3b8', fontSize: '0.72rem', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
                      {activePassport.canonical_payload}
                    </pre>
                  )}
                </div>
              </div>
            </div>

            {/* Evidentiary Citations List */}
            {activePassport.evidence_citations && activePassport.evidence_citations.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={18} color="var(--color-evidence-teal)" />
                  <span>Governed Evidentiary Rules & Ledger Citations</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {activePassport.evidence_citations.map((cit, idx) => (
                    <div 
                      key={idx}
                      style={{ 
                        padding: '12px 16px', 
                        backgroundColor: 'var(--color-warm-ivory)', 
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-border-gray)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--color-deep-ink)', marginBottom: '4px' }}>
                        {cit.rule || cit.claim || 'Verified Policy Rule'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)' }}>
                        Source Document: <strong>{cit.doc || cit.source || 'Standard Guidelines'}</strong> • Status: <span style={{ color: '#047857', fontWeight: 600 }}>Satisfied & Verified</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Human Decision & AI Disclosure Block */}
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                gap: '20px',
                padding: '20px',
                backgroundColor: 'var(--color-warm-ivory)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-gray)',
                marginBottom: '28px'
              }}
            >
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-evidence-teal)', marginBottom: '6px' }}>
                  Authorizing Operations Reviewer
                </div>
                <strong style={{ fontSize: '1rem', color: 'var(--color-deep-ink)' }}>
                  {activePassport.authorized_reviewer_name}
                </strong>
                <p style={{ fontSize: '0.78rem', color: 'var(--color-muted-slate)', marginTop: '4px' }}>
                  Signoff granted under BrandGuard Corporate Governance Charter. Reviewer ID: <code>{activePassport.authorized_reviewer_id}</code>.
                </p>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-evidence-teal)', marginBottom: '6px' }}>
                  Algorithmic Transparency Disclosure
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-deep-ink)', lineHeight: 1.5, margin: 0 }}>
                  {activePassport.ai_disclosure || 'Algorithmic checks executed to identify guideline risks. All final release authorizations rendered by verified human reviewers.'}
                </p>
              </div>
            </div>

            {/* Operations Reviewer Revocation Control */}
            {isOperations && activePassport.status !== 'REVOKED' && (
              <div style={{ borderTop: '1px solid var(--color-border-gray)', paddingTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowRevokeModal(true)}
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#dc2626', borderColor: '#fca5a5', gap: '6px' }}
                >
                  <ShieldAlert size={14} />
                  <span>Revoke Brand Passport for Cause</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Revoke Brand Passport */}
      {showRevokeModal && activePassport && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(13, 27, 42, 0.7)',
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
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              border: '2px solid #dc2626'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <ShieldAlert size={24} color="#dc2626" />
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#991b1b' }}>Revoke Brand Passport</h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-deep-ink)', lineHeight: 1.5, marginBottom: '16px' }}>
              You are about to revoke <strong>{activePassport.passport_number}</strong> ({activePassport.project_name}). Once revoked, the cryptographic seal will fail verification across all distributor platforms.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                Revocation Cause & Regulatory Rationale <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                rows={3}
                className="form-control"
                placeholder="State the regulatory policy breach, expired claim, or executive order justifying revocation..."
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowRevokeModal(false)}
                className="btn btn-secondary btn-sm"
                disabled={isSubmittingRevocation}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevocation}
                className="btn btn-dark btn-sm"
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626', gap: '6px' }}
                disabled={isSubmittingRevocation || !revocationReason.trim()}
              >
                {isSubmittingRevocation ? <Loader2 size={14} className="spin-animate" /> : <ShieldAlert size={14} />}
                <span>Confirm Revocation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Issue Brand Passport */}
      {showIssueModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(13, 27, 42, 0.7)',
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
              maxWidth: '560px', 
              width: '100%', 
              backgroundColor: 'var(--color-surface-white)',
              borderRadius: 'var(--radius-lg)',
              padding: '28px',
              border: '2px solid var(--color-evidence-teal)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <Award size={24} color="var(--color-evidence-teal)" />
              <h3 style={{ margin: 0, fontSize: '1.25rem' }}>Issue Cryptographic Brand Passport</h3>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-deep-ink)', lineHeight: 1.5, marginBottom: '16px' }}>
              Brand Passports can only be issued for submissions with an actual persisted human approval from an authorized Operations Reviewer.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                Select Approved Submission <span style={{ color: 'var(--color-evidence-teal)' }}>*</span>
              </label>
              {approvedSubmissions.length > 0 ? (
                <select
                  value={selectedSubmissionId}
                  onChange={(e) => setSelectedSubmissionId(e.target.value)}
                  className="form-control"
                  style={{ fontSize: '0.85rem' }}
                >
                  {approvedSubmissions.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.project_name} — v{s.approved_version_number || s.version_number} ({s.company_name})
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ padding: '12px', backgroundColor: 'var(--color-warm-ivory)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem', color: 'var(--color-muted-slate)' }}>
                  No approved submissions currently available. Submissions must be marked "Approved" in the Review Queue before a passport can be minted.
                </div>
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>
                Applicable Guideline Standard
              </label>
              <input
                type="text"
                value={guidelineVersion}
                onChange={(e) => setGuidelineVersion(e.target.value)}
                className="form-control form-control-sm"
                placeholder="e.g. 2026.1"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowIssueModal(false)}
                className="btn btn-secondary btn-sm"
                disabled={isSubmittingIssuance}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmIssuance}
                className="btn btn-primary btn-sm"
                disabled={isSubmittingIssuance || !selectedSubmissionId || approvedSubmissions.length === 0}
                style={{ gap: '6px' }}
              >
                {isSubmittingIssuance ? <Loader2 size={14} className="spin-animate" /> : <Award size={14} />}
                <span>Mint & Sign Passport</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
