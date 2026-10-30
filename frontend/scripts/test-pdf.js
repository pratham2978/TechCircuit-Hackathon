// Test generating a valid PDF 1.4 document in pure JavaScript
import fs from 'fs';

function escapePdfText(str) {
  return str.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function generateAnalysisPdf(data) {
  const objects = [];
  function addObject(content) {
    objects.push(content);
    return objects.length;
  }

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  // Build stream content
  let streamOps = [];

  // Helper for colors
  function setFillColor(r, g, b) {
    streamOps.push(`${(r/255).toFixed(3)} ${(g/255).toFixed(3)} ${(b/255).toFixed(3)} rg`);
  }
  function setStrokeColor(r, g, b) {
    streamOps.push(`${(r/255).toFixed(3)} ${(g/255).toFixed(3)} ${(b/255).toFixed(3)} RG`);
  }
  function drawRect(x, y, w, h, fill = true, stroke = false) {
    const op = fill && stroke ? 'B' : fill ? 'f' : 'S';
    streamOps.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${op}`);
  }
  function drawText(text, x, y, font = 'F1', size = 10, r = 20, g = 33, b = 43) {
    setFillColor(r, g, b);
    streamOps.push(`BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(text)}) Tj ET`);
  }

  // Header background bar (Deep Ink #14212B)
  setFillColor(20, 33, 43);
  drawRect(0, pageHeight - 65, pageWidth, 65, true, false);

  // Logo / Title in Header
  drawText('BRANDGUARD', margin, pageHeight - 38, 'F2', 16, 241, 107, 80); // Signal Coral
  drawText(' |  AI Governance & Compliance Analysis Report', margin + 115, pageHeight - 38, 'F1', 11, 247, 245, 240); // Warm Ivory
  drawText(`Generated: ${new Date().toISOString().slice(0, 10)}  |  Confidential Enterprise Audit`, margin, pageHeight - 52, 'F1', 8, 180, 190, 198);

  let currentY = pageHeight - 95;

  // Project & Review Info Card
  setFillColor(247, 245, 240); // Warm ivory background
  setStrokeColor(221, 226, 226);
  drawRect(margin, currentY - 55, contentWidth, 55, true, true);

  drawText(`PROJECT: ${data.projectName}`, margin + 12, currentY - 18, 'F2', 12, 20, 33, 43);
  drawText(`REVIEW TYPE: ${data.reviewType.toUpperCase()}`, margin + 12, currentY - 32, 'F2', 9, 22, 124, 120);
  drawText(`STATUS: ${data.overallResult}`, margin + 12, currentY - 45, 'F1', 9, 241, 107, 80);
  drawText(`TARGET FILE: ${data.fileName || 'Direct Submission'}`, margin + 260, currentY - 32, 'F1', 9, 100, 114, 125);
  drawText(`AUTHOR: ${data.author || 'Authorized User'}`, margin + 260, currentY - 45, 'F1', 9, 100, 114, 125);

  currentY -= 75;

  // Executive Summary Section
  drawText('EXECUTIVE SUMMARY & KEY FINDINGS', margin, currentY, 'F2', 11, 20, 33, 43);
  currentY -= 6;
  setStrokeColor(241, 107, 80);
  streamOps.push(`${margin} ${currentY} m ${margin + contentWidth} ${currentY} l S`);
  currentY -= 15;

  for (const bullet of data.keyFindings) {
    drawText('•', margin + 8, currentY, 'F2', 10, 241, 107, 80);
    drawText(bullet, margin + 22, currentY, 'F1', 9, 30, 40, 50);
    currentY -= 15;
  }

  currentY -= 10;

  // Detailed Findings Section
  drawText(`DETAILED COMPLIANCE FINDINGS (${data.findings.length} ISSUES)`, margin, currentY, 'F2', 11, 20, 33, 43);
  currentY -= 6;
  setStrokeColor(22, 124, 120);
  streamOps.push(`${margin} ${currentY} m ${margin + contentWidth} ${currentY} l S`);
  currentY -= 18;

  for (const f of data.findings) {
    if (currentY < 120) break; // keep in page bounds for sample
    const isCritical = f.severity === 'critical';
    const isWarning = f.severity === 'warning';

    // Box
    setFillColor(252, 252, 250);
    setStrokeColor(221, 226, 226);
    drawRect(margin, currentY - 60, contentWidth, 60, true, true);

    // Left border indicator
    if (isCritical) setFillColor(230, 57, 70);
    else if (isWarning) setFillColor(241, 107, 80);
    else setFillColor(22, 124, 120);
    drawRect(margin, currentY - 60, 4, 60, true, false);

    // Finding title & severity
    const sevLabel = `[${f.severity.toUpperCase()}]`;
    drawText(sevLabel, margin + 12, currentY - 14, 'F2', 8, isCritical ? 230 : 22, isCritical ? 57 : 124, isCritical ? 70 : 120);
    drawText(`${f.title || f.ruleReference}`, margin + 70, currentY - 14, 'F2', 9, 20, 33, 43);

    // Explanation
    drawText(`Issue: ${f.explanation.slice(0, 95)}`, margin + 12, currentY - 28, 'F1', 8, 80, 90, 100);

    // Evidence & Rule Ref
    if (f.sourceDoc) {
      drawText(`Evidence Citation: ${f.sourceDoc} (Page ${f.sourcePage || 1})`, margin + 12, currentY - 40, 'F1', 8, 22, 124, 120);
    } else {
      drawText(`Rule Reference: ${f.ruleReference}`, margin + 12, currentY - 40, 'F1', 8, 100, 114, 125);
    }

    // Recommendation
    if (f.suggestedCorrection) {
      drawText(`Recommended Replacement: "${f.suggestedCorrection.slice(0, 85)}"`, margin + 12, currentY - 52, 'F2', 8, 20, 33, 43);
    }

    currentY -= 68;
  }

  // Footer bar
  setFillColor(247, 245, 240);
  drawRect(0, 0, pageWidth, 26, true, false);
  drawText('Certified Brand Passport Compliance Record  |  BrandGuard AI  |  Page 1 of 1', margin, 10, 'F1', 7.5, 100, 114, 125);

  const streamString = streamOps.join('\n');
  const streamLength = Buffer.byteLength(streamString, 'utf-8');

  // Assemble PDF Objects
  // 1: Catalog
  // 2: Outlines
  // 3: Pages
  // 4: Page 1
  // 5: Contents
  // 6: Font Helvetica
  // 7: Font Helvetica-Bold

  const pdfParts = [
    '%PDF-1.4\n',
    '1 0 obj\n<< /Type /Catalog /Pages 3 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Outlines /Count 0 >>\nendobj\n',
    '3 0 obj\n<< /Type /Pages /Kids [4 0 R] /Count 1 >>\nendobj\n',
    '4 0 obj\n<< /Type /Page /Parent 3 0 R /MediaBox [0 0 595.28 841.89] /Contents 5 0 R /Resources << /ProcSet [/PDF /Text] /Font << /F1 6 0 R /F2 7 0 R >> >> >>\nendobj\n',
    `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamString}\nendstream\nendobj\n`,
    '6 0 obj\n<< /Type /Font /Subtype /Type1 /Name /F1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
    '7 0 obj\n<< /Type /Font /Subtype /Type1 /Name /F2 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n'
  ];

  // Calculate xref offsets
  let offset = 0;
  const offsets = [];
  for (const part of pdfParts) {
    offsets.push(offset);
    offset += Buffer.byteLength(part, 'utf-8');
  }

  let xref = 'xref\n0 8\n0000000000 65535 f \n';
  for (let i = 1; i <= 7; i++) {
    const off = offsets[i];
    xref += off.toString().padStart(10, '0') + ' 00000 n \n';
  }

  const trailer = `trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
  return Buffer.concat([Buffer.from(pdfParts.join('')), Buffer.from(xref), Buffer.from(trailer)]);
}

// Test sample
const sampleData = {
  projectName: 'Summer Sale 2027',
  reviewType: 'legal',
  overallResult: 'Changes Required (1 Critical Issue)',
  fileName: 'Master_Enterprise_Legal_Terms.docx',
  author: 'Sarah Chen (Lead Marketer)',
  keyFindings: [
    'Absolute 100% uptime SLA guarantee prohibited by enterprise risk policy SLA-ABS-01.',
    'Missing mandatory EEA Standard Contractual Clauses (SCCs) disclosure.',
    'Replacement standard availability clause recommended: "99.9% commercially reasonable availability".'
  ],
  findings: [
    {
      id: 'fnd-1',
      title: 'Absolute SLA Guarantee Prohibited',
      ruleReference: 'SLA-ABS-01: Prohibited Absolute Availability & Cash Penalties',
      severity: 'critical',
      explanation: 'Absolute 100% SLA guarantees and cash refunds are prohibited by enterprise policy SLA-ABS-01.',
      sourceDoc: 'Enterprise Master Terms 2026.pdf',
      sourcePage: 8,
      suggestedCorrection: 'target 99.9% commercially reasonable availability, excluding scheduled maintenance windows.'
    }
  ]
};

const pdfBuffer = generateAnalysisPdf(sampleData);
fs.writeFileSync('dist/test_sample_report.pdf', pdfBuffer);
console.log('Successfully generated test PDF report! Size:', pdfBuffer.length, 'bytes');

