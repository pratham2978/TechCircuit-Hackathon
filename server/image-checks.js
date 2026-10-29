const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { getContrastRatio } = require('./accessibility');

const PYTHON_CMD = process.env.PYTHON_CMD || 'python';
const PALETTE_SCRIPT = path.join(__dirname, 'analyze_palette.py');

/**
 * Executes local Python 64x64 palette clustering & Lab color distance check
 */
function analyzeImagePalette(imagePath, brandColors = ['#27231e', '#f7f4ee', '#c6f432', '#22d3ee']) {
  return new Promise((resolve) => {
    if (!fs.existsSync(imagePath)) {
      return resolve({ success: false, error: 'Image file does not exist' });
    }

    const paletteArg = Array.isArray(brandColors) ? brandColors.join(',') : String(brandColors);
    const child = spawn(PYTHON_CMD, [PALETTE_SCRIPT, imagePath, paletteArg]);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', data => { stdout += data.toString(); });
    child.stderr.on('data', data => { stderr += data.toString(); });

    child.on('close', code => {
      if (code !== 0) {
        return resolve({
          success: false,
          error: stderr || `Palette script exited with code ${code}`,
          status: 'unavailable'
        });
      }

      try {
        const json = JSON.parse(stdout.trim());
        resolve(json);
      } catch (err) {
        resolve({
          success: false,
          error: `Failed to parse palette analyzer output: ${err.message}`,
          raw: stdout
        });
      }
    });

    child.on('error', err => {
      resolve({
        success: false,
        error: `Failed to spawn Python process: ${err.message}`,
        status: 'unavailable'
      });
    });
  });
}

/**
 * Checks an uploaded image against:
 * 1. File type and 5MB size limit
 * 2. Mandatory alt text (WCAG 1.1.1)
 * 3. Dominant colors vs brand palette (64x64, top 5, Lab distance > 25, coverage >= 10%)
 * 4. Text/background contrast ratio if foreground and background colors provided (WCAG 1.4.3)
 */
async function performImageChecks({
  filePath,
  originalName,
  fileSize,
  mimeType,
  altText,
  brandPalette = ['#27231e', '#f7f4ee', '#c6f432', '#22d3ee'],
  fgColor = null,
  bgColor = null
}) {
  const findings = [];
  let findingCount = 1;

  // 1. File Type and Size Validation
  const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

  if (!ALLOWED_MIME.includes(mimeType?.toLowerCase())) {
    return {
      success: false,
      error: `Invalid file type "${mimeType}". Allowed image formats: PNG, JPG/JPEG, WebP.`
    };
  }

  if (fileSize > MAX_SIZE) {
    return {
      success: false,
      error: `Image size (${(fileSize / (1024 * 1024)).toFixed(2)} MB) exceeds the 5 MB maximum limit.`
    };
  }

  // 2. Alt Text Check (WCAG 1.1.1 Non-text Content)
  const trimmedAlt = (altText || '').trim();
  if (!trimmedAlt) {
    findings.push({
      finding_id: `IMG-ALT-${findingCount++}`,
      category: 'Accessibility',
      severity: 'HIGH',
      explanation: 'Missing alternative text (alt text) for uploaded creative image. WCAG 2.1 Principle 1 requires text alternatives for any non-text content so that it can be converted into other forms people need (speech, braille, or simplified symbols).',
      matched_text: originalName,
      rule_id: 'WCAG-1.1.1',
      claim_id: null,
      evidence_reference: 'WCAG 2.1 Guideline 1.1.1 (Non-text Content, Level A)',
      suggested_correction: `Provide descriptive alt text describing the subject and context of "${originalName}".`,
      verification_status: 'ACCESSIBILITY_VIOLATION'
    });
  }

  // 3. Dominant Colors & Off-Palette Check (64x64, top 5 colors, Lab distance > 25, coverage >= 10%)
  const paletteAnalysis = await analyzeImagePalette(filePath, brandPalette);
  let dominantColors = [];
  let offPaletteList = [];

  if (paletteAnalysis.success) {
    dominantColors = paletteAnalysis.top_colors || [];
    offPaletteList = paletteAnalysis.off_palette_colors || [];

    for (const off of offPaletteList) {
      findings.push({
        finding_id: `IMG-PALETTE-${findingCount++}`,
        category: 'Brand Identity',
        severity: 'MEDIUM',
        explanation: `Dominant color ${off.hex} covers ${off.coverage_pct}% of the image and has a CIELAB distance of ${off.min_lab_distance} from authorized brand palette colors (${brandPalette.join(', ')}). Policy requires visual assets to adhere to approved brand color tokens.`,
        matched_text: `${off.hex} (${off.coverage_pct}% coverage)`,
        rule_id: 'RULE-PALETTE-01',
        claim_id: null,
        evidence_reference: 'Section 1.0 - Brand Palette & Visual Identity Standards',
        suggested_correction: `Adjust visual tone toward approved palette colors (e.g. ${brandPalette.slice(0, 3).join(', ')}).`,
        verification_status: 'BRAND_ASSET_VIOLATION',
        color_data: off
      });
    }
  }

  // 4. Contrast Ratio Check (WCAG 1.4.3 Contrast Minimum)
  let contrastData = null;
  if (fgColor && bgColor) {
    const ratio = getContrastRatio(fgColor, bgColor);
    if (ratio !== null) {
      contrastData = {
        fgColor,
        bgColor,
        contrastRatio: Math.round(ratio * 100) / 100,
        compliant: ratio >= 4.5
      };

      if (ratio < 4.5) {
        findings.push({
          finding_id: `IMG-CONTRAST-${findingCount++}`,
          category: 'Accessibility',
          severity: 'HIGH',
          explanation: `Text overlay contrast ratio of ${contrastData.contrastRatio}:1 between foreground ${fgColor} and background ${bgColor} fails WCAG 1.4.3 minimum threshold of 4.5:1.`,
          matched_text: `${fgColor} on ${bgColor}`,
          rule_id: 'WCAG-1.4.3',
          claim_id: null,
          evidence_reference: 'WCAG 2.1 Guideline 1.4.3 (Contrast Minimum, Level AA)',
          suggested_correction: `Increase contrast to at least 4.5:1 by darkening text or lightening background.`,
          verification_status: 'ACCESSIBILITY_VIOLATION'
        });
      }
    }
  }

  return {
    success: true,
    file_info: {
      original_name: originalName,
      file_size: fileSize,
      mime_type: mimeType
    },
    alt_text: trimmedAlt || null,
    dominant_colors: dominantColors,
    off_palette_colors: offPaletteList,
    contrast: contrastData,
    findings,
    summary: {
      total: findings.length,
      high: findings.filter(f => f.severity === 'HIGH').length,
      medium: findings.filter(f => f.severity === 'MEDIUM').length,
      low: findings.filter(f => f.severity === 'LOW').length
    }
  };
}

/**
 * Scans HTML content for <img> tags without alt attribute or with empty alt (WCAG 1.1.1)
 */
function scanHtmlImagesForAlt(htmlContent) {
  const findings = [];
  if (!htmlContent) return findings;

  const imgRegex = /<img\b([^>]*)>/gi;
  let match;
  let count = 1;

  while ((match = imgRegex.exec(htmlContent)) !== null) {
    const fullTag = match[0];
    const attrs = match[1];

    const altMatch = attrs.match(/\balt\s*=\s*["']([^"']*)["']/i);
    const hasAlt = !!altMatch;
    const altValue = altMatch ? altMatch[1].trim() : '';

    if (!hasAlt || !altValue) {
      findings.push({
        finding_id: `HTML-IMG-${count++}`,
        category: 'Accessibility',
        severity: 'HIGH',
        explanation: `HTML <img> tag is missing an informative alt attribute. WCAG 1.1.1 requires all non-text content to provide text alternatives.`,
        matched_text: fullTag,
        rule_id: 'WCAG-1.1.1',
        evidence_reference: 'WCAG 2.1 Guideline 1.1.1 (Level A)',
        suggested_correction: fullTag.replace(/<img/i, '<img alt="Descriptive visual summary"'),
        verification_status: 'ACCESSIBILITY_VIOLATION'
      });
    }
  }

  return findings;
}

module.exports = {
  analyzeImagePalette,
  performImageChecks,
  scanHtmlImagesForAlt
};
