# Deployment Guide

This document describes how to deploy Null-Secret to production, staging, and self-hosted environments. The reference deployment uses **Render** for the backend and **Vercel** for the frontend, but the app is platform-agnostic.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Production Environment Variables](#production-environment-variables)
- [Backend on Render](#backend-on-render)
- [Frontend on Vercel](#frontend-on-vercel)
- [Self-hosting with Docker](#self-hosting-with-docker)
- [Self-hosting on Linux/systemd](#self-hosting-on-linuxsystemd)
- [Firebase Setup](#firebase-setup)
- [Generating the Master Key](#generating-the-master-key)
- [DNS & TLS](#dns--tls)
- [Post-deploy Checklist](#post-deploy-checklist)
- [Rollback](#rollback)
- [Observability](#observability)

---

## Prerequisites

- A registered domain you control, or a subdomain delegated to Vercel/Render.
- A Firebase project with Email/Password and Google auth providers enabled.
- A terminal with `openssl`, `git`, and either the Render or Vercel CLI installed (optional but helpful).

---

## Production Environment Variables

### Backend (Go API)

| Variable | Required | Example | Notes |
|---|---|---|---|
| `PORT` | injected by PaaS | `10000` | Render/Heroku/Fly inject this automatically |
| `ENV` | yes | `production` | Enables strict CORS and triggers production-only warnings |
| `ALLOWED_ORIGINS` | yes | `https://app.example.com,https://example.com` | Comma-separated CORS allow-list |
| `VITE_API_BASE` | yes | `https://api.example.com` | Used in the `connect-src` CSP directive |
| `TRUST_PROXY` | yes if behind a proxy | `true` | Honours `X-Forwarded-For` for accurate per-IP rate limiting |
| `SUPER_ADMIN_KEY` | yes | long random string | Gate for `/api/v1/admin/*` endpoints. **Rotate when leaked.** |
| `MASTER_KEY` | **strongly recommended** | 64-char hex string | 32-byte server-side encryption key. See [below](#generating-the-master-key) |
| `DB_PATH` | no | `/var/lib/nullsecret/nullsecret.db` | Writable SQLite path |
| `BACKUP_DIR` | no | `/var/lib/nullsecret/backups` | Directory for the 5-minute `backup.db` snapshot |

### Frontend (Vite bundle)

| Variable | Required | Example |
|---|---|---|
| `VITE_API_BASE` | yes | `https://api.example.com/api/v1` |
| `VITE_FIREBASE_API_KEY` | yes | see Firebase console |
| `VITE_FIREBASE_AUTH_DOMAIN` | yes | `<project-id>.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | yes | `<project-id>` |
| `VITE_FIREBASE_STORAGE_BUCKET` | yes | `<project-id>.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | yes | numeric |
| `VITE_FIREBASE_APP_ID` | yes | `1:…:web:…` |

Vite embeds these at build time; rotating them requires a rebuild + redeploy.

---

## Backend on Render

A [`render.yaml`](./render.yaml) blueprint lives at the repository root.

### One-time setup

1. Fork or push this repository to GitHub.
2. In the Render dashboard, click **New → Blueprint** and point it at the GitHub repo.
3. Render reads `render.yaml` and creates a Web Service for the backend.
4. Open the service → **Environment** → add every variable from the [production env var table](#backend-go-api). Mark `SUPER_ADMIN_KEY` and `MASTER_KEY` as **secret**.
5. Hit **Save**. Render builds and deploys automatically on every push to `main`.

### Updates

Push to `main`. Render auto-deploys. No manual steps.

### Disk

The default SQLite file lives inside the container filesystem and is **ephemeral** on Render's free tier. Attach a **Persistent Disk** to the service (paid plan) and set `DB_PATH` and `BACKUP_DIR` to paths on that disk, otherwise every redeploy wipes active secrets.

---

## Frontend on Vercel

A [`frontend/vercel.json`](./frontend/vercel.json) config points at the `frontend/` subdirectory.

### One-time setup

1. In the Vercel dashboard, **Add New → Project** and select the same GitHub repo.
2. Set **Root Directory** to `frontend`.
3. Build command: `npm run build`. Output directory: `dist`.
4. Add each `VITE_*` variable from the [frontend env var table](#frontend-vite-bundle) under **Settings → Environment Variables**. Set them for Production and Preview.
5. Deploy. Vercel builds and ships on every `main` push.

### Custom domain

In **Settings → Domains**, add your domain and let Vercel issue a free TLS certificate.

After you have the frontend domain, update `ALLOWED_ORIGINS` and `VITE_API_BASE` on the backend accordingly.

---

## Self-hosting with Docker

A `Dockerfile` ships in `backend/`. It builds a small static Go binary.

```bash
cd backend
docker build -t null-secret-api:latest .

docker run -d \
  --name null-secret \
  -p 8080:8080 \
  -e ENV=production \
  -e ALLOWED_ORIGINS=https://example.com \
  -e VITE_API_BASE=https://api.example.com \
  -e TRUST_PROXY=true \
  -e SUPER_ADMIN_KEY="$(openssl rand -hex 32)" \
  -e MASTER_KEY="$(openssl rand -hex 32)" \
  -e DB_PATH=/data/nullsecret.db \
  -e BACKUP_DIR=/data \
  -v /srv/null-secret:/data \
  null-secret-api:latest
```

### Frontend static hosting

```bash
cd frontend
npm ci
npm run build
# Ship dist/ to any static host: Nginx, Caddy, Cloudflare Pages, S3 + CloudFront.
```

Example Nginx location block:

```nginx
location / {
  root /var/www/null-secret;
  try_files $uri $uri/ /index.html;
  add_header Cache-Control "public, max-age=0, must-revalidate";
}

location ~* \.(?:js|css|woff2?|ttf|png|svg|webp|json)$ {
  root /var/www/null-secret;
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

---

## Self-hosting on Linux/systemd

1. Build the binary on your target architecture:

   ```bash
   cd backend
   GOOS=linux GOARCH=amd64 go build -o /usr/local/bin/null-secret-api ./cmd/api
   ```

2. Create a dedicated user and data directory:

   ```bash
   sudo useradd --system --home /var/lib/null-secret null-secret
   sudo mkdir -p /var/lib/null-secret
   sudo chown null-secret:null-secret /var/lib/null-secret
   ```

3. Drop the unit file at `/etc/systemd/system/null-secret.service`:

   ```ini
   [Unit]
   Description=Null-Secret API
   After=network-online.target
   Wants=network-online.target

   [Service]
   Type=simple
   User=null-secret
   Group=null-secret
   WorkingDirectory=/var/lib/null-secret
   EnvironmentFile=/etc/null-secret.env
   ExecStart=/usr/local/bin/null-secret-api
   Restart=on-failure
   RestartSec=5s
   NoNewPrivileges=true
   PrivateTmp=true
   ProtectSystem=strict
   ProtectHome=true
   ReadWritePaths=/var/lib/null-secret
   LimitNOFILE=65536

   [Install]
   WantedBy=multi-user.target
   ```

4. Populate `/etc/null-secret.env` (mode `600`):

   ```env
   ENV=production
   PORT=8080
   ALLOWED_ORIGINS=https://example.com
   VITE_API_BASE=https://api.example.com
   TRUST_PROXY=true
   SUPER_ADMIN_KEY=<generated>
   MASTER_KEY=<generated>
   DB_PATH=/var/lib/null-secret/nullsecret.db
   BACKUP_DIR=/var/lib/null-secret
   ```

5. `sudo systemctl daemon-reload && sudo systemctl enable --now null-secret`.

Put the service behind Nginx/Caddy for TLS termination.

---

## Firebase Setup

1. Create a Firebase project in the [Firebase console](https://console.firebase.google.com).
2. Enable **Authentication → Sign-in method → Email/Password** and **Google**.
3. Enable **Firestore Database** in Native mode.
4. Add your production domain under **Authentication → Settings → Authorized domains**.
5. Copy the web app config into the `VITE_FIREBASE_*` variables above.
6. Apply this Firestore security rules template to protect per-user data:

   ```js
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/history/{docId} {
         allow read, create, delete: if request.auth != null && request.auth.uid == userId;
         allow update: if false;
       }
       match /usage/{userId}/daily/{date} {
         allow read, create, update: if request.auth != null && request.auth.uid == userId;
         allow delete: if false;
       }
     }
   }
   ```

7. Tighten the Web API key in the [Google Cloud console](https://console.cloud.google.com/apis/credentials): restrict to your domain and the Firebase Identity Toolkit API.

---

## Generating the Master Key

The `MASTER_KEY` must be a 32-byte hex string. Generate it once and store it in your secret manager.

```bash
openssl rand -hex 32
```

**If you lose this key, every existing encrypted record becomes unreadable.** Back it up in a password manager or cloud KMS. Rotation is not supported automatically; plan a maintenance window if you ever need to rotate it.

The `SUPER_ADMIN_KEY` is also 32 bytes of randomness, but the format is a free-form string — treat it like a bearer token:

```bash
openssl rand -base64 48
```

---

## DNS & TLS

- **Frontend:** Vercel issues and renews certificates for any domain you add in the dashboard. No manual steps.
- **Backend on Render:** same, provided you use Render's built-in domain or add one in the dashboard.
- **Self-hosted:** use [Caddy](https://caddyserver.com) for automatic HTTPS, or [Certbot](https://certbot.eff.org/) for Let's Encrypt on Nginx.

Ensure `Strict-Transport-Security` stays enabled (the backend sets it globally in middleware).

---

## Post-deploy Checklist

Run through this after every production deploy.

- [ ] `curl https://<api>/health` returns `{"status":"OK","storage":"healthy"}`
- [ ] Visit `/` in a fresh browser tab, confirm the theme loads and the header shows the backend indicator (green)
- [ ] Create a test secret, open it in a private window, verify it self-destructs after the set view limit
- [ ] Sign up with a fresh email → lands on `/app`
- [ ] Deliberately enter a wrong password → friendly error ("That email and password combination did not match…"); no raw `Firebase: Error`
- [ ] Try to create an account with an existing email → friendly error ("An account with this email already exists…")
- [ ] Try to hit a protected route (`/app`) while signed out → redirected to `/login`
- [ ] DevTools network tab: confirm the admin key is sent as `X-Admin-Key` (not `?admin_key=`)
- [ ] DevTools security tab: confirm CSP and HSTS headers are present
- [ ] Hit `/api/v1/admin/telemetry` without an admin key → `401`; with the correct key → `200` and sane metrics
- [ ] Wait the configured inactivity window → the frontend auto-signs out

---

## Rollback

The app is rolling-release; every `main` commit is a deployable tip. To roll back:

1. Identify the last good commit SHA: `git log --oneline -n 20`.
2. `git revert <bad-sha>` (or `git revert <bad-sha>..HEAD` for a range).
3. Push to `main`. Render + Vercel redeploy automatically.

Avoid force-pushing to `main`. If a rollback is urgent, use Render's **Rollback** and Vercel's **Promote** buttons to flip to the previous successful build while you prepare the revert commit.

---

## Observability

- **Backend logs:** structured JSON via `log/slog`, one line per request thanks to `chi`'s `middleware.Logger`. In Render, stream them from the **Logs** tab; in self-hosted, pipe to `journald` (systemd) or a log shipper.
- **Frontend errors:** `ErrorBoundary` renders a friendly fallback and logs to `console.error`. Wire up Sentry or a similar service for production visibility (see the [P1 roadmap](./PROJECT_STATUS.md#p1--nice-to-have)).
- **Health:** the backend's `/health` returns a JSON status. Expose it to your uptime monitor (UptimeRobot, Better Stack, Pingdom).
- **Capacity:** `/api/v1/admin/telemetry` returns goroutine count, heap alloc, active secrets, and payload bytes. Poll it periodically with the super-admin key to drive dashboards.
