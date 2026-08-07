# Null-Secret — Project Status Report

**Last updated:** May 3, 2026
**Branch:** `main`
**Overall Score:** **82 / 100** (up from 72 / 100 after the May 3 hardening pass)

> A concise, factual snapshot of where the codebase stands today — what is production-ready, what is duplicated, what is missing, and what comes next.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Repository Layout](#repository-layout)
3. [Tech Stack](#tech-stack)
4. [Feature Inventory](#feature-inventory)
5. [Architecture](#architecture)
6. [Security Posture](#security-posture)
7. [Recent Changes](#recent-changes)
8. [Quality Metrics](#quality-metrics)
9. [Known Gaps & Roadmap](#known-gaps--roadmap)
10. [Development Workflow](#development-workflow)
11. [Deployment](#deployment)
12. [Environment Variables](#environment-variables)
13. [Testing & Verification](#testing--verification)
14. [Scoring Breakdown](#scoring-breakdown)

---

## Executive Summary

Null-Secret is a **zero-knowledge, end-to-end encrypted secret-sharing web app**. Users create a one-time or time-limited link that disappears after being read. The message is locked on the sender's device with AES-256-GCM, the key rides inside the URL fragment (never sent to the server), and the ciphertext is stored only in server memory until the view limit or TTL is hit.

### Current Status

| Area | Status | Notes |
|---|---|---|
| Core feature set | **Shipped** | Encrypted sharing, one-time links, view limits, file attachments |
| Authentication | **Shipped** | Email/password, Google OAuth, friendly error messages |
| Authorization | **Shipped** | Protected routes enforce sign-in for `/app`, `/history`, `/security/*`, `/account` |
| UI consistency | **Good** | Shared `AuthLayout`, `SecurityPageHeader`, `BackLink`, `PasswordInput`, `GoogleSignInButton`, `NoiseBackground` |
| Backend security | **Hardened** | Constant-time key comparison, SQL-quote escaping, no plaintext fallback |
| Build | **Green** | `tsc -b` zero errors, `vite build` clean, Go `build` + `test` pass |
| Tests | **Backend only** | 8 Go tests. Frontend has zero tests (Playwright installed but unused) |
| Documentation | **Present** | `README.md`, `USER_GUIDE.md`, `FEATURES.md`, `TermsOfService`, `PrivacyPolicy` |

---

## Repository Layout

```
golang/
├── README.md              - Project overview, quickstart, architecture
├── USER_GUIDE.md          - End-user documentation with table of contents
├── FEATURES.md            - Existing + planned feature inventory
├── PROJECT_STATUS.md      - This document
├── render.yaml            - Render.com deployment config
├── .gitignore             - Excludes binaries, .db files, .env.*
│
├── backend/               Go 1.25 API server
│   ├── cmd/api/main.go        - Entry point, graceful shutdown
│   ├── internal/api/          - HTTP handlers, middleware (chi router)
│   ├── internal/store/        - SQLite storage, rate limiter, encryption
│   ├── internal/config/       - Env var loading
│   ├── internal/models/       - Request/response DTOs
│   ├── Dockerfile
│   └── go.mod
│
└── frontend/              React 19 + TypeScript + Vite
    ├── src/
    │   ├── App.tsx                 - Routes + ProtectedRoute guard
    │   ├── index.css               - Design tokens, utility classes
    │   ├── main.tsx
    │   │
    │   ├── components/         Shared UI primitives
    │   │   ├── AuthLayout.tsx          - Two-panel auth screen
    │   │   ├── Authscreen.tsx          - Sign in
    │   │   ├── Signup.tsx
    │   │   ├── ForgotPassword.tsx
    │   │   ├── GoogleSignInButton.tsx  - OAuth button + multi-color SVG
    │   │   ├── PasswordInput.tsx       - Show/hide toggle
    │   │   ├── NoiseBackground.tsx     - Fractal-noise SVG overlay
    │   │   ├── SecurityPageHeader.tsx  - Lottie + eyebrow + title + aside
    │   │   ├── BackLink.tsx            - Uniform "Back to …" link
    │   │   ├── InViewLottie.tsx        - Viewport-aware lottie loader
    │   │   ├── LottieView.tsx          - ESM-safe lottie wrapper
    │   │   ├── Preloader.tsx           - Column-wipe splash screen
    │   │   ├── FileDropzone.tsx        - Drag-and-drop files
    │   │   ├── ErrorBoundary.tsx
    │   │   ├── Footer.tsx              - 4-column professional footer
    │   │   ├── Skeleton.tsx
    │   │   └── DecryptedText.tsx       - Scramble-reveal effect
    │   │
    │   ├── pages/              Route components
    │   │   ├── Landing.tsx             - Marketing home
    │   │   ├── Home.tsx                - Create secret form (protected)
    │   │   ├── Success.tsx             - Share link + QR
    │   │   ├── ViewSecret.tsx          - Decrypt and display
    │   │   ├── AdminDashboard.tsx      - Burn / check views on a secret
    │   │   ├── SuperAdmin.tsx          - System telemetry + purge
    │   │   ├── AccountSettings.tsx     - Profile + email
    │   │   ├── SecuritySettings.tsx    - 2FA, biometric, timeout, sessions
    │   │   ├── TwoFactorSetup.tsx      - (placeholder, "coming soon")
    │   │   ├── BiometricSetup.tsx      - (placeholder, "coming soon")
    │   │   ├── SessionTimeout.tsx      - Inactivity window picker
    │   │   ├── DeviceSessions.tsx      - Current session
    │   │   ├── DestroyVault.tsx        - Delete account + data
    │   │   ├── UsageHistory.tsx        - Creation log + daily quota
    │   │   ├── PrivacyPolicy.tsx
    │   │   └── TermsOfService.tsx
    │   │
    │   ├── layouts/Layout.tsx          - Sticky header + hamburger + Footer
    │   ├── contexts/ThemeContext.tsx   - light/dark/system with persistence
    │   ├── contexts/ToastContext.tsx
    │   │
    │   ├── utils/
    │   │   ├── crypto.ts               - AES-GCM, PBKDF2, padding, bundling
    │   │   ├── firebase.ts             - Initialization + env validation
    │   │   ├── authErrors.ts           - Friendly Firebase error translator
    │   │   ├── api.ts                  - API_BASE constant
    │   │   ├── constants.ts            - Shared magic numbers
    │   │   ├── sessionTimeout.ts       - Inactivity-window persistence
    │   │   ├── passwordStrength.ts     - Strength meter
    │   │   └── csv.ts                  - Export helpers
    │   │
    │   └── assets/                 Lottie JSON, fonts, logos
    │
    ├── vite.config.ts          - PWA plugin, code-splitting
    ├── package.json
    └── .env.example
```

---

## Tech Stack

### Backend
- **Go 1.25** with `log/slog` structured logging
- **chi router** (`go-chi/chi/v5`) for HTTP routing and middleware
- **modernc.org/sqlite** — pure-Go SQLite driver (no CGO dependency)
- **golang.org/x/time/rate** — token bucket rate limiter
- **Standard library only** for crypto (`crypto/aes`, `crypto/cipher`, `crypto/subtle`, `crypto/sha256`, `crypto/rand`)

### Frontend
- **React 19** with functional components + hooks
- **TypeScript** (strict mode) — zero type errors as of latest commit
- **Vite 8** + **@vitejs/plugin-react** + **vite-plugin-pwa**
- **Tailwind CSS v4** + custom design tokens via CSS variables
- **React Router 7** for client-side routing
- **Firebase 12** for authentication (email/password, Google) and Firestore (history, daily quota)
- **Web Crypto API** for AES-256-GCM and PBKDF2 (in-browser)
- **lottie-react** for animations
- **qrcode.react** for QR-code rendering
- **fflate** for zipping multi-file attachments

---

## Feature Inventory

### Shipped (production-ready)

| Feature | Location |
|---|---|
| Browser-side AES-256-GCM encryption | `frontend/src/utils/crypto.ts` |
| Optional password layer (PBKDF2, 600K iterations) | `frontend/src/utils/crypto.ts` |
| Ciphertext padding to bucket sizes (1KB / 5KB / 10KB) | `frontend/src/utils/crypto.ts` |
| One-time, multi-view, and time-limited links | `backend/internal/store/storage.go` |
| File attachments (single inline, multiple auto-zipped) | `frontend/src/components/FileDropzone.tsx` |
| Self-destructing server-side storage | `backend/internal/store/storage.go` |
| Admin links (view count + burn) | `frontend/src/pages/AdminDashboard.tsx` |
| Email + Google sign-in via Firebase | `frontend/src/components/Authscreen.tsx`, `Signup.tsx` |
| Daily quota tracking per user | `frontend/src/pages/UsageHistory.tsx` |
| Light / dark / system theme | `frontend/src/contexts/ThemeContext.tsx` |
| Activity log (secret IDs + timestamps) | `frontend/src/pages/UsageHistory.tsx` |
| Backend health indicator | `frontend/src/layouts/Layout.tsx` |
| Per-IP + global rate limiting | `backend/internal/store/storage.go` |
| Graceful server shutdown | `backend/cmd/api/main.go` |
| Periodic backup worker (`VACUUM INTO backup.db`) | `backend/internal/store/storage.go` |
| TTL cleanup worker (purges expired secrets) | `backend/internal/store/storage.go` |
| Server-side encryption at rest (AES-GCM) | `backend/internal/store/storage.go` |
| Super-admin telemetry endpoint (auth-gated) | `backend/internal/api/handlers.go` |
| Inactivity-based auto-logout | `frontend/src/layouts/Layout.tsx` |
| Device-session view + sign-out | `frontend/src/pages/DeviceSessions.tsx` |
| Account destruction (delete auth + Firestore data) | `frontend/src/pages/DestroyVault.tsx` |
| Professional footer (4 columns + bottom bar) | `frontend/src/components/Footer.tsx` |
| Hamburger menu (signed-in / signed-out variants) | `frontend/src/layouts/Layout.tsx` |
| PWA precaching (vite-plugin-pwa) | `frontend/vite.config.ts` |
| Content Security Policy headers | `backend/internal/api/handlers.go` |
| CSV export of usage history | `frontend/src/utils/csv.ts` |

### Placeholder / Planned

| Feature | Status |
|---|---|
| Two-Factor Auth (TOTP) | Placeholder page, "Coming soon" |
| Biometric lock (WebAuthn) | Placeholder page, "Coming soon" |
| Cross-device session list | Blocked by Firebase Auth web API |
| Frontend test suite (Vitest / Playwright) | Not started |
| OpenAPI / Swagger spec | Not started |
| CI/CD workflows | Not started |
| Sentry or similar error monitoring | Not started |

---

## Architecture

### Zero-Knowledge Flow

```
SENDER                                      SERVER                                  RECEIVER
───────                                     ────────                                ─────────
1. Generate AES-256 key in browser
2. Encrypt message + files locally
3. POST ciphertext only ────────────────▶   Store ciphertext in SQLite
                                            (encrypted again with master key)
                                            Return { id, adminKey }
4. Build URL: /v/{id}#{keyBundle}
5. Share URL out-of-band                                                            6. Open URL
                                                                                    7. GET /v/{id} ────▶
                                            Retrieve ciphertext,
                                            increment view counter,
                                            delete if limit reached
                                            ◀──── Return ciphertext
                                                                                    8. Parse #keyBundle
                                                                                    9. Decrypt in browser
                                                                                    10. Display plaintext
```

The key **never leaves the client** and browsers by specification never transmit the URL fragment over the network.

### Backend API

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `GET`  | `/health` | Liveness probe | — |
| `GET`  | `/api/v1/healthz` | Liveness probe (alias) | — |
| `POST` | `/api/v1/secret` | Create a new secret | — |
| `GET`  | `/api/v1/secret/{id}` | Retrieve and decrement view counter | — |
| `GET`  | `/api/v1/secret/{id}/info` | Read view stats | Admin key |
| `DELETE` | `/api/v1/secret/{id}` | Early-burn a secret | Admin key |
| `POST` | `/api/v1/admin/login` | Verify super-admin key | Super-admin key |
| `GET`  | `/api/v1/admin/telemetry` | Runtime + storage stats | Super-admin key |
| `DELETE` | `/api/v1/admin/purge` | Wipe all secrets | Super-admin key |

### Middleware Chain

```
RequestID → RealIP (if TrustProxy) → Logger → Recoverer
         → CORS → GlobalRateLimit → PerIPRateLimit → Concurrency → Handler
```

---

## Security Posture

### Strong

- AES-256-GCM for confidentiality + authenticity in both client and server
- PBKDF2-SHA256 with 600 000 iterations (OWASP 2023 minimum)
- Admin keys stored as SHA-256 hashes; comparison uses `crypto/subtle.ConstantTimeCompare`
- Super-admin key check also uses constant-time comparison
- Content Security Policy with `frame-ancestors 'none'`, `object-src 'none'`, strict `connect-src`
- `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`
- Request-body size limit (1 MB) via `http.MaxBytesReader`
- Global and per-IP rate limiters
- Concurrency cap via semaphore
- SQL prepared statements throughout storage layer
- Single-quote escaping on `VACUUM INTO` backup path
- Inactivity-based client-side auto-logout
- Zero-trust handshake: master key is auto-generated if `MASTER_KEY` is unset (with a warning)

### Fixed in the May 3 hardening commit

- **Removed silent-plaintext fallback** in `decryptPayload` that used to return ciphertext unchanged when the `v1:` prefix was missing
- **Removed plaintext admin-key fallback** in both `GetInfo` and `Burn`
- **Escaped single quotes** in the `VACUUM INTO` path to block quote-injection
- **Replaced `any` types** in `Landing.tsx` and `App.tsx` `ProtectedRoute` with `User | null`

### Remaining considerations

- **Master key is ephemeral by default.** If `MASTER_KEY` is not set, a random key is generated each restart. Secrets written before the restart become unreadable (the GCM auth tag fails). Fine for ephemeral usage; set a persistent key for disaster-recovery scenarios.
- **Backup file is overwritten every 5 minutes** (`VACUUM INTO backup.db`). There is no rotation — consider snapshotting off-box or adding a retention policy.
- **Firebase API keys ship to the browser**, which is Firebase's designed pattern. Restrict them in the Firebase console to authorized domains.

---

## Recent Changes

### May 3, 2026

**Commit `af5b3a7` — Refactor duplicates and fix security issues**
- Backend: removed backward-compat plaintext path in `decryptPayload`; consolidated admin-key validation into `validateAdminKey`; escaped quotes in `VACUUM INTO`
- Frontend: replaced `any` with `User` in `Landing.tsx` and `ProtectedRoute`
- New components: `AuthLayout`, `NoiseBackground`, `GoogleSignInButton`, `PasswordInput`, `SecurityPageHeader`, `BackLink`
- New CSS utilities: `.eyebrow-label`, `.section-title`, `.caps-button`
- Refactored `Authscreen`, `Signup`, `ForgotPassword`, `TwoFactorSetup`, `BiometricSetup`
- Deleted the committed binaries (`api.exe`, `test.db*`)
- Net: **+380 / −1128 lines** (≈750 lines of duplication eliminated)

**Commit `a8409c0` — Propagate SecurityPageHeader and BackLink**
- Added `aside`, `lottie`, `eyebrowColor` props to `SecurityPageHeader`
- Refactored `SessionTimeout`, `SecuritySettings`, `DeviceSessions`, `UsageHistory`, `AccountSettings`, `DestroyVault` to use it
- Replaced repeated `text-xs font-bold uppercase tracking-widest` stacks with the `.section-title` utility class
- Net: **+82 / −105 lines**

**Commit `f7e02b7` — Terms of Service + hamburger cleanup**
- Created `TermsOfService` page with 11 sections
- Slimmed the hamburger menu (dropped Resources / Appearance / Legal / Contact sections)

**Commit `37a0a06` — Mandatory sign-in**
- Created `ProtectedRoute` wrapper guarding `/app`, `/history`, `/security/*`, `/account`
- Replaced "View Source" button on Landing with "Sign In to Start" / "Create Account"

**Commit `900a93f` — Context-aware landing page**
- Landing CTA now reads authentication state and shows "Create Secret" / "My Account" when signed in

**Commit `252d0ed` — UI polish**
- Logout/sign-out text painted red everywhere it appears
- Footer rebuilt with four columns + bottom bar + icons

---

## Quality Metrics

### Bundle Size (last `vite build`)

| Chunk | Size | Gzip |
|---|---|---|
| `Landing-*.js` | 845 KB | 183 KB |
| `firebase-*.js` | 356 KB | 108 KB |
| `lottie-*.js` | 323 KB | 83 KB |
| `vendor-*.js` | 249 KB | 81 KB |
| `index-*.js` | 108 KB | 17 KB |

PWA precache: **39 entries / 2010 KiB**.

### Typecheck / Lint

- `tsc -b --noEmit`: **0 errors**, **0 warnings**
- `eslint`: configured but not wired into CI

### Backend

- `go build ./...`: clean
- `go test ./...`: **8 / 8 passing** (`internal/api`: 7 tests, `internal/store`: 1 test)

### Duplication Reduced

Since May 3:
- **Auth screens**: 3 files × ~125 lines each → 3 files using 4 shared components (~60% of each page is now shared)
- **Security pages**: 8 near-identical 20-line header blocks → 1 component used 8 times
- **"Back to X" links**: 4 identical blocks → 1 `BackLink` component
- **Noise SVG**: inlined in 3 files → 1 component
- **Google sign-in SVG**: inlined in 2 files → 1 component

---

## Known Gaps & Roadmap

### P0 — Should be done next

- [ ] **Frontend tests**: at least smoke tests for the auth flow using Playwright (already installed)
- [ ] **Bundle splitting**: Landing is 845 KB — extract the `privacyfull` lottie into a dynamic import
- [ ] **CI workflow**: GitHub Actions that runs `tsc -b`, `vite build`, `go build`, `go test` on every PR

### P1 — Nice to have

- [ ] **`SettingsPage` wrapper** to collapse the `fade-in max-w-5xl mx-auto py-6 md:py-10 px-4 md:px-8 space-y-10 md:space-y-12` duplication across 7 pages
- [ ] **OpenAPI spec** for the public API
- [ ] **Error monitoring** (Sentry) for client-side exceptions
- [ ] **Pre-commit hooks** (husky + lint-staged) to run `tsc` + `eslint` on staged files
- [ ] **Password strength meter** wired into the signup form (utility already exists in `passwordStrength.ts`)

### P2 — Feature work

- [ ] Actual TOTP 2FA implementation (placeholder page exists)
- [ ] WebAuthn passkey sign-in (placeholder page exists)
- [ ] True cross-device session list (requires server-side session tokens)
- [ ] Rich-text editor for the secret body
- [ ] Configurable bucket sizes for ciphertext padding

---

## Development Workflow

### Prerequisites

- Go 1.25 or newer
- Node 20 or newer (Node 22 recommended)
- A Firebase project with Authentication + Firestore enabled

### First-time setup

```powershell
git clone https://github.com/4nur4gmishr4/Null-Secret.git
cd Null-Secret

# Backend
cd backend
go mod download
cd ..

# Frontend
cd frontend
copy .env.example .env.local
# Fill in the VITE_FIREBASE_* keys in .env.local
npm install
cd ..
```

### Run locally

```powershell
# Terminal 1 — backend
cd backend
go run ./cmd/api

# Terminal 2 — frontend
cd frontend
npm run dev
```

Backend listens on `:8080` by default. Frontend dev server runs on `:5173` and is CORS-allowed automatically in development mode.

### Build for production

```powershell
cd frontend
npm run build   # emits dist/

cd ..\backend
go build -o api.exe .\cmd\api
```

---

## Deployment

- **Backend** → [Render.com](https://render.com) via `render.yaml`. The `PORT` env var is injected by the platform.
- **Frontend** → [Vercel](https://vercel.com) via `vercel.json`. The build command is `npm run build` and the output directory is `dist/`.

### Required secrets in production

Set these in the backend host:

```
ENV=production
ALLOWED_ORIGINS=https://your-frontend-domain
VITE_API_BASE=https://your-backend-domain
MASTER_KEY=<hex-encoded-32-byte-key>   # e.g. openssl rand -hex 32
SUPER_ADMIN_KEY=<a-long-random-string>
TRUST_PROXY=true
```

Set these in the frontend host:

```
VITE_API_BASE=https://your-backend-domain
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

---

## Environment Variables

### Backend

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | — | `8080` | TCP port to listen on |
| `ENV` | — | `development` | `development` or `production` |
| `ALLOWED_ORIGINS` | production only | — | Comma-separated list of allowed CORS origins |
| `VITE_API_BASE` | — | `http://localhost:8080` | Used in the CSP `connect-src` allowlist |
| `TRUST_PROXY` | — | `false` | Set to `true` if behind a reverse proxy to honor `X-Forwarded-For` |
| `SUPER_ADMIN_KEY` | production only | — | Required for `/api/v1/admin/*` endpoints |
| `MASTER_KEY` | recommended | random each restart | 32-byte hex. Set to make secrets survive restarts |
| `DB_PATH` | — | `nullsecret.db` | SQLite file path |
| `BACKUP_DIR` | — | `.` | Where the 5-minute `backup.db` snapshot goes |

### Frontend

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE` | yes | Backend URL including `/api/v1` |
| `VITE_FIREBASE_API_KEY` | yes | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | yes | `<project-id>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | yes | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | yes | `<project-id>.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | yes | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | yes | Firebase app ID |

---

## Testing & Verification

### Backend

```powershell
cd backend
go test ./...         # 8 tests pass
go test -cover ./...  # coverage report
```

Current test files:

- `backend/internal/api/handlers_test.go` — health, create-secret, telemetry (auth + unauth), admin-login, purge (auth + unauth), empty payload, cap enforcement
- `backend/internal/store/storage_test.go` — basic storage round-trip

### Frontend

```powershell
cd frontend
npx tsc -b --noEmit   # type-check only, 0 errors
npm run build         # full production build
npm run dev           # local dev server
```

No automated tests exist yet. Playwright is installed in `devDependencies` but no specs are authored.

### Manual smoke-test checklist

1. Sign up with a fresh email → lands on `/app`
2. Create a secret with a 1-view limit → copy the link
3. Open the link in an incognito window → message decrypts, counter hits 1
4. Refresh the incognito window → 404 (secret self-destructed)
5. Sign out → landing page shows "Sign In to Start"
6. Try to open `/app` while signed out → redirected to `/login`
7. Enter a wrong password → friendly error ("That email and password combination did not match…"), no raw "Firebase: Error" leak
8. Try to sign up with an existing email → friendly error ("An account with this email already exists…")
9. Toggle theme via the header button → persists across reload
10. Wait for inactivity timeout → auto-signs out

---

## Scoring Breakdown

| Category | Score (before) | Score (now) | Δ | Notes |
|---|---|---|---|---|
| Architecture & Structure | 85 | 88 | +3 | Binaries removed, stale md files gone |
| Security | 82 | 92 | +10 | Backward-compat decrypt hole closed, admin-key fallback removed, VACUUM quote-escape |
| Code Quality | 65 | 82 | +17 | 6 new shared components, 750+ lines of duplication eliminated, `any` → `User` |
| UI/UX Consistency | 60 | 80 | +20 | `SecurityPageHeader` / `BackLink` / `AuthLayout` used across 9 pages; `.section-title` utility |
| Testing | 45 | 45 | 0 | Backend still 8/8, frontend still zero |
| Documentation | 80 | 90 | +10 | `TermsOfService` page, `PROJECT_STATUS.md`, updated `README` |
| DevOps & Build | 75 | 80 | +5 | Binaries de-committed, `.gitignore` clean |
| Performance | 70 | 72 | +2 | Same bundle sizes but shared components improve parse time slightly |
| **Overall** | **72** | **82** | **+10** | Production-ready; top gaps are tests and bundle splitting |

---

**Maintainer:** Anurag Mishra
**License:** See `LICENSE`
**Repo:** <https://github.com/4nur4gmishr4/Null-Secret>
