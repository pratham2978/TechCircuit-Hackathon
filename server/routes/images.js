const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb, logAudit } = require('../db');
const { authenticate } = require('../auth');
const { performImageChecks } = require('../image-checks');

router.use(authenticate);

// Configure multer for image uploads (PNG, JPG, WebP up to 5 MB)
const uploadDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'img-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.png', '.jpg', '.jpeg', '.webp'];

    if (allowedTypes.includes(file.mimetype.toLowerCase()) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPG, and WebP images up to 5 MB are supported.'));
    }
  }
});

// POST /api/images/check - Upload image, inspect palette, alt text & contrast
router.post('/check', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'No image file uploaded. Please upload a PNG, JPG, or WebP file (max 5 MB).'
    });
  }

  const { alt_text, workspace_id, fg_color, bg_color } = req.body;
  const db = getDb();
  const wsId = workspace_id || 1;

  try {
    // Retrieve workspace brand colors
    let brandPalette = ['#27231e', '#f7f4ee', '#c6f432', '#22d3ee'];
    const ws = db.prepare('SELECT brand_colors FROM workspaces WHERE id = ?').get(wsId);
    if (ws && ws.brand_colors) {
      brandPalette = ws.brand_colors.split(',').map(c => c.trim()).filter(Boolean);
    }

    const checkResult = await performImageChecks({
      filePath: req.file.path,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      altText: alt_text,
      brandPalette,
      fgColor: fg_color || null,
      bgColor: bg_color || null
    });

    if (!checkResult.success) {
      return res.status(400).json(checkResult);
    }

    // Save image asset metadata record
    const insertAsset = db.prepare(`
      INSERT INTO brand_assets (organization_id, workspace_id, asset_type, name, file_path, metadata_json)
      VALUES (?, ?, 'creative_image', ?, ?, ?)
    `);

    const assetMetadata = {
      original_name: req.file.originalname,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      alt_text: alt_text || null,
      dominant_colors: checkResult.dominant_colors,
      off_palette_count: checkResult.off_palette_colors.length,
      findings_count: checkResult.findings.length
    };

    const assetRes = insertAsset.run(
      req.organizationId,
      wsId,
      req.file.originalname,
      `/uploads/${path.basename(req.file.path)}`,
      JSON.stringify(assetMetadata)
    );

    logAudit('IMAGE_AUDITED', 'brand_assets', assetRes.lastInsertRowid, req.user, {
      filename: req.file.originalname,
      alt_provided: !!alt_text,
      findings: checkResult.findings.length
    }, req.organizationId);

    res.json({
      success: true,
      asset_id: assetRes.lastInsertRowid,
      file_url: `/uploads/${path.basename(req.file.path)}`,
      ...checkResult
    });

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
