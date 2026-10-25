/**
 * Deterministic Constitution Compiler
 * Extracts candidate brand policies strictly from document text, section headings,
 * and normative modal verbs (must, must not, always, never, avoid, required).
 * Strictly local - no external AI APIs required or used.
 */

const CATEGORY_PATTERNS = [
  { category: 'Prohibited Terminology', regex: /\b(prohibit|forbidden|never use|do not use|banned|avoid|unapproved)\b/i, ruleType: 'prohibited_term', severity: 'High' },
  { category: 'Required Terminology', regex: /\b(terminology|casing|spelled as|naming|wordmark|referred to as)\b/i, ruleType: 'deterministic_term', severity: 'Medium' },
  { category: 'Tone of Voice', regex: /\b(tone|voice|persona|sound like|speaking style|formal|informal|slang)\b/i, ruleType: 'ai_guideline', severity: 'Medium' },
  { category: 'Claims and Evidence', regex: /\b(claim|substantiat|evidence|proof|statistic|benchmark|clinical|accuracy)\b/i, ruleType: 'ai_guideline', severity: 'High' },
  { category: 'Legal Disclaimers', regex: /\b(disclaimer|terms and conditions|legal|copyright|disclosure|trademark|mandatory wording)\b/i, ruleType: 'required_phrase', severity: 'High' },
  { category: 'Visual Identity', regex: /\b(color|hex|rgb|logo|clear space|palette|margin|alignment)\b/i, ruleType: 'deterministic_term', severity: 'Medium' },
  { category: 'Accessibility', regex: /\b(accessibility|wcag|contrast|alt text|screen reader|readability)\b/i, ruleType: 'ai_guideline', severity: 'Medium' }
];

const MODAL_PATTERNS = /\b(must\s+not|must|shall\s+not|shall|always|never|should\s+not|do\s+not|prohibited|forbidden|mandatory|required|ensure|avoid)\b/i;

function compileGuidelines(docText, docMetadata = {}) {
  const lines = docText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const candidates = [];
  let currentSection = docMetadata.original_name ? `Document: ${docMetadata.original_name}` : 'General Guidelines';
  let ruleCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect section headers
    if (line.length < 80 && (/^[0-9]+(\.[0-9]+)*\s+[A-Z]/i.test(line) || /^#+\s+[A-Z]/i.test(line) || /^[A-Z0-9\s—–:-]{4,60}$/.test(line))) {
      currentSection = line.replace(/^#+\s*/, '').replace(/:$/, '').trim();
      continue;
    }

    // Identify guideline requirement statement
    if (line.length >= 20 && MODAL_PATTERNS.test(line)) {
      let matchedCategory = 'General Brand Policy';
      let ruleType = 'deterministic_term';
      let severity = 'Medium';

      for (const cp of CATEGORY_PATTERNS) {
        if (cp.regex.test(currentSection) || cp.regex.test(line)) {
          matchedCategory = cp.category;
          ruleType = cp.ruleType;
          severity = cp.severity;
          break;
        }
      }

      if (/never|prohibited|forbidden|must not|zero tolerance|illegal/i.test(line)) {
        severity = 'High';
      }

      // Extract target pattern/quote if available
      const quotes = line.match(/["'“]([^"'“”]{2,50})["'”]/g);
      let pattern = null;
      let replacement = null;

      if (quotes && quotes.length >= 1) {
        pattern = quotes[0].replace(/["'“”]/g, '').trim();
        if (quotes.length >= 2) {
          replacement = quotes[1].replace(/["'“”]/g, '').trim();
        } else if (matchedCategory === 'Prohibited Terminology') {
          replacement = 'cost-effective / approved alternative';
        }
      }

      const words = line.split(/\s+/);
      const title = words.slice(0, 7).join(' ').replace(/[.,;:]$/, '') + '...';

      candidates.push({
        rule_code: `RULE-${String(ruleCounter).padStart(3, '0')}`,
        category: matchedCategory,
        title: title.length > 55 ? title.slice(0, 52) + '...' : title,
        description: line,
        rule_type: ruleType,
        pattern_or_phrase: pattern,
        replacement_or_guidance: replacement || line,
        severity,
        source_reference: currentSection,
        source_excerpt: line.length > 200 ? line.slice(0, 197) + '...' : line,
        extraction_method: 'deterministic_pattern',
        status: 'candidate'
      });

      ruleCounter++;
    }
  }

  // Fallback sentence breakdown if no structured lines were caught
  if (candidates.length === 0) {
    const sentences = docText.match(/[^.!?]+[.!?]+/g) || [docText];
    for (const s of sentences.slice(0, 5)) {
      const trimmed = s.trim();
      if (trimmed.length > 25) {
        candidates.push({
          rule_code: `RULE-${String(ruleCounter).padStart(3, '0')}`,
          category: 'General Brand Policy',
          title: trimmed.split(/\s+/).slice(0, 6).join(' '),
          description: trimmed,
          rule_type: 'deterministic_term',
          pattern_or_phrase: null,
          replacement_or_guidance: trimmed,
          severity: 'Medium',
          source_reference: currentSection,
          source_excerpt: trimmed,
          extraction_method: 'keyword_context',
          status: 'candidate'
        });
        ruleCounter++;
      }
    }
  }

  return candidates;
}

module.exports = {
  compileGuidelines
};
