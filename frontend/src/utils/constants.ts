/**
 * Single source of truth for cross-screen magic numbers.
 * Update here, propagate everywhere.
 */

/** Maximum secrets a single account can create per UTC day. */
export const DAILY_SECRET_LIMIT = 30;

/** Auth routes where the global Footer must be hidden so the form fits in one viewport. */
export const AUTH_ROUTES: readonly string[] = ['/login', '/signup', '/forgot-password'];

/** localStorage key for the user-chosen inactivity logout window (in minutes). */
export const SESSION_TIMEOUT_KEY = 'ns_session_timeout_minutes';

/** Default inactivity window when no preference has been saved yet. */
export const DEFAULT_SESSION_TIMEOUT_MINUTES = 15;

/** Allowed values for the inactivity window (must match SessionTimeout option set). */
export const SESSION_TIMEOUT_OPTIONS = ['5', '15', '60', '480'] as const;
export type SessionTimeoutOption = typeof SESSION_TIMEOUT_OPTIONS[number];

/** Approximate height of the sticky header. Used by viewport-fit auth screens. */
export const HEADER_HEIGHT_PX = 72;
