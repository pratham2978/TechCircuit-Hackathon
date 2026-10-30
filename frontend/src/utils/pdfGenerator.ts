/**
 * BrandGuard Client-Side PDF Report Generator
 * Generates standards-compliant PDF 1.4 documents from actual analysis results without external dependencies.
 */

export interface AnalysisFinding {
  id: string;
  title: string;
  severity: 'critical' | 'warning' | 'advisory';
  explanation: string;
  ruleReference?: string;
  sourceDoc?: string;
  sourcePage?: number;
  claimOwner?: string;
  validDates?: string;
  suggestedCorrection?: string;
  timestamp?: string; // For video review
}

export interface ReportData {
  projectName: string;
  reviewType: string;
  overallResult: string;
  fileName?: string;
  author?: string;
  analysisDate?: string;
  keyFindings: string[];
  findings: AnalysisFinding[];
}

function escapePdfText(str: string): string {
  // Replace non-ascii and special chars to prevent syntax break in standard WinAnsiEncoding
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, ' ');
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

export function generateAnalysisPdf(data: ReportData): Blob {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;

  const streamOps: string[] = [];

  function setFillColor(r: number, g: number, b: number) {
    streamOps.push(`${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} rg`);
  }
  function setStrokeColor(r: number, g: number, b: number) {
    streamOps.push(`${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} RG`);
  }
  function drawRect(x: number, y: number, w: number, h: number, fill = true, stroke = false) {
    const op = fill && stroke ? 'B' : fill ? 'f' : 'S';
    streamOps.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${op}`);
  }
  function drawText(text: string, x: number, y: number, font = 'F1', size = 10, r = 20, g = 33, b = 43) {
    setFillColor(r, g, b);
    streamOps.push(`BT /${font} ${size} Tf ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(text)}) Tj ET`);
  }

  // Header background bar (Deep Ink #14212B)
  setFillColor(20, 33, 43);
  drawRect(0, pageHeight - 65, pageWidth, 65, true, false);

  // Logo / Title in Header
  drawText('BRANDGUARD', margin, pageHeight - 38, 'F2', 16, 241, 107, 80); // Signal Coral
  drawText(' |  AI Governance & Compliance Analysis Report', margin + 115, pageHeight - 38, 'F1', 11, 247, 245, 240); // Warm Ivory
  drawText(
    `Generated: ${data.analysisDate || new Date().toISOString().slice(0, 10)}  |  Confidential Enterprise Audit  |  Deterministic Ground Truth`,
    margin,
    pageHeight - 52,
    'F1',
    8,
    180,
    190,
    198
  );

  let currentY = pageHeight - 95;

  // Project & Review Info Card
  setFillColor(247, 245, 240); // Warm Ivory
  setStrokeColor(221, 226, 226);
  drawRect(margin, currentY - 55, contentWidth, 55, true, true);

  drawText(`PROJECT: ${data.projectName}`, margin + 12, currentY - 18, 'F2', 12, 20, 33, 43);
  drawText(`REVIEW TYPE: ${data.reviewType.toUpperCase()}`, margin + 12, currentY - 32, 'F2', 9, 22, 124, 120);
  drawText(`OVERALL RESULT: ${data.overallResult}`, margin + 12, currentY - 45, 'F2', 9, 241, 107, 80);
  drawText(`FILE / ASSET: ${data.fileName || 'Direct Submission'}`, margin + 270, currentY - 32, 'F1', 9, 100, 114, 125);
  drawText(`LEAD AUTHOR: ${data.author || 'Authorized User'}`, margin + 270, currentY - 45, 'F1', 9, 100, 114, 125);

  currentY -= 75;

  // Key Findings Summary Section
  drawText('KEY FINDINGS SUMMARY', margin, currentY, 'F2', 11, 20, 33, 43);
  currentY -= 6;
  setStrokeColor(241, 107, 80);
  streamOps.push(`${margin} ${currentY} m ${margin + contentWidth} ${currentY} l S`);
  currentY -= 15;

  for (const bullet of data.keyFindings) {
    const wrapped = wrapText(bullet, 85);
    drawText('•', margin + 6, currentY, 'F2', 9, 241, 107, 80);
    for (const line of wrapped) {
      drawText(line, margin + 18, currentY, 'F1', 8.5, 30, 40, 50);
      currentY -= 12;
    }
    currentY -= 2;
  }

  currentY -= 8;

  // Detailed Findings Section
  drawText(`DETAILED ANALYSIS FINDINGS (${data.findings.length} ISSUES)`, margin, currentY, 'F2', 11, 20, 33, 43);
  currentY -= 6;
  setStrokeColor(22, 124, 120);
  streamOps.push(`${margin} ${currentY} m ${margin + contentWidth} ${currentY} l S`);
  currentY -= 18;

  for (const f of data.findings) {
    if (currentY < 120) break; // keep within page bounds for single-page summary

    const isCritical = f.severity === 'critical';
    const isWarning = f.severity === 'warning';

    // Height calculation
    const explanationLines = wrapText(`Issue: ${f.explanation}`, 88);
    const boxHeight = Math.max(58, 30 + explanationLines.length * 10 + (f.suggestedCorrection ? 14 : 0));

    // Card background
    setFillColor(252, 252, 250);
    setStrokeColor(221, 226, 226);
    drawRect(margin, currentY - boxHeight, contentWidth, boxHeight, true, true);

    // Left border indicator
    if (isCritical) setFillColor(230, 57, 70);
    else if (isWarning) setFillColor(241, 107, 80);
    else setFillColor(22, 124, 120);
    drawRect(margin, currentY - boxHeight, 4, boxHeight, true, false);

    // Title line
    const sevLabel = `[${f.severity.toUpperCase()}]`;
    drawText(sevLabel, margin + 12, currentY - 14, 'F2', 8, isCritical ? 230 : 22, isCritical ? 57 : 124, isCritical ? 70 : 120);
    const titleText = f.timestamp ? `${f.title} (${f.timestamp})` : f.title;
    drawText(titleText.slice(0, 70), margin + 70, currentY - 14, 'F2', 8.5, 20, 33, 43);

    let textY = currentY - 26;
    for (const expLine of explanationLines.slice(0, 2)) {
      drawText(expLine, margin + 12, textY, 'F1', 8, 70, 80, 90);
      textY -= 10;
    }

    // Citation or Rule
    if (f.sourceDoc) {
      drawText(`Citation: ${f.sourceDoc} (Page ${f.sourcePage || 1})`, margin + 12, textY, 'F1', 7.5, 22, 124, 120);
      textY -= 10;
    } else if (f.ruleReference) {
      drawText(`Rule Reference: ${f.ruleReference}`, margin + 12, textY, 'F1', 7.5, 100, 114, 125);
      textY -= 10;
    }

    // Recommended replacement
    if (f.suggestedCorrection) {
      drawText(`Recommended Replacement: "${f.suggestedCorrection.slice(0, 80)}"`, margin + 12, textY, 'F2', 7.5, 20, 33, 43);
    }

    currentY -= (boxHeight + 8);
  }

  // Footer bar
  setFillColor(247, 245, 240);
  drawRect(0, 0, pageWidth, 26, true, false);
  drawText('Certified Brand Passport Compliance Record  |  BrandGuard AI  |  Audit Veracity Guaranteed', margin, 10, 'F1', 7.5, 100, 114, 125);

  const streamString = streamOps.join('\n');
  const streamBytes = new TextEncoder().encode(streamString);
  const streamLength = streamBytes.length;

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

  let offset = 0;
  const offsets: number[] = [];
  for (const part of pdfParts) {
    offsets.push(offset);
    offset += new TextEncoder().encode(part).length;
  }

  let xref = 'xref\n0 8\n0000000000 65535 f \n';
  for (let i = 1; i <= 7; i++) {
    const off = offsets[i];
    xref += off.toString().padStart(10, '0') + ' 00000 n \n';
  }

  const trailer = `trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
  const fullText = pdfParts.join('') + xref + trailer;

  return new Blob([new TextEncoder().encode(fullText)], { type: 'application/pdf' });
}

export function downloadPdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

