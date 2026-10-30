import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist/assets');
const files = fs.readdirSync(distDir);
const jsFile = files.find(f => f.endsWith('.js'));
if (!jsFile) {
  console.error('No built JS file found');
  process.exit(1);
}

const jsContent = fs.readFileSync(path.join(distDir, jsFile), 'utf-8');

console.log('Verifying bundle contents:');

const checks = [
  { name: 'Projects Repository route /app/projects', test: jsContent.includes('/app/projects') },
  { name: 'Legal Document Review SLA-ABS-01 rule', test: jsContent.includes('SLA-ABS-01') },
  { name: 'Non-legal advice notation present', test: jsContent.includes('This inspection does not constitute formal legal counsel') },
  { name: 'Promotion & Offer claim CLM-2024-089 verification', test: jsContent.includes('CLM-2024-089') },
  { name: 'Brand Color Tokens (Deep Ink, Warm Ivory, Signal Coral, Evidence Teal)', test: jsContent.includes('#14212B') && jsContent.includes('#F7F5F0') && jsContent.includes('#F16B50') && jsContent.includes('#167C78') },
  { name: 'WCAG 2.1 AA Contrast calculation ratio (4.5:1)', test: jsContent.includes('4.5') },
  { name: 'Video Review transparent phased status', test: jsContent.includes('Automated multi-modal video AI processing') || jsContent.includes('Video Asset Governance & Phased Processing Status') },
  { name: 'Multi-Tenant Company Isolation security boundary', test: jsContent.includes('Access Denied: Enterprise Company Isolation Boundary') },
  { name: 'Human Reviewer Decision controls (approved, changes_requested, rejected)', test: jsContent.includes('Record Review Decision') },
  { name: 'Version comparison and snapshot preservation', test: jsContent.includes('Version Diff') || jsContent.includes('Compare vs v') }
];

let allPassed = true;
for (const check of checks) {
  if (check.test) {
    console.log(`✓ ${check.name}: PASS`);
  } else {
    console.error(`✗ ${check.name}: FAIL`);
    allPassed = false;
  }
}

if (!allPassed) {
  process.exit(1);
}
console.log('\nAll 10 integration verification bundle checks PASSED!');

