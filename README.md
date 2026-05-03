# Null-Secret

Send anything private. No traces left behind.

A zero-knowledge, end-to-end encrypted secret-sharing service. Share passwords, files, and private notes through one-time links that self-destruct after reading.

---

## Table of Contents

1. [Features](#features)
2. [Getting Started](#getting-started)
3. [Development](#development)
4. [Deployment](#deployment)
5. [Security](#security)
6. [Roadmap](#roadmap)
7. [Contributing](#contributing)
8. [License](#license)

---

## Features

### For Users

- **One-time links** - Create secure links that can be opened a fixed number of times (default 1)
- **File attachments** - Send files up to 6 MB, encrypted and auto-zipped
- **Optional password protection** - Add a second layer of security with PBKDF2
- **Auto-destruction** - Messages disappear immediately after being read or when expired
- **No account required** - Use the full service anonymously
- **Account benefits** - Sign in for history tracking, daily quotas, and security settings
- **Dark/light themes** - Automatic system theme detection or manual selection

### Security Guarantees

- **AES-256-GCM encryption** - Messages encrypted in your browser before leaving your device
- **Zero-knowledge** - The decryption key never reaches our server (stored in URL fragment)
- **RAM-only storage** - No database, no disk storage, server restart wipes everything
- **No logs** - We never store IP addresses or message content
- **Rate limiting** - Protection against automated attacks

---

## Getting Started

### Quick Start

1. Visit the app and create a secret
2. Set expiry time and view limit
3. Optionally add a password or file attachments
4. Share the generated link
5. The recipient opens it, reads the message, and it's gone forever

### Authentication (Optional)

- Sign up with email/password or Google
- Track your secret history (IDs only, never content)
- Set daily quotas (30 secrets/day)
- Manage security settings

---

## Development

### Prerequisites

- Go 1.22+
- Node.js 20+
- npm 10+
- (optional) Docker 24+

### Local Setup

```bash
# Clone the repository
git clone https://github.com/4nur4gmishr4/Null-Secret.git
cd Null-Secret

# Start the backend
cd backend
go run ./cmd/api
# API runs on http://localhost:8080

# Start the frontend (new terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### Running Tests

```bash
# Backend tests
cd backend
go test -v ./...

# Frontend build
cd frontend
npm run build
```

### Project Structure

```
null-secret/
├── backend/              # Go 1.22 API server
│   ├── cmd/api/          # Entry point
│   ├── internal/
│   │   ├── api/          # Handlers, CORS, rate limiting
│   │   ├── models/       # Request/response DTOs
│   │   └── store/        # Sharded map, GC, rate limiter
│   └── Dockerfile
├── frontend/             # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Route pages
│   │   ├── contexts/     # Theme, auth context
│   │   ├── utils/        # Crypto, helpers
│   │   └── layouts/      # App layout wrapper
│   └── public/           # PWA assets
└── render.yaml           # Render deployment config
```

---

## Deployment

### Recommended: Vercel + Render

**Backend on Render** (one-click via `render.yaml`):
1. Push repo to GitHub
2. On Render: New → Blueprint → Connect this repo
3. Set `ALLOWED_ORIGINS` to your Vercel domain
4. Set up cron-job.org to ping `/api/v1/healthz` every 10 minutes (keeps free tier awake)

**Frontend on Vercel**:
1. Import repo, set Root Directory to `frontend`
2. Add environment variables:
   - `VITE_API_BASE` - Backend URL
   - `VITE_FIREBASE_API_KEY` - From Firebase console
   - `VITE_FIREBASE_AUTH_DOMAIN` - From Firebase console
   - `VITE_FIREBASE_PROJECT_ID` - From Firebase console
   - `VITE_FIREBASE_STORAGE_BUCKET` - From Firebase console
   - `VITE_FIREBASE_MESSAGING_SENDER_ID` - From Firebase console
   - `VITE_FIREBASE_APP_ID` - From Firebase console

**Firebase Setup**:
1. Create project at console.firebase.google.com
2. Enable Email/Password and Google sign-in
3. Create Firestore database in production mode
4. Add domain to Authentication → Settings → Authorized domains

### Alternative Deployments

Works with any equivalent pair: Netlify/Fly, Cloudflare Pages/Cloud Run, Railway/Fly.io, etc.

---

## Security

### Encryption Model

- **AES-256-GCM** - Industry-standard authenticated encryption
- **Key delivery via URL fragment** - Never sent to server per RFC 3986
- **PBKDF2-SHA256** - 600,000 iterations for password stretching
- **Traffic padding** - Ciphertext padded to hide size patterns

### Storage Model

- **RAM-only** - No database, no disk, no backups
- **Automatic deletion** - GC sweeps expired entries every minute
- **Atomic burn** - Messages deleted immediately when view limit reached

### Privacy Guarantees

We do not store:
- IP addresses (in-memory only for rate limiting)
- Plaintext messages or encryption keys
- User content beyond secret IDs and timestamps
- Any tracking or analytics data

### Rate Limiting

- 10 requests per minute per IP
- Sliding window token bucket
- Configurable via environment variables

---

## Roadmap

### Account & Identity
- Two-Factor Authentication (TOTP)
- Passkey / Biometric login (WebAuthn)
- Session control and device management
- Auto-logout timer
- Account deletion
- Email change with verification

### Sharing & Delivery
- Custom link aliases
- Time-window unlock
- Email-gated unlock
- View notifications
- Drag and drop file upload
- Image and PDF preview before download
- Markdown rendering
- Code syntax highlighting
- Multi-recipient links

### Security Hardening
- Real password strength meter (zxcvbn)
- Captcha on view
- Rate-limit transparency with retry countdown
- Hardware key signing
- Per-message ECDH (forward secrecy)
- Tamper detection panel
- IP and country allowlist

### UX Polish
- QR code on create page
- Browser notification when secret viewed
- Copy individual sections from decrypted view
- Per-page progress indicator
- In-app toast notifications

### Audit & Telemetry
- Per-secret access log
- Country-only geolocation
- Export usage history as CSV
- Visual analytics for power users

### Compliance
- GDPR data export
- GDPR data deletion
- Audit log access for enterprises

### Operations
- Multi-region deployment
- Secret replication
- Operator console

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/<short-description>`
3. Make changes and ensure tests pass:

```bash
cd backend && go test ./... && go vet ./...
cd frontend && npm run build
```

4. Commit with a meaningful message
5. Open a pull request

Tests and production build must succeed before merging.

---

## License

Proprietary software developed by **Anurag Mishra**. All rights reserved.
