# Null-Secret

A zero-knowledge, end-to-end encrypted secret-sharing service. The browser
encrypts every message with **AES-256-GCM** before it leaves your device.
The server only ever stores ciphertext, holds it in SQLite database,
and deletes it the moment it expires or hits its view limit.

---

## Table of Contents

- [Quick Start](#quick-start)
- [What It Does](#what-it-does)
- [Architecture](#architecture)
- [Project Layout](#project-layout)
- [Local Development](#local-development)
- [Production Deployment](#production-deployment)
- [Configuration Reference](#configuration-reference)
- [API Reference](#api-reference)
- [Security Model](#security-model)
- [Frontend Feature Map](#frontend-feature-map)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

---

## Quick Start

**For users:** See [USER_GUIDE.md](./USER_GUIDE.md) for a simple, non-technical guide on how to use Null-Secret.

**For developers:** Jump to [Local Development](#local-development) to get started.

---

## What It Does

- Creates a **one-time link** (`/v/{id}#{key}`) that another person can open
  to read the message you sent.
- Encrypts the message **inside your browser** with `window.crypto.subtle`
  using AES-256-GCM. The decryption key never leaves your device — it
  travels in the URL fragment, which browsers refuse to send to servers.
- Lets the recipient open the link a fixed number of times (default 1).
  Once that limit is reached, the message is gone forever.
- Optional second password the recipient must type, derived through
  PBKDF2-SHA256 with 600 000 iterations.
- Optional **file attachments** up to 6 MB combined, packed into a Zip
  inside the encrypted blob, never seen by the server.
- Optional Firebase **sign-in** that adds a 30-secret-per-day cap and a
  history page that lists only IDs and timestamps (never message content).

You can use the whole app **without an account**. Sign-in unlocks a
quota counter, a history view, and account-level security settings.

---

## Architecture

```
┌─ Browser (React 19 + Vite, Web Crypto API) ─────────────────────────┐
│                                                                     │
│   ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐    │
│   │ AES-256-GCM  │  │ PBKDF2-SHA256│  │ Bucket-padded payload  │    │
│   │ encrypt      │  │ key stretch  │  │ (1K / 5K / 10K / 100K) │    │
│   └──────┬───────┘  └──────┬───────┘  └───────────┬────────────┘    │
│          └─────────────────┴──────────────────────┘                 │
│                            │                                        │
│                            ▼                                        │
│                POST /api/v1/secret  { payload, expiry, viewLimit }  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─ Go API (chi router, SQLite database) ─────────────────────────────┐
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ SQLite database with secrets table                           │   │
│   │ Background sweeper deletes expired entries every minute     │   │
│   │ Token-bucket rate limiter (100 req/sec global)               │   │
│   │ Atomic delete on view limit reach                           │   │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

```
┌─ Optional Firebase (only when the user is signed in) ───────────────┐
│   • Authentication (Email/Password, Google)                         │
│   • Firestore                                                       │
│       users/{uid}/history    list of created secret IDs             │
│       usage/{uid}/daily/{ymd} integer counter for the daily cap     │
└─────────────────────────────────────────────────────────────────────┘
```

**Privacy properties:**

- Decryption key travels in URL fragment (never sent to server per RFC 3986)
- Server holds only encrypted ciphertext in SQLite database
- Firestore stores only secret ID and timestamp (never content or keys)

---

## Project layout

```
null-secret/
├── backend/                          # Go 1.22 API
│   ├── cmd/
│   │   └── api/main.go               # Entry point; reads $PORT
│   ├── internal/
│   │   ├── api/handlers.go           # CORS, CSP, routes, rate limit
│   │   ├── config/                   # Configuration management
│   │   ├── models/                   # Request/response DTOs
│   │   └── store/                    # SQLite storage, GC, rate limiter, tests
│   ├── go.mod
│   ├── go.sum
│   └── Dockerfile                    # Multi-stage, distroless, non-root
├── frontend/                         # React 19 + Vite + TypeScript
│   ├── public/                       # PWA assets
│   ├── src/
│   │   ├── App.tsx                   # Routes + Preloader gate
│   │   ├── main.tsx                  # ReactDOM bootstrap
│   │   ├── index.css                 # Design tokens, animations, motion-respect
│   │   ├── components/
│   │   │   ├── Authscreen.tsx        # /login
│   │   │   ├── Signup.tsx            # /signup
│   │   │   ├── ForgotPassword.tsx    # /forgot-password
│   │   │   ├── Footer.tsx            # Sitewide footer
│   │   │   ├── Preloader.tsx         # First-paint shield animation
│   │   │   ├── DecryptedText.tsx     # Scramble-text effect
│   │   │   ├── InViewLottie.tsx      # IntersectionObserver-aware Lottie
│   │   │   ├── LottieView.tsx        # Single source of lottie-react interop
│   │   │   ├── FileDropzone.tsx      # Drag and drop file upload
│   │   │   ├── ErrorBoundary.tsx     # React error boundary
│   │   │   └── Skeleton.tsx          # Loading skeleton
│   │   ├── contexts/
│   │   │   ├── ThemeContext.tsx      # Auto / Light / Dark cycle
│   │   │   └── ToastContext.tsx      # Toast notification system
│   │   ├── layouts/
│   │   │   └── Layout.tsx            # Header, profile menu, mobile menu, auto-logout
│   │   ├── pages/
│   │   │   ├── Landing.tsx           # /
│   │   │   ├── Home.tsx              # /app  (create flow)
│   │   │   ├── Success.tsx           # /s/:id  (links + QR)
│   │   │   ├── ViewSecret.tsx        # /v/:id  (decrypt flow)
│   │   │   ├── AdminDashboard.tsx    # /admin/:id
│   │   │   ├── SuperAdmin.tsx        # /super-admin
│   │   │   ├── PrivacyPolicy.tsx     # /privacy
│   │   │   ├── AccountSettings.tsx   # /account
│   │   │   ├── UsageHistory.tsx      # /history
│   │   │   ├── SecuritySettings.tsx  # /security
│   │   │   ├── SessionTimeout.tsx    # /security/timeout
│   │   │   ├── DeviceSessions.tsx    # /security/sessions
│   │   │   ├── DestroyVault.tsx      # /security/destroy
│   │   │   ├── TwoFactorSetup.tsx    # /security/2fa
│   │   │   └── BiometricSetup.tsx    # /security/biometric
│   │   ├── utils/
│   │   │   ├── crypto.ts             # AES-GCM, PBKDF2, bucket padding
│   │   │   ├── csv.ts                # RFC 4180 CSV builder + download
│   │   │   ├── constants.ts          # DAILY_SECRET_LIMIT, AUTH_ROUTES, etc.
│   │   │   ├── firebase.ts           # initializeApp + env validation
│   │   │   ├── passwordStrength.ts   # Lightweight strength estimator
│   │   │   ├── sessionTimeout.ts     # localStorage-backed inactivity preference
│   │   │   └── api.ts                # API client utilities
│   │   └── assets/lotties/           # JSON shield animations
│   ├── .env.example                  # Copy to .env.local for development
│   ├── package.json
│   ├── vite.config.ts                # PWA, code splitting
│   └── vercel.json                   # SPA fallback rewrite
├── render.yaml                       # One-click backend deploy on Render
├── FEATURES.md                       # Roadmap
├── .gitignore
└── README.md
```

---

## Local development

### Prerequisites

| Tool         | Version   |
|--------------|-----------|
| Go           | 1.22+     |
| Node.js      | 20+       |
| npm          | 10+       |
| (optional) Docker | 24+ |

### 1. Clone and bootstrap

```bash
git clone https://github.com/4nur4gmishr4/Null-Secret.git
cd Null-Secret
```

### 2. Start the backend

```bash
cd backend
go run ./cmd/api
# 2026/01/01 INFO Starting NULL-SECRET API addr=:8080
```

The API listens on `:8080`. Health check:

```bash
curl http://localhost:8080/api/v1/healthz
# {"status":"OK","storage":"healthy"}
```

### 3. Start the frontend

```bash
cd frontend
cp .env.example .env.local      # Then fill in your Firebase keys
npm install
npm run dev
# VITE ready in 700ms  →  http://localhost:5173
```

Without Firebase keys, the app boots fine but anonymous sign-in is the
only path; `/login`, `/signup`, account pages will not work. The core
secret create/view flow (no account) works without Firebase.

### 4. Run the tests

```bash
# Backend unit tests
cd backend
go test -v ./...

# Frontend type check + production build
cd ../frontend
npm run build
```

---

## Production deployment

The reference deployment is **Vercel for the frontend** + **Render for
the Go backend**. Both have generous free tiers. The architecture works
on any equivalent pair (Netlify/Fly, Cloudflare Pages/Cloud Run, etc.).

### A. Backend on Render (one-click via `render.yaml`)

1. Push this repo to GitHub.
2. On Render: **New → Blueprint → Connect this repo**.
3. Render reads `render.yaml`, provisions a free Web Service, builds
   the multi-stage Dockerfile, and starts the binary.
4. Set `ALLOWED_ORIGINS` in the service env to the URL Vercel will
   give you (you can fill this in after step B and redeploy).

The free plan sleeps after 15 minutes of inactivity. To keep it warm,
register a free job at **cron-job.org** that hits
`https://<your-app>.onrender.com/api/v1/healthz` every 10 minutes.

### B. Frontend on Vercel

1. Import the repo on Vercel and set the **Root Directory** to
   `frontend`.
2. Add the following Environment Variables (Production scope):

   | Name | Value |
   |---|---|
   | `VITE_API_BASE` | `https://<your-render-app>.onrender.com/api/v1` |
   | `VITE_FIREBASE_API_KEY` | from Firebase console |
   | `VITE_FIREBASE_AUTH_DOMAIN` | from Firebase console |
   | `VITE_FIREBASE_PROJECT_ID` | from Firebase console |
   | `VITE_FIREBASE_STORAGE_BUCKET` | from Firebase console |
   | `VITE_FIREBASE_MESSAGING_SENDER_ID` | from Firebase console |
   | `VITE_FIREBASE_APP_ID` | from Firebase console |

3. Click **Deploy**. The included `vercel.json` rewrites every path to
   `index.html` so React Router works on hard reloads.

### C. Wire CORS

Once Vercel gives you a URL like `https://null-secret.vercel.app`,
go back to Render and update `ALLOWED_ORIGINS` to include it
(comma-separate multiple origins for previews):

```
ALLOWED_ORIGINS=https://null-secret.vercel.app,https://null-secret-git-main-you.vercel.app
```

Redeploy. Done.

### D. Firebase setup

1. Create a project at <https://console.firebase.google.com>.
2. **Authentication → Sign-in method**: enable Email/Password, Google.
3. **Firestore → Create database** in production mode.
4. Paste these Firestore rules so users can only touch their own docs:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
       match /usage/{uid}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```

5. **Authentication → Settings → Authorized domains**: add your Vercel
   domain. Without this, Google sign-in pop-ups will be blocked.

### E. Common deployment gotchas

| Symptom | Fix |
|---|---|
| Frontend shows a CORS error | Add the Vercel domain to `ALLOWED_ORIGINS` and redeploy the backend. |
| 30-50 s delay on the first request | Free Render sleeps. Set up the keep-alive cron at cron-job.org. |
| `Encryption needs a secure connection` toast | Browser refuses Web Crypto on `http://`. Vercel and Render are HTTPS by default; if self-hosting, terminate TLS at your reverse proxy. |
| Firebase sign-in popup blocks | Add the production domain in Firebase → Authentication → Settings → Authorized domains. |
| `PORT must be an integer in 1..65535` | The platform set `$PORT` to a non-numeric value. Don't override it; Render sets it correctly automatically. |

---

## Configuration reference

### Backend (Go)

| Variable          | Default                  | Description                                                      |
|-------------------|--------------------------|------------------------------------------------------------------|
| `PORT`            | `8080`                   | Port to bind. Render/Heroku/Fly inject this automatically.       |
| `ALLOWED_ORIGINS` | (none)                   | Comma-separated CORS origins. Required in production.            |
| `ALLOWED_ORIGIN`  | (none)                   | Legacy single-origin form. Still honoured for backwards compat.  |
| `ENV`             | (none)                   | Set to `production` to drop the localhost dev-time CORS allowlist. |
| `TRUST_PROXY`     | (none)                   | Set to `true` behind a reverse proxy so X-Forwarded-For wins for rate limiting. |
| `VITE_API_BASE`   | `http://localhost:8080`  | Used inside the Content-Security-Policy `connect-src` directive. |

### Frontend (Vite, build-time)

| Variable                            | Required | Description                                  |
|-------------------------------------|----------|----------------------------------------------|
| `VITE_API_BASE`                     | yes      | Backend base URL, including `/api/v1`.       |
| `VITE_FIREBASE_API_KEY`             | prod     | All six Firebase keys are required when built in production mode. The build will throw if any are blank. |
| `VITE_FIREBASE_AUTH_DOMAIN`         | prod     | |
| `VITE_FIREBASE_PROJECT_ID`          | prod     | |
| `VITE_FIREBASE_STORAGE_BUCKET`      | prod     | |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | prod     | |
| `VITE_FIREBASE_APP_ID`              | prod     | |

In dev mode missing Firebase keys log a warning instead of throwing,
so you can iterate on the secret-sharing flow without setting up
Firebase first.

---

## API reference

All routes are prefixed with `/api/v1`. JSON in, JSON out.

### `POST /api/v1/secret`

Create a new secret.

```json
{
  "payload":  "<base64 ciphertext bundle>",
  "expiry":   24,
  "viewLimit": 1
}
```

| Field       | Type   | Notes                                                       |
|-------------|--------|-------------------------------------------------------------|
| `payload`   | string | Base64-encoded `[12-byte IV][ciphertext+GCM tag]` bundle.   |
| `expiry`    | int    | TTL in hours. Defaults to 24, must be > 0.                  |
| `viewLimit` | int    | Number of views before deletion. Defaults to 1.             |

Response `201 Created`:

```json
{
  "id":       "a1b2c3d4e5f6",
  "adminKey": "<random>"
}
```

`adminKey` is shown to the creator once and used to delete the secret
early or look up its status. **Treat it like a password**; it never
appears in any other response.

Errors:
- `400` — empty payload or malformed JSON
- `413` — payload exceeds 10 MB
- `429` — rate limit (10 req/min/IP)
- `503` — server at capacity (refuses to OOM)

### `GET /api/v1/secret/{id}`

Retrieve and atomically increment view count. Deletes the secret when
`views >= viewLimit`. Anyone with the URL can call this; the URL
fragment carries the key.

Response `200 OK`:

```json
{
  "payload":   "<base64 ciphertext bundle>",
  "views":     1,
  "viewLimit": 1
}
```

Errors:
- `404` — not found, expired, or already burned

### `GET /api/v1/secret/{id}/info`

Status check for the creator. Requires the admin key.

```bash
curl -H "X-Admin-Key: $ADMIN_KEY" \
     https://api.example.com/api/v1/secret/abc123/info
```

Response `200 OK`:

```json
{
  "views":     0,
  "viewLimit": 1,
  "expiresAt": "2026-01-15T12:34:56Z"
}
```

### `DELETE /api/v1/secret/{id}`

Burn early. Requires the admin key. Idempotent.

```bash
curl -X DELETE -H "X-Admin-Key: $ADMIN_KEY" \
     https://api.example.com/api/v1/secret/abc123
```

Response `200 OK`:

```json
{ "status": "burned" }
```

### `GET /api/v1/healthz`

```json
{ "status": "OK", "storage": "healthy" }
```

Used by the navbar Wi-Fi indicator and the recommended Render
keep-alive cron.

---

## Security Model

| Layer                     | Mechanism                                                         |
|---------------------------|-------------------------------------------------------------------|
| Confidentiality           | AES-256-GCM via `window.crypto.subtle`                            |
| Integrity / authenticity  | GCM authentication tag (rejects any tampering)                    |
| Key delivery              | URL fragment (RFC 3986 §3.5: never sent to server)                |
| Optional second factor    | PBKDF2-HMAC-SHA256 with 600,000 iterations                         |
| Traffic-analysis resistance | Ciphertext padded to 1 KB / 5 KB / 10 KB / 100 KB buckets     |
| Transport                 | HSTS preload, X-Content-Type-Options, X-Frame-Options DENY        |
| Content security          | Locked-down CSP with `connect-src` whitelist                      |
| Rate limiting             | 100 req/sec global, per-IP limits                                 |
| Storage                   | SQLite database with automatic GC on TTL or view-limit hit        |
| Account deletion          | `Destroy Vault` deletes Firestore data + Firebase Auth user       |

**What we do NOT collect or store:**

- IP addresses (in-memory only for rate limiting; never written down)
- Trackers, marketing scripts, third-party analytics
- Plaintext messages, encryption keys, or optional passwords
- Any link between sign-in identity and secret content (only ID and timestamp stored)

See the in-app `/privacy` page for the full plain-language story.

---

## Frontend feature map

| Page / Route                 | What it does                                                              | Auth required |
|------------------------------|---------------------------------------------------------------------------|---------------|
| `/`                          | Marketing landing page                                                    | no            |
| `/app`                       | Compose a secret: text + files, expiry, view limit, optional password     | no            |
| `/s/:id#key`                 | Confirmation page with copy-link, QR code, admin link                     | no            |
| `/v/:id#key`                 | Recipient page: decrypt, optional password prompt, view counter           | no            |
| `/admin/:id#adminkey`        | Creator dashboard: view count, expiry, burn-now button                    | no            |
| `/super-admin`               | Super admin dashboard for advanced management                             | yes           |
| `/login`                     | Email/password and Google sign-in                                         | no            |
| `/signup`                    | Create account                                                            | no            |
| `/forgot-password`           | Send password reset email                                                 | no            |
| `/account`                   | Edit display name; change email with verification                         | yes           |
| `/history`                   | List of secrets you created (IDs only); CSV export; daily quota gauge     | yes           |
| `/security`                  | Hub for security settings                                                 | yes           |
| `/security/timeout`          | Auto-logout window (5 / 15 / 60 / 480 minutes)                            | yes           |
| `/security/sessions`         | Current device summary; sign out                                          | yes           |
| `/security/destroy`          | Permanently delete account, history, and quota counters                   | yes           |
| `/security/2fa`              | Informational: explains why TOTP needs a backend                          | yes           |
| `/security/biometric`        | Informational: explains WebAuthn requirements                             | yes           |
| `/privacy`                   | Privacy manifesto with a TOC and anchor jumps                             | no            |

UI conventions:

- **Single Lottie wrapper** (`components/LottieView.tsx`) hides the
  lottie-react default-export interop quirk so every page renders the
  animation reliably.
- **`prefers-reduced-motion: reduce`** disables every animation and
  transition site-wide.
- **`html { scroll-behavior: smooth }` + `.section-anchor`** with
  `scroll-margin-top: calc(var(--header-h) + 24px)` makes anchor jumps
  land below the sticky header.
- **Auto-logout** is implemented in `Layout.tsx`. Inactivity is the
  absence of mouse, key, scroll, and touch events for the configured
  number of minutes.
- **Footer is hidden** on `/login`, `/signup`, and `/forgot-password`
  so the auth screens fit one viewport with no scroll.

---

## Roadmap

The full backlog lives in [`FEATURES.md`](./FEATURES.md). Items that
require backend work (TOTP, WebAuthn, custom slug aliases, time-window
unlock, email-gated unlock, view notifications, captcha, hardware-key
signing, ECDH forward secrecy, IP allowlist, per-secret access log,
country geolocation, GDPR data export/delete/audit, multi-region
replication, operator console) are flagged there and not stubbed in
the UI to avoid implying a security feature is active when it isn't.

### Current Features

The system already does:
- Browser-side AES-256-GCM encryption
- Optional password layer with PBKDF2 (600,000 iterations)
- One-time, multi-view, or time-limited links
- File attachments up to 6 MB total (single file inline, multiple files auto-zipped)
- SQLite-based storage with automatic GC
- Admin links so the creator can see view counts and burn early
- Email and Google sign-in (Firebase) with daily quota tracking
- Light, dark, and system theme
- Activity log of secrets you have created
- Health indicator that pings the backend
- Super admin dashboard for advanced management
- Drag and drop file upload
- Toast notification system
- Error boundary for graceful error handling
- Session timeout settings
- Device session management
- Account deletion with Destroy Vault

---

## Contributing

1. Fork the repo.
2. Branch: `git checkout -b feature/<short-description>`.
3. Make changes and ensure both checks pass:

   ```bash
   cd backend  && go test ./... && go vet ./...
   cd frontend && npm run build
   ```

4. Commit with a meaningful message and open a pull request.

Tests and the production build must succeed before a PR is merged.

---

## License

Proprietary software designed, developed, and managed by **Anurag Mishra**. All rights
reserved. See [Privacy Manifesto](https://github.com/4nur4gmishr4/Null-Secret#)
in-app for the privacy contract with users.
