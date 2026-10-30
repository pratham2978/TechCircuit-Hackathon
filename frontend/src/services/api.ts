import { AnalysisFinding } from '../utils/pdfGenerator';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

/**
 * Fetch real submissions for the Operations Review Queue.
 */
export async function fetchOperationsSubmissions(filters?: {
  status?: string;
  review_type?: string;
  company_id?: string;
  date_from?: string;
}): Promise<ReviewSubmissionItem[]> {
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters?.review_type && filters.review_type !== 'all') params.append('review_type', filters.review_type);
  if (filters?.company_id && filters.company_id !== 'all') params.append('company_id', filters.company_id);
  if (filters?.date_from) params.append('date_from', filters.date_from);

  const url = `${API_BASE_URL}/api/operations/submissions?${params.toString()}`;
  const res = await fetch(url, { headers: getOperationsAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Failed to load operations submissions: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.submissions || [];
}

/**
 * Fetch full submission detail including decision history and change requests.
 */
export async function fetchSubmissionDetail(submissionId: string): Promise<ReviewSubmissionDetail> {
  const url = `${API_BASE_URL}/api/operations/submissions/${encodeURIComponent(submissionId)}`;
  const res = await fetch(url, { headers: getOperationsAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Failed to load submission details: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.submission;
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
  const url = `${API_BASE_URL}/api/operations/submissions`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getOperationsAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || data.message || `Failed to submit review: HTTP ${res.status}`);
  }
  return data;
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
  const url = `${API_BASE_URL}/api/operations/submissions/${encodeURIComponent(submissionId)}/decision`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getOperationsAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || data.message || `Failed to record decision: HTTP ${res.status}`);
  }
  return data;
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
  const url = `${API_BASE_URL}/api/operations/submissions/${encodeURIComponent(submissionId)}/resubmit`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getOperationsAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || data.message || `Failed to resubmit revision: HTTP ${res.status}`);
  }
  return data;
}

/**
 * Fetch customer change requests and reviewer revision instructions.
 */
export async function fetchOperationsChangeRequests(status?: string): Promise<ChangeRequestRecord[]> {
  const params = new URLSearchParams();
  if (status && status !== 'all') params.append('status', status);

  const url = `${API_BASE_URL}/api/operations/change-requests?${params.toString()}`;
  const res = await fetch(url, { headers: getOperationsAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Failed to load change requests: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.change_requests || [];
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
  const url = `${API_BASE_URL}/api/operations/change-requests`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getOperationsAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || data.message || `Failed to create change request: HTTP ${res.status}`);
  }
  return data;
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
  const params = new URLSearchParams();
  if (filters?.company_id && filters.company_id !== 'all') params.append('company_id', filters.company_id);
  if (filters?.review_type && filters.review_type !== 'all') params.append('review_type', filters.review_type);
  if (filters?.status && filters.status !== 'all') params.append('status', filters.status);

  const url = `${API_BASE_URL}/api/passports?${params.toString()}`;
  const res = await fetch(url, { headers: getOperationsAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Failed to load Brand Passports: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.passports || [];
}

/**
 * Retrieve full details of an issued Brand Passport.
 */
export async function fetchBrandPassportDetail(passportId: string): Promise<BrandPassportDetail> {
  const url = `${API_BASE_URL}/api/passports/${encodeURIComponent(passportId)}`;
  const res = await fetch(url, { headers: getOperationsAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Failed to load Brand Passport details: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.passport;
}

/**
 * Issue a Brand Passport for an approved version.
 */
export async function issueBrandPassport(submissionId: string, guidelineVersion: string = '2026.1'): Promise<any> {
  const url = `${API_BASE_URL}/api/passports/issue`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getOperationsAuthHeaders(),
    body: JSON.stringify({ submission_id: submissionId, guideline_version: guidelineVersion })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || data.message || `Failed to issue Brand Passport: HTTP ${res.status}`);
  }
  return data;
}

/**
 * Perform real cryptographic integrity verification of a Brand Passport.
 */
export async function verifyPassportIntegrity(passportId: string): Promise<PassportVerificationResult> {
  const url = `${API_BASE_URL}/api/passports/${encodeURIComponent(passportId)}/verify`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getOperationsAuthHeaders()
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Verification request failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.verification;
}

/**
 * Revoke a Brand Passport for cause.
 */
export async function revokeBrandPassport(passportId: string, reason: string): Promise<any> {
  const url = `${API_BASE_URL}/api/passports/${encodeURIComponent(passportId)}/revoke`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getOperationsAuthHeaders(),
    body: JSON.stringify({ reason })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || data.message || `Failed to revoke Brand Passport: HTTP ${res.status}`);
  }
  return data;
}

/**
 * Export Brand Passport Audit Certificate as a certified PDF or raw JSON audit proof envelope.
 */
export async function downloadPassportExport(passportId: string, format: 'pdf' | 'json'): Promise<void> {
  const url = `${API_BASE_URL}/api/passports/${encodeURIComponent(passportId)}/export?format=${format}`;
  const res = await fetch(url, { headers: getOperationsAuthHeaders() });
  if (!res.ok) {
    throw new Error(`Failed to export passport: HTTP ${res.status}`);
  }

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

  // PDF download
  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition');
  let filename = `BrandPassport-${passportId}-Certificate.pdf`;
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
// Admin Inbox: Inbound Form Submissions & Operations Management
// =====================================================================

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
  attachments?: Array<{ filename: string; size: number; storage_path?: string }>;
  source_page?: string;
  source_form?: string;
  status: 'new' | 'in_review' | 'awaiting_info' | 'converted' | 'closed';
  assigned_to_id?: string | null;
  assigned_to_name?: string | null;
  internal_notes?: string | null;
  converted_project_id?: string | null;
  created_at: string | null;
  updated_at?: string | null;
}

export interface InboxSummary {
  total: number;
  new: number;
  in_review: number;
  awaiting_info: number;
  converted: number;
  closed: number;
}

export interface SubmitInquiryPayload {
  contact_name: string;
  email: string;
  company_name: string;
  job_title?: string;
  phone?: string;
  website?: string;
  team_size?: string;
  request_type?: string;
  service_interest?: string;
  campaign_details?: string;
  message: string;
  source_page?: string;
  source_form?: string;
  attachments?: Array<any>;
}

/**
 * Public request form submission.
 */
export async function submitInquiry(payload: SubmitInquiryPayload): Promise<{ success: boolean; submission_id: string; message: string }> {
  const res = await fetch(`${API_BASE_URL}/api/inbox/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || data.message || `Failed to submit inquiry: HTTP ${res.status}`);
  }
  return data;
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
  const params = new URLSearchParams();
  if (filters?.status && filters.status !== 'all') params.append('status', filters.status);
  if (filters?.request_type && filters.request_type !== 'all') params.append('request_type', filters.request_type);
  if (filters?.search && filters.search.trim()) params.append('search', filters.search.trim());
  if (filters?.sort_by) params.append('sort_by', filters.sort_by);

  const url = `${API_BASE_URL}/api/inbox/submissions${params.toString() ? `?${params.toString()}` : ''}`;
  const res = await fetch(url, { headers: getOperationsAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch Inbox submissions: HTTP ${res.status}`);
  }
  return await res.json();
}

/**
 * Retrieve full details of an Inbox submission.
 */
export async function fetchInboxSubmissionDetail(submissionId: string): Promise<InboxSubmissionItem> {
  const url = `${API_BASE_URL}/api/inbox/submissions/${encodeURIComponent(submissionId)}`;
  const res = await fetch(url, { headers: getOperationsAuthHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch submission details: HTTP ${res.status}`);
  }
  const data = await res.json();
  return data.submission;
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
  const url = `${API_BASE_URL}/api/inbox/submissions/${encodeURIComponent(submissionId)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: getOperationsAuthHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || data.message || `Failed to update submission: HTTP ${res.status}`);
  }
  return data;
}

/**
 * Convert an Inbox submission into a managed corporate Project.
 */
export async function convertInboxSubmissionToProject(submissionId: string): Promise<{ success: boolean; project_id: string; project_title: string; message: string }> {
  const url = `${API_BASE_URL}/api/inbox/submissions/${encodeURIComponent(submissionId)}/convert-to-project`;
  const res = await fetch(url, {
    method: 'POST',
    headers: getOperationsAuthHeaders()
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.detail || data.message || `Failed to convert submission to project: HTTP ${res.status}`);
  }
  return data;
}


