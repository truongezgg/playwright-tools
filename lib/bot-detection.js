/**
 * Bot challenge / CAPTCHA detection.
 * Detects when a page returned a block/CAPTCHA instead of real content.
 */

const BOT_KEYWORDS = [
  // English
  'captcha',
  'verification',
  'verify you are human',
  'access denied',
  'blocked',
  'rate limit',
  'too many requests',
  'please enable javascript',
  'please verify',
  'solve the challenge',
  'select all squares',
  'robot or human',
  'are you a robot',
  // Chinese
  '请验证',
  '验证码',
  '人机验证',
  '安全验证',
  '访问被拒绝',
  // Google specific
  '/sorry/',
];

const STRONG_SIGNALS = [
  'captcha',
  'verify you are human',
  '验证码',
  '人机验证',
  '/sorry/',
  'solve the challenge',
  'select all squares',
];

/**
 * Check if text looks like a bot challenge page.
 * @param {string} text - Page text or HTML
 * @returns {boolean}
 */
export function looksLikeBotChallenge(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return BOT_KEYWORDS.some((k) => lower.includes(k));
}

/**
 * Analyze page for bot blocking with false-positive guard.
 * Returns blocked status and detected keywords.
 *
 * @param {string} text - Page text content
 * @param {boolean} hasRealContent - Whether page has actual results/content
 * @returns {{ blocked: boolean, keywords: string[] }}
 */
export function analyzeBlockedPage(text, hasRealContent = false) {
  if (!text) return { blocked: false, keywords: [] };

  const lower = text.toLowerCase();
  const detected = BOT_KEYWORDS.filter((k) => lower.includes(k));

  // False positive: page has real content alongside keyword mentions
  if (hasRealContent) {
    return { blocked: false, keywords: detected };
  }

  // Strong signal alone is enough
  const hasStrongSignal = STRONG_SIGNALS.some((k) => lower.includes(k));

  // Multiple weaker signals together
  const hasMultipleSignals = detected.length >= 2;

  return {
    blocked: hasStrongSignal || hasMultipleSignals,
    keywords: detected,
  };
}
