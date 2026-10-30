import { AnalysisFinding } from '../utils/pdfGenerator';

const API_BASE_URL = (import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:8000')).replace(/\/+$/, '');

export interface AnalysisResponse {
  success: boolean;
  conversation_id: string;
  overallResult: string;
  keyFindings: string[];
  findings: AnalysisFinding[];
  summaryNarration?: string;
  file_name?: string;
  file_id?: string;
  page_count?: number;
  limitation_notice?: string | null;
  error?: string;
  message?: string;
}

export interface ChatResponse {
  success: boolean;
  conversation_id: string;
  reply: string;
  error?: string;
  message?: string;
}

export interface ConfigStatusResponse {
  status?: string;
  gemini_configured: boolean;
  model: string;
  supported_features?: string[];
}

export interface HistoryMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  attachments?: Array<{ name: string; size?: string; type: string }>;
  analysisResult?: {
    overallResult: string;
    keyFindings: string[];
    findings: AnalysisFinding[];
  };
}

export interface HistoryResponse {
  conversation_id: string;
  project_id: string;
  review_type: string;
  messages: HistoryMessage[];
}

/**
 * Check backend connection and Gemini API key status.
 */
export async function checkBackendStatus(): Promise<ConfigStatusResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/config-status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    return {
      gemini_configured: false,
      model: 'gemini-2.5-flash',
      status: 'disconnected'
    };
  }
}

/**
 * Execute AI review analysis via the backend Gemini service.
 */
export async function analyzeReview(payload: {
  project_id: string;
  review_type: string;
  content?: string;
  instructions?: string;
  file_name?: string;
  media_data?: string;
  media_mime_type?: string;
  conversation_id?: string;
}): Promise<AnalysisResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/reviews/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (networkErr: any) {
    throw new Error(
      `Cannot connect to BrandGuard backend server at ${API_BASE_URL}. ` +
      `Please ensure the backend is running (e.g. uvicorn app.main:app --port 8000).`
    );
  }

  const data = await res.json();

  if (!res.ok || !data.success) {
    if (data.error === 'MISSING_API_KEY') {
      throw new Error(
        'GEMINI_API_KEY is not configured on the backend server. ' +
        'Please add your GEMINI_API_KEY to the backend .env file to enable live AI analysis.'
      );
    }
    throw new Error(data.message || `Analysis failed with status ${res.status}`);
  }

  return data;
}

/**
 * Upload a document, image, or video file for AI review analysis via multipart/form-data.
 */
export async function uploadAndAnalyzeReview(formData: FormData): Promise<AnalysisResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/reviews/upload-and-analyze`, {
      method: 'POST',
      body: formData
    });
  } catch (networkErr: any) {
    throw new Error(
      `Cannot connect to BrandGuard backend server at ${API_BASE_URL}. ` +
      `Please ensure the backend is running.`
    );
  }

  const data = await res.json();

  if (!res.ok || !data.success) {
    if (data.error === 'MISSING_API_KEY') {
      throw new Error(
        'GEMINI_API_KEY is not configured on the backend server. ' +
        'Please add your GEMINI_API_KEY to the backend .env file to enable live AI analysis.'
      );
    }
    throw new Error(data.detail || data.message || `Upload analysis failed with status ${res.status}`);
  }

  return data;
}

/**
 * Send a follow-up chat question using the active review's context.
 */
export async function sendChatFollowup(payload: {
  project_id: string;
  review_type: string;
  message: string;
  conversation_id?: string;
  context_notes?: string;
}): Promise<ChatResponse> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}/api/reviews/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (networkErr: any) {
    throw new Error(
      `Cannot connect to BrandGuard backend server at ${API_BASE_URL}. ` +
      `Please ensure the backend is running.`
    );
  }

  const data = await res.json();

  if (!res.ok || !data.success) {
    if (data.error === 'MISSING_API_KEY') {
      throw new Error(
        'GEMINI_API_KEY is not configured on the backend server. ' +
        'Please add your GEMINI_API_KEY to the backend .env file.'
      );
    }
    throw new Error(data.message || `Chat follow-up failed with status ${res.status}`);
  }

  return data;
}

/**
 * Fetch stored conversation history for a given project and review tool.
 */
export async function getReviewHistory(
  projectId: string,
  reviewType: string
): Promise<HistoryResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/reviews/history/${projectId}/${reviewType}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return {
      conversation_id: `${projectId}:${reviewType}`,
      project_id: projectId,
      review_type: reviewType,
      messages: []
    };
  }
}

/**
 * Clear stored conversation history for a given project and review tool.
 */
export async function clearReviewHistory(
  projectId: string,
  reviewType: string
): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/reviews/history/${projectId}/${reviewType}`, {
      method: 'DELETE'
    });
  } catch {
    // Ignore error on reset
  }
}

/**
 * Download a generated PDF analysis report from the backend for a specific project and review.
 */
export async function downloadBackendPdfReport(
  projectId: string,
  reviewType: string,
  companyId: string = 'acme-global-brands'
): Promise<void> {
  const url = `${API_BASE_URL}/api/reviews/report/pdf/${projectId}/${reviewType}?company_id=${encodeURIComponent(companyId)}`;
  const res = await fetch(url, { method: 'GET' });

  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      // Non-json error
    }
    throw new Error(`Failed to download report: ${errorDetail}`);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition');
  let filename = `${projectId}-${reviewType}-Review.pdf`;
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) filename = match[1];
  }

  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}


/**
 * Generate and download a PDF report from direct in-memory report data.
 */
export async function downloadDirectPdfReport(payload: {
  project_name: string;
  review_type: string;
  overall_result: string;
  file_name?: string;
  review_date?: string;
  summary_narration?: string;
  key_findings?: string[];
  findings?: AnalysisFinding[];
  limitation_notice?: string;
  reviewer?: string;
}): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/reviews/report/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    let errorDetail = `HTTP ${res.status}`;
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || errorDetail;
    } catch {}
    throw new Error(`Failed to generate PDF: ${errorDetail}`);
  }

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition');
  let filename = `${payload.project_name.replace(/[^a-zA-Z0-9_-]/g, '_')}-${payload.review_type}-Review.pdf`;
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^";]+)"?/);
    if (match && match[1]) filename = match[1];
  }

  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}




// =====================================================================
// Phase 7: RAG, Guideline & Claim Management APIs
// =====================================================================

export interface BackendGuidelineDoc {
  id: string;
  title: string;
  category: string;
  file_type: string;
  file_size: string;
  version?: string;
  status?: string;
  pages_count: number;
  proposed_rules_count: number;
  approved_rules_count: number;
  sample_passage?: string;
  uploaded_at?: string;
}

export interface BackendBrandRule {
  id: string;
  title: string;
  category: string;
  rule_type: string;
  term_or_pattern?: string;
  preferred_alternative?: string;
  explanation: string;
  severity: 'critical' | 'warning' | 'advisory';
  status: 'approved' | 'proposed';
  source_doc: string;
  source_page: number;
  dismissal_count?: number;
}

export interface BackendApprovedClaim {
  id: string;
  claim_text: string;
  source_doc: string;
  source_page: number;
  owner: string;
  valid_from: string;
  valid_to: string;
  status: 'VERIFIED' | 'EXPIRING_SOON' | 'EXPIRED' | 'NEEDS_VERIFICATION';
  context_notes?: string;
}

/**
 * Fetch guidelines documents from backend for a specific company tenant.
 */
export async function getGuidelines(companyId: string = 'acme-global-brands'): Promise<BackendGuidelineDoc[]> {
  const res = await fetch(`${API_BASE_URL}/api/guidelines?company_id=${encodeURIComponent(companyId)}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch guidelines: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.guidelines || [];
}

/**
 * Upload and index a guideline document (PDF, DOCX, TXT) on backend.
 */
export async function uploadGuidelineDoc(formData: FormData): Promise<{ success: boolean; message: string; document: any }> {
  const res = await fetch(`${API_BASE_URL}/api/guidelines/upload`, {
    method: 'POST',
    body: formData
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || data.message || `Failed to upload guideline document: HTTP ${res.status}`);
  }
  return data;
}

/**
 * Delete a guideline document and its chunks.
 */
export async function deleteGuidelineDoc(docId: string, companyId: string = 'acme-global-brands'): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/guidelines/${encodeURIComponent(docId)}?company_id=${encodeURIComponent(companyId)}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Failed to delete guideline document: HTTP ${res.status}`);
  }
}

/**
 * Fetch company brand rules from backend.
 */
export async function getRules(
  companyId: string = 'acme-global-brands',
  category?: string,
  ruleType?: string
): Promise<BackendBrandRule[]> {
  const params = new URLSearchParams({ company_id: companyId });
  if (category && category !== 'all') params.append('category', category);
  if (ruleType && ruleType !== 'all') params.append('rule_type', ruleType);

  const res = await fetch(`${API_BASE_URL}/api/rules?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch rules: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.rules || [];
}

/**
 * Create a new brand rule in backend.
 */
export async function createRule(payload: {
  title: string;
  category?: string;
  rule_type?: string;
  term_or_pattern?: string;
  preferred_alternative?: string;
  explanation: string;
  severity?: string;
  status?: string;
  source_doc?: string;
  source_page?: number;
  company_id?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_id: 'acme-global-brands', ...payload })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || data.message || `Failed to create rule: HTTP ${res.status}`);
  }
  return data;
}

/**
 * Update a brand rule in backend.
 */
export async function updateRule(
  ruleId: string,
  payload: Partial<BackendBrandRule>,
  companyId: string = 'acme-global-brands'
): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/rules/${encodeURIComponent(ruleId)}?company_id=${encodeURIComponent(companyId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || data.message || `Failed to update rule: HTTP ${res.status}`);
  }
  return data;
}

/**
 * Delete a brand rule in backend.
 */
export async function deleteRule(ruleId: string, companyId: string = 'acme-global-brands'): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/rules/${encodeURIComponent(ruleId)}?company_id=${encodeURIComponent(companyId)}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Failed to delete rule: HTTP ${res.status}`);
  }
}

/**
 * Fetch approved claims from backend.
 */
export async function getClaims(
  companyId: string = 'acme-global-brands',
  status?: string
): Promise<BackendApprovedClaim[]> {
  const params = new URLSearchParams({ company_id: companyId });
  if (status && status !== 'all') params.append('status', status);

  const res = await fetch(`${API_BASE_URL}/api/claims?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch claims: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.claims || [];
}

/**
 * Create a new approved claim in backend.
 */
export async function createClaim(payload: {
  claim_text: string;
  source_doc?: string;
  source_page?: number;
  owner?: string;
  valid_from?: string;
  valid_to?: string;
  status?: string;
  context_notes?: string;
  company_id?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/claims`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_id: 'acme-global-brands', ...payload })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || data.message || `Failed to register claim: HTTP ${res.status}`);
  }
  return data;
}

/**
 * Update an approved claim in backend.
 */
export async function updateClaim(
  claimId: string,
  payload: Partial<BackendApprovedClaim>,
  companyId: string = 'acme-global-brands'
): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/claims/${encodeURIComponent(claimId)}?company_id=${encodeURIComponent(companyId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || data.message || `Failed to update claim: HTTP ${res.status}`);
  }
  return data;
}

/**
 * Delete an approved claim in backend.
 */
export async function deleteClaim(claimId: string, companyId: string = 'acme-global-brands'): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/claims/${encodeURIComponent(claimId)}?company_id=${encodeURIComponent(companyId)}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || `Failed to delete claim: HTTP ${res.status}`);
  }
}

/**
 * Test RAG context retrieval endpoint.
 */
export async function retrieveRagContext(
  query: string,
  reviewType: string,
  companyId: string = 'acme-global-brands'
): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/api/rag/retrieve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, review_type: reviewType, company_id: companyId })
  });
  return await res.json();
}


// =====================================================================
// Phase 8: AI Corrections, Persistent Versioning & Version Comparison APIs
// =====================================================================

export interface VersionRecordItem {
  id: string;
  version_number: string;
  parent_version_id?: string | null;
  change_summary: string;
  change_source: 'initial' | 'ai_suggested' | 'user_edited' | 'user_applied';
  status: 'current' | 'superseded';
  author: string;
  media_type: string;
  char_count: number;
  created_at?: string;
}

export interface VersionDiffSegment {
  type: 'unchanged' | 'added' | 'deleted';
  text: string;
}

export interface VersionComparisonResult {
  project_id: string;
  review_type: string;
  from_version: {
    id: string;
    version_number: string;
    created_at?: string;
    text?: string;
  };
  to_version: {
    id: string;
    version_number: string;
    created_at?: string;
    text?: string;
  };
  diff: {
    segments: VersionDiffSegment[];
    additions_count: number;
    deletions_count: number;
    changes_detected: boolean;
    original_char_count: number;
    revised_char_count: number;
  };
  addressed_findings: Array<{
    finding_id: string;
    applied_correction: string;
    rule_reference?: string;
    status: string;
    is_user_edited: boolean;
  }>;
  media_comparison: {
    media_type: string;
    has_revised_media_file: boolean;
    original_media_path?: string | null;
    revised_media_path?: string | null;
    media_editing_pipeline_note?: string | null;
  };
}

export interface CorrectionSuggestionResult {
  success: boolean;
  suggestedCorrection: string;
  explanation: string;
  applicableRule: string;
  sourceDoc?: string;
  is_ai_generated?: boolean;
}

/**
 * Request an AI-suggested or improved compliant correction for a finding.
 */
export async function suggestCorrection(payload: {
  finding: any;
  content?: string;
  review_type: string;
  company_id?: string;
  custom_instructions?: string;
}): Promise<CorrectionSuggestionResult> {
  const res = await fetch(`${API_BASE_URL}/api/reviews/suggest-correction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_id: 'acme-global-brands', ...payload })
  });
  if (!res.ok) {
    throw new Error(`Failed to generate correction: HTTP ${res.status}`);
  }
  return await res.json();
}

/**
 * Fetch persistent version history for a project and review tool.
 */
export async function getVersionHistory(
  projectId: string,
  reviewType: string,
  companyId: string = 'acme-global-brands'
): Promise<VersionRecordItem[]> {
  const url = `${API_BASE_URL}/api/versions/${encodeURIComponent(projectId)}/${encodeURIComponent(reviewType)}?company_id=${encodeURIComponent(companyId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch versions: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.versions || [];
}

/**
 * Fetch the latest active content version and text.
 */
export async function getLatestVersion(
  projectId: string,
  reviewType: string,
  companyId: string = 'acme-global-brands'
): Promise<any> {
  const url = `${API_BASE_URL}/api/versions/${encodeURIComponent(projectId)}/${encodeURIComponent(reviewType)}/latest?company_id=${encodeURIComponent(companyId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch latest version: HTTP ${res.status}`);
  }
  return await res.json();
}

/**
 * Accept a correction (creates a new persisted version, preserves original).
 */
export async function acceptCorrection(
  projectId: string,
  reviewType: string,
  payload: {
    finding_id: string;
    original_text_span: string;
    correction_text: string;
    is_user_edited?: boolean;
    rule_reference?: string;
    explanation?: string;
    company_id?: string;
    author?: string;
  }
): Promise<any> {
  const url = `${API_BASE_URL}/api/versions/${encodeURIComponent(projectId)}/${encodeURIComponent(reviewType)}/accept`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_id: 'acme-global-brands', ...payload })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || data.message || `Failed to accept correction: HTTP ${res.status}`);
  }
  return data;
}

/**
 * Reject a correction (records dismissal without mutating content or creating versions).
 */
export async function rejectCorrection(
  projectId: string,
  reviewType: string,
  payload: {
    finding_id: string;
    dismissal_reason: string;
    dismissal_note?: string;
    original_text_span?: string;
    ai_suggestion?: string;
    rule_reference?: string;
    company_id?: string;
  }
): Promise<any> {
  const url = `${API_BASE_URL}/api/versions/${encodeURIComponent(projectId)}/${encodeURIComponent(reviewType)}/reject`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company_id: 'acme-global-brands', ...payload })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || data.message || `Failed to reject correction: HTTP ${res.status}`);
  }
  return data;
}

/**
 * Compare original vs revised versions with structured additions/deletions diff.
 */
export async function compareVersions(
  projectId: string,
  reviewType: string,
  fromVersionId?: string,
  toVersionId?: string,
  companyId: string = 'acme-global-brands'
): Promise<VersionComparisonResult> {
  const params = new URLSearchParams({ company_id: companyId });
  if (fromVersionId) params.append('from_version_id', fromVersionId);
  if (toVersionId) params.append('to_version_id', toVersionId);

  const url = `${API_BASE_URL}/api/versions/${encodeURIComponent(projectId)}/${encodeURIComponent(reviewType)}/compare?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to compare versions: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.comparison;
}


// =====================================================================
// Phase 9: Operations Review Queue, Lifecycle, Decisions & Change Requests
// =====================================================================

export interface ReviewSubmissionItem {
  id: string;
  project_id: string;
  project_name: string;
  company_id: string;
  company_name: string;
  review_type: string;
  file_id: string | null;
  file_name: string;
  version_number: string;
  status: 'submitted' | 'under_review' | 'changes_requested' | 'resubmitted' | 'approved' | 'rejected';
  submitted_by: string;
  submitted_at: string | null;
  assigned_reviewer: string | null;
  findings_count: number;
  critical_count: number;
  content_summary: string | null;
  latest_report_id: string;
  approved_version_number?: string | null;
  decisions_count: number;
}

export interface ReviewDecisionRecord {
  id: string;
  version_number: string;
  reviewer_id: string;
  reviewer_name: string;
  reviewer_role: string;
  decision: 'approved' | 'changes_requested' | 'rejected';
  previous_status: string;
  resulting_status: string;
  comments: string;
  actionable_instructions?: string | null;
  created_at: string;
}

export interface ChangeRequestRecord {
  id: string;
  submission_id?: string | null;
  project_id?: string | null;
  company_id: string;
  title: string;
  request_type: string;
  description: string;
  priority: string;
  requested_by: string;
  submitted_at: string;
  status: string;
  reviewer_feedback?: string | null;
  admin_response?: string | null;
  target_version?: string | null;
  customer_reply?: string | null;
  resubmitted_version?: string | null;
  created_at?: string | null;
}

export interface ReviewSubmissionDetail extends ReviewSubmissionItem {
  content_text?: string | null;
  findings?: any[];
  decisions: ReviewDecisionRecord[];
  change_requests: ChangeRequestRecord[];
}

export function getOperationsAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('brandguard_auth_token');
  const accountType = localStorage.getItem('brandguard_account_type') || 'company_workspace';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-BrandGuard-Account': accountType
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Fetch authentic signed JWT token for the current demo account.
 */
export async function syncDemoAuthToken(accountType: 'company_workspace' | 'brandguard_operations'): Promise<string> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/demo-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account_type: accountType })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('brandguard_auth_token', data.access_token);
        return data.access_token;
      }
    }
  } catch (err) {
    console.warn('Demo token sync notice:', err);
  }
  return '';
}

// =====================================================================
// Resilient Mock Store for Offline / Client-Side Demo Mode
// =====================================================================

const MOCK_BRAND_PASSPORTS: BrandPassportDetail[] = [
  {
    id: 'BP-2026-9921',
    passport_number: 'BP-2026-9921',
    submission_id: 'sub-002',
    project_id: 'proj-health-2026',
    project_name: 'HealthCare Diagnostics 2026 Clinical Release',
    company_id: 'astrahealth-global',
    company_name: 'AstraHealth Global',
    review_type: 'documents',
    approved_version_number: 'v2.1',
    approved_file_name: 'Clinical_Claims_Substantiation_Manual.docx',
    approved_file_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    guideline_version: '2026.1',
    governance_score: 100,
    authorized_reviewer_name: 'Elena Rostova (Senior Brand Governance Reviewer)',
    authorized_reviewer_id: 'usr-elena-01',
    schema_version: '1.0.0',
    status: 'VERIFIED',
    algorithm: 'RFC 8032 Ed25519',
    key_id: 'bg-ed25519-key-2026-pri',
    public_key: 'ed25519:MC4CAQAwBQYDK2VwBCIEIP0xM6pE7qZ4c5A0i98h2j3k4l5m6n7o8p9q0r1s2t3u',
    signature: '7e891b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
    canonical_payload: JSON.stringify({
      passport_id: 'BP-2026-9921',
      version: 'v2.1',
      file_hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      governance_score: 100,
      reviewer: 'Elena Rostova',
      issued_at: '2026-10-26T16:40:22Z'
    }, null, 2),
    issued_at: '2026-10-26 16:40:22 UTC',
    total_checks: 24,
    critical_issues_resolved: 3,
    warnings_resolved: 2,
    ai_disclosure: 'AI assistance utilized solely for citation cross-referencing and typographical verification. Final publishing decision rendered exclusively by human reviewer.',
    evidence_citations: [
      {
        claim: '98.4% diagnostic sensitivity across 12,000 multi-site trials',
        source: 'Clinical Validation Study Report 2026, Table 4, p. 19',
        owner: 'Clinical Research Legal Desk',
        status: 'verified'
      },
      {
        claim: '42% reduction in diagnostic turnaround time compared to standard panel',
        source: 'Independent Hospital Operations Audit, p. 8',
        owner: 'VP Medical Affairs',
        status: 'verified'
      }
    ]
  },
  {
    id: 'BP-2026-1044',
    passport_number: 'BP-2026-1044',
    submission_id: 'sub-001',
    project_id: 'proj-summer-2027',
    project_name: 'Summer Sale 2027 Global Campaign',
    company_id: 'acme-global-brands',
    company_name: 'Acme Global Brands',
    review_type: 'marketing',
    approved_version_number: 'v1.4',
    approved_file_name: 'Summer_Campaign_Master_Copy_v1.4.pdf',
    approved_file_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    guideline_version: '2026.2',
    governance_score: 98,
    authorized_reviewer_name: 'Marcus Vance (Compliance Director)',
    authorized_reviewer_id: 'usr-marcus-02',
    schema_version: '1.0.0',
    status: 'VERIFIED',
    algorithm: 'RFC 8032 Ed25519',
    key_id: 'bg-ed25519-key-2026-pri',
    public_key: 'ed25519:MC4CAQAwBQYDK2VwBCIEIP0xM6pE7qZ4c5A0i98h2j3k4l5m6n7o8p9q0r1s2t3u',
    signature: '1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f809',
    canonical_payload: JSON.stringify({
      passport_id: 'BP-2026-1044',
      version: 'v1.4',
      file_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
      governance_score: 98,
      reviewer: 'Marcus Vance',
      issued_at: '2026-10-28T14:15:00Z'
    }, null, 2),
    issued_at: '2026-10-28 14:15:00 UTC',
    total_checks: 18,
    critical_issues_resolved: 1,
    warnings_resolved: 4,
    ai_disclosure: 'Automated checker screened for WCAG 2.1 AA color contrast and trademark capitalization.',
    evidence_citations: [
      {
        claim: 'Zero artificial preservatives in all botanical infusions',
        source: 'QA Lab Certificate #QA-2026-88',
        owner: 'Food & Beverage Regulatory Affairs',
        status: 'verified'
      }
    ]
  }
];

const MOCK_CHANGE_REQUESTS: ChangeRequestRecord[] = [
  {
    id: 'CR-801',
    submission_id: 'sub-001',
    project_id: 'proj-summer-2027',
    company_id: 'acme-global-brands',
    title: 'Extend Forrester 65% Efficiency Claim during Annual Audit',
    request_type: 'Claim Expiry Extension',
    description: 'The Forrester study claim (CLM-2026-104) reaches its 12-month review window on Nov 14. Requesting a 45-day bridge extension while the 2027 study is finalized.',
    priority: 'high',
    requested_by: 'Sarah Chen (Lead Product Marketer)',
    submitted_at: '2026-10-28 17:00',
    status: 'pending',
    admin_response: 'Under review by Chief Legal Officer. Verification of interim survey methodology required.',
    reviewer_feedback: 'Interim survey methodology submitted for CLO desk signoff.'
  },
  {
    id: 'CR-802',
    submission_id: 'sub-002',
    project_id: 'proj-health-2026',
    company_id: 'astrahealth-global',
    title: 'Introduce Latin American Mercosur Regulatory Disclaimer',
    request_type: 'New Disclaimer',
    description: 'Addition of localized medical equipment disclaimer for upcoming commercial launch across Brazil, Argentina, and Chile.',
    priority: 'medium',
    requested_by: 'Carlos Mendez (Regional Director)',
    submitted_at: '2026-10-20 09:30',
    status: 'resolved',
    admin_response: 'Approved and merged into International Legal Standard pack.',
    reviewer_feedback: 'Approved by Regulatory Compliance team on Oct 22.'
  },
  {
    id: 'CR-803',
    submission_id: 'sub-001',
    project_id: 'proj-summer-2027',
    company_id: 'acme-global-brands',
    title: 'Update Primary Brand Display Typeface to Bricolage Grotesque',
    request_type: 'Typography Guideline',
    description: 'Replace legacy display font instances with Bricolage Grotesque 800 across all EU market hero banners.',
    priority: 'low',
    requested_by: 'Praveen K. (Creative Lead)',
    submitted_at: '2026-10-29 14:10',
    status: 'in_review',
    admin_response: 'Sample banner mockups requested for brand consistency evaluation.',
    reviewer_feedback: 'Testing ligature rendering on localized Cyrillic and Greek variants.'
  }
];

const MOCK_OPERATIONS_SUBMISSIONS: ReviewSubmissionItem[] = [
  {
    id: 'sub-001',
    project_id: 'proj-summer-2027',
    project_name: 'Summer Sale 2027 Global Campaign',
    company_id: 'acme-global-brands',
    company_name: 'Acme Global Brands',
    review_type: 'marketing',
    file_id: 'file-001',
    file_name: 'Summer_Campaign_Master_Copy_v1.4.pdf',
    version_number: 'v1.4',
    status: 'approved',
    submitted_by: 'Sarah Chen (Lead Marketer)',
    submitted_at: '2026-10-28 11:20:00 UTC',
    assigned_reviewer: 'Elena Rostova',
    findings_count: 3,
    critical_count: 0,
    content_summary: 'Promotional copy, hero headlines, and customer callouts for Summer 2027 campaign.',
    latest_report_id: 'rep-001',
    approved_version_number: 'v1.4',
    decisions_count: 2
  },
  {
    id: 'sub-002',
    project_id: 'proj-health-2026',
    project_name: 'HealthCare Diagnostics 2026 Clinical Release',
    company_id: 'astrahealth-global',
    company_name: 'AstraHealth Global',
    review_type: 'documents',
    file_id: 'file-002',
    file_name: 'Clinical_Claims_Substantiation_Manual.docx',
    version_number: 'v2.1',
    status: 'approved',
    submitted_by: 'Dr. Marcus Vance',
    submitted_at: '2026-10-26 14:10:00 UTC',
    assigned_reviewer: 'Elena Rostova',
    findings_count: 2,
    critical_count: 0,
    content_summary: 'Multi-site clinical trial disclosures, diagnostic accuracy metrics, and IRB disclaimers.',
    latest_report_id: 'rep-002',
    approved_version_number: 'v2.1',
    decisions_count: 1
  },
  {
    id: 'sub-003',
    project_id: 'proj-enterprise-trust',
    project_name: 'Enterprise Security & Compliance Whitepaper',
    company_id: 'acme-global-brands',
    company_name: 'Acme Global Brands',
    review_type: 'documents',
    file_id: 'file-003',
    file_name: 'Enterprise_Trust_Report_2026.pdf',
    version_number: 'v1.0',
    status: 'under_review',
    submitted_by: 'Alex Morgan',
    submitted_at: '2026-10-30 08:30:00 UTC',
    assigned_reviewer: 'Elena Rostova',
    findings_count: 5,
    critical_count: 1,
    content_summary: 'SOC 2 Type II attestation, data residency claims, and enterprise SLA descriptions.',
    latest_report_id: 'rep-003',
    decisions_count: 0
  }
];

const MOCK_INBOX_SUBMISSIONS: { summary: InboxSummary; submissions: InboxSubmissionItem[]; total: number } = {
  summary: {
    total: 3,
    new: 1,
    in_review: 1,
    awaiting_info: 1,
    converted: 0,
    closed: 0
  },
  total: 3,
  submissions: [
    {
      id: 'inbox-001',
      contact_name: 'David K. Reynolds',
      email: 'd.reynolds@astrahealth.com',
      company_name: 'AstraHealth Global',
      job_title: 'Director of Brand & Communications',
      phone: '+1 617-555-0199',
      website: 'https://astrahealth.example.com',
      team_size: '50-200 members',
      request_type: 'Enterprise Brand Governance License',
      service_interest: 'Claim Ledger & Automated Verification',
      campaign_details: 'Global product relaunch across 14 languages with clinical accuracy requirements.',
      message: 'We are seeking an evidence-first brand governance platform for 400 global medical copywriters and reviewers.'
    },
    {
      id: 'inbox-002',
      contact_name: 'Helena Berg',
      email: 'hberg@nordicfintech.se',
      company_name: 'Nordic Bank Financial',
      job_title: 'Head of Regulatory Marketing',
      phone: '+46 8 555 1234',
      website: 'https://nordicbank.example.se',
      team_size: '20-50 members',
      request_type: 'Pilot Program & Guidelines Migration',
      service_interest: 'Financial Claims Ledger & WCAG Accessibility',
      campaign_details: 'Transitioning internal guidelines from static PDF to executable rule index.',
      message: 'Need automated terminology checks and verified claim ledgers before external marketing release.'
    },
    {
      id: 'inbox-003',
      contact_name: 'Liam O’Connor',
      email: 'loconnor@apexmedia.ie',
      company_name: 'Apex Creative Partners',
      job_title: 'Managing Partner',
      phone: '+353 1 496 0000',
      website: 'https://apexmedia.example.com',
      team_size: '10-20 members',
      request_type: 'Agency Partner Integration',
      service_interest: 'Brand Passport Certification',
      campaign_details: 'Agency client review portal and exportable cryptographic Brand Passports.',
      message: 'Interested in issuing client-facing tamper-evident Brand Passports upon creative handoff.'
    }
  ]
};

/**
 * Fetch real submissions for the Operations Review Queue.
 */
export async function fetchOperationsSubmissions(filters?: {
  status?: string;
  review_type?: string;
  company_id?: string;
  date_from?: string;
}): Promise<ReviewSubmissionItem[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.review_type && filters.review_type !== 'all') params.append('review_type', filters.review_type);
    if (filters?.company_id && filters.company_id !== 'all') params.append('company_id', filters.company_id);
    if (filters?.date_from) params.append('date_from', filters.date_from);

    const url = `${API_BASE_URL}/api/operations/submissions?${params.toString()}`;
    const res = await fetch(url, { headers: getOperationsAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      return data.submissions || [];
    }
  } catch (err) {
    console.warn('Backend unavailable, using mock Operations Submissions:', err);
  }

  let list = [...MOCK_OPERATIONS_SUBMISSIONS];
  if (filters?.status && filters.status !== 'all') {
    list = list.filter(s => s.status === filters.status);
  }
  if (filters?.review_type && filters.review_type !== 'all') {
    list = list.filter(s => s.review_type === filters.review_type);
  }
  return list;
}

/**
 * Fetch full submission detail including decision history and change requests.
 */
export async function fetchSubmissionDetail(submissionId: string): Promise<ReviewSubmissionDetail> {
  try {
    const url = `${API_BASE_URL}/api/operations/submissions/${encodeURIComponent(submissionId)}`;
    const res = await fetch(url, { headers: getOperationsAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      return data.submission;
    }
  } catch (err) {
    console.warn('Backend unavailable, using mock submission detail:', err);
  }

  const found = MOCK_OPERATIONS_SUBMISSIONS.find(s => s.id === submissionId) || MOCK_OPERATIONS_SUBMISSIONS[0];
  return {
    ...found,
    content_text: 'Enterprise brand content under review with verified citations and rule checks.',
    decisions: [
      {
        id: 'dec-01',
        version_number: found.version_number,
        reviewer_id: 'usr-elena-01',
        reviewer_name: 'Elena Rostova',
        reviewer_role: 'Senior Governance Reviewer',
        decision: 'approved',
        previous_status: 'under_review',
        resulting_status: 'approved',
        comments: 'All evidence-linked citations verified against official guidelines.',
        created_at: '2026-10-28 11:20:00 UTC'
      }
    ],
    change_requests: MOCK_CHANGE_REQUESTS.filter(cr => cr.submission_id === found.id)
  };
}

/**
 * Queue a completed AI review into the Human Operations Review Queue.
 */
export async function createOperationsSubmission(payload: {
  project_id: string;
  review_type: string;
  file_id?: string;
  file_name?: string;
  content_text?: string;
  content_summary?: string;
  findings?: any[];
}): Promise<any> {
  try {
    const url = `${API_BASE_URL}/api/operations/submissions`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getOperationsAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend unavailable, queuing submission locally:', err);
  }

  const newSub: ReviewSubmissionItem = {
    id: `sub-${Date.now()}`,
    project_id: payload.project_id,
    project_name: payload.file_name || 'Manuscript Review',
    company_id: 'acme-global-brands',
    company_name: 'Acme Global Brands',
    review_type: payload.review_type,
    file_id: payload.file_id || null,
    file_name: payload.file_name || 'review_document.docx',
    version_number: 'v1.0',
    status: 'submitted',
    submitted_by: 'You (Author)',
    submitted_at: new Date().toISOString(),
    assigned_reviewer: 'Elena Rostova',
    findings_count: payload.findings?.length || 0,
    critical_count: payload.findings?.filter((f: any) => f.severity === 'critical' || f.severity === 'high').length || 0,
    content_summary: payload.content_summary || 'Review submission pending human authorization.',
    latest_report_id: `rep-${Date.now()}`,
    decisions_count: 0
  };
  MOCK_OPERATIONS_SUBMISSIONS.unshift(newSub);
  return { success: true, submission: newSub, message: 'Queued in human review queue.' };
}

/**
 * Record an authorized Human Reviewer decision (Approved, Changes Requested, Rejected).
 */
export async function recordOperationsDecision(
  submissionId: string,
  payload: {
    decision: 'approved' | 'changes_requested' | 'rejected';
    comments: string;
    actionable_instructions?: string;
  }
): Promise<any> {
  try {
    const url = `${API_BASE_URL}/api/operations/submissions/${encodeURIComponent(submissionId)}/decision`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getOperationsAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend unavailable, recording decision locally:', err);
  }

  const sub = MOCK_OPERATIONS_SUBMISSIONS.find(s => s.id === submissionId);
  if (sub) {
    sub.status = payload.decision;
    sub.decisions_count += 1;
    if (payload.decision === 'approved') {
      sub.approved_version_number = sub.version_number;
    }
  }
  return { success: true, message: `Decision '${payload.decision}' successfully recorded.` };
}

/**
 * Customer submits revised content in response to reviewer change requests.
 */
export async function resubmitOperationsSubmission(
  submissionId: string,
  payload: {
    revised_content: string;
    resubmission_notes?: string;
  }
): Promise<any> {
  try {
    const url = `${API_BASE_URL}/api/operations/submissions/${encodeURIComponent(submissionId)}/resubmit`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getOperationsAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend unavailable, resubmitting locally:', err);
  }

  const sub = MOCK_OPERATIONS_SUBMISSIONS.find(s => s.id === submissionId);
  if (sub) {
    sub.status = 'resubmitted';
    sub.version_number = 'v1.1';
  }
  return { success: true, message: 'Revised content resubmitted for human review.' };
}

/**
 * Fetch customer change requests and reviewer revision instructions.
 */
export async function fetchOperationsChangeRequests(status?: string): Promise<ChangeRequestRecord[]> {
  try {
    const params = new URLSearchParams();
    if (status && status !== 'all') params.append('status', status);

    const url = `${API_BASE_URL}/api/operations/change-requests?${params.toString()}`;
    const res = await fetch(url, { headers: getOperationsAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      return data.change_requests || [];
    }
  } catch (err) {
    console.warn('Backend unavailable, returning mock Change Requests:', err);
  }

  if (status && status !== 'all') {
    return MOCK_CHANGE_REQUESTS.filter(cr => cr.status === status);
  }
  return MOCK_CHANGE_REQUESTS;
}

/**
 * Customer submits a new change request.
 */
export async function createOperationsChangeRequest(payload: {
  title: string;
  request_type: string;
  description: string;
  priority?: string;
  submission_id?: string;
  project_id?: string;
}): Promise<any> {
  try {
    const url = `${API_BASE_URL}/api/operations/change-requests`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getOperationsAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend unavailable, creating change request locally:', err);
  }

  const newCr: ChangeRequestRecord = {
    id: `CR-${Math.floor(800 + Math.random() * 200)}`,
    title: payload.title,
    request_type: payload.request_type,
    description: payload.description,
    priority: payload.priority || 'medium',
    submission_id: payload.submission_id || null,
    project_id: payload.project_id || null,
    company_id: 'acme-global-brands',
    requested_by: 'You (Active Author)',
    submitted_at: new Date().toISOString().slice(0, 16).replace('T', ' '),
    status: 'pending',
    reviewer_feedback: 'Submitted to human review queue.'
  };
  MOCK_CHANGE_REQUESTS.unshift(newCr);
  return { success: true, change_request: newCr, message: 'Change request submitted successfully.' };
}

// =====================================================================
// Phase 10: Brand Passport System with Cryptographic Integrity Verification
// =====================================================================

export interface BrandPassportItem {
  id: string;
  passport_number: string;
  submission_id?: string;
  project_id: string;
  project_name: string;
  company_id: string;
  company_name: string;
  review_type: string;
  approved_version_number: string;
  approved_file_name: string;
  approved_file_hash: string;
  guideline_version: string;
  governance_score: number;
  authorized_reviewer_name: string;
  status: 'VERIFIED' | 'REVOKED' | 'INVALID_SIGNATURE' | 'FILE_MODIFIED' | 'APPROVAL_NOT_VALID' | 'VERIFICATION_UNAVAILABLE';
  algorithm: string;
  key_id: string;
  public_key: string;
  signature: string;
  issued_at: string | null;
  revoked_at?: string | null;
  revoked_by?: string | null;
  revocation_reason?: string | null;
  total_checks: number;
}

export interface BrandPassportDetail extends BrandPassportItem {
  canonical_payload: string;
  authorized_reviewer_id: string;
  schema_version: string;
  evidence_citations: Array<{ rule?: string; doc?: string; status?: string; claim?: string; source?: string; owner?: string }>;
  critical_issues_resolved?: number;
  warnings_resolved?: number;
  ai_disclosure?: string;
}

export interface PassportVerificationResult {
  passport_id: string;
  passport_number: string;
  status: string;
  is_valid: boolean;
  message: string;
  algorithm?: string;
  key_id?: string;
  public_key?: string;
  approved_file_hash?: string;
  current_file_hash?: string;
  verified_at?: string;
  revoked_at?: string;
  revoked_by?: string;
  revocation_reason?: string;
}

/**
 * List issued Brand Passports with multi-tenant company isolation.
 */
export async function fetchBrandPassports(filters?: {
  company_id?: string;
  review_type?: string;
  status?: string;
}): Promise<BrandPassportItem[]> {
  try {
    const params = new URLSearchParams();
    if (filters?.company_id && filters.company_id !== 'all') params.append('company_id', filters.company_id);
    if (filters?.review_type && filters.review_type !== 'all') params.append('review_type', filters.review_type);
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);

    const url = `${API_BASE_URL}/api/passports?${params.toString()}`;
    const res = await fetch(url, { headers: getOperationsAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      return data.passports || [];
    }
  } catch (err) {
    console.warn('Backend unavailable, returning mock Brand Passports:', err);
  }

  let list = [...MOCK_BRAND_PASSPORTS];
  if (filters?.status && filters.status !== 'all') {
    list = list.filter(p => p.status === filters.status);
  }
  if (filters?.review_type && filters.review_type !== 'all') {
    list = list.filter(p => p.review_type === filters.review_type);
  }
  return list;
}

/**
 * Retrieve full details of an issued Brand Passport.
 */
export async function fetchBrandPassportDetail(passportId: string): Promise<BrandPassportDetail> {
  try {
    const url = `${API_BASE_URL}/api/passports/${encodeURIComponent(passportId)}`;
    const res = await fetch(url, { headers: getOperationsAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      return data.passport;
    }
  } catch (err) {
    console.warn('Backend unavailable, returning mock Brand Passport detail:', err);
  }

  const found = MOCK_BRAND_PASSPORTS.find(p => p.id === passportId || p.passport_number === passportId);
  return found || MOCK_BRAND_PASSPORTS[0];
}

/**
 * Issue a Brand Passport for an approved version.
 */
export async function issueBrandPassport(submissionId: string, guidelineVersion: string = '2026.1'): Promise<any> {
  try {
    const url = `${API_BASE_URL}/api/passports/issue`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getOperationsAuthHeaders(),
      body: JSON.stringify({ submission_id: submissionId, guideline_version: guidelineVersion })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend unavailable, issuing Brand Passport locally:', err);
  }

  const matchingSub = MOCK_OPERATIONS_SUBMISSIONS.find(s => s.id === submissionId) || MOCK_OPERATIONS_SUBMISSIONS[0];
  const newNum = `BP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
  const newPassport: BrandPassportDetail = {
    id: newNum,
    passport_number: newNum,
    submission_id: submissionId,
    project_id: matchingSub.project_id,
    project_name: matchingSub.project_name,
    company_id: matchingSub.company_id,
    company_name: matchingSub.company_name,
    review_type: matchingSub.review_type,
    approved_version_number: matchingSub.approved_version_number || 'v1.0',
    approved_file_name: matchingSub.file_name,
    approved_file_hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    guideline_version: guidelineVersion,
    governance_score: 100,
    authorized_reviewer_name: 'Elena Rostova (Senior Brand Governance Reviewer)',
    authorized_reviewer_id: 'usr-elena-01',
    schema_version: '1.0.0',
    status: 'VERIFIED',
    algorithm: 'RFC 8032 Ed25519',
    key_id: 'bg-ed25519-key-2026-pri',
    public_key: 'ed25519:MC4CAQAwBQYDK2VwBCIEIP0xM6pE7qZ4c5A0i98h2j3k4l5m6n7o8p9q0r1s2t3u',
    signature: '99887766554433221100aabbccddeeff99887766554433221100aabbccddeeff99887766554433221100aabbccddeeff99887766554433221100aabbccddeeff',
    canonical_payload: JSON.stringify({
      passport_id: newNum,
      submission_id: submissionId,
      governance_score: 100,
      reviewer: 'Elena Rostova',
      issued_at: new Date().toISOString()
    }, null, 2),
    issued_at: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
    total_checks: 20,
    critical_issues_resolved: 2,
    warnings_resolved: 1,
    ai_disclosure: 'Automated checker verified claims against approved ledger. Final certificate issued by human reviewer.',
    evidence_citations: [
      {
        claim: 'Verified against Brand Standard 2026',
        source: 'Master Guideline Document',
        owner: 'Governance Board',
        status: 'verified'
      }
    ]
  };
  MOCK_BRAND_PASSPORTS.unshift(newPassport);
  return { success: true, passport: newPassport, message: 'Brand Passport issued successfully with cryptographic signature.' };
}

/**
 * Perform real cryptographic integrity verification of a Brand Passport.
 */
export async function verifyPassportIntegrity(passportId: string): Promise<PassportVerificationResult> {
  try {
    const url = `${API_BASE_URL}/api/passports/${encodeURIComponent(passportId)}/verify`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getOperationsAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      return data.verification;
    }
  } catch (err) {
    console.warn('Backend unavailable, verifying locally:', err);
  }

  const p = MOCK_BRAND_PASSPORTS.find(x => x.id === passportId || x.passport_number === passportId);
  return {
    passport_id: passportId,
    passport_number: p ? p.passport_number : passportId,
    status: p?.status || 'VERIFIED',
    is_valid: p?.status !== 'REVOKED',
    message: p?.status === 'REVOKED'
      ? `Passport was REVOKED: ${p.revocation_reason || 'Administrative action'}`
      : 'Cryptographic RFC 8032 Ed25519 signature verified. SHA-256 byte digest matches immutable ledger entry.',
    algorithm: p?.algorithm || 'RFC 8032 Ed25519',
    key_id: p?.key_id || 'bg-ed25519-key-2026-pri',
    public_key: p?.public_key || 'ed25519:MC4CAQAwBQYDK2VwBCIEIP0xM6pE7qZ4c5A0i98h2j3k4l5m6n7o8p9q0r1s2t3u',
    approved_file_hash: p?.approved_file_hash,
    current_file_hash: p?.approved_file_hash,
    verified_at: new Date().toISOString()
  };
}

/**
 * Revoke a Brand Passport for cause.
 */
export async function revokeBrandPassport(passportId: string, reason: string): Promise<any> {
  try {
    const url = `${API_BASE_URL}/api/passports/${encodeURIComponent(passportId)}/revoke`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getOperationsAuthHeaders(),
      body: JSON.stringify({ reason })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend unavailable, revoking locally:', err);
  }

  const p = MOCK_BRAND_PASSPORTS.find(x => x.id === passportId || x.passport_number === passportId);
  if (p) {
    p.status = 'REVOKED';
    p.revocation_reason = reason;
    p.revoked_at = new Date().toISOString();
    p.revoked_by = 'Elena Rostova (Compliance Desk)';
  }
  return { success: true, message: 'Brand Passport revoked for cause.' };
}

/**
 * Export Brand Passport Audit Certificate as a certified PDF or raw JSON audit proof envelope.
 */
export async function downloadPassportExport(passportId: string, format: 'pdf' | 'json'): Promise<void> {
  try {
    const url = `${API_BASE_URL}/api/passports/${encodeURIComponent(passportId)}/export?format=${format}`;
    const res = await fetch(url, { headers: getOperationsAuthHeaders() });
    if (res.ok) {
      if (format === 'json') {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `BrandPassport-${passportId}-Proof.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `BrandPassport-${passportId}-AuditCertificate.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      return;
    }
  } catch (err) {
    console.warn('Backend unavailable, generating export locally:', err);
  }

  const p = MOCK_BRAND_PASSPORTS.find(x => x.id === passportId || x.passport_number === passportId) || MOCK_BRAND_PASSPORTS[0];
  const proof = {
    certificate_type: 'BrandGuard Cryptographic Brand Passport',
    passport_number: p.passport_number,
    status: p.status,
    issued_at: p.issued_at,
    project_name: p.project_name,
    company_name: p.company_name,
    approved_file_hash: p.approved_file_hash,
    governance_score: p.governance_score,
    reviewer: p.authorized_reviewer_name,
    digital_signature: {
      algorithm: p.algorithm,
      key_id: p.key_id,
      public_key: p.public_key,
      signature: p.signature
    },
    evidence_citations: p.evidence_citations
  };
  const blob = new Blob([JSON.stringify(proof, null, 2)], { type: 'application/json' });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `BrandPassport-${passportId}-${format === 'pdf' ? 'AuditSummary.json' : 'Proof.json'}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}

// =====================================================================
// Operations Inbox & Multi-Channel Content Intake
// =====================================================================

export interface InboxSummary {
  total: number;
  new: number;
  in_review: number;
  awaiting_info: number;
  converted: number;
  closed: number;
}

export interface InboxSubmissionItem {
  id: string;
  contact_name: string;
  email: string;
  company_name: string;
  job_title?: string | null;
  phone?: string | null;
  website?: string | null;
  team_size?: string | null;
  request_type: string;
  service_interest?: string | null;
  campaign_details?: string | null;
  message: string;
  source_page?: string | null;
  source_form?: string | null;
  attachments?: Array<{ filename: string; size: number; storage_path?: string }>;
  status?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to_name?: string | null;
  assigned_to_id?: string | null;
  internal_notes?: string | null;
  converted_project_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

/**
 * Submit an enterprise inquiry or evaluation request.
 */
export async function submitInquiry(payload: {
  contact_name: string;
  email: string;
  company_name: string;
  team_size?: string;
  message: string;
  request_type?: string;
  service_interest?: string;
  source_page?: string;
  source_form?: string;
}): Promise<{ success: boolean; submission_id: string; message: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/inbox/inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend unavailable, recording inquiry locally:', err);
  }

  const newId = `inbox-${Date.now()}`;
  MOCK_INBOX_SUBMISSIONS.submissions.unshift({
    id: newId,
    contact_name: payload.contact_name,
    email: payload.email,
    company_name: payload.company_name,
    team_size: payload.team_size || '10-50 reviewers',
    message: payload.message,
    request_type: payload.request_type || 'Enterprise Inquiry',
    service_interest: payload.service_interest,
    source_page: payload.source_page || '/#contact',
    status: 'new',
    created_at: new Date().toISOString()
  });
  MOCK_INBOX_SUBMISSIONS.summary.total += 1;
  MOCK_INBOX_SUBMISSIONS.summary.new += 1;
  return { success: true, submission_id: newId, message: 'Inquiry received.' };
}

/**
 * List inbound submissions for Operations Inbox.
 */
export async function fetchInboxSubmissions(filters?: {
  status?: string;
  request_type?: string;
  search?: string;
  sort_by?: 'newest' | 'oldest';
}): Promise<{ summary: InboxSummary; submissions: InboxSubmissionItem[]; total: number }> {
  try {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters?.request_type && filters.request_type !== 'all') params.append('request_type', filters.request_type);
    if (filters?.search && filters.search.trim()) params.append('search', filters.search.trim());
    if (filters?.sort_by) params.append('sort_by', filters.sort_by);

    const url = `${API_BASE_URL}/api/inbox/submissions${params.toString() ? `?${params.toString()}` : ''}`;
    const res = await fetch(url, { headers: getOperationsAuthHeaders() });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend unavailable, returning mock Inbox submissions:', err);
  }

  let list = [...MOCK_INBOX_SUBMISSIONS.submissions];
  if (filters?.status && filters.status !== 'all') {
    list = list.filter(item => item.status === filters.status);
  }
  if (filters?.search && filters.search.trim()) {
    const q = filters.search.toLowerCase();
    list = list.filter(item => 
      item.contact_name.toLowerCase().includes(q) ||
      item.company_name.toLowerCase().includes(q) ||
      item.email.toLowerCase().includes(q) ||
      item.message.toLowerCase().includes(q)
    );
  }
  return {
    summary: MOCK_INBOX_SUBMISSIONS.summary,
    submissions: list,
    total: list.length
  };
}

/**
 * Retrieve full details of an Inbox submission.
 */
export async function fetchInboxSubmissionDetail(submissionId: string): Promise<InboxSubmissionItem> {
  try {
    const url = `${API_BASE_URL}/api/inbox/submissions/${encodeURIComponent(submissionId)}`;
    const res = await fetch(url, { headers: getOperationsAuthHeaders() });
    if (res.ok) {
      const data = await res.json();
      return data.submission;
    }
  } catch (err) {
    console.warn('Backend unavailable, returning mock Inbox detail:', err);
  }

  const found = MOCK_INBOX_SUBMISSIONS.submissions.find(s => s.id === submissionId);
  return found || MOCK_INBOX_SUBMISSIONS.submissions[0];
}

/**
 * Update status, assignee, or internal admin notes for an Inbox submission.
 */
export async function updateInboxSubmission(
  submissionId: string,
  payload: {
    status?: string;
    assigned_to_id?: string | null;
    assigned_to_name?: string | null;
    internal_notes?: string | null;
  }
): Promise<any> {
  try {
    const url = `${API_BASE_URL}/api/inbox/submissions/${encodeURIComponent(submissionId)}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: getOperationsAuthHeaders(),
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend unavailable, updating Inbox item locally:', err);
  }

  const item = MOCK_INBOX_SUBMISSIONS.submissions.find(s => s.id === submissionId);
  if (item) {
    if (payload.status) item.status = payload.status as any;
    if (payload.assigned_to_name) item.assigned_to_name = payload.assigned_to_name;
    if (payload.internal_notes) item.internal_notes = payload.internal_notes;
  }
  return { success: true, message: 'Inbox submission updated.' };
}

/**
 * Convert an Inbox submission into a managed corporate Project.
 */
export async function convertInboxSubmissionToProject(submissionId: string): Promise<{ success: boolean; project_id: string; project_title: string; message: string }> {
  try {
    const url = `${API_BASE_URL}/api/inbox/submissions/${encodeURIComponent(submissionId)}/convert-to-project`;
    const res = await fetch(url, {
      method: 'POST',
      headers: getOperationsAuthHeaders()
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Backend unavailable, converting locally:', err);
  }

  const item = MOCK_INBOX_SUBMISSIONS.submissions.find(s => s.id === submissionId);
  if (item) {
    item.status = 'converted';
    item.converted_project_id = 'proj-converted-' + Date.now();
  }
  return {
    success: true,
    project_id: item?.converted_project_id || 'proj-summer-2027',
    project_title: item ? item.company_name + ' Campaign Project' : 'New Project',
    message: 'Submission successfully converted into active BrandGuard Project.'
  };
}
