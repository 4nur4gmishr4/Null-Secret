# Architecture

This document describes how Null-Secret is built, why it is built this way, and the invariants that every change must preserve.

---

## Table of Contents

- [Goals](#goals)
- [High-Level Topology](#high-level-topology)
- [Request Lifecycle](#request-lifecycle)
- [Cryptography](#cryptography)
- [Storage](#storage)
- [Rate Limiting & Concurrency](#rate-limiting--concurrency)
- [Authentication](#authentication)
- [Frontend Structure](#frontend-structure)
- [Component Hierarchy](#component-hierarchy)
- [Design System](#design-system)
- [Invariants](#invariants)

---

## Goals

1. **Zero-knowledge by default.** The server must never see plaintext.
2. **Ephemeral by default.** Storage is secondary; in-memory view counts and TTL are primary.
3. **No persistent identity tied to secrets.** User accounts exist for quota tracking only; secrets are not owned by a Firebase `uid`.
4. **Simple enough to audit.** A single reviewer should be able to trace a secret end-to-end in under an hour.
5. **Self-hostable.** One Go binary and one static bundle, no external services required beyond Firebase for optional auth.

---

## High-Level Topology

```
┌─────────────────────────┐        HTTPS         ┌──────────────────────────┐
│   Browser (SPA)         │ ───────────────────▶ │   Go API (chi router)    │
│   React 19 + Vite       │ ◀─────────────────── │   :8080                  │
│   Firebase Auth client  │        JSON          │   SQLite (WAL)           │
└───────┬─────────────────┘                      └────────┬─────────────────┘
        │                                                 │
        │ (Firebase SDK)                                  │ (local file I/O)
        ▼                                                 ▼
┌─────────────────────────┐                      ┌──────────────────────────┐
│   Firebase Auth         │                      │   nullsecret.db          │
│   Firestore             │                      │   backup.db (5 min)      │
└─────────────────────────┘                      └──────────────────────────┘
```

- **Browser** does AES encryption, holds the decryption key in `window.location.hash`.
- **Go API** stores ciphertext, hashes admin keys, enforces rate limits, ships CSP/HSTS headers.
- **Firebase** handles user identity and per-user history. Completely optional for the core share-a-secret flow.
- **SQLite** persists ciphertext so a process restart does not vaporise every in-flight secret.

The SPA is served as a static bundle by any CDN (Vercel in our deployment). It talks to the Go API over CORS-allowed HTTPS; the API never calls Firebase.

---

## Request Lifecycle

### Creating a secret

```
User types message ─▶ frontend/src/pages/Home.tsx
  │
  ├─▶ generateKey()                          (crypto.subtle, AES-256-GCM)
  ├─▶ encrypt(text, key)                     (pads to 1 KB / 5 KB / 10 KB bucket)
  ├─▶ bundle(payload, iv, salt)              (base64 JSON envelope)
  │
  ├─▶ POST /api/v1/secret { payload, expiry, viewLimit }
  │     │
  │     ├─▶ CORS, rate-limit, concurrency middleware
  │     ├─▶ encryptPayload(data, masterKey)  (second layer, at rest)
  │     ├─▶ generateID() + generateAdminKey()
  │     ├─▶ hashAdminKey(adminKey)
  │     └─▶ INSERT INTO secrets (...)
  │
  └─▶ Response: { id, adminKey }

Final URL the user shares:
https://null-secret.app/v/{id}#{bundle}
                               └── never sent to server ──┘
```

### Viewing a secret

```
Recipient opens link ─▶ frontend/src/pages/ViewSecret.tsx
  │
  ├─▶ GET /api/v1/secret/{id}
  │     │
  │     ├─▶ BEGIN TRANSACTION
  │     ├─▶ SELECT ... WHERE id = ?
  │     ├─▶ if expired: DELETE, return 410 Gone
  │     ├─▶ views++
  │     ├─▶ if views >= viewLimit: DELETE
  │     ├─▶ else: UPDATE views
  │     ├─▶ COMMIT
  │     └─▶ decryptPayload(data, masterKey)
  │
  ├─▶ Response: { payload, views, viewLimit }
  │
  ├─▶ unbundle(hash)
  ├─▶ importKey(bundle.key)        (or deriveKeyFromPassword if password-protected)
  ├─▶ decrypt(payload, iv, key)
  └─▶ unpad() ─▶ display plaintext
```

### Burning a secret early

```
Creator visits /admin/{id} ─▶ frontend/src/pages/AdminDashboard.tsx
  │
  ├─▶ GET /api/v1/secret/{id}/info
  │     └─▶ returns views + limit + expiry
  │
  └─▶ DELETE /api/v1/secret/{id}   (with X-Admin-Key header)
        │
        ├─▶ validateAdminKey(storedHash, providedKey)  (constant-time)
        └─▶ DELETE FROM secrets WHERE id = ?
```

---

## Cryptography

### Client side (`frontend/src/utils/crypto.ts`)

- **Algorithm:** AES-256-GCM via `window.crypto.subtle`.
- **Key derivation (password mode):** PBKDF2-SHA256, 600 000 iterations, 16-byte salt (minimum enforced in code), 32-byte derived key.
- **IV:** 12 bytes, generated per-message via `crypto.getRandomValues`.
- **Padding:** Envelope `{ d: text, p: padding }` is stringified, then `pad()` grows `p` to reach the nearest bucket size: 1 KB, 5 KB, 10 KB, or the next multiple of 10 KB if the envelope already exceeds 10 KB.
- **Bundle:** The fragment is a base64-encoded JSON `{ p, i, s? }` where `p` = payload, `i` = IV, `s` = salt (only present in password mode).

### Server side (`backend/internal/store/storage.go`)

- **Algorithm:** AES-256-GCM with a server-side master key.
- **Nonce:** 12-byte, generated per-record via `crypto/rand.Read`.
- **Version prefix:** `v1:` bytes prepended to the ciphertext. `decryptPayload` fails if the prefix is missing — there is no silent fallback.
- **Master key source:** `MASTER_KEY` env var (32 bytes, hex-encoded). If unset, a random key is generated each boot and secrets written before the restart become unrecoverable.
- **Admin key hash:** SHA-256 over the random admin token. Comparison uses `crypto/subtle.ConstantTimeCompare` inside `validateAdminKey`.
- **Super-admin comparison:** The same constant-time function is used for the `SUPER_ADMIN_KEY` env var.

### Why two layers of encryption

The client-side layer (key in URL fragment) is the primary defence: even if the server is compromised, the attacker cannot read plaintext.

The server-side layer (`MASTER_KEY`) protects the SQLite file on disk. If a backup tape leaks or the disk image is exfiltrated, the attacker still needs the master key to read ciphertext. Defence in depth.

---

## Storage

`backend/internal/store/storage.go` owns the data layer.

### Schema

```sql
CREATE TABLE IF NOT EXISTS secrets (
    id          TEXT PRIMARY KEY,
    admin_key   TEXT,                    -- SHA-256 hash of the admin token
    data        BLOB,                    -- "v1:" || AES-GCM ciphertext
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at  DATETIME,
    view_limit  INTEGER,
    views       INTEGER DEFAULT 0
);
CREATE INDEX idx_expires_at ON secrets(expires_at);
CREATE INDEX idx_created_at ON secrets(created_at);
```

### PRAGMAs

```sql
PRAGMA journal_mode = WAL;        -- concurrent readers + one writer
PRAGMA synchronous = NORMAL;      -- survives OS crash, not power loss
PRAGMA busy_timeout = 5000;       -- 5-second wait before returning SQLITE_BUSY
```

### Workers

Three goroutines spin up in `NewStorage` and tear down on `Close()`:

1. **Rate-limiter cleanup** — every 5 minutes, prunes stale IP entries from the in-memory token buckets.
2. **TTL worker** — every 60 seconds, deletes rows where `expires_at < CURRENT_TIMESTAMP`.
3. **Backup worker** — every 5 minutes, runs `VACUUM INTO '<BACKUP_DIR>/backup.db'` with quote-escaping applied to the path.

### Capacity controls

- Hard cap of **1000 secrets** per database; when hit, the oldest 10 rows are evicted.
- Per-payload cap of **1 MB** at the storage layer and **1 MB** at the HTTP request layer (`http.MaxBytesReader`).

---

## Rate Limiting & Concurrency

Three layers in `backend/internal/api/handlers.go`:

| Layer | Limit | Key | Response |
|---|---|---|---|
| Global token bucket | 100 req/s, burst 100 | process-wide | `429 global rate limit exceeded` |
| Per-IP sliding window | 20 req/min | `clientIP()` | `429 rate limit exceeded` |
| Concurrency semaphore | 100 in-flight | process-wide | `503 server at capacity` |

`clientIP()` strips the TCP port from `r.RemoteAddr`. IPv6 addresses are collapsed to a `/64` prefix so a single attacker cannot rotate ports or suffixes to evade.

---

## Authentication

Firebase Auth handles identity. The backend is **auth-agnostic** for the secret lifecycle — any browser can create or read a secret. Authentication only powers:

- Daily quota tracking (Firestore `usage/{uid}/daily/{date}`)
- Activity history (Firestore `users/{uid}/history`)
- The `ProtectedRoute` wrapper in `frontend/src/App.tsx` that forces sign-in for `/app`, `/history`, `/security/*`, `/account`

The admin endpoints (`/api/v1/admin/*`) use a static `SUPER_ADMIN_KEY` header, not Firebase.

**Firebase auth errors** are translated to plain-language strings by `frontend/src/utils/authErrors.ts` so users never see `Firebase: Error (auth/invalid-credential)`.

---

## Frontend Structure

```
src/
├── App.tsx                  Routes + ProtectedRoute guard
├── main.tsx                 React entry
├── index.css                Design tokens + utility classes
│
├── contexts/
│   ├── ThemeContext.tsx     light / dark / system with localStorage
│   └── ToastContext.tsx
│
├── layouts/
│   └── Layout.tsx           Sticky header, hamburger, footer, auto-logout
│
├── components/              Shared UI primitives (see next section)
├── pages/                   Route components (16 files)
└── utils/                   crypto, firebase, api, csv, constants
```

- Routes are lazy-loaded (`React.lazy`) so the landing page does not pay for code it does not need.
- `ProtectedRoute` subscribes to `onAuthStateChanged` and shows a small spinner while Firebase resolves the initial state, then either renders the children or redirects to `/login`.
- `Layout.tsx` owns the global chrome and the inactivity-based auto-logout effect (mouse/keyboard/touch/scroll reset a deadline timer).

---

## Component Hierarchy

```
AuthLayout                  (two-panel wrapper, noise SVG hero)
├── NoiseBackground
├── GoogleSignInButton       (shared across Authscreen and Signup)
└── PasswordInput            (show/hide toggle)
   └── used by Authscreen, Signup

SecurityPageHeader          (lottie + eyebrow + title + optional aside)
   ├── LottieView
   └── used by SecuritySettings, SessionTimeout, DeviceSessions,
              UsageHistory, AccountSettings, TwoFactorSetup,
              BiometricSetup, DestroyVault

BackLink                    (uniform "Back to …" underline link)
   └── used by SecuritySettings, DeviceSessions, TwoFactorSetup,
              BiometricSetup

Footer                      (4 columns + bottom bar)
Layout                      (header + main + conditional Footer)
ErrorBoundary
Preloader                   (column-wipe splash)
InViewLottie                (viewport-aware lottie loader)
LottieView                  (ESM interop shim)
FileDropzone                (drag-and-drop multi-file)
Skeleton
DecryptedText               (scramble-reveal animation)
```

---

## Design System

Defined in `frontend/src/index.css`.

### Tokens

CSS variables switched by adding/removing `.dark` on `<html>`:

```css
--bg-primary, --bg-secondary, --bg-elevated
--text-primary, --text-secondary, --text-tertiary
--border-default, --border-strong
--accent, --accent-hover, --accent-subtle
--surface-danger, --text-danger
--surface-success, --text-success
--font-sans, --font-mono, --font-logo
--header-h: 72px
```

### Utility classes

Prefer these over re-assembling Tailwind stacks:

| Class | Purpose |
|---|---|
| `.label` | 11 px bold tracked uppercase tertiary-colour label |
| `.eyebrow-label` | 10 px bold tracked-[0.4em] uppercase eyebrow above page titles |
| `.section-title` | 12 px bold tracked-widest uppercase section heading |
| `.caps-button` | Capsule-style micro button text |
| `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost` | Button system |
| `.surface`, `.surface-muted` | Card backgrounds |
| `.error-banner` | Red-filled banner |
| `.feature-card` | Lifted card with hover state |
| `.info-row` | Padded, bordered horizontal row |
| `.link-display` | Mono-font, user-select:all link box |
| `.mono` | Apply mono font |
| `.font-logo` | Apply Savery display font |
| `.lift` | Opt-in hover transform (−2 px) |
| `.fade-in`, `.slide-up` | Entrance animations |
| `.menu-open`, `.menu-close` | Mobile menu animations |

Radius is forcibly set to `0` globally (`*,*::before,*::after { border-radius: 0 !important; }`) to keep the sharp, no-rounded-corners aesthetic. Do not fight it.

---

## Invariants

These properties must hold after every change. Reviewers should reject patches that break them.

1. The URL fragment (`#…`) is never serialised to the server.
2. `crypto.subtle.ConstantTimeCompare` is the only way secrets are compared in Go. No `==`, no `bytes.Equal` on credentials.
3. `decryptPayload` fails if the `v1:` prefix is missing. There is no plaintext fallback.
4. Admin keys are stored hashed. The validator does not accept plaintext keys.
5. The backend never logs request bodies, Firebase user ids, or URL fragments.
6. Firebase auth errors are always passed through `friendlyAuthError`; raw `Firebase: Error (...)` strings never reach the UI.
7. Binaries (`*.exe`), SQLite files (`*.db*`), and `.env.*` files (except `.env.example`) are never committed.
8. Every public Go function has a doc comment starting with the identifier name.
9. New TypeScript code is free of `any` outside explicitly-justified interop shims.
10. Shared UI primitives (`AuthLayout`, `SecurityPageHeader`, `BackLink`, `PasswordInput`, `GoogleSignInButton`, `NoiseBackground`) are reused; new pages do not duplicate their markup.
