/**
 * BRANDGUARD BY INKLOOM AI — Master Frontend Client
 * Fully integrated with Node.js Express backend & SQLite database.
 */

const STATE = {
  token: localStorage.getItem('bg_token') || null,
  user: null,
  workspaces: [],
  currentWorkspaceId: null,
  currentDraft: null,
  activeTab: 'dashboard'
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
  await initAuth();
  await loadWorkspaces();
  await switchTab('dashboard');
  calculateContrast(); // Initial WCAG calculation
});

// --- ROLE-BASED ACCESS CONTROL (RBAC) ---
const ROLE_PERMISSIONS = {
  admin: ['dashboard', 'workspaces', 'rules', 'claims', 'studio', 'queue', 'passport', 'audit'],
  brand_manager: ['dashboard', 'workspaces', 'rules', 'claims', 'passport'],
  creator: ['studio', 'passport'],
  reviewer: ['queue', 'dashboard', 'passport']
};

const DEFAULT_TAB_FOR_ROLE = {
  admin: 'dashboard',
  brand_manager: 'dashboard',
  creator: 'studio',
  reviewer: 'queue'
};

// --- AUTHENTICATION & ROLE SWITCHING ---
async function initAuth() {
  if (STATE.token) {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${STATE.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          STATE.user = data.user;
          updateUserUI();
          return;
        }
      }
    } catch (e) {
      console.warn('Stale session token, re-authenticating demo persona.');
    }
    localStorage.removeItem('bg_token');
    STATE.token = null;
  }
  // Default login as Brand Manager on initial load
  await switchRole('manager@inkloom.ai', true);
}

async function switchRole(email, silent = false, customPassword = null) {
  try {
    const password = customPassword || (email.includes('nexus') ? 'Nexus2026!' : 'password123');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Login failed', 'error');
      return;
    }
    STATE.token = data.token;
    STATE.user = data.user;
    localStorage.setItem('bg_token', data.token);
    
    // Dismiss login modal
    const loginModal = document.getElementById('modal-login');
    if (loginModal) loginModal.classList.remove('open');

    updateUserUI();
    if (!silent) {
      showToast(`Welcome ${data.user.name} (${data.user.role.toUpperCase()})`, 'success');
    }
    await loadWorkspaces();
    refreshCurrentTab();
  } catch (err) {
    showToast('Failed to switch role', 'error');
  }
}

async function quickLoginRole(email) {
  await switchRole(email, false);
}

async function handleManualLogin(event) {
  event.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  await switchRole(email, false, password);
}

function switchAuthTab(tab) {
  const loginTab = document.getElementById('auth-tab-login');
  const regTab = document.getElementById('auth-tab-register');
  const loginPanel = document.getElementById('auth-panel-login');
  const regPanel = document.getElementById('auth-panel-register');

  if (tab === 'register') {
    if (loginTab) {
      loginTab.style.borderColor = 'transparent';
      loginTab.style.color = 'var(--ink-muted)';
    }
    if (regTab) {
      regTab.style.borderColor = 'var(--lime)';
      regTab.style.color = 'var(--lime)';
    }
    if (loginPanel) loginPanel.style.display = 'none';
    if (regPanel) regPanel.style.display = 'block';
  } else {
    if (loginTab) {
      loginTab.style.borderColor = 'var(--lime)';
      loginTab.style.color = 'var(--lime)';
    }
    if (regTab) {
      regTab.style.borderColor = 'transparent';
      regTab.style.color = 'var(--ink-muted)';
    }
    if (loginPanel) loginPanel.style.display = 'block';
    if (regPanel) regPanel.style.display = 'none';
  }
}

function updateUserUI() {
  if (!STATE.user) {
    showLoginModal();
    return;
  }
  document.getElementById('current-user-name').textContent = STATE.user.name;
  const roleEl = document.getElementById('current-user-role');
  roleEl.textContent = STATE.user.role.toUpperCase();
  roleEl.className = `role-badge ${STATE.user.role.toLowerCase().replace(/[\s_]/g, '-')}`;
  document.getElementById('sys-org-badge').textContent = `Org: ${STATE.user.organization_name || 'Inkloom AI'}`;

  // Enforce Role-Based Tab Visibility
  const rawRole = (STATE.user.role || 'creator').toLowerCase().replace(/[\s-]/g, '_');
  const allowedTabs = ROLE_PERMISSIONS[rawRole] || ROLE_PERMISSIONS.creator;

  document.querySelectorAll('.tab-btn').forEach(btn => {
    const tab = btn.dataset.tab;
    if (tab) {
      if (allowedTabs.includes(tab)) {
        btn.style.display = 'inline-flex';
      } else {
        btn.style.display = 'none';
      }
    }
  });

  // Auto switch to role default tab if current tab is unauthorized
  if (!allowedTabs.includes(STATE.activeTab)) {
    const defaultTab = DEFAULT_TAB_FOR_ROLE[rawRole] || allowedTabs[0];
    switchTab(defaultTab);
  }
}

function showAuthModal(tab = 'login') {
  const modal = document.getElementById('modal-login');
  if (modal) modal.classList.add('open');
  switchAuthTab(tab);
}

async function handleManualRegister(event) {
  event.preventDefault();
  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const role = document.getElementById('register-role').value;
  const organization_name = document.getElementById('register-org').value.trim() || 'Inkloom AI';

  if (!name || !email || !password || !role) {
    showToast('Please fill in all required fields', 'error');
    return;
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, organization_name })
    });
    const data = await res.json();
    if (!data.success) {
      showToast(data.error || 'Registration failed', 'error');
      return;
    }
    STATE.token = data.token;
    STATE.user = data.user;
    localStorage.setItem('bg_token', data.token);

    const loginModal = document.getElementById('modal-login');
    if (loginModal) loginModal.classList.remove('open');

    updateUserUI();
    showToast(`Account created! Welcome, ${data.user.name} (${data.user.role.toUpperCase()})`, 'success');
    await loadWorkspaces();
    refreshCurrentTab();
  } catch (err) {
    showToast('Registration request failed: ' + err.message, 'error');
  }
}

function showLoginModal() {
  showAuthModal('login');
}

async function logout() {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${STATE.token}` }
    });
  } catch (e) {}
  STATE.token = null;
  STATE.user = null;
  localStorage.removeItem('bg_token');
  showLoginModal();
  showToast('Logged out. Please sign in.', 'info');
}

// --- API HELPER ---
async function apiFetch(endpoint, method = 'GET', body = null) {
  const headers = {};
  if (STATE.token) headers['Authorization'] = `Bearer ${STATE.token}`;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const options = { method, headers };
  if (body) {
    options.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  const res = await fetch(endpoint, options);
  if (res.status === 401) {
    console.warn('Session expired for endpoint:', endpoint);
    showLoginModal();
    return null;
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await res.text();
    throw new Error(`API Error (${res.status}): Server returned unexpected non-JSON response`);
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}`);
  }
  return data;
}

// --- WORKSPACES ---
async function loadWorkspaces() {
  if (!STATE.token || !STATE.user) return;
  try {
    const res = await apiFetch('/api/workspaces');
    if (res && res.success) {
      STATE.workspaces = res.workspaces;
      const select = document.getElementById('workspace-select');
      select.innerHTML = '';
      res.workspaces.forEach(ws => {
        const opt = document.createElement('option');
        opt.value = ws.id;
        opt.textContent = `${ws.name} (${ws.industry || 'General'})`;
        select.appendChild(opt);
      });

      if (!STATE.currentWorkspaceId && res.workspaces.length > 0) {
        STATE.currentWorkspaceId = res.workspaces[0].id;
      }
      select.value = STATE.currentWorkspaceId;
      updateActiveWorkspaceDisplay();
    }
  } catch (err) {
    console.error('Failed to load workspaces:', err);
  }
}

function handleWorkspaceChange(wsId) {
  STATE.currentWorkspaceId = parseInt(wsId);
  updateActiveWorkspaceDisplay();
  refreshCurrentTab();
  showToast('Active workspace updated', 'info');
}

function updateActiveWorkspaceDisplay() {
  const ws = STATE.workspaces.find(w => w.id === STATE.currentWorkspaceId);
  if (!ws) return;
  document.getElementById('ws-detail-name').textContent = ws.name;
  document.getElementById('ws-detail-industry').textContent = ws.industry || 'Technology';
  document.getElementById('ws-detail-approved-terms').textContent = ws.approved_terminology || '--';
  document.getElementById('ws-detail-prohibited-terms').textContent = ws.prohibited_terminology || '--';

  const colorsContainer = document.getElementById('ws-detail-colors');
  colorsContainer.innerHTML = '';
  const colors = (ws.brand_colors || '#27231e, #f7f4ee, #c6f432, #22d3ee').split(',').map(c => c.trim());
  colors.forEach(col => {
    const chip = document.createElement('div');
    chip.style.width = '24px';
    chip.style.height = '24px';
    chip.style.borderRadius = '50%';
    chip.style.backgroundColor = col;
    chip.style.border = '1px solid var(--border)';
    chip.title = col;
    colorsContainer.appendChild(chip);
  });
}

// --- TAB ROUTING ---
function switchTab(tabName) {
  STATE.activeTab = tabName;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.view-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === `view-${tabName}`);
  });
  refreshCurrentTab();
}

function refreshCurrentTab() {
  if (!STATE.token || !STATE.user) return;
  switch (STATE.activeTab) {
    case 'dashboard': loadDashboard(); break;
    case 'workspaces': loadDocuments(); break;
    case 'rules': loadRules(); break;
    case 'claims': loadClaims(); break;
    case 'queue': loadWorkflowQueue(); break;
    case 'imagechecks': break;
    case 'passport': loadBrandPassport(); break;
    case 'audit': loadAuditTrail(); break;
  }
}

// --- TAB 1: HEALTH DASHBOARD ---
async function loadDashboard() {
  if (!STATE.currentWorkspaceId) return;
  try {
    const res = await apiFetch(`/api/dashboard?workspace_id=${STATE.currentWorkspaceId}`);
    if (!res || !res.success) return;

    const stats = res.stats || res.metrics || {};
    const approved = stats.approved_rules ?? stats.total_approved_rules ?? 0;
    const pending = stats.pending_rules ?? stats.pending_candidate_rules ?? 0;
    const totalClaims = stats.total_claims ?? 0;
    const verified = stats.verified_claims ?? (totalClaims - (stats.expired_claims || 0) - (stats.needs_verification_claims || stats.claims_requiring_verification || 0));
    const needsVerif = stats.needs_verification_claims ?? stats.claims_requiring_verification ?? 0;
    const expired = stats.expired_claims ?? 0;
    const highFindings = stats.high_severity_findings ?? stats.open_high_severity_findings ?? 0;
    const totalApprovals = stats.total_approvals ?? 0;
    const totalRejections = stats.total_rejections ?? 0;
    const expiringSoon = stats.expiring_soon_claims ?? (res.claims_expiring_soon ? res.claims_expiring_soon.length : 0);
    const flaggedRules = stats.flagged_rules_count ?? (res.rule_health ? res.rule_health.filter(r => r.needs_clarification).length : 0);

    const elApp = document.getElementById('stat-approved-rules'); if (elApp) elApp.textContent = approved;
    const elPen = document.getElementById('stat-pending-rules'); if (elPen) elPen.textContent = pending;
    const elTot = document.getElementById('stat-total-claims'); if (elTot) elTot.textContent = totalClaims;
    const elVer = document.getElementById('stat-verified-claims'); if (elVer) elVer.textContent = Math.max(0, verified);
    const elNee = document.getElementById('stat-needs-verification'); if (elNee) elNee.textContent = needsVerif;
    const elExp = document.getElementById('stat-expired-claims'); if (elExp) elExp.textContent = expired;
    const elHig = document.getElementById('stat-high-findings'); if (elHig) elHig.textContent = highFindings;

    const elExpSoon = document.getElementById('stat-expiring-soon-claims');
    if (elExpSoon) elExpSoon.textContent = expiringSoon;

    const elFlagged = document.getElementById('stat-flagged-rules');
    if (elFlagged) elFlagged.textContent = flaggedRules;

    const totalDecisions = totalApprovals + totalRejections;
    const ratio = totalDecisions > 0 ? Math.round((totalApprovals / totalDecisions) * 100) : 100;
    const elRatio = document.getElementById('stat-approval-ratio'); if (elRatio) elRatio.textContent = `${ratio}%`;
    const elAppCounts = document.getElementById('stat-approval-counts'); if (elAppCounts) elAppCounts.textContent = `${totalApprovals} Approvals / ${totalRejections} Rejections`;

    // Populate Improvement #2: Rule Health Table
    const ruleHealthTbody = document.getElementById('rule-health-tbody');
    if (ruleHealthTbody) {
      ruleHealthTbody.innerHTML = '';
      const ruleHealthList = res.rule_health || [];
      if (ruleHealthList.length === 0) {
        ruleHealthTbody.innerHTML = '<tr><td colspan="9" style="text-align:center; color: var(--ink-dim);">No active brand rules evaluated yet.</td></tr>';
      } else {
        ruleHealthList.forEach(rh => {
          const tr = document.createElement('tr');
          const isFlagged = rh.needs_clarification;
          if (isFlagged) tr.style.background = 'rgba(239, 68, 68, 0.08)';

          const reasonMap = {
            rule_unclear: 'Rule Unclear',
            false_positive: 'False Positive',
            approved_exception: 'Approved Exception',
            ok_in_context: 'OK in Context'
          };
          const topReasonLabel = rh.top_reason ? (reasonMap[rh.top_reason] || rh.top_reason) : '—';

          tr.innerHTML = `
            <td style="font-family: var(--font-mono); font-weight: 600;">${escapeHtml(rh.rule_code)}</td>
            <td style="font-weight: 600; max-width: 200px;">${escapeHtml(rh.title || 'Brand Rule')}</td>
            <td><span class="badge badge-info" style="font-size: 11px;">${escapeHtml(rh.category || 'General')}</span></td>
            <td style="text-align:center;">${rh.times_fired}</td>
            <td style="text-align:center;">${rh.times_dismissed}</td>
            <td style="text-align:center; font-weight: 600; color: ${rh.dismissal_rate >= 40 ? '#f87171' : 'inherit'};
              ">${rh.dismissal_rate}%</td>
            <td><span style="font-size: 12px; color: var(--ink-muted);">${escapeHtml(topReasonLabel)}</span></td>
            <td>
              ${isFlagged
                ? '<span class="badge badge-danger" style="font-size: 10px; font-weight:700;">⚠️ Needs Clarification</span>'
                : '<span class="badge badge-verified" style="font-size: 10px;">✓ Healthy</span>'}
            </td>
            <td>
              <button class="btn btn-sm btn-primary" style="padding: 3px 8px; font-size: 11px;" onclick="openEditRuleModal(${rh.id})">${isFlagged ? '✏️ Clarify Rule' : 'Edit'}</button>
            </td>
          `;
          ruleHealthTbody.appendChild(tr);
        });
      }
    }

    // Populate Improvement #2: Expiring Claims Section
    const expAlertCard = document.getElementById('expiring-claims-alert-card');
    const expTbody = document.getElementById('expiring-claims-tbody');
    const expBadge = document.getElementById('expiring-claims-count-badge');
    const expiringSoonList = res.claims_expiring_soon || [];

    if (expAlertCard && expTbody) {
      if (expiringSoonList.length > 0) {
        expAlertCard.style.display = 'block';
        if (expBadge) expBadge.textContent = `${expiringSoonList.length} Expiring Soon`;
        expTbody.innerHTML = '';
        expiringSoonList.forEach(cl => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td style="font-family: var(--font-mono); font-weight: 600;">${escapeHtml(cl.claim_code)}</td>
            <td>${escapeHtml(cl.claim_title || 'Marketing Claim')}</td>
            <td style="color: #fbbf24; font-weight: 600;">${escapeHtml(cl.valid_to || '')}</td>
            <td>${escapeHtml(cl.owner || 'Compliance')}</td>
            <td><button class="btn btn-sm btn-primary" style="padding:3px 8px; font-size:11px;" onclick="switchTab('claims')">Renew in Ledger →</button></td>
          `;
          expTbody.appendChild(tr);
        });
      } else {
        expAlertCard.style.display = 'none';
      }
    }

    // Populate recent reviews table
    const tbody = document.getElementById('dashboard-reviews-tbody');
    if (tbody) {
      tbody.innerHTML = '';
      const reviews = res.recent_reviews || [];
      if (reviews.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: var(--ink-dim);">No reviews recorded yet.</td></tr>';
        return;
      }
      reviews.forEach(rev => {
        const tr = document.createElement('tr');
        const revId = rev.review_id || rev.id || rev.draft_id;
        const status = (rev.status || rev.draft_status || 'DRAFT').toUpperCase();
        const findingsCount = rev.findings_count || 0;
        tr.innerHTML = `
          <td style="font-family: var(--font-mono); font-size: 12px;">REV-${revId}</td>
          <td style="font-weight: 600;">${escapeHtml(rev.draft_title || 'Untitled Draft')}</td>
          <td>${escapeHtml(rev.author_name || rev.author_id || 'Creator')}</td>
          <td><span class="badge badge-info">${escapeHtml(rev.predicted_tone || rev.ml_tone_predicted || 'Professional')}</span></td>
          <td><span class="badge ${findingsCount > 0 ? 'badge-high' : 'badge-verified'}">${findingsCount} Issues</span></td>
          <td><span class="badge badge-${status.toLowerCase()}">${status}</span></td>
          <td style="color: var(--ink-dim); font-size: 12px;">${new Date(rev.created_at || Date.now()).toLocaleString()}</td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

// --- TAB 2: GUIDELINE UPLOAD & CONSTITUTION COMPILER ---
async function handleGuidelineUpload(event) {
  event.preventDefault();
  const fileInput = document.getElementById('guideline-file-input');
  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Please select a PDF or DOCX file', 'error');
    return;
  }

  const btn = document.getElementById('btn-upload-guideline');
  btn.disabled = true;
  btn.textContent = '⏳ Compiling Constitution...';

  const formData = new FormData();
  formData.append('guideline_file', fileInput.files[0]);
  formData.append('file', fileInput.files[0]);
  formData.append('workspace_id', STATE.currentWorkspaceId);

  try {
    const res = await apiFetch('/api/guidelines/upload', 'POST', formData);
    if (res && res.success) {
      const extractedCount = res.rulesCount || res.extracted_count || (res.candidateRules ? res.candidateRules.length : 0);
      showToast(`Successfully extracted ${extractedCount} candidate rules!`, 'success');
      const box = document.getElementById('upload-result-box');
      box.style.display = 'block';
      box.className = 'card';
      box.style.borderColor = 'var(--lime)';
      box.innerHTML = `
        <h4 style="color: var(--lime); margin-bottom: 6px;">🎉 Constitution Compiled Successfully</h4>
        <p style="font-size: 13px;">Extracted <strong>${extractedCount}</strong> candidate requirements with modal keywords and page/section references.</p>
        <button class="btn btn-sm btn-primary" style="margin-top: 10px;" onclick="switchTab('rules')">Review & Approve Candidate Rules →</button>
      `;
      fileInput.value = '';
      await loadDocuments();
      await loadDashboard();
    }
  } catch (err) {
    showToast(err.message || 'Guideline ingestion failed', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '⚡ Ingest & Compile Rules';
  }
}

async function loadDocuments() {
  try {
    const res = await apiFetch('/api/guidelines');
    const tbody = document.getElementById('documents-tbody');
    tbody.innerHTML = '';
    if (!res || !res.documents || res.documents.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color: var(--ink-dim);">No documents uploaded yet.</td></tr>`;
      return;
    }
    res.documents.forEach(doc => {
      const tr = document.createElement('tr');
      const displayName = doc.original_name || doc.filename;
      const ext = displayName.split('.').pop().toUpperCase();
      tr.innerHTML = `
        <td style="font-weight: 600;">📄 ${escapeHtml(displayName)}</td>
        <td style="text-transform: uppercase; font-family: var(--font-mono); font-size: 12px;"><span class="badge badge-info">${ext}</span></td>
        <td>${doc.page_count || 1} pages</td>
        <td><span class="badge badge-pending">${doc.total_rules_count || 0} Rules (${doc.approved_rules_count || 0} Approved)</span></td>
        <td style="color: var(--ink-dim); font-size: 12px;">${new Date(doc.created_at).toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load documents:', err);
  }
}

// --- TAB 3: RULE GOVERNANCE ---
async function loadRules() {
  if (!STATE.currentWorkspaceId) return;
  const status = document.getElementById('rules-filter-status').value;
  const category = document.getElementById('rules-filter-category').value;
  let url = `/api/rules?workspace_id=${STATE.currentWorkspaceId}`;
  if (status) url += `&status=${encodeURIComponent(status)}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;

  try {
    const res = await apiFetch(url);
    const container = document.getElementById('rules-list-container');
    container.innerHTML = '';
    if (!res || !res.rules || res.rules.length === 0) {
      container.innerHTML = `<div style="text-align:center; color: var(--ink-dim); padding: 30px;">No rules found matching criteria.</div>`;
      return;
    }

    const canManageRules = STATE.user && (STATE.user.role === 'admin' || STATE.user.role === 'brand_manager');

    res.rules.forEach(rule => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.display = 'flex';
      card.style.justifyContent = 'space-between';
      card.style.alignItems = 'flex-start';
      card.style.gap = '16px';
      
      const isCandidate = rule.status === 'candidate' || rule.status === 'pending';
      const statusBadgeClass = rule.status === 'approved' ? 'badge-verified' : rule.status === 'rejected' ? 'badge-expired' : 'badge-pending';
      const ruleDisplayTitle = rule.title || rule.description || rule.rule_text || 'Brand Rule';
      const ruleCitation = rule.source_excerpt || rule.title || rule.description || '';
      const docName = rule.document_name || rule.source_reference || 'Brand Guidelines';

      card.innerHTML = `
        <div style="flex: 1;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span class="badge ${statusBadgeClass}">${rule.status.toUpperCase()}</span>
            <span class="badge badge-info">${escapeHtml(rule.category || 'General')}</span>
            <span class="badge badge-${(rule.severity || 'medium').toLowerCase()}">${rule.severity || 'MEDIUM'}</span>
            <span style="font-size: 12px; color: var(--ink-dim); font-family: var(--font-mono);">${escapeHtml(rule.rule_code || rule.rule_type)}</span>
          </div>
          <div style="font-size: 15px; font-weight: 600; margin-bottom: 6px;">${escapeHtml(ruleDisplayTitle)}</div>
          ${rule.description && rule.description !== rule.title ? `<div style="font-size: 13px; color: var(--ink-muted); margin-bottom: 8px;">${escapeHtml(rule.description)}</div>` : ''}
          ${rule.replacement_or_guidance ? `<div style="font-size: 12px; color: var(--lime); margin-bottom: 8px;">💡 Guidance: ${escapeHtml(rule.replacement_or_guidance)}</div>` : ''}
          <div class="citation-box">
            <strong>Source Citation:</strong> "${escapeHtml(ruleCitation)}"
            <br><span style="color: var(--ink-muted); font-size: 11px;">Document: ${escapeHtml(docName)}</span>
          </div>
        </div>
        ${isCandidate && canManageRules ? `
          <div style="display: flex; gap: 8px; flex-shrink: 0;">
            <button class="btn btn-sm btn-primary" onclick="approveRule(${rule.id})">✅ Approve Rule</button>
            <button class="btn btn-sm btn-danger" onclick="rejectRule(${rule.id})">❌ Reject</button>
          </div>
        ` : `
          <span style="font-size: 12px; color: var(--ink-dim); flex-shrink: 0;">
            ${rule.status === 'approved' ? `✅ Approved by ${escapeHtml(rule.approved_by || 'Admin')}` : rule.status === 'rejected' ? `❌ Rejected` : `Decided by ${escapeHtml(rule.reviewed_by || 'Manager')}`}
          </span>
        `}
      `;
      container.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to load rules:', err);
  }
}

async function approveRule(ruleId) {
  try {
    const res = await apiFetch(`/api/rules/${ruleId}/approve`, 'POST');
    if (res && res.success) {
      showToast('Rule approved and active for compliance checking', 'success');
      await loadRules();
      await loadDashboard();
    }
  } catch (err) {
    showToast(err.message || 'Action failed', 'error');
  }
}

async function rejectRule(ruleId) {
  try {
    const res = await apiFetch(`/api/rules/${ruleId}/reject`, 'POST');
    if (res && res.success) {
      showToast('Candidate rule rejected', 'info');
      await loadRules();
      await loadDashboard();
    }
  } catch (err) {
    showToast(err.message || 'Action failed', 'error');
  }
}

// --- TAB 4: CLAIM LEDGER & EVIDENCE ---
async function loadClaims() {
  if (!STATE.currentWorkspaceId) return;
  try {
    const res = await apiFetch(`/api/claims?workspace_id=${STATE.currentWorkspaceId}`);
    const tbody = document.getElementById('claims-tbody');
    tbody.innerHTML = '';
    if (!res || !res.claims || res.claims.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--ink-dim);">No marketing claims recorded yet.</td></tr>`;
      return;
    }

    res.claims.forEach(claim => {
      // Use server-computed status (EXPIRED, EXPIRING_SOON, VERIFIED, NEEDS_VERIFICATION)
      const cs = claim.computed_status || 'needs_verification';
      const statusClassMap = {
        approved: 'badge-verified',
        expired: 'badge-expired',
        expiring_soon: 'badge-warning',
        needs_verification: 'badge-needs_verification',
        pending: 'badge-pending',
        rejected: 'badge-high'
      };
      const statusTextMap = {
        approved: 'VERIFIED',
        expired: 'EXPIRED',
        expiring_soon: 'EXPIRING SOON',
        needs_verification: 'NEEDS VERIFICATION',
        pending: 'PENDING',
        rejected: 'REJECTED'
      };
      const statusBadge = statusClassMap[cs] || 'badge-info';
      const statusText = statusTextMap[cs] || cs.toUpperCase();

      const ec = claim.evidence_card || {};
      const evidenceSummary = ec.source
        ? `<strong>${escapeHtml(ec.evidence_title || ec.source)}</strong><br><span style="color:var(--ink-dim);font-size:12px;">${escapeHtml(ec.source)}</span>${ec.doc_reference ? `<br><span style="font-family:var(--font-mono);font-size:10px;color:var(--ink-dim);">${escapeHtml(ec.doc_reference)}</span>` : ''}`
        : `<span style="color: var(--warning); font-size: 12px;">⚠️ No evidence attached</span>`;

      const reasonTooltip = claim.status_reason ? `title="${escapeHtml(claim.status_reason)}"` : '';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><span class="badge ${statusBadge}" ${reasonTooltip}>${statusText}</span></td>
        <td style="font-weight: 600; max-width: 300px;">${escapeHtml(claim.claim_text)}</td>
        <td><span class="badge badge-info">${escapeHtml(claim.category || 'General')}</span></td>
        <td>${evidenceSummary}</td>
        <td style="font-family: var(--font-mono); font-size: 13px; color: ${cs === 'expired' ? '#f87171' : cs === 'expiring_soon' ? '#fbbf24' : 'inherit'}">${claim.valid_to || 'Ongoing'}</td>
        <td>
          <button class="btn btn-sm btn-danger" onclick="deleteClaim(${claim.id})">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load claims:', err);
  }
}

async function handleCreateClaim(event) {
  event.preventDefault();
  const text = document.getElementById('new-claim-text').value;
  const category = document.getElementById('new-claim-category').value;
  const validity = document.getElementById('new-claim-validity').value;
  const evTitle = document.getElementById('new-claim-evidence-title').value;
  const evSource = document.getElementById('new-claim-evidence-source').value;

  const payload = {
    workspace_id: STATE.currentWorkspaceId,
    claim_text: text,
    category,
    validity_date: validity,
    evidence: evTitle ? [{
      evidence_title: evTitle,
      source_name: evSource,
      supporting_excerpt: evSource,
      expiration_date: validity
    }] : []
  };

  try {
    const res = await apiFetch('/api/claims', 'POST', payload);
    if (res && res.success) {
      showToast('Marketing claim and evidence saved to ledger', 'success');
      closeModal('modal-add-claim');
      await loadClaims();
      await loadDashboard();
    }
  } catch (err) {
    showToast(err.message || 'Failed to save claim', 'error');
  }
}

async function deleteClaim(id) {
  if (!confirm('Are you sure you want to remove this claim?')) return;
  try {
    await apiFetch(`/api/claims/${id}`, 'DELETE');
    showToast('Claim removed from ledger', 'info');
    await loadClaims();
    await loadDashboard();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// --- TAB 5: CONTENT STUDIO & REVIEW ENGINE ---
async function runComplianceReview() {
  const content = document.getElementById('draft-content').value;
  if (!content.trim()) {
    showToast('Please enter content to review', 'error');
    return;
  }

  showToast('Running deep compliance check & local ML analysis...', 'info');

  try {
    const res = await apiFetch('/api/review/run', 'POST', {
      workspace_id: STATE.currentWorkspaceId,
      content,
      draft_id: STATE.currentDraft ? STATE.currentDraft.id : null
    });

    if (!res || !res.success) return;

    // Update Local ML Tone Badge
    const tone = res.tone_prediction || {};
    if (tone.status === 'unavailable' || !tone.predicted_tone) {
      document.getElementById('predicted-tone-badge').textContent = 'Tone check unavailable';
      document.getElementById('predicted-tone-conf').textContent = 'ML model offline or not loaded';
      document.getElementById('predicted-tone-desc').textContent = 'Run python ml/train.py to activate local tone classifier. Rules & claim checks still active.';
    } else {
      document.getElementById('predicted-tone-badge').textContent = tone.predicted_tone || 'Standard';
      document.getElementById('predicted-tone-conf').textContent = `${Math.round((tone.confidence || 0) * 100)}% Confidence`;
      document.getElementById('predicted-tone-desc').textContent = `Local ML Model (${tone.model_version || 'v1-local'}) trained on authentic tone dataset.`;
    }

    // Render structured findings
    renderFindings(res.findings);
    document.getElementById('findings-count').textContent = res.findings.length;
    document.getElementById('findings-summary-pill').textContent = res.findings.length === 0 ? 'Compliant' : `${res.findings.length} Violations`;
    document.getElementById('findings-summary-pill').className = `badge ${res.findings.length === 0 ? 'badge-verified' : 'badge-high'}`;

    showToast(`Scan complete: ${res.findings.length} findings surfaced`, res.findings.length > 0 ? 'warning' : 'success');
  } catch (err) {
    showToast(err.message || 'Review failed', 'error');
  }
}

function renderFindings(findings) {
  // Phase 2: evidence card helper
  function buildEvidenceCardHtml(ec) {
    if (!ec) return '';
    const statusClassMap = {
      expired: 'badge-expired', expiring_soon: 'badge-warning',
      verified: 'badge-verified', approved: 'badge-verified',
      needs_verification: 'badge-needs_verification'
    };
    const statusLabelMap = {
      expired: '\uD83D\uDD34 EXPIRED', expiring_soon: '\uD83D\uDFE1 EXPIRING SOON',
      verified: '\uD83D\uDFE2 VERIFIED', approved: '\uD83D\uDFE2 VERIFIED',
      needs_verification: '\uD83D\uDFE0 NEEDS VERIFICATION'
    };
    const sc = statusClassMap[ec.approval_status] || 'badge-info';
    const sl = statusLabelMap[ec.approval_status] || (ec.approval_status || '').toUpperCase();
    const validToColor = ec.approval_status === 'expired' ? '#f87171' : ec.approval_status === 'expiring_soon' ? '#fbbf24' : 'inherit';
    return `
      <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.12);border-radius:8px;padding:10px 14px;margin-top:10px;font-size:12px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="font-weight:700;color:var(--ink-bright);">\uD83D\uDCCB Evidence Record</span>
          <span class="badge ${sc}" style="font-size:10px;">${sl}</span>
        </div>
        <table style="width:100%;border-collapse:collapse;color:var(--ink-muted);">
          <tr><td style="padding:2px 8px 2px 0;font-weight:600;white-space:nowrap;">Claim ID</td><td>${escapeHtml(ec.claim_id || '\u2014')}</td></tr>
          ${ec.claim_title ? `<tr><td style="padding:2px 8px 2px 0;font-weight:600;">Claim</td><td>${escapeHtml(ec.claim_title)}</td></tr>` : ''}
          ${ec.source ? `<tr><td style="padding:2px 8px 2px 0;font-weight:600;">Source</td><td>${escapeHtml(ec.source)}</td></tr>` : ''}
          ${ec.doc_reference ? `<tr><td style="padding:2px 8px 2px 0;font-weight:600;">Doc Ref</td><td style="font-family:var(--font-mono);font-size:11px;">${escapeHtml(ec.doc_reference)}</td></tr>` : ''}
          ${ec.owner ? `<tr><td style="padding:2px 8px 2px 0;font-weight:600;">Owner</td><td>${escapeHtml(ec.owner)}</td></tr>` : ''}
          ${ec.valid_to ? `<tr><td style="padding:2px 8px 2px 0;font-weight:600;">Valid To</td><td style="color:${validToColor};font-weight:600;">${escapeHtml(ec.valid_to)}</td></tr>` : ''}
          ${ec.policy_exception ? `<tr><td style="padding:2px 8px 2px 0;font-weight:600;">Exception</td><td style="color:var(--warning);">${escapeHtml(ec.policy_exception)}</td></tr>` : ''}
        </table>
      </div>`;
  }
  const container = document.getElementById('findings-container');
  container.innerHTML = '';
  if (!findings || findings.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--lime); padding: 30px 0;">
        ✨ <strong>No Violations Found!</strong> Content fully aligns with approved brand guidelines, tone parameters, and marketing claims.
      </div>
    `;
    return;
  }

  findings.forEach(f => {
    const card = document.createElement('div');
    card.className = `finding-card ${(f.severity || 'medium').toLowerCase()}`;

    // Build citation from actual rule_id / claim_id fields (Phase 1 fix)
    let citation = '';
    if (f.rule_id) {
      citation = `<div class="citation-box"><strong>Rule Cited:</strong> ${escapeHtml(f.rule_id)} — ${escapeHtml(f.evidence_reference || '')}</div>`;
    } else if (f.claim_id) {
      citation = `<div class="citation-box"><strong>Claim Reference:</strong> ${escapeHtml(f.claim_id)} — ${escapeHtml(f.evidence_reference || 'Evidence Required')}</div>`;
    }

    // Evidence card (Phase 2)
    const evidenceCardHtml = buildEvidenceCardHtml(f.evidence_card);

    // API-based accept button when finding persisted server-side (has .id)
    const hasApiAccept = f.id && f.matched_text && f.suggested_correction;
    const acceptBtn = hasApiAccept
      ? `<button class="btn btn-sm btn-primary" onclick="acceptFindingById(${f.id})" id="accept-btn-${f.id}">✅ Accept Suggestion</button>`
      : (f.suggested_correction ? `<button class="btn btn-sm btn-primary" onclick="acceptCorrection('${escapeHtml(f.matched_text||'')}', '${escapeHtml(f.suggested_correction)}')">Accept Suggestion</button>` : '');
    const dismissBtn = f.id
      ? `<button class="btn btn-sm" style="background:rgba(239,68,68,0.15); color:#f87171; border:1px solid rgba(239,68,68,0.3);" onclick="openDismissModal(${f.id})" id="dismiss-btn-${f.id}">❌ Dismiss Finding</button>`
      : '';

    card.innerHTML = `
      <div class="finding-header">
        <span class="finding-title">${escapeHtml(f.category)}</span>
        <span class="badge badge-${(f.severity || 'medium').toLowerCase()}">${f.severity || 'MEDIUM'}</span>
        ${f.verification_status ? `<span class="badge badge-info" style="font-size:10px;">${escapeHtml(f.verification_status)}</span>` : ''}
      </div>
      <p style="font-size:13px;color:var(--ink-muted);margin-bottom:6px;">${escapeHtml(f.explanation)}</p>
      ${f.matched_text ? `<div class="finding-quote">"${escapeHtml(f.matched_text)}"</div>` : ''}
      ${citation}
      ${evidenceCardHtml}
      ${f.suggested_correction ? `
        <div class="finding-suggestion">💡 <strong>Suggested Replacement:</strong> "${escapeHtml(f.suggested_correction)}"</div>
        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">${acceptBtn} ${dismissBtn}</div>
      ` : ''}
    `;
    container.appendChild(card);
  });
}

async function acceptFindingById(findingId) {
  const btn = document.getElementById(`accept-btn-${findingId}`);
  if (btn) { btn.disabled = true; btn.textContent = 'Applying…'; }
  try {
    const res = await apiFetch(`/api/review/findings/${findingId}/accept`, 'POST');
    if (res && res.success) {
      document.getElementById('draft-content').value = res.content_text;
      document.getElementById('draft-revision-badge').textContent = `Revision: v${res.version} (Modified)`;
      showToast(`Suggestion applied — revision v${res.version}`, 'success');
      runComplianceReview();
    } else {
      showToast(res.error || 'Could not apply suggestion', 'error');
      if (btn) { btn.disabled = false; btn.textContent = '✅ Accept Suggestion'; }
    }
  } catch (err) {
    showToast(err.message || 'Accept failed', 'error');
    if (btn) { btn.disabled = false; btn.textContent = '✅ Accept Suggestion'; }
  }
}

function acceptCorrection(oldText, newText) {
  const textarea = document.getElementById('draft-content');
  const currentVal = textarea.value;
  if (!currentVal.includes(oldText)) {
    showToast('Match text not found in current content', 'error');
    return;
  }

  // Record diff preview
  document.getElementById('diff-section').style.display = 'block';
  document.getElementById('diff-v1-text').innerHTML = escapeHtml(currentVal).replace(
    new RegExp(escapeRegex(oldText), 'g'),
    `<span class="diff-del">${escapeHtml(oldText)}</span>`
  );
  
  const updatedVal = currentVal.replace(oldText, newText);
  textarea.value = updatedVal;

  document.getElementById('diff-v2-text').innerHTML = escapeHtml(updatedVal).replace(
    new RegExp(escapeRegex(newText), 'g'),
    `<span class="diff-add">${escapeHtml(newText)}</span>`
  );

  document.getElementById('draft-revision-badge').textContent = 'Revision: v2 (Modified)';
  showToast(`Applied correction: replaced "${oldText}" with "${newText}"`, 'success');

  // Automatically re-run review on modified text
  runComplianceReview();
}

async function saveDraft(showToastMsg = true) {
  const title = document.getElementById('draft-title').value;
  const channel = document.getElementById('draft-channel').value;
  const content = document.getElementById('draft-content').value;

  try {
    const res = await apiFetch('/api/content/drafts', 'POST', {
      workspace_id: STATE.currentWorkspaceId,
      id: STATE.currentDraft ? STATE.currentDraft.id : null,
      title,
      channel,
      content_text: content,
      raw_content: content
    });
    if (res && res.success) {
      STATE.currentDraft = res.draft || { id: res.id, title, content_text: content };
      if (showToastMsg) showToast('Draft saved successfully', 'success');
      return STATE.currentDraft;
    }
  } catch (err) {
    showToast(err.message || 'Failed to save draft', 'error');
  }
}

async function submitDraftForReview() {
  const draft = await saveDraft(false);
  if (!draft) return;

  try {
    const res = await apiFetch('/api/review/submit', 'POST', {
      draft_id: draft.id,
      comments: 'Submitted for editorial and brand compliance approval'
    });
    if (res && res.success) {
      showToast('Draft submitted to Reviewer Queue!', 'success');
      switchTab('queue');
    }
  } catch (err) {
    showToast(err.message || 'Submission failed', 'error');
  }
}

// --- TAB 6: REVIEWER WORKFLOW QUEUE ---
async function loadWorkflowQueue() {
  try {
    const res = await apiFetch('/api/workflow/queue');
    const tbody = document.getElementById('queue-tbody');
    tbody.innerHTML = '';
    if (!res || !res.queue || res.queue.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--ink-dim);">No submissions pending review.</td></tr>`;
      return;
    }

    res.queue.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 700;">${escapeHtml(item.title)}</td>
        <td>${escapeHtml(item.author_name || 'Creator')}</td>
        <td><span class="badge badge-info">${escapeHtml(item.channel)}</span></td>
        <td><span class="badge badge-pending">${item.status}</span></td>
        <td style="color: var(--ink-dim); font-size: 12px;">${new Date(item.submitted_at || item.created_at).toLocaleString()}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="openDecisionPanel(${item.id}, '${escapeHtml(item.title)}')">Evaluate →</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load queue:', err);
  }
}

let activeEvaluationDraftId = null;

async function openDecisionPanel(draftId, title) {
  activeEvaluationDraftId = draftId;
  const panel = document.getElementById('decision-panel');
  panel.style.display = 'block';
  document.getElementById('decision-draft-title').textContent = title;
  
  try {
    const res = await apiFetch(`/api/content/drafts/${draftId}`);
    if (res && res.draft) {
      document.getElementById('decision-draft-preview').textContent = res.draft.content_text || res.draft.raw_content;
    }
  } catch (e) {}

  panel.scrollIntoView({ behavior: 'smooth' });
}

function toggleExceptionRationale(checked) {
  document.getElementById('exception-rationale-group').style.display = checked ? 'block' : 'none';
}

async function submitDecision(decision) {
  if (!activeEvaluationDraftId) return;

  const comments = document.getElementById('decision-comments').value;
  const hasException = document.getElementById('decision-exception-check').checked;
  const rationale = document.getElementById('decision-exception-rationale').value;

  if (hasException && (!rationale.trim() || rationale.trim().length < 5)) {
    showToast('Manager exception requires explicit justification (min 5 characters)', 'error');
    return;
  }

  try {
    const res = await apiFetch(`/api/workflow/${activeEvaluationDraftId}/decision`, 'POST', {
      draft_id: activeEvaluationDraftId,
      decision,
      comments,
      policy_exception: hasException,
      exception_reason: rationale,
      manager_policy_exception: hasException,
      exception_rationale: rationale
    });

    if (res && res.success) {
      showToast(`Submission successfully marked ${decision}!`, 'success');
      document.getElementById('decision-panel').style.display = 'none';
      await loadWorkflowQueue();
      await loadDashboard();
    }
  } catch (err) {
    showToast(err.message || 'Decision failed', 'error');
  }
}

// Local relative luminance helper for instant contrast calculations
function localRelativeLuminance(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const num = parseInt(hex, 16);
  if (isNaN(num)) return 0;
  const [r, g, b] = [(num >> 16) & 255, (num >> 8) & 255, num & 255].map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function computeLocalContrast(fgHex, bgHex) {
  try {
    const l1 = localRelativeLuminance(fgHex);
    const l2 = localRelativeLuminance(bgHex);
    const bright = Math.max(l1, l2);
    const dark = Math.min(l1, l2);
    return Math.round(((bright + 0.05) / (dark + 0.05)) * 100) / 100;
  } catch (e) {
    return 1;
  }
}

// --- TAB 7: BRAND PASSPORT & WCAG 2.1 ---
async function loadBrandPassport() {
  if (!STATE.currentWorkspaceId) return;
  try {
    const res = await apiFetch(`/api/passport?workspace_id=${STATE.currentWorkspaceId}`);
    if (!res || !res.passport) return;

    const p = res.passport;
    const container = document.getElementById('passport-summary');
    const ws = p.workspace || {};
    const rules = p.approved_rules || [];
    const claims = p.approved_claims || [];
    const guidelines = p.approved_guidelines || [];
    const ml = p.local_ml_model || {};

    let colorsHtml = '';
    if (ws.brand_colors) {
      const colors = ws.brand_colors.split(',').map(c => c.trim());
      colorsHtml = `<div style="display: flex; gap: 8px; margin-top: 8px;">` +
        colors.map(c => `<div style="width: 24px; height: 24px; border-radius: 50%; background: ${c}; border: 1px solid var(--border);" title="${c}"></div>`).join('') +
        `</div>`;
    }

    container.innerHTML = `
      <div style="border-bottom: 1px solid var(--border); padding-bottom: 14px;">
        <span style="color: var(--ink-dim); font-size: 11px; text-transform: uppercase; font-weight: 700;">Organization & Brand</span>
        <div style="font-size: 22px; font-weight: 800; color: var(--lime); margin-top: 2px;">${escapeHtml(ws.name || p.organization || 'BrandGuard Master')}</div>
        <div style="color: var(--ink-muted); font-size: 13px;">${escapeHtml(ws.industry || 'Technology')}</div>
        ${colorsHtml}
      </div>

      <div style="border-bottom: 1px solid var(--border); padding-bottom: 14px;">
        <span style="color: var(--ink-dim); font-size: 11px; text-transform: uppercase; font-weight: 700;">Preferred Voice & Tone</span>
        <div style="font-weight: 600; font-size: 15px; margin-top: 2px;">${escapeHtml(ws.preferred_tone || 'Professional, Confident, Authoritative')}</div>
        ${ml.accuracy ? `<div style="font-size: 12px; color: var(--cyan); margin-top: 4px;">🤖 Local Tone Classifier: ${ml.name || 'scikit-learn'} (${Math.round(ml.accuracy * 100)}% test accuracy)</div>` : ''}
      </div>

      <div style="border-bottom: 1px solid var(--border); padding-bottom: 14px;">
        <span style="color: var(--ink-dim); font-size: 11px; text-transform: uppercase; font-weight: 700;">Active Approved Policy Rules (${rules.length})</span>
        ${rules.length === 0 ? `<div style="color: var(--ink-dim); font-size: 13px; margin-top: 4px;">No rules approved yet.</div>` : `
          <ul style="padding-left: 18px; font-size: 13px; margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
            ${rules.slice(0, 5).map(r => `<li><strong>${escapeHtml(r.rule_code)}:</strong> ${escapeHtml(r.title || r.description)}</li>`).join('')}
            ${rules.length > 5 ? `<li style="color: var(--ink-dim);">+ ${rules.length - 5} more approved rules</li>` : ''}
          </ul>
        `}
      </div>

      <div>
        <span style="color: var(--ink-dim); font-size: 11px; text-transform: uppercase; font-weight: 700;">Substantiated Marketing Claims (${claims.length})</span>
        ${claims.length === 0 ? `<div style="color: var(--ink-dim); font-size: 13px; margin-top: 4px;">No marketing claims recorded in ledger.</div>` : `
          <ul style="padding-left: 18px; font-size: 13px; margin-top: 6px; display: flex; flex-direction: column; gap: 4px;">
            ${claims.slice(0, 4).map(c => `<li>"${escapeHtml(c.claim_text)}" <span style="color: var(--ink-dim); font-size: 11px;">(${escapeHtml(c.category || 'Performance')})</span></li>`).join('')}
          </ul>
        `}
      </div>
    `;
  } catch (err) {
    console.error('Failed to load passport:', err);
  }
}

async function calculateContrast() {
  const fg = document.getElementById('wcag-fg').value;
  const bg = document.getElementById('wcag-bg').value;

  const preview = document.getElementById('contrast-preview-box');
  if (preview) {
    preview.style.backgroundColor = bg;
    preview.style.color = fg;
  }

  try {
    const res = await apiFetch('/api/passport/contrast', 'POST', {
      foreground_hex: fg,
      background_hex: bg
    });

    if (res && res.success) {
      document.getElementById('contrast-ratio-val').textContent = `${res.contrast_ratio}:1`;
      
      const aaBadge = document.getElementById('wcag-aa-badge');
      aaBadge.textContent = `AA: ${res.wcag_aa ? 'PASS' : 'FAIL'}`;
      aaBadge.className = `badge ${res.wcag_aa ? 'badge-verified' : 'badge-expired'}`;

      const aaaBadge = document.getElementById('wcag-aaa-badge');
      aaaBadge.textContent = `AAA: ${res.wcag_aaa ? 'PASS' : 'FAIL'}`;
      aaaBadge.className = `badge ${res.wcag_aaa ? 'badge-verified' : 'badge-expired'}`;
      return;
    }
  } catch (e) {}

  // Instant local fallback
  const ratio = computeLocalContrast(fg, bg);
  document.getElementById('contrast-ratio-val').textContent = `${ratio}:1`;
  const aaBadge = document.getElementById('wcag-aa-badge');
  aaBadge.textContent = `AA: ${ratio >= 4.5 ? 'PASS' : 'FAIL'}`;
  aaBadge.className = `badge ${ratio >= 4.5 ? 'badge-verified' : 'badge-expired'}`;
  const aaaBadge = document.getElementById('wcag-aaa-badge');
  aaaBadge.textContent = `AAA: ${ratio >= 7.0 ? 'PASS' : 'FAIL'}`;
  aaaBadge.className = `badge ${ratio >= 7.0 ? 'badge-verified' : 'badge-expired'}`;
}

// --- TAB 8: AUDIT TRAIL ---
async function loadAuditTrail() {
  if (!STATE.currentWorkspaceId) return;
  try {
    const res = await apiFetch(`/api/audit?workspace_id=${STATE.currentWorkspaceId}`);
    const tbody = document.getElementById('audit-tbody');
    tbody.innerHTML = '';
    if (!res || !res.audit_events || res.audit_events.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--ink-dim);">No audit events recorded yet.</td></tr>`;
      return;
    }

    res.audit_events.forEach(ev => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-family: var(--font-mono); font-size: 12px;">EV-${ev.id}</td>
        <td><span class="badge badge-info" style="font-family: var(--font-mono);">${ev.action}</span></td>
        <td>${escapeHtml(ev.actor_email || 'System')}</td>
        <td style="color: var(--ink-muted); font-size: 13px;">${escapeHtml(ev.target_type)}</td>
        <td style="font-size: 13px;">${escapeHtml(ev.details || '--')}</td>
        <td style="color: var(--ink-dim); font-size: 12px;">${new Date(ev.created_at).toLocaleString()}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load audit trail:', err);
  }
}

// --- MODALS ---
function openNewClaimModal() {
  document.getElementById('modal-add-claim').classList.add('open');
}
function openNewWorkspaceModal() {
  document.getElementById('modal-add-workspace').classList.add('open');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

async function handleCreateWorkspace(event) {
  event.preventDefault();
  const name = document.getElementById('new-ws-name').value;
  const industry = document.getElementById('new-ws-industry').value;
  const approved = document.getElementById('new-ws-approved').value;
  const prohibited = document.getElementById('new-ws-prohibited').value;

  try {
    const res = await apiFetch('/api/workspaces', 'POST', {
      name,
      industry,
      approved_terminology: approved,
      prohibited_terminology: prohibited
    });

    if (res && res.success) {
      showToast('Brand workspace created successfully', 'success');
      closeModal('modal-add-workspace');
      await loadWorkspaces();
      handleWorkspaceChange(res.workspace.id);
    }
  } catch (err) {
    showToast(err.message || 'Failed to create workspace', 'error');
  }
}

// --- UTILITIES ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


// --- SPEC #2: DISMISS FINDING & RULE CLARIFICATION HELPERS ---
function openDismissModal(findingId) {
  document.getElementById('dismiss-finding-id').value = findingId;
  document.getElementById('dismiss-reason-select').value = 'false_positive';
  document.getElementById('dismiss-note-input').value = '';
  const modal = document.getElementById('dismiss-finding-modal');
  if (modal) modal.style.display = 'flex';
}

function closeDismissModal() {
  const modal = document.getElementById('dismiss-finding-modal');
  if (modal) modal.style.display = 'none';
}

async function confirmDismissFinding() {
  const findingId = document.getElementById('dismiss-finding-id').value;
  const dismiss_reason = document.getElementById('dismiss-reason-select').value;
  const dismiss_note = document.getElementById('dismiss-note-input').value;

  try {
    const res = await apiFetch(`/api/review/findings/${findingId}/reject`, 'POST', {
      dismiss_reason,
      dismiss_note
    });

    if (res && res.success) {
      closeDismissModal();
      showToast(res.message || 'Finding dismissed', 'success');
      runComplianceReview();
      loadDashboard();
    } else {
      showToast(res.error || 'Failed to dismiss finding', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Action failed', 'error');
  }
}

async function openEditRuleModal(ruleId) {
  try {
    const res = await apiFetch(`/api/rules/${ruleId}`);
    if (!res || !res.success || !res.rule) {
      showToast('Could not load rule details', 'error');
      return;
    }
    const r = res.rule;
    document.getElementById('edit-rule-id').value = r.id;
    document.getElementById('edit-rule-code').value = r.rule_code || '';
    document.getElementById('edit-rule-title').value = r.title || '';
    document.getElementById('edit-rule-desc').value = r.description || '';
    document.getElementById('edit-rule-guidance').value = r.replacement_or_guidance || '';

    const modal = document.getElementById('edit-rule-modal');
    if (modal) modal.style.display = 'flex';
  } catch (err) {
    showToast(err.message || 'Failed to open rule editor', 'error');
  }
}

function closeEditRuleModal() {
  const modal = document.getElementById('edit-rule-modal');
  if (modal) modal.style.display = 'none';
}

async function saveEditedRule() {
  const ruleId = document.getElementById('edit-rule-id').value;
  const title = document.getElementById('edit-rule-title').value;
  const description = document.getElementById('edit-rule-desc').value;
  const replacement_or_guidance = document.getElementById('edit-rule-guidance').value;

  try {
    const res = await apiFetch(`/api/rules/${ruleId}`, 'PUT', {
      title,
      description,
      replacement_or_guidance
    });

    if (res && res.success) {
      closeEditRuleModal();
      showToast('Rule clarification saved successfully', 'success');
      loadDashboard();
      if (typeof loadRules === 'function') loadRules();
    } else {
      showToast(res.error || 'Failed to save rule clarification', 'error');
    }
  } catch (err) {
    showToast(err.message || 'Save failed', 'error');
  }
}


// --- SPEC #3: EXPLAINABLE IMAGE & ACCESSIBILITY AUDIT ---
async function handleImageAudit(event) {
  event.preventDefault();
  const fileInput = document.getElementById('audit-image-file');
  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Please select a PNG, JPG, or WebP image file.', 'error');
    return;
  }

  const file = fileInput.files[0];
  const altText = document.getElementById('audit-image-alt').value;
  const fgColor = document.getElementById('audit-fg-color').value;
  const bgColor = document.getElementById('audit-bg-color').value;

  const btn = document.getElementById('btn-audit-image');
  btn.disabled = true;
  btn.textContent = '⏳ Analyzing 64×64 Palette & WCAG...';

  // Preview image immediately
  const previewImg = document.getElementById('audit-preview-img');
  const previewContainer = document.getElementById('image-preview-container');
  const reader = new FileReader();
  reader.onload = function(e) {
    previewImg.src = e.target.result;
    previewContainer.style.display = 'block';
  };
  reader.readAsDataURL(file);

  const formData = new FormData();
  formData.append('image', file);
  formData.append('alt_text', altText);
  formData.append('workspace_id', STATE.currentWorkspaceId || 1);
  if (fgColor) formData.append('fg_color', fgColor);
  if (bgColor) formData.append('bg_color', bgColor);

  try {
    const res = await apiFetch('/api/images/check', 'POST', formData);
    btn.disabled = false;
    btn.textContent = '🔍 Run Image & Accessibility Audit';

    if (res && res.success) {
      renderImageFindings(res);
      showToast(`Image audit completed: ${res.findings.length} issue(s) identified`, res.findings.length > 0 ? 'warning' : 'success');
    } else {
      showToast(res.error || 'Image audit failed', 'error');
    }
  } catch (err) {
    btn.disabled = false;
    btn.textContent = '🔍 Run Image & Accessibility Audit';
    showToast(err.message || 'Audit request failed', 'error');
  }
}

function renderImageFindings(data) {
  const container = document.getElementById('image-findings-container');
  const countBadge = document.getElementById('image-findings-count');
  const summaryPill = document.getElementById('image-findings-badge');
  const colorsCard = document.getElementById('image-colors-card');
  const colorsBar = document.getElementById('dominant-colors-bar');
  const paletteNote = document.getElementById('palette-evaluation-note');

  countBadge.textContent = data.findings ? data.findings.length : 0;
  if (data.findings.length === 0) {
    summaryPill.className = 'badge badge-verified';
    summaryPill.textContent = '✓ 100% Brand & WCAG Compliant';
  } else {
    summaryPill.className = 'badge badge-danger';
    summaryPill.textContent = `${data.summary.high || 0} Critical / ${data.summary.medium || 0} Warning`;
  }

  // Render dominant colors
  if (data.dominant_colors && data.dominant_colors.length > 0) {
    colorsCard.style.display = 'block';
    colorsBar.innerHTML = '';
    data.dominant_colors.forEach(c => {
      const swatch = document.createElement('div');
      swatch.style.cssText = `display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.05); padding:4px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); font-size:11px;`;
      swatch.innerHTML = `
        <span style="width:16px; height:16px; border-radius:4px; background:${c.hex}; display:inline-block; border:1px solid rgba(255,255,255,0.3);"></span>
        <span style="font-family:var(--font-mono); font-weight:600;">${c.hex}</span>
        <span style="color:var(--ink-muted);">${c.coverage_pct}%</span>
        ${c.is_off_palette ? '<span style="color:#f87171; font-weight:700;">⚠️ Off-Palette</span>' : '<span style="color:var(--lime);">✓ Palette</span>'}
      `;
      colorsBar.appendChild(swatch);
    });

    paletteNote.innerHTML = `Authorized Brand Palette: ${(data.palette_evaluated || []).map(p => `<code style="color:var(--lime); margin-right:4px;">${p}</code>`).join(' ')} `;
  }

  // Render findings list
  container.innerHTML = '';
  if (!data.findings || data.findings.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--lime); padding: 30px 0;">
        ✨ <strong>No Violations Found!</strong> Image palette strictly adheres to brand guidelines and passes all WCAG 2.1 accessibility criteria.
      </div>
    `;
    return;
  }

  data.findings.forEach(f => {
    const card = document.createElement('div');
    card.className = `finding-card ${(f.severity || 'medium').toLowerCase()}`;

    card.innerHTML = `
      <div class="finding-header">
        <span class="finding-title">${escapeHtml(f.category)}</span>
        <span class="badge badge-${(f.severity || 'medium').toLowerCase()}">${f.severity || 'MEDIUM'}</span>
        <span class="badge badge-info" style="font-size:10px;">${escapeHtml(f.rule_id || 'WCAG')}</span>
      </div>
      <p style="font-size:13px; color:var(--ink-muted); margin-bottom:6px;">${escapeHtml(f.explanation)}</p>
      ${f.matched_text ? `<div class="finding-quote">"${escapeHtml(f.matched_text)}"</div>` : ''}
      <div class="citation-box"><strong>Cited Standard:</strong> ${escapeHtml(f.evidence_reference || '')}</div>
      ${f.suggested_correction ? `<div class="finding-suggestion">💡 <strong>Guidance:</strong> ${escapeHtml(f.suggested_correction)}</div>` : ''}
    `;
    container.appendChild(card);
  });
}


// --- JUDGE TRY-THIS SAMPLE HELPER (Section 5) ---
function pasteSampleDraftAndReview() {
  switchTab('studio');
  const sampleCopy = "Brandguard by Inkloom AI is the cheap choice offering 100% guaranteed safety and is the #1 fastest growing guardrail tool. We achieve 99.4% brand compliance detection rate and cut brand review cycles by 80%. Try it today!";
  document.getElementById('draft-content').value = sampleCopy;
  document.getElementById('draft-title').value = "Try-This Demo: Spring Product Announcement";
  document.getElementById('draft-revision-badge').textContent = "Revision: v1 (Draft)";
  showToast("Try-this sample copy loaded into Content Studio!", "info");
  setTimeout(() => {
    runComplianceReview();
  }, 200);
}
