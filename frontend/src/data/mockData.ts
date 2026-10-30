import { 
  ReviewDocument, 
  BrandRule, 
  ClaimRecord, 
  GuidelineDoc, 
  BrandPassportRecord, 
  ChangeRequest, 
  ContactLead,
  Project,
  ProjectFile 
} from '../types';

export const INITIAL_DOCUMENTS: ReviewDocument[] = [
  {
    id: 'doc-001',
    title: 'Q3 Enterprise Cloud Migration Announcement',
    type: 'plain_text',
    status: 'pending_review',
    author: 'Sarah Chen (Lead Product Marketer)',
    submittedAt: '2026-10-28 14:32',
    updatedAt: '2026-10-29 09:15',
    version: '1.2',
    intentCard: {
      goal: 'Drive Fortune 500 IT decision-makers to book enterprise platform migration consultations.',
      audience: 'Enterprise CIOs, VP Cloud Architecture, and Security Compliance Directors.',
      keyMessage: 'BrandGuard Cloud guarantees 100% uptime with revolutionary AI automation.'
    },
    content: `BrandGuard Cloud is an all-in-one revolutionary AI platform designed to automate enterprise brand compliance with zero human effort. Our groundbreaking proprietary neural engine delivers guaranteed 100% uptime across all hybrid cloud environments.

Unlike cheap legacy compliance scanners, BrandGuard is recognized as the world's most infallible brand safety network, eliminating 100% of brand risk overnight. Click below to experience effortless compliance without having to manually review any marketing collateral ever again.`,
    findings: [
      {
        id: 'f-101',
        category: 'claim_verification',
        severity: 'critical',
        textSpan: 'guaranteed 100% uptime across all hybrid cloud environments',
        explanation: 'Claim of 100% uptime contradicts the Engineering SLA Ledger. Max supported verifiable SLA is 99.99%. Absolute guarantees violate corporate risk guidelines.',
        ruleReference: 'CLAIMS-GOV-04: Availability & SLA Statement Limits',
        sourceDoc: 'Enterprise Master Service Agreement 2026',
        sourcePage: 12,
        claimOwner: 'DevOps / Infrastructure Legal Counsel',
        validDates: 'Active thru Dec 2026',
        suggestedCorrection: 'engineered for 99.99% target uptime across hybrid cloud deployments',
        status: 'open',
        feedback: null
      },
      {
        id: 'f-102',
        category: 'terminology',
        severity: 'warning',
        textSpan: 'revolutionary AI platform',
        explanation: '"Revolutionary AI" is flagged on the Prohibited Terminology Index. Use precise, evidence-grounded capabilities rather than promotional superlatives.',
        ruleReference: 'TERM-PROHIBITED-09: Unqualified AI Hype Words',
        sourceDoc: 'Corporate Editorial & Voice Stylebook',
        sourcePage: 6,
        claimOwner: 'Brand Strategy Committee',
        validDates: 'Permanent Rule',
        suggestedCorrection: 'enterprise-grade AI-assisted governance platform',
        status: 'open',
        feedback: null
      },
      {
        id: 'f-103',
        category: 'brand_rules',
        severity: 'critical',
        textSpan: 'with zero human effort ... without having to manually review any marketing collateral ever again',
        explanation: 'BrandGuard governance policy explicitly mandates human-in-the-loop accountability. Content must never imply that human review is eliminated or unnecessary.',
        ruleReference: 'BRAND-CORE-01: Human Authority & Oversight Mandate',
        sourceDoc: 'Brand Governance Charter v3.0',
        sourcePage: 2,
        claimOwner: 'Chief Brand Officer',
        validDates: 'Permanent Rule',
        suggestedCorrection: 'with assisted evidence verification while keeping your team in final approval control',
        status: 'open',
        feedback: null
      },
      {
        id: 'f-104',
        category: 'tone',
        severity: 'advisory',
        textSpan: 'cheap legacy compliance scanners',
        explanation: 'Comparative framing is overly aggressive. Brand voice guidelines require an authoritative, professional, and respectful tone toward market alternatives.',
        ruleReference: 'TONE-VOICE-07: Respectful Industry Stance',
        sourceDoc: 'Corporate Editorial & Voice Stylebook',
        sourcePage: 18,
        suggestedCorrection: 'traditional manual review checklists',
        status: 'open',
        feedback: null
      }
    ]
  },
  {
    id: 'doc-002',
    title: 'HealthCare Diagnostics 2026 Clinical Release',
    type: 'docx',
    status: 'approved',
    author: 'Dr. Marcus Vance (Director of Communications)',
    submittedAt: '2026-10-25 11:00',
    updatedAt: '2026-10-26 16:40',
    version: '2.0',
    reviewer: 'Elena Rostova (Senior Brand Governance Reviewer)',
    reviewerDecision: 'Approved with verified evidentiary citations and medical disclaimers intact.',
    reviewerNotes: 'All 3 clinical claims cross-checked against peer-reviewed validation ledger.',
    intentCard: {
      goal: 'Communicate diagnostic precision benchmark data to hospital clinical boards.',
      audience: 'Chief Medical Officers, Clinical Lab Directors, Pathology Chairs.',
      keyMessage: 'Rigorous peer-reviewed validation shows 98.4% diagnostic sensitivity.'
    },
    content: `The HealthCare Diagnostics Suite demonstrates 98.4% sensitivity in multi-site clinical trials across 12,000 anonymized patient samples. Independent research confirms a 42% reduction in diagnostic turnaround time compared to standard panel protocols.

All testing remains investigational in selected jurisdictions and is intended to supplement, not replace, certified pathologist review.`,
    findings: []
  },
  {
    id: 'doc-003',
    title: 'Nordic Market Partner Onboarding Campaign',
    type: 'html',
    status: 'changes_requested',
    author: 'Jonas Lindqvist (Regional Growth Manager)',
    submittedAt: '2026-10-27 08:20',
    updatedAt: '2026-10-28 10:15',
    version: '1.0',
    reviewer: 'Elena Rostova (Senior Brand Governance Reviewer)',
    reviewerDecision: 'Changes Requested: Regional GDPR data-retention disclaimer missing.',
    reviewerNotes: 'Please insert the standard Scandinavian EEA data residency disclosure before re-submitting.',
    intentCard: {
      goal: 'Recruit certified VAR distributors across Sweden, Norway, and Finland.',
      audience: 'Enterprise Value-Added Resellers and IT MSP Executives.',
      keyMessage: 'Accelerate localized enterprise compliance with turnkey sovereign data frameworks.'
    },
    content: `Expand your regional compliance portfolio with BrandGuard Nordic Partner Edition. Join our growing channel of certified resellers delivering automated policy enforcement across the EEA.`,
    findings: [
      {
        id: 'f-301',
        category: 'brand_rules',
        severity: 'critical',
        textSpan: 'automated policy enforcement across the EEA',
        explanation: 'Mandatory disclaimer required: European marketing assets mentioning EEA data flows must include the Sovereign Cloud Residency clause.',
        ruleReference: 'DISC-EEA-02: European Regional Cloud Disclaimer',
        sourceDoc: 'International Legal Disclosure Standard',
        sourcePage: 4,
        suggestedCorrection: 'assisted policy verification across the EEA under sovereign data residency safeguards',
        status: 'open',
        feedback: null
      }
    ]
  },
  {
    id: 'doc-004',
    title: 'Fintech Zero-Trust Security Whitepaper Overview',
    type: 'plain_text',
    status: 'draft',
    author: 'Sarah Chen (Lead Product Marketer)',
    submittedAt: '2026-10-29 16:00',
    updatedAt: '2026-10-29 16:00',
    version: '0.1',
    intentCard: {
      goal: 'Educate Tier 1 banking CISOs on multi-tenant cryptographic isolation.',
      audience: 'Bank CISOs and Cloud Security Officers.',
      keyMessage: 'Customer policy rules and proprietary claims are encrypted with tenant-isolated keys.'
    },
    content: `BrandGuard enforces strict cryptographic isolation for all corporate claim records and ingested brand playbooks. Every tenant repository is secured with customer-managed encryption keys.`,
    findings: []
  }
];

export const INITIAL_RULES: BrandRule[] = [
  {
    id: 'RULE-01',
    title: 'Human Authority in Publishing Decisions',
    category: 'brand_rules',
    type: 'restriction',
    explanation: 'No asset may claim or imply full automation without human oversight. BrandGuard acts as an evidence advisor, never an autonomous publisher.',
    severity: 'critical',
    status: 'approved',
    sourceDoc: 'Brand Governance Charter v3.0, Section 1.2',
    dismissalCount: 2
  },
  {
    id: 'RULE-02',
    title: 'Unqualified AI Hyperbole Prohibition',
    category: 'terminology',
    type: 'prohibited_term',
    termOrPattern: 'revolutionary AI, magic AI, infallible, 100% error-free',
    preferredAlternative: 'evidence-backed AI, verified intelligence, precision-assisted review',
    explanation: 'Promotional superlatives erode enterprise buyer trust and invite regulatory scrutiny regarding algorithmic accountability.',
    severity: 'warning',
    status: 'approved',
    sourceDoc: 'Corporate Editorial & Voice Stylebook, p. 6',
    dismissalCount: 8
  },
  {
    id: 'RULE-03',
    title: 'Target Availability SLA Quotation',
    category: 'claim_verification',
    type: 'approved_term',
    termOrPattern: '99.99% target availability',
    preferredAlternative: '99.99% target uptime (under Enterprise MSA)',
    explanation: 'Always state availability as "target availability" or cite the specific tier SLA. Absolute guarantees are strictly disallowed.',
    severity: 'critical',
    status: 'approved',
    sourceDoc: 'Master Customer Service Agreement 2026',
    dismissalCount: 1
  },
  {
    id: 'RULE-04',
    title: 'Derogatory Competitor Characterization',
    category: 'tone',
    type: 'voice',
    explanation: 'Maintain an elevated, respectful corporate posture. Do not use informal derogatory labels such as "cheap", "archaic", or "useless".',
    severity: 'advisory',
    status: 'approved',
    sourceDoc: 'Corporate Editorial & Voice Stylebook, p. 18',
    dismissalCount: 4
  },
  {
    id: 'RULE-05',
    title: 'WCAG 2.1 AA Contrast Ratio in Display Graphics',
    category: 'accessibility',
    type: 'restriction',
    explanation: 'Text overlays on product marketing cards must sustain a minimum contrast ratio of 4.5:1 against background colors.',
    severity: 'warning',
    status: 'approved',
    sourceDoc: 'Visual Asset & Digital Guidelines, p. 12',
    dismissalCount: 0
  },
  {
    id: 'RULE-06',
    title: 'Mandatory Non-Legal Advice Disclaimer',
    category: 'brand_rules',
    type: 'disclaimer',
    preferredAlternative: 'BrandGuard provides content and brand policy governance; it does not render formal legal counsel.',
    explanation: 'Collateral discussing regulatory compliance must carry the explicit non-legal advice boundary notation.',
    severity: 'critical',
    status: 'proposed',
    sourceDoc: 'Legal Risk Ingestion Pass - Oct 2026',
    dismissalCount: 0
  }
];

export const INITIAL_CLAIMS: ClaimRecord[] = [
  {
    id: 'CLM-2026-081',
    claimText: 'Processes over 100 million corporate governance checks annually with sub-second retrieval latency.',
    sourceDoc: 'Global Infrastructure Metrics Report 2026',
    sourcePage: 14,
    owner: 'Chief Platform Architect',
    validFrom: '2026-01-01',
    validTo: '2026-12-31',
    status: 'VERIFIED',
    contextNotes: 'Validated across Q1-Q3 aggregated platform audit telemetry.'
  },
  {
    id: 'CLM-2026-104',
    claimText: 'Reduces enterprise brand compliance review cycles by 65% across multi-department campaigns.',
    sourceDoc: 'Forrester Total Economic Impact Study',
    sourcePage: 9,
    owner: 'VP Product Marketing',
    validFrom: '2025-11-15',
    validTo: '2026-11-14',
    status: 'EXPIRING_SOON',
    contextNotes: 'Annual renewal study underway. Re-benchmarking scheduled for mid-November.'
  },
  {
    id: 'CLM-2025-012',
    claimText: 'First and only market platform featuring zero-knowledge tenant policy cryptographic segregation.',
    sourceDoc: 'Security Architecture Whitepaper 2024',
    sourcePage: 3,
    owner: 'Information Security Director',
    validFrom: '2024-06-01',
    validTo: '2025-12-31',
    status: 'EXPIRED',
    contextNotes: 'Expired claim. Competitive patents filed in 2025 make "only platform" factually unsupported.'
  },
  {
    id: 'CLM-2026-309',
    claimText: 'Awarded #1 Enterprise Brand Risk Governance Solution in Gartner Peer Insights 2026.',
    sourceDoc: 'Gartner Peer Insights Recognition Notice',
    sourcePage: 2,
    owner: 'Brand Strategy Director',
    validFrom: '2026-08-01',
    validTo: '2027-07-31',
    status: 'NEEDS_VERIFICATION',
    contextNotes: 'Pending final citation licensing agreement verification from Gartner legal desk.'
  }
];

export const INITIAL_GUIDELINES: GuidelineDoc[] = [
  {
    id: 'g-01',
    title: 'BrandGuard Global Brand Identity & Tone Master Guide',
    fileName: 'BrandGuard_Brand_Master_2026_v4.pdf',
    fileSize: '4.8 MB',
    uploadedAt: '2026-09-12 10:20',
    version: '4.2',
    status: 'indexed',
    pagesCount: 42,
    proposedRulesCount: 2,
    approvedRulesCount: 14,
    samplePassage: 'BrandGuard maintains an uncompromising stance on veracity. We never publish unsubstantiated superlatives. Precision precedes persuasion in all enterprise statements.'
  },
  {
    id: 'g-02',
    title: 'Healthcare & Life Sciences Claims Substantiation Standard',
    fileName: 'Clinical_Claims_Substantiation_Manual.docx',
    fileSize: '2.1 MB',
    uploadedAt: '2026-10-01 15:45',
    version: '1.0',
    status: 'indexed',
    pagesCount: 28,
    proposedRulesCount: 1,
    approvedRulesCount: 9,
    samplePassage: 'Statistical disclosures must cite sample sizes (N), confidence intervals, and reference peer-reviewed or internal validated bench trials.'
  },
  {
    id: 'g-03',
    title: 'Visual Assets & WCAG 2.1 AA Accessibility Manual',
    fileName: 'Accessibility_and_Visual_Design_v2.pdf',
    fileSize: '8.3 MB',
    uploadedAt: '2026-10-18 11:30',
    version: '2.1',
    status: 'indexed',
    pagesCount: 18,
    proposedRulesCount: 0,
    approvedRulesCount: 6,
    samplePassage: 'Color must never serve as the sole conveyor of meaning. Text-to-background contrast minimum is 4.5:1 for standard weights and 3:1 for display typography.'
  }
];

export const INITIAL_PASSPORT: BrandPassportRecord = {
  id: 'BP-2026-9921',
  documentId: 'doc-002',
  documentTitle: 'HealthCare Diagnostics 2026 Clinical Release',
  author: 'Dr. Marcus Vance (Director of Communications)',
  reviewer: 'Elena Rostova (Senior Brand Governance Reviewer)',
  approvedAt: '2026-10-26 16:40:22 UTC',
  governanceScore: 100,
  totalChecks: 24,
  criticalIssuesResolved: 3,
  warningsResolved: 2,
  evidenceCitations: [
    {
      claim: '98.4% diagnostic sensitivity across 12,000 multi-site trials',
      source: 'Clinical Validation Study Report 2026, Table 4, p. 19',
      owner: 'Clinical Research Legal Desk'
    },
    {
      claim: '42% reduction in diagnostic turnaround time compared to standard panel',
      source: 'Independent Hospital Operations Audit, p. 8',
      owner: 'VP Medical Affairs'
    }
  ],
  aiDisclosure: 'AI assistance utilized solely for citation cross-referencing and typographical verification. Final publishing decision rendered exclusively by human reviewer.',
  auditEvents: [
    {
      id: 'aud-01',
      timestamp: '2026-10-25 11:00:14',
      actor: 'Dr. Marcus Vance',
      role: 'Creator',
      action: 'Content Submitted',
      details: 'Initial manuscript submitted with Intent Card attachments.'
    },
    {
      id: 'aud-02',
      timestamp: '2026-10-25 11:00:19',
      actor: 'BrandGuard Automated Checker',
      role: 'System Engine',
      action: 'Diagnostic Verification',
      details: 'Identified 3 claim citations requiring ledger cross-matching; 0 brand violations.'
    },
    {
      id: 'aud-03',
      timestamp: '2026-10-26 16:38:05',
      actor: 'Elena Rostova',
      role: 'Reviewer',
      action: 'Manual Verification Verified',
      details: 'Verified Clinical Trial Table 4 citation accuracy against registered IRB protocol.'
    },
    {
      id: 'aud-04',
      timestamp: '2026-10-26 16:40:22',
      actor: 'Elena Rostova',
      role: 'Reviewer',
      action: 'Final Publishing Authorization',
      details: 'Brand Passport certificate issued and locked against future tampering.'
    }
  ]
};

export const INITIAL_CHANGE_REQUESTS: ChangeRequest[] = [
  {
    id: 'CR-801',
    type: 'Claim Expiry Extension',
    title: 'Extend Forrester 65% Efficiency Claim during Annual Audit',
    description: 'The Forrester study claim (CLM-2026-104) reaches its 12-month review window on Nov 14. Requesting a 45-day bridge extension while the 2027 study is finalized.',
    priority: 'high',
    requestedBy: 'Sarah Chen (Lead Product Marketer)',
    submittedAt: '2026-10-28 17:00',
    status: 'pending_review',
    adminResponse: 'Under review by Chief Legal Officer. Verification of interim survey methodology required.'
  },
  {
    id: 'CR-802',
    type: 'New Disclaimer',
    title: 'Introduce Latin American Mercosur Regulatory Disclaimer',
    description: 'Addition of localized medical equipment disclaimer for upcoming commercial launch across Brazil, Argentina, and Chile.',
    priority: 'medium',
    requestedBy: 'Carlos Mendez (Regional Director)',
    submittedAt: '2026-10-20 09:30',
    status: 'approved',
    adminResponse: 'Approved and merged into International Legal Standard pack.'
  }
];

export const INITIAL_LEADS: ContactLead[] = [
  {
    id: 'lead-01',
    name: 'David K. Reynolds',
    email: 'd.reynolds@astrahealth.com',
    company: 'AstraHealth Global',
    teamSize: '50-200 members',
    message: 'We are seeking an evidence-first brand governance platform for 400 global medical copywriters and reviewers.',
    submittedAt: '2026-10-29 11:15'
  },
  {
    id: 'lead-02',
    name: 'Helena Berg',
    email: 'hberg@nordicfintech.se',
    company: 'Nordic Bank Financial',
    teamSize: '20-50 members',
    message: 'Need automated terminology checks and verified claim ledgers before external marketing release.',
    submittedAt: '2026-10-28 15:40'
  }
];

export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj-summer-2027',
    name: 'Summer Sale 2027',
    description: 'Global mid-year marketing campaign, promotional offers, and digital ad creative.',
    status: 'in_review',
    createdAt: '2026-10-15',
    updatedAt: '2026-10-30',
    clientName: 'Acme Global Brands',
    owner: 'Sarah Chen (Lead Marketer)',
    auditLog: [
      {
        id: 'aud-sum-01',
        timestamp: '2026-10-15 10:00',
        actor: 'Sarah Chen',
        role: 'Lead Marketer',
        action: 'Project Created',
        details: 'Initialized Summer Sale 2027 governance repository for Acme Global Brands.'
      },
      {
        id: 'aud-sum-02',
        timestamp: '2026-10-28 14:20',
        actor: 'Sarah Chen',
        role: 'Lead Marketer',
        action: 'Asset Uploaded',
        details: 'Uploaded Summer_Sale_Promotional_Brief.docx (v1.0).'
      },
      {
        id: 'aud-sum-03',
        timestamp: '2026-10-29 09:15',
        actor: 'Sarah Chen',
        role: 'Lead Marketer',
        action: 'Asset Uploaded',
        details: 'Uploaded Promotional_Discount_Terms_Addendum.pdf (v0.9).'
      },
      {
        id: 'aud-sum-04',
        timestamp: '2026-10-29 14:10',
        actor: 'BrandGuard Engine',
        role: 'Automated Inspector',
        action: 'Review Completed',
        details: 'Flagged 2 policy findings on Promotional_Discount_Terms_Addendum.pdf.'
      }
    ],
    files: [
      {
        id: 'f-01',
        name: 'Summer_Sale_Promotional_Brief.docx',
        type: 'docx',
        reviewType: 'content',
        uploadedAt: '2026-10-28 14:20',
        status: 'in_progress',
        size: '1.4 MB',
        documentId: 'doc-001',
        version: '1.0',
        originalText: 'BrandGuard Cloud is an enterprise governance platform. Our platform is engineered to deliver guaranteed 100% uptime across all hybrid cloud deployments with assisted evidence verification while keeping your team in final approval control.',
        currentText: 'BrandGuard Cloud is an enterprise governance platform. Our platform is engineered to deliver guaranteed 100% uptime across all hybrid cloud deployments with assisted evidence verification while keeping your team in final approval control.',
        versionHistory: [
          {
            version: '1.0',
            text: 'BrandGuard Cloud is an enterprise governance platform. Our platform is engineered to deliver guaranteed 100% uptime across all hybrid cloud deployments with assisted evidence verification while keeping your team in final approval control.',
            modifiedAt: '2026-10-28 14:20',
            modifiedBy: 'Sarah Chen',
            findingsCount: 3
          }
        ],
        findings: [
          {
            id: 'fnd-cnt-1',
            category: 'brand_rules',
            severity: 'critical',
            textSpan: 'guaranteed 100% uptime',
            explanation: 'Absolute SLA guarantees are prohibited by enterprise risk policy SLA-ABS-01. Target availability must not exceed 99.9%.',
            ruleReference: 'BRAND-RULE-101: Absolute SLA Prohibited',
            suggestedCorrection: 'enterprise-grade high availability',
            status: 'open'
          },
          {
            id: 'fnd-cnt-2',
            category: 'tone',
            severity: 'warning',
            textSpan: 'is engineered to deliver',
            explanation: 'Passive construction reduces clarity and executive impact. Brand guidelines recommend active voice verbs.',
            ruleReference: 'TONE-042: Active Voice Over Passive',
            suggestedCorrection: 'delivers',
            status: 'open'
          }
        ],
        findingsCount: 2
      },
      {
        id: 'f-02',
        name: 'Promotional_Discount_Terms_Addendum.pdf',
        type: 'pdf',
        reviewType: 'promotions',
        uploadedAt: '2026-10-29 09:15',
        status: 'needs_changes',
        size: '840 KB',
        version: '0.9',
        originalText: 'Flash Sale: 70% off everything on BrandGuard Cloud! Valid through Dec 31, 2027.',
        currentText: 'Flash Sale: 70% off everything on BrandGuard Cloud! Valid through Dec 31, 2027.',
        versionHistory: [
          {
            version: '0.9',
            text: 'Flash Sale: 70% off everything on BrandGuard Cloud! Valid through Dec 31, 2027.',
            modifiedAt: '2026-10-29 09:15',
            modifiedBy: 'Sarah Chen',
            findingsCount: 2
          }
        ],
        findings: [
          {
            id: 'fnd-promo-1',
            category: 'claim_verification',
            severity: 'critical',
            textSpan: '70% off everything',
            explanation: 'Offer terms in Ledger Claim #CLM-2024-089 restrict discounts to selected annual enterprise tiers; consulting and hardware are excluded.',
            ruleReference: 'PROMO-OFFER-089: Ledger Claim Scope Mismatch',
            sourceDoc: 'Brand Guidelines 2026.pdf',
            sourcePage: 14,
            claimOwner: 'VP Marketing',
            validDates: '2026-10-01 to 2026-11-30',
            suggestedCorrection: 'Up to 70% off selected annual tiers*',
            status: 'open'
          },
          {
            id: 'fnd-promo-2',
            category: 'claim_verification',
            severity: 'warning',
            textSpan: 'Dec 31, 2027',
            explanation: 'Promotional validity period exceeds authorized financial ledger date of Nov 30, 2026.',
            ruleReference: 'FIN-DATE-2026: Unauthorized Promotion Expiration Date',
            sourceDoc: 'Finance Ledger Addendum B',
            sourcePage: 3,
            suggestedCorrection: 'Nov 30, 2026',
            status: 'open'
          }
        ],
        findingsCount: 2
      },
      {
        id: 'f-03',
        name: 'Master_Enterprise_Legal_Terms.docx',
        type: 'docx',
        reviewType: 'legal',
        uploadedAt: '2026-10-27 16:30',
        status: 'awaiting_verification',
        size: '2.8 MB',
        version: '1.0',
        originalText: `MASTER ENTERPRISE SUBSCRIPTION AGREEMENT (ADDENDUM 4B)
1. SERVICE LEVEL COMMITMENT
Provider shall guarantee 100% uptime across all hybrid cloud deployments without exception for scheduled maintenance. In the event of any service disruption, customer shall receive an immediate 100% cash refund of all annual licensing fees.

2. GOVERNING COMPLIANCE
All customer telemetry processed through BrandGuard Cloud shall comply with cross-border data transfer protocols under EEA guidelines.`,
        currentText: `MASTER ENTERPRISE SUBSCRIPTION AGREEMENT (ADDENDUM 4B)
1. SERVICE LEVEL COMMITMENT
Provider shall guarantee 100% uptime across all hybrid cloud deployments without exception for scheduled maintenance. In the event of any service disruption, customer shall receive an immediate 100% cash refund of all annual licensing fees.

2. GOVERNING COMPLIANCE
All customer telemetry processed through BrandGuard Cloud shall comply with cross-border data transfer protocols under EEA guidelines.`,
        versionHistory: [
          {
            version: '1.0',
            text: `MASTER ENTERPRISE SUBSCRIPTION AGREEMENT (ADDENDUM 4B)
1. SERVICE LEVEL COMMITMENT
Provider shall guarantee 100% uptime across all hybrid cloud deployments without exception for scheduled maintenance. In the event of any service disruption, customer shall receive an immediate 100% cash refund of all annual licensing fees.

2. GOVERNING COMPLIANCE
All customer telemetry processed through BrandGuard Cloud shall comply with cross-border data transfer protocols under EEA guidelines.`,
            modifiedAt: '2026-10-27 16:30',
            modifiedBy: 'Legal Counsel',
            findingsCount: 1
          }
        ],
        findings: [
          {
            id: 'fnd-legal-1',
            category: 'brand_rules',
            severity: 'critical',
            textSpan: 'guarantee 100% uptime across all hybrid cloud deployments without exception for scheduled maintenance. In the event of any service disruption, customer shall receive an immediate 100% cash refund',
            explanation: 'Absolute 100% SLA guarantees and cash refunds are prohibited by enterprise policy SLA-ABS-01. Approved clause requires 99.9% availability and service credits.',
            ruleReference: 'SLA-ABS-01: Prohibited Absolute Availability & Cash Penalties',
            sourceDoc: 'Enterprise Master Terms 2026.pdf',
            sourcePage: 8,
            suggestedCorrection: 'target 99.9% commercially reasonable availability, excluding scheduled maintenance windows announced with 48 hours notice. In the event of disruption exceeding SLA thresholds, customer shall be eligible for proportional service credits',
            status: 'open'
          }
        ],
        findingsCount: 1
      },
      {
        id: 'f-04',
        name: 'Campaign_Hero_Banner_1200x630.png',
        type: 'png',
        reviewType: 'images',
        uploadedAt: '2026-10-29 11:00',
        status: 'needs_changes',
        size: '3.2 MB',
        detectedColors: ['#14212B', '#F7F5F0', '#F16B50', '#9B51E0'],
        contrastRatio: 3.2,
        altText: 'BrandGuard cloud governance dashboard preview with active compliance rules.',
        findingsCount: 2
      },
      {
        id: 'f-05',
        name: 'Summer_Promotion_Teaser_30s.mp4',
        type: 'mp4',
        reviewType: 'videos',
        uploadedAt: '2026-10-30 08:45',
        status: 'not_reviewed',
        size: '48.5 MB',
        videoChecklist: {
          introLogo: true,
          superTitleDuration: false,
          audioDisclaimer: true,
          termsNotice: false
        },
        findingsCount: 0
      }
    ]
  },
  {
    id: 'proj-product-launch',
    name: 'New Product Launch',
    description: 'Strategic rollout collateral, clinical trial release, and global press announcements.',
    status: 'approved',
    createdAt: '2026-10-01',
    updatedAt: '2026-10-26',
    clientName: 'Acme Global Brands',
    owner: 'Dr. Marcus Vance (Director of Communications)',
    files: [
      {
        id: 'f-06',
        name: 'Clinical_Diagnostics_Whitepaper.pdf',
        type: 'pdf',
        reviewType: 'content',
        uploadedAt: '2026-10-25 11:00',
        status: 'approved',
        size: '4.2 MB',
        documentId: 'doc-002',
        findingsCount: 0
      },
      {
        id: 'f-07',
        name: 'FDA_EU_Regulatory_Substantiation.docx',
        type: 'docx',
        reviewType: 'legal',
        uploadedAt: '2026-10-24 15:00',
        status: 'approved',
        size: '1.9 MB',
        findingsCount: 0
      },
      {
        id: 'f-08',
        name: 'Launch_Product_KeyVisual_HighRes.png',
        type: 'png',
        reviewType: 'images',
        uploadedAt: '2026-10-26 10:15',
        status: 'approved',
        size: '5.1 MB',
        findingsCount: 0
      }
    ]
  },
  {
    id: 'proj-emea-expansion',
    name: 'EMEA Regional Expansion',
    description: 'Localized EEA multilingual collateral, GDPR compliance disclaimers, and reseller kits.',
    status: 'active',
    createdAt: '2026-10-20',
    updatedAt: '2026-10-29',
    clientName: 'Acme Global Brands',
    owner: 'Elena Rostova (Operations Reviewer)',
    files: [
      {
        id: 'f-09',
        name: 'Nordic_Partner_Announcement.html',
        type: 'html',
        reviewType: 'content',
        uploadedAt: '2026-10-28 12:00',
        status: 'in_progress',
        size: '520 KB',
        documentId: 'doc-003',
        findingsCount: 1
      },
      {
        id: 'f-10',
        name: 'Cross_Border_Data_Transfer_Terms.docx',
        type: 'docx',
        reviewType: 'legal',
        uploadedAt: '2026-10-29 14:10',
        status: 'not_reviewed',
        size: '1.1 MB',
        findingsCount: 0
      }
    ]
  },
  {
    id: 'proj-vanguard-oncology',
    name: 'Oncology Therapeutics Release',
    description: 'Phase III clinical data release, physician advisory briefs, and FDA accelerated pathway collateral.',
    status: 'in_review',
    createdAt: '2026-10-22',
    updatedAt: '2026-10-30',
    clientName: 'Vanguard Life Sciences',
    owner: 'Dr. Aris Thorne (Chief Medical Writer)',
    files: [
      {
        id: 'f-11',
        name: 'Vanguard_Oncology_Phase3_Manuscript.docx',
        type: 'docx',
        reviewType: 'content',
        uploadedAt: '2026-10-28 09:30',
        status: 'in_progress',
        size: '3.6 MB',
        findingsCount: 2
      },
      {
        id: 'f-12',
        name: 'FDA_Accelerated_Approval_Addendum.pdf',
        type: 'pdf',
        reviewType: 'legal',
        uploadedAt: '2026-10-29 15:45',
        status: 'awaiting_verification',
        size: '1.7 MB',
        findingsCount: 1
      }
    ]
  }
];


