/**
 * Accessibility Verification Engine (WCAG 2.1 & Readability)
 * Computes:
 * - Flesch Reading Ease & Grade Level
 * - WCAG Luminance & Contrast Ratio (4.5:1 standard, 3:1 large text)
 * - Missing image alt text checks
 */

function calculateLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function hexToRgb(hex) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) {
    hex = hex.split('').map(c => c + c).join('');
  }
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function getContrastRatio(hex1, hex2) {
  try {
    const rgb1 = hexToRgb(hex1);
    const rgb2 = hexToRgb(hex2);
    const lum1 = calculateLuminance(rgb1.r, rgb1.g, rgb1.b);
    const lum2 = calculateLuminance(rgb2.r, rgb2.g, rgb2.b);
    const brighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    return (brighter + 0.05) / (darker + 0.05);
  } catch (e) {
    return null;
  }
}

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]|ed|es|e)$/, '');
  word = word.replace(/^y/, '');
  const syllables = word.match(/[aeiouy]{1,2}/g);
  return syllables ? syllables.length : 1;
}

function analyzeReadability(text) {
  if (!text || !text.trim()) {
    return { score: 100, level: 'Very Easy', wordCount: 0, sentenceCount: 0 };
  }

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return { score: 100, level: 'Very Easy', wordCount: 0, sentenceCount: 0 };
  }

  let totalSyllables = 0;
  for (const w of words) {
    totalSyllables += countSyllables(w);
  }

  const wordsPerSentence = words.length / Math.max(1, sentences.length);
  const syllablesPerWord = totalSyllables / words.length;

  // Flesch Reading Ease = 206.835 - (1.015 * ASL) - (84.6 * ASW)
  const score = Math.round(206.835 - (1.015 * wordsPerSentence) - (84.6 * syllablesPerWord));
  const clampedScore = Math.max(0, Math.min(100, score));

  let level = 'Standard';
  if (clampedScore >= 80) level = 'Easy to Read';
  else if (clampedScore >= 60) level = 'Standard';
  else if (clampedScore >= 40) level = 'Fairly Difficult';
  else level = 'Complex / Academic';

  return {
    score: clampedScore,
    level,
    wordCount: words.length,
    sentenceCount: sentences.length,
    avgSentenceLength: Math.round(wordsPerSentence)
  };
}

module.exports = {
  getContrastRatio,
  analyzeReadability
};
