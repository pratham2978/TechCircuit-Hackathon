import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  AccountType,
  UserRole, 
  ReviewDocument, 
  BrandRule, 
  ClaimRecord, 
  GuidelineDoc, 
  BrandPassportRecord, 
  ChangeRequest, 
  ContactLead,
  DismissalReason,
  Finding,
  Project,
  ProjectFile,
  ProjectStatus,
  ReviewItemStatus,
  FileVersionRecord,
  ProjectAuditEntry
} from '../types';
import { 
  INITIAL_DOCUMENTS, 
  INITIAL_RULES, 
  INITIAL_CLAIMS, 
  INITIAL_GUIDELINES, 
  INITIAL_PASSPORT, 
  INITIAL_CHANGE_REQUESTS, 
  INITIAL_LEADS,
  INITIAL_PROJECTS
} from '../data/mockData';

interface DemoContextType {
  // Theme state
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Account model (Simplified to Two Account Types)
  accountType: AccountType;
  setAccountType: (type: AccountType) => void;

  // Internal role mapping for fine-grained UI controls
  currentRole: UserRole;
  setRole: (role: UserRole) => void;

  // Projects - Central Workspace Repository
  projects: Project[];
  createProject: (proj: Partial<Project>) => Project;
  updateProject: (id: string, updates: Partial<Project>) => void;
  archiveProject: (id: string) => void;
  addFileToProject: (projectId: string, file: Omit<ProjectFile, 'id' | 'uploadedAt'>) => ProjectFile;
  updateProjectFileStatus: (projectId: string, fileId: string, status: ReviewItemStatus, findingsCount?: number) => void;
  updateFileContent: (projectId: string, fileId: string, newText: string, updatedBy?: string) => void;
  acceptFileFinding: (projectId: string, fileId: string, findingId: string) => void;
  runFileReview: (projectId: string, fileId: string) => void;
  submitFileForVerification: (projectId: string, fileId: string) => void;
  recordFileReviewDecision: (projectId: string, fileId: string, decision: 'approved' | 'rejected' | 'changes_requested', notes: string) => void;

  documents: ReviewDocument[];
  rules: BrandRule[];
  claims: ClaimRecord[];
  guidelines: GuidelineDoc[];
  passports: BrandPassportRecord[];
  changeRequests: ChangeRequest[];
  leads: ContactLead[];
  
  // Interactive Document Actions
  createDocument: (doc: Partial<ReviewDocument>) => ReviewDocument;
  updateDocumentContent: (id: string, content: string) => void;
  acceptFindingFix: (docId: string, findingId: string) => void;
  rejectFinding: (docId: string, findingId: string, reason: DismissalReason, note?: string) => void;
  setFindingFeedback: (docId: string, findingId: string, feedback: 'useful' | 'wrong') => void;
  submitForReview: (docId: string) => void;
  reviewDecision: (docId: string, decision: 'approved' | 'rejected' | 'changes_requested', notes: string) => void;
  
  // Rule actions
  approveRule: (ruleId: string) => void;
  rejectRule: (ruleId: string) => void;
  addRule: (rule: Omit<BrandRule, 'id' | 'dismissalCount'>) => void;
  
  // Claim actions
  addClaim: (claim: Omit<ClaimRecord, 'id'>) => void;
  updateClaim: (claim: ClaimRecord) => void;
  
  // Change request actions
  addChangeRequest: (req: Omit<ChangeRequest, 'id' | 'submittedAt' | 'status'>) => void;
  updateChangeRequestStatus: (id: string, status: 'approved' | 'rejected' | 'in_progress', adminNotes?: string) => void;
  
  // Contact lead actions
  addLead: (lead: Omit<ContactLead, 'id' | 'submittedAt'>) => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state persisted in localStorage
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('brandguard_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('brandguard_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Simplified Two-Account Model: 'company_workspace' vs 'brandguard_operations'
  const [accountType, setAccountTypeState] = useState<AccountType>(() => {
    const saved = localStorage.getItem('brandguard_account_type');
    if (saved === 'company_workspace' || saved === 'brandguard_operations') return saved;
    return 'company_workspace';
  });

  const [currentRole, setRoleState] = useState<UserRole>('creator');

  const setAccountType = (type: AccountType) => {
    setAccountTypeState(type);
    localStorage.setItem('brandguard_account_type', type);
    // Align internal role representation
    if (type === 'company_workspace') {
      setRoleState('creator');
    } else {
      setRoleState('reviewer');
    }
  };

  const setRole = (role: UserRole) => {
    setRoleState(role);
  };

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('brandguard_projects_v3');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { }
    }
    return INITIAL_PROJECTS;
  });

  useEffect(() => {
    localStorage.setItem('brandguard_projects_v3', JSON.stringify(projects));
  }, [projects]);

  const createProject = (newProjData: Partial<Project>): Project => {
    const newProj: Project = {
      id: `proj-${Date.now().toString().slice(-4)}`,
      name: newProjData.name || 'New Marketing Campaign',
      description: newProjData.description || 'Campaign assets and governance reviews.',
      status: 'active',
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
      clientName: newProjData.clientName || 'Acme Global Brands',
      owner: accountType === 'company_workspace' ? 'Sarah Chen (Lead Marketer)' : 'Elena Rostova (Operations Reviewer)',
      files: newProjData.files || []
    };
    setProjects(prev => [newProj, ...prev]);
    return newProj;
  };

  const updateProject = (id: string, updates: Partial<Project>) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString().slice(0, 10) } : p));
  };

  const archiveProject = (id: string) => {
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status: p.status === 'archived' ? 'active' : 'archived', updatedAt: new Date().toISOString().slice(0, 10) } : p));
  };

  const addFileToProject = (projectId: string, fileData: Omit<ProjectFile, 'id' | 'uploadedAt'>): ProjectFile => {
    const newFile: ProjectFile = {
      ...fileData,
      id: `f-${Date.now().toString().slice(-4)}`,
      uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          updatedAt: new Date().toISOString().slice(0, 10),
          files: [newFile, ...p.files]
        };
      }
      return p;
    }));
    return newFile;
  };

  const updateProjectFileStatus = (projectId: string, fileId: string, status: ReviewItemStatus, findingsCount?: number) => {
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          updatedAt: new Date().toISOString().slice(0, 10),
          files: p.files.map(f => {
            if (f.id === fileId) {
              return {
                ...f,
                status,
                findingsCount: findingsCount !== undefined ? findingsCount : f.findingsCount
              };
            }
            return f;
          })
        };
      }
      return p;
    }));
  };

  const updateFileContent = (projectId: string, fileId: string, newText: string, updatedBy?: string) => {
    const actor = updatedBy || (accountType === 'company_workspace' ? 'Sarah Chen (Lead Marketer)' : 'Elena Rostova (Operations Reviewer)');
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;

      const updatedFiles = p.files.map(f => {
        if (f.id !== fileId) return f;

        const prevText = f.currentText || f.originalText || '';
        if (prevText === newText) return f;

        // Bump minor version e.g. '1.0' -> '1.1'
        const currentVer = f.version || '1.0';
        const parts = currentVer.split('.');
        const major = parts[0] || '1';
        const minor = parseInt(parts[1] || '0', 10) + 1;
        const newVer = `${major}.${minor}`;

        const newVersionRecord: FileVersionRecord = {
          version: currentVer,
          text: prevText,
          modifiedAt: timestamp,
          modifiedBy: actor,
          reviewDecision: f.reviewDecision,
          findingsCount: f.findingsCount
        };

        const existingHistory = f.versionHistory || [];

        // Check open findings: mark as outdated if textSpan is no longer in modified text
        const updatedFindings = (f.findings || []).map(finding => {
          if (finding.status === 'open' && !newText.includes(finding.textSpan)) {
            return {
              ...finding,
              status: 'rejected' as const,
              dismissalReason: 'ok_in_context' as const,
              dismissalNote: 'Text span modified in newer revision.'
            };
          }
          return finding;
        });

        const openCount = updatedFindings.filter(finding => finding.status === 'open').length;

        const auditEntry: ProjectAuditEntry = {
          id: `aud-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
          timestamp,
          actor,
          role: accountType === 'company_workspace' ? 'Lead Marketer' : 'Operations Reviewer',
          action: 'Content Updated',
          details: `Modified ${f.name} (v${newVer}). Created revision snapshot.`
        };

        return {
          ...f,
          version: newVer,
          currentText: newText,
          versionHistory: [newVersionRecord, ...existingHistory],
          findings: updatedFindings,
          findingsCount: openCount,
          status: 'in_progress' as ReviewItemStatus,
          history: [auditEntry, ...(f.history || [])]
        };
      });

      return {
        ...p,
        updatedAt: new Date().toISOString().slice(0, 10),
        files: updatedFiles
      };
    }));
  };

  const acceptFileFinding = (projectId: string, fileId: string, findingId: string) => {
    const actor = accountType === 'company_workspace' ? 'Sarah Chen (Lead Marketer)' : 'Elena Rostova (Operations Reviewer)';
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;

      const updatedFiles = p.files.map(f => {
        if (f.id !== fileId) return f;

        const targetFinding = (f.findings || []).find(fnd => fnd.id === findingId);
        if (!targetFinding || !targetFinding.suggestedCorrection) return f;
        if (targetFinding.status === 'accepted') return f; // Prevent applying twice

        const prevText = f.currentText || f.originalText || '';
        if (!prevText.includes(targetFinding.textSpan)) return f;

        const corrected = prevText.replace(targetFinding.textSpan, targetFinding.suggestedCorrection);

        // Version bump
        const currentVer = f.version || '1.0';
        const parts = currentVer.split('.');
        const major = parts[0] || '1';
        const minor = parseInt(parts[1] || '0', 10) + 1;
        const newVer = `${major}.${minor}`;

        const newVersionRecord: FileVersionRecord = {
          version: currentVer,
          text: prevText,
          modifiedAt: timestamp,
          modifiedBy: actor,
          reviewDecision: f.reviewDecision,
          findingsCount: f.findingsCount
        };

        const updatedFindings = (f.findings || []).map(fnd => {
          if (fnd.id === findingId) {
            return { ...fnd, status: 'accepted' as const };
          }
          return fnd;
        });

        const openCount = updatedFindings.filter(fnd => fnd.status === 'open').length;

        const auditEntry: ProjectAuditEntry = {
          id: `aud-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
          timestamp,
          actor,
          role: accountType === 'company_workspace' ? 'Lead Marketer' : 'Operations Reviewer',
          action: 'Correction Accepted',
          details: `Accepted correction for Finding #${targetFinding.id} in ${f.name} (v${newVer}).`
        };

        return {
          ...f,
          version: newVer,
          currentText: corrected,
          versionHistory: [newVersionRecord, ...(f.versionHistory || [])],
          findings: updatedFindings,
          findingsCount: openCount,
          status: 'in_progress' as ReviewItemStatus,
          history: [auditEntry, ...(f.history || [])]
        };
      });

      return {
        ...p,
        updatedAt: new Date().toISOString().slice(0, 10),
        files: updatedFiles
      };
    }));
  };

  const runFileReview = (projectId: string, fileId: string) => {
    const actor = accountType === 'company_workspace' ? 'Sarah Chen (Lead Marketer)' : 'BrandGuard Operations';
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;

      const updatedFiles = p.files.map(f => {
        if (f.id !== fileId) return f;

        const content = f.currentText || f.originalText || '';
        // Deterministic scan: check which findings still have their textSpan in content
        const remainingFindings = (f.findings || []).map(finding => {
          if (content.includes(finding.textSpan)) {
            return { ...finding, status: 'open' as const };
          }
          return { ...finding, status: 'accepted' as const };
        });

        const openCount = remainingFindings.filter(fnd => fnd.status === 'open').length;

        const auditEntry: ProjectAuditEntry = {
          id: `aud-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
          timestamp,
          actor,
          role: 'BrandGuard Automated Engine',
          action: 'Review Completed',
          details: `Re-scanned ${f.name}. Found ${openCount} open policy finding(s).`
        };

        return {
          ...f,
          findings: remainingFindings,
          findingsCount: openCount,
          status: (openCount === 0 ? 'in_progress' : 'needs_changes') as ReviewItemStatus,
          history: [auditEntry, ...(f.history || [])]
        };
      });

      return {
        ...p,
        updatedAt: new Date().toISOString().slice(0, 10),
        files: updatedFiles
      };
    }));
  };

  const submitFileForVerification = (projectId: string, fileId: string) => {
    const actor = accountType === 'company_workspace' ? 'Sarah Chen (Lead Marketer)' : 'Operations Lead';
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;

      const updatedFiles = p.files.map(f => {
        if (f.id !== fileId) return f;

        const auditEntry: ProjectAuditEntry = {
          id: `aud-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
          timestamp,
          actor,
          role: 'Client Submitter',
          action: 'Verification Requested',
          details: `Submitted ${f.name} (v${f.version || '1.0'}) to BrandGuard Operations review queue.`
        };

        return {
          ...f,
          status: 'awaiting_verification' as ReviewItemStatus,
          history: [auditEntry, ...(f.history || [])]
        };
      });

      return {
        ...p,
        status: 'in_review' as ProjectStatus,
        updatedAt: new Date().toISOString().slice(0, 10),
        files: updatedFiles
      };
    }));
  };

  const recordFileReviewDecision = (projectId: string, fileId: string, decision: 'approved' | 'rejected' | 'changes_requested', notes: string) => {
    const reviewerName = accountType === 'brandguard_operations' ? 'Elena Rostova (Operations Reviewer)' : 'Authorized Reviewer';
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);

    setProjects(prev => prev.map(p => {
      if (p.id !== projectId) return p;

      const updatedFiles = p.files.map(f => {
        if (f.id !== fileId) return f;

        const resultingStatus: ReviewItemStatus = 
          decision === 'approved' ? 'approved' :
          decision === 'rejected' ? 'rejected' : 'needs_changes';

        const auditEntry: ProjectAuditEntry = {
          id: `aud-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
          timestamp,
          actor: reviewerName,
          role: 'Human Reviewer',
          action: `Review Decision: ${decision.toUpperCase()}`,
          details: `Decision rendered: ${decision.toUpperCase()}. Reviewer note: "${notes}".`
        };

        return {
          ...f,
          status: resultingStatus,
          reviewer: reviewerName,
          reviewDecision: decision,
          reviewerNotes: notes,
          decidedAt: timestamp,
          history: [auditEntry, ...(f.history || [])]
        };
      });

      const allApproved = updatedFiles.every(f => f.status === 'approved');

      return {
        ...p,
        status: (allApproved ? 'approved' : p.status) as ProjectStatus,
        updatedAt: new Date().toISOString().slice(0, 10),
        files: updatedFiles
      };
    }));
  };

  const [documents, setDocuments] = useState<ReviewDocument[]>(INITIAL_DOCUMENTS);
  const [rules, setRules] = useState<BrandRule[]>(INITIAL_RULES);
  const [claims, setClaims] = useState<ClaimRecord[]>(INITIAL_CLAIMS);
  const [guidelines] = useState<GuidelineDoc[]>(INITIAL_GUIDELINES);
  const [passports, setPassports] = useState<BrandPassportRecord[]>([INITIAL_PASSPORT]);
  const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>(INITIAL_CHANGE_REQUESTS);
  const [leads, setLeads] = useState<ContactLead[]>(INITIAL_LEADS);

  const createDocument = (newDocData: Partial<ReviewDocument>): ReviewDocument => {
    const newDoc: ReviewDocument = {
      id: `doc-${Date.now().toString().slice(-4)}`,
      title: newDocData.title || 'Untitled Marketing Asset',
      type: newDocData.type || 'plain_text',
      status: 'draft',
      author: accountType === 'company_workspace' ? 'Company Copywriter' : 'BrandGuard Operations Lead',
      submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      version: '0.1',
      intentCard: newDocData.intentCard || {
        goal: 'Engage audience with compliant messaging.',
        audience: 'Enterprise stakeholders.',
        keyMessage: 'Evidence-verified product announcement.'
      },
      content: newDocData.content || '',
      findings: [
        {
          id: `f-${Date.now().toString().slice(-3)}`,
          category: 'brand_rules',
          severity: 'advisory',
          textSpan: 'draft content',
          explanation: 'Initial check recommended before submission to review queue.',
          ruleReference: 'BRAND-INIT-01: Pre-flight Verification',
          status: 'open',
          feedback: null
        }
      ]
    };

    setDocuments(prev => [newDoc, ...prev]);
    return newDoc;
  };

  const updateDocumentContent = (id: string, content: string) => {
    setDocuments(prev => prev.map(doc => {
      if (doc.id === id) {
        return {
          ...doc,
          content,
          updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
        };
      }
      return doc;
    }));
  };

  const acceptFindingFix = (docId: string, findingId: string) => {
    setDocuments(prev => prev.map(doc => {
      if (doc.id !== docId) return doc;

      const targetFinding = doc.findings.find(f => f.id === findingId);
      if (!targetFinding || !targetFinding.suggestedCorrection) return doc;

      // Replace text span with suggested correction
      const updatedContent = doc.content.replace(targetFinding.textSpan, targetFinding.suggestedCorrection);

      const updatedFindings = doc.findings.map(f => {
        if (f.id === findingId) {
          return { ...f, status: 'accepted' as const };
        }
        return f;
      });

      return {
        ...doc,
        content: updatedContent,
        findings: updatedFindings,
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
      };
    }));
  };

  const rejectFinding = (docId: string, findingId: string, reason: DismissalReason, note?: string) => {
    setDocuments(prev => prev.map(doc => {
      if (doc.id !== docId) return doc;

      const updatedFindings = doc.findings.map(f => {
        if (f.id === findingId) {
          return {
            ...f,
            status: 'rejected' as const,
            dismissalReason: reason,
            dismissalNote: note
          };
        }
        return f;
      });

      return {
        ...doc,
        findings: updatedFindings,
        updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
      };
    }));

    // Increment rule dismissal count for analytics
    setRules(prev => prev.map(r => {
      return { ...r, dismissalCount: r.dismissalCount + 1 };
    }));
  };

  const setFindingFeedback = (docId: string, findingId: string, feedback: 'useful' | 'wrong') => {
    setDocuments(prev => prev.map(doc => {
      if (doc.id !== docId) return doc;

      const updatedFindings = doc.findings.map(f => {
        if (f.id === findingId) {
          return { ...f, feedback };
        }
        return f;
      });

      return { ...doc, findings: updatedFindings };
    }));
  };

  const submitForReview = (docId: string) => {
    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          status: 'pending_review',
          submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
        };
      }
      return doc;
    }));
  };

  const reviewDecision = (docId: string, decision: 'approved' | 'rejected' | 'changes_requested', notes: string) => {
    setDocuments(prev => prev.map(doc => {
      if (doc.id === docId) {
        const updated = {
          ...doc,
          status: decision,
          reviewer: accountType === 'brandguard_operations' ? 'BrandGuard Lead Reviewer' : 'Authorized Company Reviewer',
          reviewerDecision: `Decision: ${decision.toUpperCase()}`,
          reviewerNotes: notes,
          updatedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
        };

        // If approved, mint Brand Passport
        if (decision === 'approved') {
          const newPassport: BrandPassportRecord = {
            id: `BP-2026-${Date.now().toString().slice(-4)}`,
            documentId: doc.id,
            documentTitle: doc.title,
            author: doc.author,
            reviewer: 'BrandGuard Reviewer (Elena Rostova)',
            approvedAt: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
            governanceScore: 100,
            totalChecks: 24,
            criticalIssuesResolved: doc.findings.filter(f => f.severity === 'critical' && f.status === 'accepted').length,
            warningsResolved: doc.findings.filter(f => f.severity === 'warning' && f.status === 'accepted').length,
            evidenceCitations: [
              {
                claim: 'Corporate Governance Standard Verified',
                source: 'Brand Governance Charter v3.0',
                owner: 'Chief Brand Officer'
              }
            ],
            aiDisclosure: 'AI assistance utilized solely for citation cross-referencing and typographical verification. Final publishing decision rendered exclusively by human reviewer.',
            auditEvents: [
              {
                id: `aud-${Date.now()}-1`,
                timestamp: doc.submittedAt,
                actor: doc.author,
                role: 'Creator',
                action: 'Submitted to Review Queue',
                details: 'Content submitted for brand policy governance.'
              },
              {
                id: `aud-${Date.now()}-2`,
                timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
                actor: 'BrandGuard Operations Reviewer',
                role: 'Reviewer',
                action: 'Final Publishing Authorization',
                details: notes || 'All evidence checks verified and approved.'
              }
            ]
          };
          setPassports(pp => [newPassport, ...pp.filter(p => p.documentId !== doc.id)]);
        }

        return updated;
      }
      return doc;
    }));
  };

  const approveRule = (ruleId: string) => {
    setRules(prev => prev.map(r => r.id === ruleId ? { ...r, status: 'approved' } : r));
  };

  const rejectRule = (ruleId: string) => {
    setRules(prev => prev.filter(r => r.id !== ruleId));
  };

  const addRule = (newRule: Omit<BrandRule, 'id' | 'dismissalCount'>) => {
    const created: BrandRule = {
      ...newRule,
      id: `RULE-${(rules.length + 1).toString().padStart(2, '0')}`,
      dismissalCount: 0
    };
    setRules(prev => [...prev, created]);
  };

  const addClaim = (newClaim: Omit<ClaimRecord, 'id'>) => {
    const created: ClaimRecord = {
      ...newClaim,
      id: `CLM-2026-${(claims.length + 101).toString()}`
    };
    setClaims(prev => [created, ...prev]);
  };

  const updateClaim = (updatedClaim: ClaimRecord) => {
    setClaims(prev => prev.map(c => c.id === updatedClaim.id ? updatedClaim : c));
  };

  const addChangeRequest = (req: Omit<ChangeRequest, 'id' | 'submittedAt' | 'status'>) => {
    const created: ChangeRequest = {
      ...req,
      id: `CR-${Date.now().toString().slice(-3)}`,
      submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'pending_review'
    };
    setChangeRequests(prev => [created, ...prev]);
  };

  const updateChangeRequestStatus = (id: string, status: 'approved' | 'rejected' | 'in_progress', adminNotes?: string) => {
    setChangeRequests(prev => prev.map(cr => {
      if (cr.id === id) {
        return {
          ...cr,
          status,
          adminResponse: adminNotes || cr.adminResponse
        };
      }
      return cr;
    }));
  };

  const addLead = (lead: Omit<ContactLead, 'id' | 'submittedAt'>) => {
    const created: ContactLead = {
      ...lead,
      id: `lead-${Date.now().toString().slice(-3)}`,
      submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };
    setLeads(prev => [created, ...prev]);
  };

  return (
    <DemoContext.Provider
      value={{
        theme,
        toggleTheme,
        accountType,
        setAccountType,
        currentRole,
        setRole,
        projects,
        createProject,
        updateProject,
        archiveProject,
        addFileToProject,
        updateProjectFileStatus,
        updateFileContent,
        acceptFileFinding,
        runFileReview,
        submitFileForVerification,
        recordFileReviewDecision,
        documents,
        rules,
        claims,
        guidelines,
        passports,
        changeRequests,
        leads,
        createDocument,
        updateDocumentContent,
        acceptFindingFix,
        rejectFinding,
        setFindingFeedback,
        submitForReview,
        reviewDecision,
        approveRule,
        rejectRule,
        addRule,
        addClaim,
        updateClaim,
        addChangeRequest,
        updateChangeRequestStatus,
        addLead
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within a DemoProvider');
  }
  return context;
};
