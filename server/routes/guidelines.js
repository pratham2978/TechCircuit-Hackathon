const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb, logAudit } = require('../db');
const { extractDocumentText, ALLOWED_MIME_TYPES, MAX_FILE_SIZE } = require('../document-extractor');
const { compileGuidelines } = require('../constitution-compiler');
const { authenticate, requireRole } = require('../auth');

router.use(authenticate);

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME_TYPES.includes(file.mimetype) || ['.pdf', '.docx', '.txt'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and DOCX files are supported.'));
    }
  }
});

// GET /api/guidelines - List all imported guideline documents for organization
router.get('/', (req, res) => {
  try {
    const db = getDb();
    const docs = db.prepare(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM brand_rules WHERE source_document_id = d.id AND organization_id = ?) as total_rules_count,
        (SELECT COUNT(*) FROM brand_rules WHERE source_document_id = d.id AND organization_id = ? AND status = 'approved') as approved_rules_count
      FROM guideline_documents d
      WHERE d.organization_id = ?
      ORDER BY d.id DESC
    `).all(req.organizationId, req.organizationId, req.organizationId);

    res.json({ success: true, documents: docs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/guidelines/:id - Get single document details
router.get('/:id', (req, res) => {
  try {
    const db = getDb();
    const doc = db.prepare(`
      SELECT * FROM guideline_documents WHERE id = ? AND organization_id = ?
    `).get(req.params.id, req.organizationId);

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found in your organization.' });
    }

    const rules = db.prepare(`
      SELECT * FROM brand_rules WHERE source_document_id = ? AND organization_id = ? ORDER BY id ASC
    `).all(req.params.id, req.organizationId);

    res.json({ success: true, document: doc, rules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/guidelines/upload - Upload, extract text, and compile candidate brand rules
router.post('/upload', requireRole('admin', 'brand_manager'), (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    if (req.files && req.files.length > 0) {
      req.file = req.files.find(f => f.fieldname === 'guideline_file') || req.files.find(f => f.fieldname === 'file') || req.files[0];
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No document file was uploaded.' });
  }

  const filePath = req.file.path;
  const originalName = req.file.originalname;
  const mimeType = req.file.mimetype;
  const fileSize = req.file.size;
  const workspaceId = parseInt(req.body.workspace_id || '1', 10);

  try {
    // 1. Extract text and validate document content
    const extractionResult = await extractDocumentText(filePath, originalName, mimeType);
    const db = getDb();

    // 2. Persist document metadata and extracted text
    const insertDoc = db.prepare(`
      INSERT INTO guideline_documents (
        organization_id, workspace_id, filename, original_name, mime_type, file_size, extracted_text, page_count, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const docInsertResult = insertDoc.run(
      req.organizationId,
      workspaceId,
      req.file.filename,
      originalName,
      mimeType,
      fileSize,
      extractionResult.text,
      extractionResult.pageCount,
      req.user.name
    );
    const docId = docInsertResult.lastInsertRowid;

    // 3. Compile candidate brand rules using deterministic pipeline
    const candidateRules = compileGuidelines(extractionResult.text, {
      original_name: originalName,
      doc_id: docId
    });

    // 4. Persist candidate rules with stable IDs and source citations
    const insertRule = db.prepare(`
      INSERT INTO brand_rules (
        organization_id, workspace_id, rule_code, category, title, description, rule_type,
        pattern_or_phrase, replacement_or_guidance, severity,
        source_document_id, source_reference, source_excerpt, status, extraction_method, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'candidate', ?, ?)
    `);

    const savedRules = [];
    let counter = 1;

    for (const r of candidateRules) {
      let ruleCode = r.rule_code || `RULE-${String(counter).padStart(3, '0')}`;
      const existing = db.prepare('SELECT id FROM brand_rules WHERE rule_code = ? AND organization_id = ?').get(ruleCode, req.organizationId);
      if (existing) {
        ruleCode = `RULE-${docId}-${String(counter).padStart(3, '0')}`;
      }

      insertRule.run(
        req.organizationId,
        workspaceId,
        ruleCode,
        r.category || 'General Brand Policy',
        r.title || 'Brand Requirement',
        r.description || '',
        r.rule_type || 'deterministic_term',
        r.pattern_or_phrase ?? null,
        r.replacement_or_guidance ?? null,
        r.severity || 'Medium',
        docId,
        r.source_reference || `Document: ${originalName}`,
        r.source_excerpt ?? null,
        r.extraction_method || 'deterministic_pattern',
        req.user.name
      );

      savedRules.push({
        rule_code: ruleCode,
        category: r.category,
        title: r.title,
        severity: r.severity,
        source_reference: r.source_reference
      });

      counter++;
    }

    logAudit('DOCUMENT_UPLOADED', 'guideline_documents', docId, req.user, {
      originalName,
      fileSize,
      pageCount: extractionResult.pageCount,
      rulesGeneratedCount: savedRules.length,
      extractionMethod: 'deterministic_constitution_compiler'
    }, req.organizationId);

    res.json({
      success: true,
      documentId: docId,
      filename: originalName,
      pages: extractionResult.pageCount,
      textLength: extractionResult.text.length,
      rulesCount: savedRules.length,
      candidateRules: savedRules,
      compiler: 'BrandGuard Deterministic Constitution Compiler',
      message: `Extracted ${extractionResult.wordCount} words and compiled ${savedRules.length} candidate brand rules with source citations.`
    });

  } catch (err) {
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) {}
    }
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
