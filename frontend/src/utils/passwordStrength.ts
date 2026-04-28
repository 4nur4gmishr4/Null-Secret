/**
 * Lightweight password strength estimator.
 *
 * Avoids the 650 KB zxcvbn bundle. Returns a 0-100 score and a categorical
 * label that the UI maps to a colour. The score is a deliberately conservative
 * heuristic, not a cryptographic crack-time estimator.
 */

export type StrengthLabel = 'empty' | 'weak' | 'fair' | 'good' | 'strong' | 'excellent';

export interface PasswordStrength {
  readonly score: number; // 0-100
  readonly label: StrengthLabel;
  readonly hints: readonly string[];
}

const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  'password', 'password1', '12345678', '123456789', 'qwerty', 'qwerty123',
  'abc123', 'iloveyou', 'admin', 'welcome', 'letmein', 'monkey', 'dragon',
  'master', 'sunshine', 'princess', '123123', 'baseball', 'football',
  '111111', '000000', '654321', 'access', 'shadow', 'superman', 'michael',
]);

const KEYBOARD_RUNS: readonly string[] = [
  'qwertyuiop', 'asdfghjkl', 'zxcvbnm',
  '1234567890', '0987654321',
];

interface CharsetSummary {
  readonly hasLower: boolean;
  readonly hasUpper: boolean;
  readonly hasDigit: boolean;
  readonly hasSymbol: boolean;
  readonly classes: number;
}

function summariseCharset(input: string): CharsetSummary {
  let hasLower = false;
  let hasUpper = false;
  let hasDigit = false;
  let hasSymbol = false;
  for (const ch of input) {
    if (ch >= 'a' && ch <= 'z') hasLower = true;
    else if (ch >= 'A' && ch <= 'Z') hasUpper = true;
    else if (ch >= '0' && ch <= '9') hasDigit = true;
    else hasSymbol = true;
  }
  return {
    hasLower,
    hasUpper,
    hasDigit,
    hasSymbol,
    classes: Number(hasLower) + Number(hasUpper) + Number(hasDigit) + Number(hasSymbol),
  };
}

function hasKeyboardRun(input: string): boolean {
  if (input.length < 4) return false;
  const lower = input.toLowerCase();
  for (const run of KEYBOARD_RUNS) {
    for (let i = 0; i <= run.length - 4; i++) {
      if (lower.includes(run.slice(i, i + 4))) return true;
    }
  }
  return false;
}

function hasRepeats(input: string): boolean {
  return /(.)\1{2,}/.test(input);
}

function isCommon(input: string): boolean {
  return COMMON_PASSWORDS.has(input.toLowerCase());
}

function labelFromScore(score: number, isEmpty: boolean): StrengthLabel {
  if (isEmpty) return 'empty';
  if (score < 25) return 'weak';
  if (score < 50) return 'fair';
  if (score < 70) return 'good';
  if (score < 90) return 'strong';
  return 'excellent';
}

export function estimatePasswordStrength(password: string): PasswordStrength {
  if (password.length === 0) {
    return { score: 0, label: 'empty', hints: [] };
  }

  const charset = summariseCharset(password);
  const hints: string[] = [];
  let score = 0;

  // Length contributes the largest share. Each extra character past 4 is worth 4 points up to length 20.
  if (password.length < 8) {
    hints.push('Use at least 8 characters.');
  }
  score += Math.min(80, Math.max(0, password.length - 4) * 4);

  // Character class diversity adds up to 20 points.
  score += (charset.classes - 1) * 5;
  if (!charset.hasUpper) hints.push('Add an uppercase letter.');
  if (!charset.hasDigit) hints.push('Add a number.');
  if (!charset.hasSymbol && password.length < 14) hints.push('Add a symbol or make it longer.');

  // Penalties for predictable patterns.
  if (isCommon(password)) {
    score = Math.min(score, 15);
    hints.push('This is one of the most leaked passwords. Pick something else.');
  }
  if (hasRepeats(password)) {
    score -= 10;
    hints.push('Avoid repeated characters like "aaaa".');
  }
  if (hasKeyboardRun(password)) {
    score -= 10;
    hints.push('Avoid keyboard runs like "qwerty" or "1234".');
  }

  // Reward unusually long passphrases even if they are simple.
  if (password.length >= 24 && charset.classes >= 2) {
    score = Math.max(score, 90);
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    label: labelFromScore(score, false),
    hints,
  };
}
