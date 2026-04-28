# Null-Secret Feature Roadmap

This document lists every feature that the existing codebase makes natural to add. Each feature shows the user benefit in plain language first, then a small technical note for engineers.

The system already does:

- Browser-side AES-256-GCM encryption
- Optional password layer with PBKDF2 (600,000 iterations)
- One-time, multi-view, or time-limited links
- File attachments up to 6 MB total (single file inline, multiple files auto-zipped)
- Self-destructing storage in server RAM only
- Admin links so the creator can see view counts and burn early
- Email and Google sign-in (Firebase) with daily quota tracking
- Light, dark, and system theme
- Activity log of secrets you have created
- Health indicator that pings the backend

Everything below is what we can add on top.

---

## 1. Account & Identity

### 1.1 Two-Factor Authentication (2FA)

Ask people to enter a 6-digit code from their authenticator app on every sign-in. Stops anyone who steals the password from getting in.

> **For engineers.** TOTP with the standard `otpauth://` URI. Store the secret encrypted in Firestore under the user's UID. Verify with a 30-second window and a 2-step skew tolerance. Library: `otplib`.

### 1.2 Passkey / Biometric login

Replace the password with a fingerprint, FaceID, or Windows Hello prompt. Faster and harder to phish.

> **For engineers.** WebAuthn flow via `navigator.credentials.create()` and `.get()`. Use Firebase Functions to verify the attestation. Allow multiple authenticators per user.

### 1.3 Session control

Show every device that is signed in to your account. Sign out any of them with one tap.

> **For engineers.** Persist a session document per Firebase auth `idTokenResult`. Use `onAuthStateChanged` plus a Firestore listener so revocation is real-time.

### 1.4 Auto-logout timer

After a chosen period of inactivity, the app signs you out automatically.

> **For engineers.** Track last user interaction (`mousemove`, `keydown`, `touchstart`) in `useEffect`. Use `requestIdleCallback` for the timer to avoid blocking the main thread.

### 1.5 Account deletion

A single button that erases your account, your usage history, and any active secrets you created.

> **For engineers.** Cloud Function that runs a transactional delete across `users/{uid}/*` plus a `DELETE /api/v1/secrets/by-creator/{uid}` admin endpoint behind a service-account header.

### 1.6 Email change with verification

Change the email on your account. The new address has to confirm before the change takes effect.

> **For engineers.** Firebase `verifyBeforeUpdateEmail`. Show a banner until verified.

---

## 2. Sharing & Delivery

### 2.1 Custom link aliases

Replace the random ID in the URL with a memorable word, while keeping the encryption key in the fragment.

> **For engineers.** Reserve aliases in Firestore with a uniqueness check; reverse-map alias to ID at the API layer. Reject reserved words (admin, api, etc.).

### 2.2 Time-window unlock

A secret that only opens during a chosen time window (for example, between 10:00 and 18:00 in the recipient's timezone).

> **For engineers.** Add `unlockAfter` and `unlockBefore` to the Secret model. Reject `GET /secret/:id` outside the window with a friendly error.

### 2.3 Email-gated unlock

The secret only opens for one specific email address. The recipient gets a code by email and types it before the message decrypts.

> **For engineers.** Send a one-time challenge token via SendGrid; verify on the backend before returning the ciphertext. Keep zero-knowledge by using the token only to gate access, not to derive the key.

### 2.4 View notifications

Get an email or a webhook ping when someone opens your secret.

> **For engineers.** On `GET /secret/:id` increment view counter and enqueue a notification to the creator's email or webhook URL stored in their profile.

### 2.5 Drag and drop file upload

Drop files anywhere on the create page instead of clicking the file input.

> **For engineers.** `react-dropzone`. Keep the existing 6 MB cap. Show file list with remove buttons.

### 2.6 Image and PDF preview before download

For image and PDF attachments, show a thumbnail in the decrypted view so the recipient knows what they are about to download.

> **For engineers.** Detect MIME type after decrypt; render with `<img>` for images and `<embed type="application/pdf">` for PDFs. All preview happens in-browser, the file never leaves the device.

### 2.7 Markdown rendering

Decrypted text messages render formatting (bold, lists, links) instead of plain text.

> **For engineers.** `react-markdown` with `rehype-sanitize`. Disable raw HTML and remote images for safety.

### 2.8 Code syntax highlighting

If the message looks like code, color it.

> **For engineers.** Detect language with `highlight.js/lib/core` lazy import.

### 2.9 Multi-recipient links

Generate a batch of unique links from one create flow, each with its own view counter.

> **For engineers.** Loop the existing create endpoint. Show all generated links in a copy-all list.

---

## 3. Security Hardening

### 3.1 Password strength meter (real one)

Show how easy or hard the optional password is to crack, in seconds, days, or years.

> **For engineers.** Replace the length-based strength bar in `Home.tsx` with `zxcvbn`. Compute on a debounced timer.

### 3.2 Captcha on view

Make the recipient solve a small puzzle before the secret decrypts. Stops scripts from grinding through random URLs.

> **For engineers.** Cloudflare Turnstile or hCaptcha invisible mode on the view page. Verify token at the backend before returning ciphertext.

### 3.3 Rate-limit transparency

If you trip the rate limiter, the page tells you when you can try again instead of showing a generic error.

> **For engineers.** Backend should return `Retry-After` header. Frontend reads it and shows a countdown.

### 3.4 Hardware key signing

Sign every secret with a YubiKey or other hardware token at create time.

> **For engineers.** WebAuthn `assertion` flow with a separate authenticator. Store signature alongside ciphertext; verify on view.

### 3.5 Per-message ECDH (forward secrecy)

Each secret uses a fresh public-private key pair so a future key compromise cannot decrypt past secrets.

> **For engineers.** Generate ECDH P-256 key pair in `utils/crypto.ts`. Derive the AES key via HKDF. Replace the current single AES key in the URL fragment with the ephemeral public key.

### 3.6 Tamper detection panel

Show the recipient a green checkmark when the ciphertext authentication tag verifies, and a clear warning if it fails.

> **For engineers.** AES-GCM already authenticates. Surface the failure as a distinct error code in `decrypt()` so the UI can render a stronger warning.

### 3.7 IP and country allowlist

The creator can restrict which countries or IP ranges can open the secret.

> **For engineers.** GeoIP lookup in the backend (MaxMind DB) on `GET /secret/:id`. Compare with allowlist stored on the secret.

---

## 4. UX Polish

### 4.1 QR code on create page

Generate the QR alongside the link as soon as the secret is created, instead of behind a button.

> **For engineers.** Move the existing `QRCodeSVG` from Success page into the create flow. Already supported.

### 4.2 Browser notification when a secret is viewed

Native OS notification fires when a creator's secret is opened.

> **For engineers.** Notification API plus Service Worker. Permission prompt on the success page.

### 4.3 Copy individual section from decrypted view

Click any line of the decrypted message to copy just that line.

> **For engineers.** Wrap each line in a clickable element that calls `navigator.clipboard.writeText`.

### 4.4 Per-page progress indicator

A thin top-of-page bar that fills as Suspense lazy-loads route chunks.

> **For engineers.** `nprogress` or a custom `<Progress>` controlled by router events.

### 4.5 In-app toasts

Replace browser `alert()` and inline error banners with a single toast system.

> **For engineers.** `sonner` or `react-hot-toast` mounted at the root.

---

## 5. Audit & Telemetry (privacy-preserving)

### 5.1 Per-secret access log

Show creators a timestamped list of when their secret was viewed (no IPs, no user agents).

> **For engineers.** Append `{ts: int, ok: bool}` to a secret-scoped sub-collection on each view. Surface in the admin dashboard.

### 5.2 Country-only geolocation

Show the recipient country (not city or IP) so creators can spot suspicious openings.

> **For engineers.** GeoIP at the backend, country code only. Opt-in per secret.

### 5.3 Export usage history as CSV

Download every secret you ever created (IDs and timestamps only) as a CSV.

> **For engineers.** Client-side CSV builder over the existing Firestore query result.

### 5.4 Visual analytics for power users

Charts of secrets created per day, average view counts, expiry distribution.

> **For engineers.** `recharts` or `visx` against the existing `users/{uid}/history` collection.

---

## 6. Compliance

### 6.1 GDPR data export

A button that produces a JSON archive of every piece of data we hold about you.

> **For engineers.** Cloud Function that walks `users/{uid}/**` and returns a signed download URL. Honor the 30-day deadline.

### 6.2 GDPR data deletion

A button that erases everything tied to your account.

> **For engineers.** Same as 1.5. Mark the deletion as immediate per Article 17.

### 6.3 Audit log access

For enterprises: an immutable audit log of admin actions.

> **For engineers.** Append-only Firestore collection with hash-chained entries.

---

## 7. Operations

### 7.1 Multi-region deployment

Run the backend in two regions so a region failure does not break the service.

> **For engineers.** Deploy the Go binary to two Cloud Run regions behind a Global Load Balancer. Note: secrets are RAM-only, so a region's secrets are lost if its instances all die. Document this trade-off.

### 7.2 Secret replication (optional)

Mirror each secret to a second region so creator-side burn still works under partial outages.

> **For engineers.** Async replication queue. Strict ordering between burn and read to avoid revealing already-deleted ciphertext.

### 7.3 Operator console

A separate, internal-only dashboard for operators to view shard-level memory pressure, GC sweep timing, and rate-limit hit rates. Not exposed to end users.

> **For engineers.** Expose `expvar` or Prometheus metrics behind a service-account guarded path.

---

## 8. Quality-of-life cleanups already on the radar

These are not features in the user-visible sense; they are the cleanups that the audit caught. Tracked here so they don't get lost.

- Replace the dead `components/Navbar.tsx` or finish wiring it
- Replace the dead `workers/cryptoWorker.ts` or wire it for large-payload encryption
- Single-source the daily limit constant (`30`) instead of repeating it in 5 places
- Move the placeholder `useLocation` import out of `AdminDashboard.tsx`
- Pick one ellipsis style (`Loading…` Unicode) and apply everywhere
- Remove em-dashes from copy and apply a consistent action-verb system

---

_This roadmap is a living document. Add to it as new ideas land._
