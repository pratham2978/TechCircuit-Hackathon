export type AccountType = 'company_workspace' | 'brandguard_operations';

export type UserRole = 
  | 'creator' 
  | 'brand_manager' 
  | 'reviewer' 
  | 'client_admin' 
  | 'platform_admin';

export type FindingSeverity = 'critical' | 'warning' | 'advisory';

export type FindingCategory = 
  | 'brand_rules' 
  | 'terminology' 
  | 'claim_verification' 
  | 'tone' 
  | 'accessibility' 
  | 'image_checks';

export type ClaimStatus = 
  | 'VERIFIED' 
  | 'EXPIRING_SOON' 
  | 'EXPIRED' 
  | 'NEEDS_VERIFICATION';

export type DismissalReason = 
  | 'false_positive' 
  | 'rule_unclear' 
  | 'approved_exception' 
  | 'ok_in_context';

export interface Finding {
  id: string;
  category: FindingCategory;
  severity: FindingSeverity;
  textSpan: string;
  explanation: string;
  ruleReference: string;
  sourceDoc?: string;
  sourcePage?: number;
  claimOwner?: string;
  validDates?: string;
  suggestedCorrection?: string;
  status: 'open' | 'accepted' | 'rejected';
  dismissalReason?: DismissalReason;
  dismissalNote?: string;
  feedback?: 'useful' | 'wrong' | null;
}

export interface IntentCard {
  goal: string;
  audience: string;
  keyMessage: string;
}

export type ContentStatus = 
  | 'draft' 
  | 'pending_review' 
  | 'changes_requested' 
  | 'approved' 
  | 'rejected';

export interface ReviewDocument {
  id: string;
  title: string;
  type: 'plain_text' | 'docx' | 'html' | 'image';
  status: ContentStatus;
  author: string;
  submittedAt: string;
  updatedAt: string;
  version: string;
  intentCard: IntentCard;
  content: string;
  findings: Finding[];
  reviewer?: string;
  reviewerDecision?: string;
  reviewerNotes?: string;
}

export interface BrandRule {
  id: string;
  title: string;
  category: FindingCategory;
  type: 'approved_term' | 'prohibited_term' | 'preferred_alternative' | 'disclaimer' | 'voice' | 'restriction';
  termOrPattern?: string;
  preferredAlternative?: string;
  explanation: string;
  severity: FindingSeverity;
  status: 'approved' | 'proposed';
  sourceDoc: string;
  sourcePassage?: string;
  dismissalCount: number;
}

export interface ClaimRecord {
  id: string;
  claimText: string;
  sourceDoc: string;
  sourcePage: number;
  owner: string;
  validFrom: string;
  validTo: string;
  status: ClaimStatus;
  contextNotes: string;
}

export interface GuidelineDoc {
  id: string;
  title: string;
  fileName: string;
  fileSize: string;
  uploadedAt: string;
  version: string;
  status: 'indexed' | 'processing' | 'needs_review';
  pagesCount: number;
  proposedRulesCount: number;
  approvedRulesCount: number;
  samplePassage: string;
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  details: string;
}

export interface BrandPassportRecord {
  id: string;
  documentId: string;
  documentTitle: string;
  author: string;
  reviewer: string;
  approvedAt: string;
  governanceScore: number;
  totalChecks: number;
  criticalIssuesResolved: number;
  warningsResolved: number;
  evidenceCitations: Array<{
    claim: string;
    source: string;
    owner: string;
  }>;
  aiDisclosure: string;
  auditEvents: AuditEvent[];
}

export interface ChangeRequest {
  id: string;
  type: 'Rule Exception' | 'New Disclaimer' | 'Claim Expiry Extension' | 'Role Elevation';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  requestedBy: string;
  submittedAt: string;
  status: 'pending_review' | 'in_progress' | 'approved' | 'rejected';
  adminResponse?: string;
}

export interface ContactLead {
  id: string;
  name: string;
  email: string;
  company: string;
  teamSize: string;
  message: string;
  submittedAt: string;
}

// Project Architecture & The 5 Core Review Tools
export type ProjectStatus = 'active' | 'in_review' | 'approved' | 'archived';

export type ReviewToolType = 
  | 'legal' 
  | 'promotions' 
  | 'content' 
  | 'images' 
  | 'videos';

export type ReviewItemStatus = 
  | 'not_reviewed' 
  | 'in_progress' 
  | 'needs_changes' 
  | 'awaiting_verification' 
  | 'approved' 
  | 'rejected';

export interface FileVersionRecord {
  version: string;
  text: string;
  modifiedAt: string;
  modifiedBy: string;
  reviewDecision?: string;
  findingsCount: number;
}

export interface ProjectAuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  role: string;
  action: string;
  details: string;
}

export interface ProjectFile {
  id: string;
  name: string;
  type: 'docx' | 'pdf' | 'png' | 'jpg' | 'mp4' | 'txt' | 'html';
  reviewType: ReviewToolType;
  uploadedAt: string;
  status: ReviewItemStatus;
  size: string;
  documentId?: string; // Links to ReviewDocument if content
  originalText?: string;
  currentText?: string;
  version?: string;
  versionHistory?: FileVersionRecord[];
  findings?: Finding[];
  findingsCount: number;
  reviewer?: string;
  reviewDecision?: 'approved' | 'rejected' | 'changes_requested';
  reviewerNotes?: string;
  decidedAt?: string;
  history?: ProjectAuditEntry[];
  detectedColors?: string[];
  contrastRatio?: number;
  altText?: string;
  videoChecklist?: {
    introLogo: boolean;
    superTitleDuration: boolean;
    audioDisclaimer: boolean;
    termsNotice: boolean;
  };
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  clientName: string;
  owner: string;
  files: ProjectFile[];
  auditLog?: ProjectAuditEntry[];
}

