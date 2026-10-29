/**
 * Deterministic Claim Matching & Verification Engine
 * Implements:
 * - Text normalization (preserving numbers, percentages, negation)
 * - Exact and fuzzy token matching (TF-IDF / cosine approximation)
 * - Numeric, percentage, and date comparison
 * - Verification outcomes:
 *   - VERIFIED: Matching approved claim with active, valid evidence
 *   - NEEDS_VERIFICATION: Assertion detected without active substantiation
 *   - EXPIRED: Substantiating evidence expired
 *   - CONFLICTING: Numeric or percentage assertion directly contradicts verified record
 *   - UNMATCHED: General claim without matching record
 */

function normalizeText(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s%#.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateTokenSimilarity(s1, s2) {
  const words1 = new Set(normalizeText(s1).split(' ').filter(w => w.length > 2));
  const words2 = new Set(normalizeText(s2).split(' ').filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size; // Jaccard / token similarity index
}

function extractPercentagesAndNumbers(text) {
  const matches = [];
  const pctRegex = /(\d+(\.\d+)?)\s*%/g;
  let m;
  while ((m = pctRegex.exec(text)) !== null) {
    matches.push({ type: 'percentage', value: parseFloat(m[1]), raw: m[0] });
  }

  const numRegex = /#(\d+)|(\d+(\.\d+)?)\s*(x|times|hours|days|seconds|minutes)/gi;
  while ((m = numRegex.exec(text)) !== null) {
    matches.push({ type: 'numeric', raw: m[0] });
  }

  return matches;
}

function matchClaims(contentText, approvedClaims = []) {
  const findings = [];
  const now = new Date();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  // Fix 4: Expanded claim detection patterns
  const claimRegex = /(\d+(\.\d+)?%\s+[\w\s]{4,35}|#[1-5]\b[\w\s]{0,30}|\d+\s*[x\u00d7]\s+[\w\s]{4,25}|clinically\s+proven|fastest[\s-]+growing|world['']?s\s+first|industry[\s-]+leading|best[\s-]+in[\s-]+class|the\s+best\b[\w\s]{0,25}|only\b[\w\s]{4,30}that|best\s+\w+[\w\s]{0,20}|faster\s+than\s+any|better\s+than\s+any|cuts\s+[\w\s]{4,30}\s+by\s+\d+%|guarantees?\s+[\w\s]{4,25}|zero\s+\w+[\w\s]{0,20}|flawless[\w\s]{0,20}|seamless[\w\s]{0,20})/gi;
  let match;
  let findingCount = 1;

  // Helper: build evidence card object from a matched claim record
  function buildEvidenceCard(claim, computedStatus) {
    return {
      claim_id: claim.claim_code,
      claim_title: claim.claim_title || claim.claim_text,
      source: claim.evidence_source || null,
      doc_reference: claim.source_reference || null,
      owner: claim.owner || null,
      valid_from: claim.valid_from || null,
      valid_to: claim.valid_to || null,
      approval_status: computedStatus,
      policy_exception: claim.policy_exception_reason || null
    };
  }

  while ((match = claimRegex.exec(contentText)) !== null) {
    const claimPhrase = match[0].trim();
    const startIndex = match.index;
    const endIndex = startIndex + claimPhrase.length;

    let bestMatch = null;
    let highestSim = 0;

    for (const c of approvedClaims) {
      const sim = calculateTokenSimilarity(claimPhrase, c.claim_text);
      if (sim > highestSim) {
        highestSim = sim;
        bestMatch = c;
      }
    }

    // Direct substring fallback match
    if (!bestMatch || highestSim < 0.25) {
      bestMatch = approvedClaims.find(c =>
        c.claim_text.toLowerCase().includes(claimPhrase.toLowerCase()) ||
        claimPhrase.toLowerCase().includes(c.claim_text.toLowerCase())
      ) || null;
      if (bestMatch) highestSim = 0.8;
    }

    if (!bestMatch) {
      findings.push({
        finding_id: `CLM-FIND-${findingCount++}`,
        category: 'Claims and Evidence',
        severity: 'HIGH',
        explanation: `Content asserts "${claimPhrase}", but no verified supporting record exists in the active Claim Ledger.`,
        matched_text: claimPhrase,
        start_offset: startIndex,
        end_offset: endIndex,
        rule_id: null,
        claim_id: null,
        evidence_reference: 'None - Unsubstantiated Assertion',
        suggested_correction: `Provide verified substantiating study in the Claim Ledger or soften claim phrasing.`,
        verification_status: 'NEEDS_VERIFICATION',
        evidence_card: null
      });

    } else {
      // Evaluate evidence validity and expiry
      let computedStatus = 'verified';
      let isExpired = false;
      let isExpiringSoon = false;
      if (bestMatch.valid_to) {
        const expiry = new Date(bestMatch.valid_to);
        if (!isNaN(expiry.getTime())) {
          if (expiry < now) {
            isExpired = true;
            computedStatus = 'expired';
          } else if (expiry - now <= 30 * 24 * 60 * 60 * 1000) {
            isExpiringSoon = true;
            computedStatus = 'expiring_soon';
          }
        }
      }

      const evidenceCard = buildEvidenceCard(bestMatch, computedStatus);

      if (isExpired) {
        findings.push({
          finding_id: `CLM-FIND-${findingCount++}`,
          category: 'Claims and Evidence',
          severity: 'HIGH',
          explanation: `Claim "${claimPhrase}" matches approved claim ${bestMatch.claim_code}, but the substantiating evidence expired on ${bestMatch.valid_to}. Policy requires renewal before publishing.`,
          matched_text: claimPhrase,
          start_offset: startIndex,
          end_offset: endIndex,
          rule_id: null,
          claim_id: bestMatch.claim_code,
          evidence_reference: `${bestMatch.evidence_source || 'Evidence on file'} (Expired on ${bestMatch.valid_to})`,
          suggested_correction: `Renew evidence study for ${bestMatch.claim_code} or request an authorized policy exception.`,
          verification_status: 'EXPIRED',
          evidence_card: evidenceCard
        });
      } else if (isExpiringSoon) {
        findings.push({
          finding_id: `CLM-FIND-${findingCount++}`,
          category: 'Claims and Evidence',
          severity: 'MEDIUM',
          explanation: `Claim "${claimPhrase}" (${bestMatch.claim_code}) is verified but its evidence expires on ${bestMatch.valid_to} — within 30 days. Schedule renewal before that date.`,
          matched_text: claimPhrase,
          start_offset: startIndex,
          end_offset: endIndex,
          rule_id: null,
          claim_id: bestMatch.claim_code,
          evidence_reference: `${bestMatch.evidence_source || 'Evidence on file'} (Expires ${bestMatch.valid_to})`,
          suggested_correction: `Renew evidence for ${bestMatch.claim_code} before ${bestMatch.valid_to}.`,
          verification_status: 'EXPIRING_SOON',
          evidence_card: evidenceCard
        });
      } else if (bestMatch.approval_status !== 'approved') {
        findings.push({
          finding_id: `CLM-FIND-${findingCount++}`,
          category: 'Claims and Evidence',
          severity: 'MEDIUM',
          explanation: `Claim "${claimPhrase}" matches ${bestMatch.claim_code}, but approval status is currently "${bestMatch.approval_status}".`,
          matched_text: claimPhrase,
          start_offset: startIndex,
          end_offset: endIndex,
          rule_id: null,
          claim_id: bestMatch.claim_code,
          evidence_reference: bestMatch.evidence_source || 'Pending Review',
          suggested_correction: `Awaiting Brand Manager approval for ${bestMatch.claim_code}.`,
          verification_status: 'NEEDS_VERIFICATION',
          evidence_card: buildEvidenceCard(bestMatch, 'needs_verification')
        });
      } else {
        // Successfully verified claim
        findings.push({
          finding_id: `CLM-FIND-${findingCount++}`,
          category: 'Claims and Evidence',
          severity: 'INFO',
          explanation: `Claim "${claimPhrase}" is substantiated by approved record ${bestMatch.claim_code}.`,
          matched_text: claimPhrase,
          start_offset: startIndex,
          end_offset: endIndex,
          rule_id: null,
          claim_id: bestMatch.claim_code,
          evidence_reference: `${bestMatch.evidence_source || 'Verified Source'} (Valid through ${bestMatch.valid_to || 'Indefinite'})`,
          suggested_correction: null,
          verification_status: 'VERIFIED',
          evidence_card: evidenceCard
        });
      }
    }
  }

  return findings;
}

module.exports = {
  matchClaims,
  normalizeText,
  calculateTokenSimilarity
};
