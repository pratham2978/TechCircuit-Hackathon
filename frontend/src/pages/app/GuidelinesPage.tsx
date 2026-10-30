import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDemo } from '../../context/DemoContext';
import { ClaimRecord, ClaimStatus, BrandRule, GuidelineDoc } from '../../types';
import { 
  getGuidelines, 
  uploadGuidelineDoc, 
  deleteGuidelineDoc, 
  getRules, 
  createRule, 
  deleteRule, 
  getClaims, 
  createClaim, 
  deleteClaim 
} from '../../services/api';
import { 
  BookOpen, 
  Upload, 
  FileText, 
  Check, 
  X, 
  ShieldCheck, 
  AlertTriangle, 
  Info,
  Plus, 
  Database, 
  Calendar, 
  Tag, 
  Scale, 
  Palette, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter, 
  ArrowRight,
  ExternalLink,
  PlusCircle,
  Copy,
  Eye,
  Download,
  FileCode,
  Type,
  RefreshCw
} from 'lucide-react';

export const GuidelinesPage: React.FC = () => {
  const { 
    guidelines: demoGuidelines, 
    rules: demoRules, 
    claims: demoClaims, 
    addClaim, 
    updateClaim,
    approveRule, 
    rejectRule, 
    addRule, 
    accountType 
  } = useDemo();

  const [guidelinesList, setGuidelinesList] = useState<GuidelineDoc[]>(demoGuidelines);
  const [rulesList, setRulesList] = useState<BrandRule[]>(demoRules);
  const [claimsList, setClaimsList] = useState<ClaimRecord[]>(demoClaims);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  
  type TabType = 'guidelines' | 'claims' | 'rules' | 'disclaimers' | 'assets';
  
  // Normalize tab input (support legacy 'colors' as 'assets')
  const normalizeTab = (tabStr: string | null): TabType => {
    if (tabStr === 'colors') return 'assets';
    if (tabStr === 'guidelines' || tabStr === 'claims' || tabStr === 'rules' || tabStr === 'disclaimers' || tabStr === 'assets') {
      return tabStr;
    }
    return 'guidelines';
  };

  const [activeTab, setActiveTab] = useState<TabType>(() => normalizeTab(requestedTab));
  const isOperations = accountType === 'brandguard_operations';

  // Modal & notification states
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAddClaimModal, setShowAddClaimModal] = useState(false);
  const [showAddRuleModal, setShowAddRuleModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  
  // Inspector states
  const [selectedGuideline, setSelectedGuideline] = useState<GuidelineDoc | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<ClaimRecord | null>(null);
  const [selectedRule, setSelectedRule] = useState<BrandRule | null>(null);

  // Search & Filter state for guidelines
  const [guidelinesSearch, setGuidelinesSearch] = useState('');

  // Search & Filter state for claims
  const [claimsSearch, setClaimsSearch] = useState('');
  const [claimsStatusFilter, setClaimsStatusFilter] = useState<'ALL' | ClaimStatus>('ALL');

  // Search state for rules
  const [rulesSearch, setRulesSearch] = useState('');
  const [rulesTypeFilter, setRulesTypeFilter] = useState<string>('all');

  // Add Claim Form State
  const [newClaimText, setNewClaimText] = useState('');
  const [newClaimSourceDoc, setNewClaimSourceDoc] = useState('Brand Guidelines 2026.pdf');
  const [newClaimPage, setNewClaimPage] = useState(12);
  const [newClaimOwner, setNewClaimOwner] = useState('Marketing VP');
  const [newClaimValidTo, setNewClaimValidTo] = useState('2027-12-31');

  // Add Rule Form State
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleExplanation, setNewRuleExplanation] = useState('');
  const [newRuleTerm, setNewRuleTerm] = useState('');
  const [newRuleAlternative, setNewRuleAlternative] = useState('');
  const [newRuleType, setNewRuleType] = useState<BrandRule['type']>('prohibited_term');
  const [newRuleSeverity, setNewRuleSeverity] = useState<BrandRule['severity']>('warning');

  const loadBackendGovernanceData = async () => {
    setIsDataLoading(true);
    try {
      const [bDocs, bRules, bClaims] = await Promise.all([
        getGuidelines('acme-global-brands').catch(() => []),
        getRules('acme-global-brands').catch(() => []),
        getClaims('acme-global-brands').catch(() => [])
      ]);

      if (bDocs && bDocs.length > 0) {
        const mappedDocs: GuidelineDoc[] = bDocs.map(d => ({
          id: d.id,
          title: d.title,
          fileName: d.title,
          fileSize: d.file_size || '1.0 MB',
          uploadedAt: d.uploaded_at || '2026-10-30',
          version: d.version || '1.0',
          status: (d.status as any) || 'indexed',
          pagesCount: d.pages_count || 1,
          proposedRulesCount: d.proposed_rules_count || 0,
          approvedRulesCount: d.approved_rules_count || 0,
          samplePassage: d.sample_passage || ''
        }));
        setGuidelinesList(mappedDocs);
      }

      if (bRules && bRules.length > 0) {
        const mappedRules: BrandRule[] = bRules.map(r => ({
          id: r.id,
          title: r.title,
          category: (r.category as any) || 'terminology',
          type: (r.rule_type as any) || 'prohibited_term',
          termOrPattern: r.term_or_pattern,
          preferredAlternative: r.preferred_alternative,
          explanation: r.explanation,
          severity: r.severity || 'warning',
          status: r.status || 'approved',
          sourceDoc: r.source_doc || 'Brand Guidelines 2026.pdf',
          dismissalCount: r.dismissal_count || 0
        }));
        setRulesList(mappedRules);
      }

      if (bClaims && bClaims.length > 0) {
        const mappedClaims: ClaimRecord[] = bClaims.map(c => ({
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
        setClaimsList(mappedClaims);
      }
    } catch {
      // Keep cached lists
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => {
    loadBackendGovernanceData();
  }, []);

  // Switch tab and keep URL in sync
  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('company_id', 'acme-global-brands');
      formData.append('category', 'Brand Guidelines');

      await uploadGuidelineDoc(formData);
      showToast(`Uploaded and indexed guideline document: "${file.name}"`);
      setShowUploadModal(false);
      await loadBackendGovernanceData();
    } catch (err: any) {
      showToast(`Upload error: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddClaimSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClaimText.trim()) return;

    try {
      await createClaim({
        company_id: 'acme-global-brands',
        claim_text: newClaimText.trim(),
        source_doc: newClaimSourceDoc,
        source_page: newClaimPage,
        owner: newClaimOwner,
        valid_to: newClaimValidTo,
        status: 'VERIFIED',
        context_notes: 'Verified via brand governance desk and supporting study.'
      });

      addClaim({
        claimText: newClaimText.trim(),
        sourceDoc: newClaimSourceDoc,
        sourcePage: newClaimPage,
        owner: newClaimOwner,
        validFrom: new Date().toISOString().slice(0, 10),
        validTo: newClaimValidTo,
        status: 'VERIFIED',
        contextNotes: 'Verified via brand governance desk and supporting study.'
      });

      await loadBackendGovernanceData();
      setShowAddClaimModal(false);
      setNewClaimText('');
      showToast('New approved claim registered and indexed');
    } catch (err: any) {
      showToast(`Failed to register claim: ${err.message}`);
    }
  };

  const handleAddRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleTitle.trim()) return;

    try {
      await createRule({
        company_id: 'acme-global-brands',
        title: newRuleTitle.trim(),
        category: 'terminology',
        rule_type: newRuleType,
        explanation: newRuleExplanation.trim(),
        term_or_pattern: newRuleTerm.trim() || undefined,
        preferred_alternative: newRuleAlternative.trim() || undefined,
        severity: newRuleSeverity,
        status: isOperations ? 'approved' : 'proposed',
        source_doc: 'Internal Governance Standard',
        source_page: 1
      });

      addRule({
        title: newRuleTitle.trim(),
        category: 'terminology',
        type: newRuleType,
        explanation: newRuleExplanation.trim(),
        termOrPattern: newRuleTerm.trim() || undefined,
        preferredAlternative: newRuleAlternative.trim() || undefined,
        severity: newRuleSeverity,
        status: isOperations ? 'approved' : 'proposed',
        sourceDoc: 'Internal Governance Standard'
      });

      await loadBackendGovernanceData();
      setShowAddRuleModal(false);
      setNewRuleTitle('');
      setNewRuleExplanation('');
      setNewRuleTerm('');
      setNewRuleAlternative('');
      showToast(isOperations ? 'Rule added and active in RAG index' : 'Rule proposed for Operations review');
    } catch (err: any) {
      showToast(`Failed to save rule: ${err.message}`);
    }
  };

  // Filtered guidelines
  const filteredGuidelines = guidelinesList.filter(g => {
    const q = guidelinesSearch.toLowerCase();
    return g.title.toLowerCase().includes(q) || 
           (g.fileName && g.fileName.toLowerCase().includes(q)) || 
           (g.samplePassage && g.samplePassage.toLowerCase().includes(q));
  });

  // Filtered claims
  const filteredClaims = claimsList.filter(c => {
    const matchesSearch = c.claimText.toLowerCase().includes(claimsSearch.toLowerCase()) ||
                          c.sourceDoc.toLowerCase().includes(claimsSearch.toLowerCase()) ||
                          c.owner.toLowerCase().includes(claimsSearch.toLowerCase());
    const matchesStatus = claimsStatusFilter === 'ALL' || c.status === claimsStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered rules
  const filteredRules = rulesList.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(rulesSearch.toLowerCase()) ||
                          r.explanation.toLowerCase().includes(rulesSearch.toLowerCase()) ||
                          (r.termOrPattern && r.termOrPattern.toLowerCase().includes(rulesSearch.toLowerCase()));
    const matchesType = rulesTypeFilter === 'all' || r.type === rulesTypeFilter;
    return matchesSearch && matchesType;
  });

  // Pre-approved disclaimers
  const preApprovedDisclaimers = [
    {
      id: 'disc-01',
      title: 'Enterprise High Availability SLA Standard Disclaimer',
      category: 'SLA & Uptime',
      text: 'Availability targets are commercially reasonable objectives and exclude scheduled maintenance announced with 48 hours notice. Proportional service credits apply in accordance with Service Level Schedule B.',
      ruleRef: 'LEGAL-SLA-99.9',
      mandatoryFor: 'Any collateral referencing cloud availability, reliability, or uptime metrics.',
      lastUpdated: '2026-10-15',
      status: 'Active'
    },
    {
      id: 'disc-02',
      title: 'Promotional Discount & Pricing Terms Notice',
      category: 'Pricing & Promotions',
      text: 'Promotional discounts apply to selected annual tiers only. Hardware, custom integrations, and professional consulting services are excluded. Cannot be combined with volume enterprise discounting. Offer valid through stated expiration dates.',
      ruleRef: 'PROMO-TERMS-01',
      mandatoryFor: 'All marketing copy mentioning percentage savings, flash sales, or limited-time pricing.',
      lastUpdated: '2026-10-18',
      status: 'Active'
    },
    {
      id: 'disc-03',
      title: 'EEA Cross-Border Data Transfer Standard Disclosure',
      category: 'Privacy & GDPR',
      text: 'BrandGuard Cloud processes customer metadata within sovereign regional data zones. All cross-border data transfers are executed under standard contractual clauses (SCCs) approved by the European Commission.',
      ruleRef: 'REG-EEA-04',
      mandatoryFor: 'EEA customer agreements, Nordic expansion briefs, and global cloud collateral.',
      lastUpdated: '2026-10-22',
      status: 'Active'
    }
  ];

  // Brand Color Palette Tokens
  const brandColorTokens = [
    {
      name: 'Deep Ink',
      token: '--color-deep-ink',
      hex: '#14212B',
      rgb: 'rgb(20, 33, 43)',
      role: 'Primary typography, dark surfaces, structural boundaries, header text.',
      wcagRatio: '14.8:1 (AAA Pass)',
      status: 'Approved'
    },
    {
      name: 'Warm Ivory',
      token: '--color-warm-ivory',
      hex: '#F7F5F0',
      rgb: 'rgb(247, 245, 240)',
      role: 'Canvas background, readable document paper texture, subtle card panels.',
      wcagRatio: '14.8:1 (AAA Pass)',
      status: 'Approved'
    },
    {
      name: 'Signal Coral',
      token: '--color-signal-coral',
      hex: 'var(--primary)',
      rgb: 'rgb(241, 107, 80)',
      role: 'Primary brand accent, interactive buttons, critical notification highlights.',
      wcagRatio: '3.2:1 (Large text or white background)',
      status: 'Approved'
    },
    {
      name: 'Evidence Teal',
      token: '--color-evidence-teal',
      hex: 'var(--info)',
      rgb: 'rgb(22, 124, 120)',
      role: 'Audit verification badge, verified fact claims, cryptographic seal highlight.',
      wcagRatio: '5.1:1 (AA Normal Text Pass)',
      status: 'Approved'
    },
    {
      name: 'Muted Slate',
      token: '--color-muted-slate',
      hex: '#64727D',
      rgb: 'rgb(100, 114, 125)',
      role: 'Secondary body text, metadata timestamps, table headers, breadcrumb links.',
      wcagRatio: '4.6:1 (AA Normal Text Pass)',
      status: 'Approved'
    },
    {
      name: 'Border Gray',
      token: '--color-border-gray',
      hex: '#DDE2E2',
      rgb: 'rgb(221, 226, 226)',
      role: 'Hairline grid dividers, card borders, tab underlines, subtle borders.',
      wcagRatio: 'Structural separator',
      status: 'Approved'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            backgroundColor: 'var(--text-primary)',
            color: '#FFFFFF',
            padding: '10px 18px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            fontSize: '0.85rem',
            zIndex: 1100,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={16} color="var(--info)" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: '0 0 4px', color: 'var(--text-primary)' }}>
            Brand Guidelines
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
            Manage brand rules, approved claims, terminology, disclaimers, and brand assets in one place.
          </p>
        </div>

        {/* Tab-Contextual Primary Action */}
        <div>
          {activeTab === 'guidelines' && (
            <button 
              onClick={() => setShowUploadModal(true)}
              className="btn btn-primary btn-sm"
              style={{ gap: '6px' }}
            >
              <Upload size={14} />
              <span>Upload Document</span>
            </button>
          )}

          {activeTab === 'claims' && (
            <button 
              onClick={() => setShowAddClaimModal(true)}
              className="btn btn-primary btn-sm"
              style={{ gap: '6px' }}
            >
              <PlusCircle size={14} />
              <span>Add Approved Claim</span>
            </button>
          )}

          {activeTab === 'rules' && (
            <button 
              onClick={() => setShowAddRuleModal(true)}
              className="btn btn-primary btn-sm"
              style={{ gap: '6px' }}
            >
              <Plus size={14} />
              <span>Add New Rule</span>
            </button>
          )}
        </div>
      </div>

      {/* 5 Simple Category Tabs */}
      <div 
        style={{ 
          display: 'flex', 
          borderBottom: '1px solid var(--border)', 
          gap: '4px',
          overflowX: 'auto',
          paddingBottom: '0px'
        }}
      >
        <button
          onClick={() => switchTab('guidelines')}
          style={{
            padding: '10px 16px',
            fontSize: '0.86rem',
            fontWeight: activeTab === 'guidelines' ? 700 : 500,
            color: activeTab === 'guidelines' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'guidelines' ? '2px solid var(--primary)' : '2px solid transparent',
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
          <BookOpen size={16} />
          <span>Brand Guidelines ({guidelinesList.length})</span>
        </button>

        <button
          onClick={() => switchTab('claims')}
          style={{
            padding: '10px 16px',
            fontSize: '0.86rem',
            fontWeight: activeTab === 'claims' ? 700 : 500,
            color: activeTab === 'claims' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'claims' ? '2px solid var(--primary)' : '2px solid transparent',
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
          <Database size={16} />
          <span>Approved Claims ({claimsList.length})</span>
        </button>

        <button
          onClick={() => switchTab('rules')}
          style={{
            padding: '10px 16px',
            fontSize: '0.86rem',
            fontWeight: activeTab === 'rules' ? 700 : 500,
            color: activeTab === 'rules' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'rules' ? '2px solid var(--primary)' : '2px solid transparent',
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
          <ShieldCheck size={16} />
          <span>Terminology & Rules ({rulesList.length})</span>
        </button>

        <button
          onClick={() => switchTab('disclaimers')}
          style={{
            padding: '10px 16px',
            fontSize: '0.86rem',
            fontWeight: activeTab === 'disclaimers' ? 700 : 500,
            color: activeTab === 'disclaimers' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'disclaimers' ? '2px solid var(--primary)' : '2px solid transparent',
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
          <span>Required Disclaimers ({preApprovedDisclaimers.length})</span>
        </button>

        <button
          onClick={() => switchTab('assets')}
          style={{
            padding: '10px 16px',
            fontSize: '0.86rem',
            fontWeight: activeTab === 'assets' ? 700 : 500,
            color: activeTab === 'assets' ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'assets' ? '2px solid var(--primary)' : '2px solid transparent',
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
          <span>Brand Assets ({brandColorTokens.length + 3})</span>
        </button>
      </div>

      {/* =========================================================================
          CATEGORY 1: BRAND GUIDELINES
          ========================================================================= */}
      {activeTab === 'guidelines' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search bar */}
          <div className="card-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '400px' }}>
              <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                value={guidelinesSearch}
                onChange={(e) => setGuidelinesSearch(e.target.value)}
                placeholder="Search guideline documents..."
                style={{ 
                  width: '100%', 
                  padding: '7px 12px 7px 32px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border)', 
                  fontSize: '0.84rem', 
                  backgroundColor: 'var(--surface-subtle)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Showing {filteredGuidelines.length} of {guidelinesList.length} documents
            </span>
          </div>

          {/* Guidelines Table */}
          {filteredGuidelines.length === 0 ? (
            <div className="card-panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <BookOpen size={36} color="var(--text-muted)" style={{ marginBottom: '10px', opacity: 0.7 }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>No guideline documents found</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '6px 0 16px' }}>
                {guidelinesSearch ? 'No documents match your search query.' : 'No brand manuals or guideline playbooks uploaded yet.'}
              </p>
              <button onClick={() => setShowUploadModal(true)} className="btn btn-primary btn-sm">
                Upload Document
              </button>
            </div>
          ) : (
            <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 20px', color: 'var(--text-primary)', fontWeight: 600 }}>Name</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>Sample Guidance</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>Rules Configured</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>Last Updated</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuidelines.map(doc => (
                    <tr key={doc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <FileText size={18} color="var(--info)" style={{ flexShrink: 0 }} />
                          <div>
                            <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                              {doc.title}
                            </strong>
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {doc.fileName} • {doc.fileSize} • v{doc.version}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', maxWidth: '320px' }}>
                        <p style={{ 
                          fontSize: '0.78rem', 
                          color: 'var(--text-muted)', 
                          margin: 0,
                          lineHeight: 1.45,
                          fontStyle: 'italic',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          &quot;{doc.samplePassage}&quot;
                        </p>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                          {doc.approvedRulesCount} Active
                        </span>
                        {doc.proposedRulesCount > 0 && (
                          <span style={{ fontSize: '0.74rem', color: 'var(--primary)', display: 'block' }}>
                            {doc.proposedRulesCount} Proposed
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span className="badge badge-info" style={{ fontSize: '0.68rem', textTransform: 'capitalize' }}>
                          {doc.status}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {doc.uploadedAt}
                      </td>

                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedGuideline(doc)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '4px' }}
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          CATEGORY 2: Approved CLAIMS
          ========================================================================= */}
      {activeTab === 'claims' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Claims Filter Bar */}
          <div className="card-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '380px' }}>
              <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                value={claimsSearch}
                onChange={(e) => setClaimsSearch(e.target.value)}
                placeholder="Search claims by text, source, or owner..."
                style={{ 
                  width: '100%', 
                  padding: '7px 12px 7px 32px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border)', 
                  fontSize: '0.84rem', 
                  backgroundColor: 'var(--surface-subtle)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(['ALL', 'VERIFIED', 'EXPIRING_SOON', 'EXPIRED', 'NEEDS_VERIFICATION'] as const).map(st => (
                <button
                  key={st}
                  onClick={() => setClaimsStatusFilter(st)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.74rem',
                    fontWeight: claimsStatusFilter === st ? 700 : 500,
                    backgroundColor: claimsStatusFilter === st ? 'var(--info)' : 'var(--surface-subtle)',
                    color: claimsStatusFilter === st ? '#FFFFFF' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer'
                  }}
                >
                  {st === 'ALL' ? 'All' : st.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Claims Table */}
          {filteredClaims.length === 0 ? (
            <div className="card-panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <Database size={36} color="var(--text-muted)" style={{ marginBottom: '10px', opacity: 0.7 }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>No claims found</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '6px 0 16px' }}>
                {claimsSearch || claimsStatusFilter !== 'ALL' 
                  ? 'No approved claims match your current filter settings.' 
                  : 'No verified claims currently authorized in this workspace.'}
              </p>
              <button onClick={() => setShowAddClaimModal(true)} className="btn btn-primary btn-sm">
                Add Approved Claim
              </button>
            </div>
          ) : (
            <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 20px', color: 'var(--text-primary)', fontWeight: 600 }}>Claim</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>Supporting Evidence</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>Validity Window</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.map(claim => {
                    const statusStyles: Record<ClaimStatus, { label: string; class: string }> = {
                      VERIFIED: { label: 'Verified', class: 'badge-success' },
                      EXPIRING_SOON: { label: 'Expiring Soon', class: 'badge-warning' },
                      EXPIRED: { label: 'Expired', class: 'badge-danger' },
                      NEEDS_VERIFICATION: { label: 'Needs Verification', class: 'badge-neutral' }
                    };
                    const badge = statusStyles[claim.status] || { label: claim.status, class: 'badge-neutral' };

                    return (
                      <tr key={claim.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px 20px', maxWidth: '340px' }}>
                          <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.88rem', marginBottom: '3px' }}>
                            &quot;{claim.claimText}&quot;
                          </strong>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            ID: {claim.id}
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <span style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                            {claim.sourceDoc} (p. {claim.sourcePage})
                          </span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            Owner: {claim.owner}
                          </span>
                        </td>

                        <td style={{ padding: '14px 16px', fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {claim.validFrom} → {claim.validTo}
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <span className={`badge ${badge.class}`} style={{ fontSize: '0.68rem' }}>
                            {badge.label}
                          </span>
                        </td>

                        <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                          <button
                            onClick={() => setSelectedClaim(claim)}
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '4px' }}
                          >
                            <Eye size={12} />
                            <span>View</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          CATEGORY 3: TERMINOLOGY & RULES
          ========================================================================= */}
      {activeTab === 'rules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Rules Filter Bar */}
          <div className="card-panel" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '380px' }}>
              <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                value={rulesSearch}
                onChange={(e) => setRulesSearch(e.target.value)}
                placeholder="Search rules, banned terms, alternatives..."
                style={{ 
                  width: '100%', 
                  padding: '7px 12px 7px 32px', 
                  borderRadius: 'var(--radius-md)', 
                  border: '1px solid var(--border)', 
                  fontSize: '0.84rem', 
                  backgroundColor: 'var(--surface-subtle)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['all', 'prohibited_term', 'preferred_alternative', 'disclaimer', 'restriction'].map(t => (
                <button
                  key={t}
                  onClick={() => setRulesTypeFilter(t)}
                  style={{
                    padding: '5px 11px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.74rem',
                    fontWeight: rulesTypeFilter === t ? 700 : 500,
                    backgroundColor: rulesTypeFilter === t ? 'var(--primary)' : 'var(--surface-subtle)',
                    color: rulesTypeFilter === t ? '#FFFFFF' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                    cursor: 'pointer'
                  }}
                >
                  {t === 'all' ? 'All Types' : t.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Rules Table */}
          {filteredRules.length === 0 ? (
            <div className="card-panel" style={{ textAlign: 'center', padding: '40px 20px' }}>
              <ShieldCheck size={36} color="var(--text-muted)" style={{ marginBottom: '10px', opacity: 0.7 }} />
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>No rules found</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '6px 0 16px' }}>
                {rulesSearch || rulesTypeFilter !== 'all' 
                  ? 'No terminology or language rules match your search.' 
                  : 'No rules configured yet.'}
              </p>
              <button onClick={() => setShowAddRuleModal(true)} className="btn btn-primary btn-sm">
                Add New Rule
              </button>
            </div>
          ) : (
            <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '12px 20px', color: 'var(--text-primary)', fontWeight: 600 }}>Rule Name</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>Prohibited / Target</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>Preferred Alternative</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>Severity</th>
                    <th style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.map(rule => (
                    <tr key={rule.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '14px 20px', maxWidth: '300px' }}>
                        <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                          {rule.title}
                        </strong>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {rule.explanation}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {rule.termOrPattern ? (
                          <code style={{ 
                            padding: '3px 7px', 
                            backgroundColor: 'rgba(241, 107, 80, 0.1)', 
                            color: 'var(--primary)', 
                            borderRadius: '4px', 
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}>
                            {rule.termOrPattern}
                          </code>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {rule.preferredAlternative ? (
                          <code style={{ 
                            padding: '3px 7px', 
                            backgroundColor: 'rgba(22, 124, 120, 0.1)', 
                            color: 'var(--info)', 
                            borderRadius: '4px', 
                            fontSize: '0.8rem',
                            fontWeight: 600
                          }}>
                            {rule.preferredAlternative}
                          </code>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge ${rule.severity === 'critical' ? 'badge-danger' : rule.severity === 'warning' ? 'badge-warning' : 'badge-neutral'}`} style={{ fontSize: '0.65rem' }}>
                          {rule.severity}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge ${rule.status === 'approved' ? 'badge-info' : 'badge-neutral'}`} style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>
                          {rule.status}
                        </span>
                      </td>

                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          {rule.status === 'proposed' && isOperations ? (
                            <>
                              <button onClick={() => { approveRule(rule.id); showToast('Rule approved and active'); }} className="btn btn-teal btn-sm" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>
                                Approve
                              </button>
                              <button onClick={() => { rejectRule(rule.id); showToast('Rule rejected'); }} className="btn btn-secondary btn-sm" style={{ padding: '3px 8px', fontSize: '0.72rem' }}>
                                Reject
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setSelectedRule(rule)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '4px' }}
                            >
                              <Eye size={12} />
                              <span>View</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          CATEGORY 4: REQUIRED DISCLAIMERS
          ========================================================================= */}
      {activeTab === 'disclaimers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '12px 20px', color: 'var(--text-primary)', fontWeight: 600 }}>Disclaimer Name</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>Required Disclaimer Text</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>Required Scope</th>
                  <th style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {preApprovedDisclaimers.map(disc => (
                  <tr key={disc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '16px 20px', maxWidth: '240px' }}>
                      <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: '0.88rem', marginBottom: '4px' }}>
                        {disc.title}
                      </strong>
                      <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>
                        {disc.category}
                      </span>
                    </td>

                    <td style={{ padding: '16px 16px' }}>
                      <div 
                        style={{ 
                          padding: '10px 12px', 
                          borderRadius: 'var(--radius-sm)', 
                          backgroundColor: 'var(--surface-subtle)',
                          border: '1px solid var(--border)',
                          fontSize: '0.82rem',
                          color: 'var(--text-primary)',
                          lineHeight: 1.5,
                          fontStyle: 'italic'
                        }}
                      >
                        &quot;{disc.text}&quot;
                      </div>
                      <div style={{ marginTop: '4px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        Rule Ref: {disc.ruleRef}
                      </div>
                    </td>

                    <td style={{ padding: '16px 16px', maxWidth: '220px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {disc.mandatoryFor}
                    </td>

                    <td style={{ padding: '16px 16px' }}>
                      <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>
                        {disc.status}
                      </span>
                    </td>

                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => copyToClipboard(disc.text, disc.title)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '4px 10px', fontSize: '0.75rem', gap: '4px' }}
                      >
                        <Copy size={12} />
                        <span>Copy Text</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          CATEGORY 5: BRAND ASSETS
          ========================================================================= */}
      {activeTab === 'assets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Sub-Section 1: Official Logos */}
          <div className="card-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
              <div>
                <strong style={{ fontSize: '0.96rem', color: 'var(--text-primary)' }}>Official Brand Logos & Marks</strong>
                <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Approved vector logo assets for collateral, display cards, and verified publication seals.
                </span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {/* Asset 1: Light Logo */}
              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F5F0', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', color: '#14212B', letterSpacing: '-0.5px' }}>
                    Brand<span style={{ color: 'var(--primary)' }}>Guard</span>
                  </span>
                </div>
                <div>
                  <strong style={{ fontSize: '0.86rem', display: 'block', color: 'var(--text-primary)' }}>Primary Logo (Light Canvas)</strong>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Vector SVG • Deep Ink on Warm Ivory</span>
                </div>
                <button 
                  onClick={() => copyToClipboard('BrandGuard', 'Logo name')}
                  className="btn btn-secondary btn-sm"
                  style={{ alignSelf: 'flex-start', padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  <Copy size={12} />
                  <span>Copy Asset Info</span>
                </button>
              </div>

              {/* Asset 2: Dark Logo */}
              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#14212B', borderRadius: 'var(--radius-sm)' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.25rem', color: '#FFFFFF', letterSpacing: '-0.5px' }}>
                    Brand<span style={{ color: 'var(--primary)' }}>Guard</span>
                  </span>
                </div>
                <div>
                  <strong style={{ fontSize: '0.86rem', display: 'block', color: 'var(--text-primary)' }}>Inverted Logo (Dark Canvas)</strong>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Vector SVG • White on Deep Ink</span>
                </div>
                <button 
                  onClick={() => copyToClipboard('BrandGuard Dark', 'Dark logo asset info')}
                  className="btn btn-secondary btn-sm"
                  style={{ alignSelf: 'flex-start', padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  <Copy size={12} />
                  <span>Copy Asset Info</span>
                </button>
              </div>

              {/* Asset 3: Monogram Mark */}
              <div style={{ padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--info)', borderRadius: 'var(--radius-sm)' }}>
                  <ShieldCheck size={32} color="#FFFFFF" />
                </div>
                <div>
                  <strong style={{ fontSize: '0.86rem', display: 'block', color: 'var(--text-primary)' }}>Monogram Seal</strong>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Symbol Mark • Evidence Teal</span>
                </div>
                <button 
                  onClick={() => copyToClipboard('BrandGuard Seal', 'Monogram seal info')}
                  className="btn btn-secondary btn-sm"
                  style={{ alignSelf: 'flex-start', padding: '4px 10px', fontSize: '0.75rem' }}
                >
                  <Copy size={12} />
                  <span>Copy Asset Info</span>
                </button>
              </div>
            </div>
          </div>

          {/* Sub-Section 2: Color Palette Tokens Table */}
          <div className="card-panel" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-subtle)' }}>
              <strong style={{ fontSize: '0.96rem', color: 'var(--text-primary)' }}>Approved Brand Colors & Contrast Tokens</strong>
              <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                Tokens enforced deterministically during Image & Design Review against WCAG 2.1 AA (4.5:1) standards.
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--surface-subtle)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 20px', color: 'var(--text-primary)', fontWeight: 600 }}>Color Swatch & Name</th>
                  <th style={{ padding: '10px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>Hex & CSS Variable</th>
                  <th style={{ padding: '10px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>Intended Purpose</th>
                  <th style={{ padding: '10px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>WCAG Contrast</th>
                  <th style={{ padding: '10px 20px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600 }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {brandColorTokens.map(token => (
                  <tr key={token.name} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div 
                          style={{ 
                            width: '32px', 
                            height: '32px', 
                            borderRadius: 'var(--radius-sm)', 
                            backgroundColor: token.hex, 
                            border: '1px solid var(--border)',
                            flexShrink: 0
                          }} 
                        />
                        <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                          {token.name}
                        </strong>
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <code style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {token.hex}
                      </code>
                      <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {token.token}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', maxWidth: '300px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {token.role}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span className="badge badge-info" style={{ fontSize: '0.68rem' }}>
                        {token.wcagRatio}
                      </span>
                    </td>

                    <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                      <button
                        onClick={() => copyToClipboard(token.hex, `${token.name} HEX`)}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: '3px 8px', fontSize: '0.74rem', gap: '4px' }}
                      >
                        <Copy size={11} />
                        <span>Copy HEX</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALS & INSPECTION DRAWERS
          ========================================================================= */}

      {/* Modal: Guideline Detail Viewer */}
      {selectedGuideline && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.55)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
          }}
        >
          <div 
            className="card-panel" 
            style={{ 
              maxWidth: '560px', width: '100%', 
              backgroundColor: 'var(--surface)',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex', flexDirection: 'column', gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="var(--info)" />
                <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Guideline Document Details</strong>
              </div>
              <button onClick={() => setSelectedGuideline(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div>
              <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', display: 'block' }}>{selectedGuideline.title}</strong>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                {selectedGuideline.fileName} • {selectedGuideline.fileSize} • {selectedGuideline.pagesCount} Pages • Version {selectedGuideline.version}
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                SAMPLE GUIDELINE PASSAGE
              </label>
              <div style={{ padding: '12px', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontStyle: 'italic', lineHeight: 1.5, border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                &quot;{selectedGuideline.samplePassage}&quot;
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ padding: '10px', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Active Rules</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--info)' }}>{selectedGuideline.approvedRulesCount}</strong>
              </div>
              <div style={{ padding: '10px', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-sm)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Proposed Rules</span>
                <strong style={{ fontSize: '1.2rem', color: 'var(--primary)' }}>{selectedGuideline.proposedRulesCount}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
              <button onClick={() => setSelectedGuideline(null)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Claim Detail Viewer */}
      {selectedClaim && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.55)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
          }}
        >
          <div 
            className="card-panel" 
            style={{ 
              maxWidth: '540px', width: '100%', 
              backgroundColor: 'var(--surface)',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex', flexDirection: 'column', gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} color="var(--info)" />
                <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Approved Claim Record</strong>
              </div>
              <button onClick={() => setSelectedClaim(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '14px', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                EXACT AUTHORIZED STATEMENT
              </span>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                &quot;{selectedClaim.claimText}&quot;
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.82rem' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.74rem' }}>Supporting Source</span>
                <strong style={{ color: 'var(--text-primary)' }}>{selectedClaim.sourceDoc} (p. {selectedClaim.sourcePage})</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.74rem' }}>Claim Owner</span>
                <strong style={{ color: 'var(--text-primary)' }}>{selectedClaim.owner}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.74rem' }}>Validity Range</span>
                <span style={{ color: 'var(--text-primary)' }}>{selectedClaim.validFrom} → {selectedClaim.validTo}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.74rem' }}>Verification Status</span>
                <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>{selectedClaim.status}</span>
              </div>
            </div>

            {selectedClaim.contextNotes && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', backgroundColor: 'var(--surface-subtle)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                <strong>Evidence Notes: </strong>{selectedClaim.contextNotes}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button 
                onClick={() => copyToClipboard(selectedClaim.claimText, 'Claim statement')}
                className="btn btn-secondary btn-sm"
              >
                Copy Statement
              </button>
              <button onClick={() => setSelectedClaim(null)} className="btn btn-primary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Rule Detail Viewer */}
      {selectedRule && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.55)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
          }}
        >
          <div 
            className="card-panel" 
            style={{ 
              maxWidth: '540px', width: '100%', 
              backgroundColor: 'var(--surface)',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex', flexDirection: 'column', gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="var(--info)" />
                <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Brand Rule Inspection</strong>
              </div>
              <button onClick={() => setSelectedRule(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div>
              <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', display: 'block' }}>{selectedRule.title}</strong>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>{selectedRule.explanation}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ padding: '12px', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--primary)', display: 'block', fontWeight: 600 }}>TARGET / PROHIBITED</span>
                <code style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600 }}>{selectedRule.termOrPattern || 'None'}</code>
              </div>
              <div style={{ padding: '12px', backgroundColor: 'var(--surface-subtle)', borderRadius: 'var(--radius-md)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--info)', display: 'block', fontWeight: 600 }}>PREFERRED ALTERNATIVE</span>
                <code style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600 }}>{selectedRule.preferredAlternative || 'None'}</code>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              <span>Category: <strong>{selectedRule.category}</strong></span>
              <span>Source: <strong>{selectedRule.sourceDoc}</strong></span>
              <span>Severity: <strong>{selectedRule.severity}</strong></span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button onClick={() => setSelectedRule(null)} className="btn btn-primary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Upload Guideline Document */}
      {showUploadModal && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.55)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
          }}
        >
          <div 
            className="card-panel" 
            style={{ 
              maxWidth: '480px', width: '100%', 
              backgroundColor: 'var(--surface)',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex', flexDirection: 'column', gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Upload Brand Guideline Document</strong>
              <button onClick={() => setShowUploadModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div 
              style={{ 
                border: '2px dashed var(--info)', 
                backgroundColor: 'var(--surface-subtle)',
                borderRadius: 'var(--radius-md)',
                textAlign: 'center',
                padding: '30px 20px',
                position: 'relative'
              }}
            >
              <input 
                type="file" 
                accept=".pdf,.docx,.txt"
                onChange={handleFileUpload}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
              />
              <Upload size={32} color="var(--info)" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Click or drag & drop guideline manual
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '4px 0 12px' }}>
                Supports PDF, DOCX, and TXT brand manuals up to 25 MB
              </p>
              <span className="btn btn-secondary btn-sm" style={{ pointerEvents: 'none' }}>
                Browse Files
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowUploadModal(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Claim */}
      {showAddClaimModal && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.55)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
          }}
        >
          <div 
            className="card-panel" 
            style={{ 
              maxWidth: '500px', width: '100%', 
              backgroundColor: 'var(--surface)',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex', flexDirection: 'column', gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} color="var(--info)" />
                <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Add Approved Claim</strong>
              </div>
              <button onClick={() => setShowAddClaimModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddClaimSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Exact Authorized Claim Statement *
                </label>
                <textarea 
                  value={newClaimText}
                  onChange={(e) => setNewClaimText(e.target.value)}
                  placeholder="e.g. Delivers enterprise-grade 99.9% uptime across hybrid cloud deployments."
                  required
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--surface-subtle)',
                    color: 'var(--text-primary)',
                    fontSize: '0.85rem'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Source Document
                  </label>
                  <input 
                    type="text" 
                    value={newClaimSourceDoc}
                    onChange={(e) => setNewClaimSourceDoc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      fontSize: '0.82rem',
                      backgroundColor: 'var(--surface-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Page Number
                  </label>
                  <input 
                    type="number" 
                    value={newClaimPage}
                    onChange={(e) => setNewClaimPage(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      fontSize: '0.82rem',
                      backgroundColor: 'var(--surface-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Claim Owner
                  </label>
                  <input 
                    type="text" 
                    value={newClaimOwner}
                    onChange={(e) => setNewClaimOwner(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      fontSize: '0.82rem',
                      backgroundColor: 'var(--surface-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Expiration Date
                  </label>
                  <input 
                    type="date" 
                    value={newClaimValidTo}
                    onChange={(e) => setNewClaimValidTo(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      fontSize: '0.82rem',
                      backgroundColor: 'var(--surface-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowAddClaimModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Rule */}
      {showAddRuleModal && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(0, 0, 0, 0.55)', 
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: '20px'
          }}
        >
          <div 
            className="card-panel" 
            style={{ 
              maxWidth: '520px', width: '100%', 
              backgroundColor: 'var(--surface)',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex', flexDirection: 'column', gap: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="var(--info)" />
                <strong style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Add Brand Rule</strong>
              </div>
              <button onClick={() => setShowAddRuleModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddRuleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Rule Name *
                </label>
                <input 
                  type="text" 
                  value={newRuleTitle}
                  onChange={(e) => setNewRuleTitle(e.target.value)}
                  placeholder="e.g. Prohibit Unqualified Uptime Guarantee"
                  required
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    fontSize: '0.84rem',
                    backgroundColor: 'var(--surface-subtle)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                  Guidance & Explanation
                </label>
                <textarea 
                  value={newRuleExplanation}
                  onChange={(e) => setNewRuleExplanation(e.target.value)}
                  placeholder="Explain why this rule exists and how copywriters should write around it."
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border)',
                    fontSize: '0.84rem',
                    backgroundColor: 'var(--surface-subtle)',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Prohibited Term / Pattern
                  </label>
                  <input 
                    type="text" 
                    value={newRuleTerm}
                    onChange={(e) => setNewRuleTerm(e.target.value)}
                    placeholder="e.g. guaranteed 100% uptime"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      fontSize: '0.82rem',
                      backgroundColor: 'var(--surface-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Preferred Replacement
                  </label>
                  <input 
                    type="text" 
                    value={newRuleAlternative}
                    onChange={(e) => setNewRuleAlternative(e.target.value)}
                    placeholder="e.g. high availability"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      fontSize: '0.82rem',
                      backgroundColor: 'var(--surface-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Rule Type
                  </label>
                  <select 
                    value={newRuleType}
                    onChange={(e) => setNewRuleType(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      fontSize: '0.82rem',
                      backgroundColor: 'var(--surface-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="prohibited_term">Prohibited Term</option>
                    <option value="preferred_alternative">Preferred Alternative</option>
                    <option value="disclaimer">Disclaimer</option>
                    <option value="restriction">Restriction</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Severity
                  </label>
                  <select 
                    value={newRuleSeverity}
                    onChange={(e) => setNewRuleSeverity(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border)',
                      fontSize: '0.82rem',
                      backgroundColor: 'var(--surface-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <option value="critical">Critical</option>
                    <option value="warning">Warning</option>
                    <option value="advisory">Advisory</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowAddRuleModal(false)} className="btn btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  {isOperations ? 'Create & Activate Rule' : 'Submit Rule for Review'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
