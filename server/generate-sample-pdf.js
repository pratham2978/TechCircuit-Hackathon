const fs = require('fs');
const path = require('path');
const { extractDocumentText } = require('../server/document-extractor');
const { compileGuidelines } = require('../server/constitution-compiler');

function buildPdf(lines) {
  let stream = 'BT /F1 11 Tf 50 730 Td ';
  for (let i = 0; i < lines.length; i++) {
    const escaped = lines[i].replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    if (i === 0) {
      stream += '(' + escaped + ') Tj ';
    } else {
      stream += '0 -22 Td (' + escaped + ') Tj ';
    }
  }
  stream += 'ET';
  const len = Buffer.byteLength(stream);

  return `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length ${len} >>
stream
${stream}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000224 00000 n 
0000000295 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
900
%%EOF`;
}

const lines = [
  'INKLOOM AI BRAND GOVERNANCE MANUAL',
  '1.0 Brand Identity Guidelines',
  'The official product name must always be spelled as BrandGuard.',
  '2.0 Prohibited Terminology Policy',
  'Creators must never use the word cheap in public copy. Use cost-effective.',
  'Marketers must avoid the phrase 100% guaranteed as it creates legal liability.',
  'Copywriters must never use the word flawless.',
  '3.0 Tone of Voice Standard',
  'Content must maintain an authoritative, professional, and transparent tone.',
  'Writers must avoid excessive exclamation marks and hyperbolic slang.',
  '4.0 Marketing Claims and Evidence',
  'All performance claims regarding turnaround reduction must cite verified study data.',
  'Claims without substantiation are strictly prohibited.',
  '5.0 Accessibility and Visual Requirements',
  'Visual assets must maintain high contrast complying with WCAG 2.1 AA standards.',
  'Alt text is required for all embedded marketing graphics.'
];

const pdfContent = buildPdf(lines);
const outPath = path.join(__dirname, '..', 'public', 'sample-brand-guidelines.pdf');
fs.writeFileSync(outPath, pdfContent);
console.log('Sample PDF successfully written to:', outPath);

// Test extraction and compilation
extractDocumentText(outPath, 'sample-brand-guidelines.pdf', 'application/pdf').then(res => {
  console.log('Extracted text lines:', res.text.split('\n').filter(Boolean).length);
  const rules = compileGuidelines(res.text, { original_name: 'sample-brand-guidelines.pdf' });
  console.log(`Successfully compiled ${rules.length} candidate rules:`);
  rules.forEach((r, idx) => console.log(`  ${idx+1}. [${r.category}] (${r.severity}) ${r.rule_text}`));
}).catch(err => {
  console.error('Extraction error:', err);
});
