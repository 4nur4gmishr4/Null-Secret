import {
  DEFAULT_SESSION_TIMEOUT_MINUTES,
  SESSION_TIMEOUT_KEY,
  SESSION_TIMEOUT_OPTIONS,
  type SessionTimeoutOption,
} from './constants';

function isValidOption(value: unknown): value is SessionTimeoutOption {
  return typeof value === 'string' && (SESSION_TIMEOUT_OPTIONS as readonly string[]).includes(value);
}

/**
 * Reads the user-chosen inactivity logout window from localStorage.
 * Falls back to {@link DEFAULT_SESSION_TIMEOUT_MINUTES} on absence or invalid value.
 */
export function readSessionTimeoutMinutes(): number {
  if (typeof window === 'undefined') return DEFAULT_SESSION_TIMEOUT_MINUTES;
  try {
    const raw = window.localStorage.getItem(SESSION_TIMEOUT_KEY);
    if (isValidOption(raw)) {
      const parsed = parseInt(raw, 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  } catch {
    // localStorage unavailable (private mode, file:// origin); fall through.
  }
  return DEFAULT_SESSION_TIMEOUT_MINUTES;
}

/**
 * Persists the inactivity logout window. Validates against the allowed set so
 * stray values cannot poison the read path.
 */
export function writeSessionTimeoutMinutes(value: SessionTimeoutOption): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SESSION_TIMEOUT_KEY, value);
  } catch {
    // Ignore storage errors so the in-memory path still works.
  }
}
