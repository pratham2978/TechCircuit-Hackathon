const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'brandguard.sqlite');

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db) {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      organization_id INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      industry TEXT DEFAULT 'Technology',
      preferred_tone TEXT DEFAULT 'Professional, Confident, Modest',
      approved_terminology TEXT DEFAULT 'BrandGuard, Inkloom AI, cost-effective',
      prohibited_terminology TEXT DEFAULT 'cheap, 100% guaranteed, flawless',
      brand_colors TEXT DEFAULT '#27231e, #f7f4ee, #c6f432, #22d3ee',
      status TEXT DEFAULT 'active',
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS guideline_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL,
      workspace_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      extracted_text TEXT NOT NULL,
      page_count INTEGER DEFAULT 1,
      uploaded_by TEXT DEFAULT 'admin',
      status TEXT DEFAULT 'processed',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS brand_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL,
      workspace_id INTEGER NOT NULL,
      rule_code TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      rule_type TEXT NOT NULL,
      pattern_or_phrase TEXT,
      replacement_or_guidance TEXT,
      severity TEXT NOT NULL,
      source_document_id INTEGER,
      source_reference TEXT,
      source_excerpt TEXT,
      status TEXT NOT NULL DEFAULT 'candidate',
      extraction_method TEXT DEFAULT 'deterministic_pattern',
      created_by TEXT DEFAULT 'admin',
      approved_by TEXT,
      approved_at TEXT,
      rejection_reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (source_document_id) REFERENCES guideline_documents(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS claim_ledger (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL,
      workspace_id INTEGER NOT NULL,
      claim_code TEXT NOT NULL,
      claim_title TEXT,
      claim_text TEXT NOT NULL,
      category TEXT DEFAULT 'Performance',
      approval_status TEXT NOT NULL DEFAULT 'approved',
      owner TEXT NOT NULL,
      reviewer TEXT,
      valid_from TEXT,
      valid_to TEXT,
      policy_exception_reason TEXT,
      created_by TEXT DEFAULT 'manager',
      approved_by TEXT,
      approved_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS claim_evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      claim_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_url TEXT,
      supporting_excerpt TEXT,
      doc_reference TEXT,
      evidence_date TEXT,
      expiration_date TEXT,
      verification_status TEXT DEFAULT 'VERIFIED',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (claim_id) REFERENCES claim_ledger(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS content_drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL,
      workspace_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content_type TEXT DEFAULT 'Social Media Post',
      content_text TEXT NOT NULL,
      channel TEXT DEFAULT 'Social Media',
      author_id TEXT DEFAULT 'creator',
      current_version INTEGER DEFAULT 1,
      status TEXT DEFAULT 'DRAFT',
      submitted_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS content_revisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      draft_id INTEGER NOT NULL,
      version_num INTEGER NOT NULL,
      content_text TEXT NOT NULL,
      diff_summary TEXT,
      author_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (draft_id) REFERENCES content_drafts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      draft_id INTEGER NOT NULL,
      revision_id INTEGER,
      stage TEXT DEFAULT 'FULL_REVIEW',
      status TEXT DEFAULT 'COMPLETED',
      ml_tone_predicted TEXT,
      ml_confidence REAL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (draft_id) REFERENCES content_drafts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_findings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      review_id INTEGER,
      draft_id INTEGER NOT NULL,
      revision_id INTEGER,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      explanation TEXT NOT NULL,
      matched_text TEXT,
      start_offset INTEGER,
      end_offset INTEGER,
      rule_id TEXT,
      claim_id TEXT,
      evidence_reference TEXT,
      suggested_correction TEXT,
      verification_status TEXT DEFAULT 'HIGH',
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (draft_id) REFERENCES content_drafts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      draft_id INTEGER NOT NULL,
      revision_id INTEGER,
      reviewer_id TEXT NOT NULL,
      decision TEXT NOT NULL,
      comments TEXT,
      policy_exception INTEGER DEFAULT 0,
      exception_reason TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (draft_id) REFERENCES content_drafts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS brand_assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL,
      workspace_id INTEGER NOT NULL,
      asset_type TEXT NOT NULL,
      name TEXT NOT NULL,
      file_path TEXT,
      metadata_json TEXT,
      status TEXT DEFAULT 'approved',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organization_id INTEGER NOT NULL,
      event_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      details_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
    );
  `);
}

function logAudit(eventType, entityType, entityId, user, details = {}, orgId = null) {
  const db = getDb();
  const organizationId = orgId || user?.organization_id || 1;
  const stmt = db.prepare(`
    INSERT INTO audit_events (organization_id, event_type, entity_type, entity_id, user_id, user_name, user_role, details_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    organizationId,
    eventType,
    entityType,
    String(entityId || ''),
    String(user?.id || user?.email || 'system'),
    user?.name || 'System User',
    user?.role || 'admin',
    JSON.stringify(details)
  );
}

module.exports = {
  getDb,
  logAudit,
  DB_PATH
};
