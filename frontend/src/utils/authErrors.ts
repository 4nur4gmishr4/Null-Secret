/**
 * Maps Firebase Auth error codes to friendly, plain-language messages.
 * Users should never see raw "Firebase: Error (auth/xxx)" strings.
 *
 * Reference: https://firebase.google.com/docs/reference/js/auth#autherrorcodes
 */

const FRIENDLY_AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'That email and password combination did not match our records. Please try again.',
  'auth/invalid-login-credentials': 'That email and password combination did not match our records. Please try again.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/user-not-found': 'No account was found with that email. Want to create one instead?',
  'auth/user-disabled': 'This account has been disabled. Contact support if you believe this is a mistake.',
  'auth/email-already-in-use': 'An account with this email already exists. Sign in instead, or use a different email.',
  'auth/invalid-email': 'That does not look like a valid email address.',
  'auth/weak-password': 'Please choose a stronger password (at least 6 characters).',
  'auth/missing-password': 'Please enter a password.',
  'auth/missing-email': 'Please enter your email address.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes before trying again.',
  'auth/network-request-failed': 'Network error. Please check your internet connection and try again.',
  'auth/requires-recent-login': 'For your security, please sign out and sign back in, then try again.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled before completing.',
  'auth/popup-blocked': 'Your browser blocked the sign-in pop-up. Please allow pop-ups for this site and try again.',
  'auth/cancelled-popup-request': 'Another sign-in attempt is already in progress.',
  'auth/account-exists-with-different-credential': 'An account already exists with this email but a different sign-in method. Try a different option.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled. Please contact support.',
  'auth/expired-action-code': 'That reset link has expired. Please request a new one.',
  'auth/invalid-action-code': 'That reset link is invalid or has already been used.',
  'auth/unauthorized-domain': 'This domain is not authorized for sign-in. Please contact support.',
  'auth/internal-error': 'Something went wrong on our side. Please try again in a moment.',
};

const AUTH_CODE_PATTERN = /\(auth\/([a-z-]+)\)/i;

/**
 * Extracts the Firebase auth error code from an unknown error value.
 * Firebase surfaces the code either on a 'code' property or embedded in
 * a message like "Firebase: Error (auth/invalid-credential)".
 */
function extractAuthCode(err: unknown): string | null {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === 'string' && code.startsWith('auth/')) {
      return code;
    }
  }
  if (err instanceof Error) {
    const match = err.message.match(AUTH_CODE_PATTERN);
    if (match) return `auth/${match[1]}`;
  }
  return null;
}

/**
 * Converts an unknown error thrown by Firebase Auth into a user-facing
 * message. Falls back to a generic copy so users never see raw
 * "Firebase: Error (...)" strings.
 */
export function friendlyAuthError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  const code = extractAuthCode(err);
  if (code && FRIENDLY_AUTH_MESSAGES[code]) {
    return FRIENDLY_AUTH_MESSAGES[code];
  }
  if (err instanceof Error && err.message && !err.message.includes('Firebase:')) {
    return err.message;
  }
  return fallback;
}
