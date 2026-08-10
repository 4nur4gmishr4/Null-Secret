// Copyright (c) 2026 Anurag Mishra. All Rights Reserved. PROPRIETARY AND CONFIDENTIAL.
/**
 * Single source of truth for cross-screen magic numbers.
 * Update here, propagate everywhere.
 */

/** Maximum secrets a single account can create per UTC day. */
export const DAILY_SECRET_LIMIT = 30;

/**
 * Maximum combined size of all attached files, in bytes. The recipient flow
 * stores the files as raw bytes, but transport base64-encodes them (~1.33x) and
 * the payload bundle base64-encodes again (~1.78x total), so 30MB of files
 * produces a ~53MB request body — the backend body cap (56MB) and stored-bundle
 * cap (48MB) are sized to match. Keep all three in sync.
 */
export const MAX_ATTACHMENT_BYTES = 30 * 1024 * 1024;

/** Auth routes where the global Footer must be hidden so the form fits in one viewport. */
export const AUTH_ROUTES: readonly string[] = ['/login', '/signup', '/forgot-password'];

/** localStorage key for the user-chosen inactivity logout window (in minutes). */
export const SESSION_TIMEOUT_KEY = 'ns_session_timeout_minutes';

/** Default inactivity window when no preference has been saved yet. */
export const DEFAULT_SESSION_TIMEOUT_MINUTES = 15;

/** Allowed values for the inactivity window (must match SessionTimeout option set). */
export const SESSION_TIMEOUT_OPTIONS = ['5', '15', '60', '480'] as const;
export type SessionTimeoutOption = typeof SESSION_TIMEOUT_OPTIONS[number];

/**
 * Approximate height of the sticky header. Used by viewport-fit auth screens.
 * ! Must stay in sync with `--header-h` in index.css.
 */
export const HEADER_HEIGHT_PX = 72;
