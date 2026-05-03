# Security Policy

Null-Secret is a zero-knowledge cryptographic tool. Trust in the crypto and the transport is the only thing the product sells, so security reports take absolute priority.

---

## Table of Contents

- [Reporting a Vulnerability](#reporting-a-vulnerability)
- [What to Include](#what-to-include)
- [Our Commitments](#our-commitments)
- [Disclosure Timeline](#disclosure-timeline)
- [Scope](#scope)
- [Out of Scope](#out-of-scope)
- [Safe Harbor](#safe-harbor)
- [Security Model at a Glance](#security-model-at-a-glance)
- [Hall of Fame](#hall-of-fame)

---

## Reporting a Vulnerability

**Do not open a public GitHub issue for a suspected vulnerability.**

Send details privately to:

- **Email:** [anuragmishrasnag06082004@gmail.com](mailto:anuragmishrasnag06082004@gmail.com)
- **Subject line:** `[Null-Secret Security] <short title>`

Encrypt sensitive findings with the PGP key below if you have one. If you do not, an unencrypted email to the address above is still the right first step.

> A formal PGP key will be published here once the project reaches its first tagged release. For now, please coordinate in plain email and avoid attaching working exploits.

---

## What to Include

A good report makes triage fast. Please provide:

1. **A title** that describes the impact in one line.
2. **A step-by-step reproduction** — request bodies, URLs, expected vs. actual behaviour.
3. **The environment** — browser, OS, backend version (commit SHA if known).
4. **Severity estimate** — low / medium / high / critical, and why.
5. **Suggested remediation** if you have one.
6. **Your name and contact** for the acknowledgement. Anonymous reports are fine; you just will not be credited.

---

## Our Commitments

- We will acknowledge your report within **72 hours**.
- We will give you a triage assessment within **7 days**.
- We will not sue, pursue, or report you to law enforcement for good-faith research that stays within the [scope](#scope).
- We will credit you in the [Hall of Fame](#hall-of-fame) and in the release notes, unless you prefer to stay anonymous.
- We will publish a post-mortem once a fix ships, omitting any detail that could help attackers still hitting older self-hosted deployments.

---

## Disclosure Timeline

| Severity | Target fix window | Public disclosure |
|---|---|---|
| Critical (data loss, crypto break, authentication bypass) | 7 days | After fix is deployed |
| High (privilege escalation, significant DoS) | 30 days | After fix is deployed |
| Medium (limited info leak, rate-limit bypass) | 60 days | After fix is deployed, or 90 days from report |
| Low (hardening suggestions) | Best effort | With the next changelog entry |

If we cannot meet these windows we will tell you why before they expire.

---

## Scope

In scope for security reports:

- The `backend/` Go service, including every public API under `/api/v1/`.
- The `frontend/` React app, especially anything touching encryption, authentication, or the URL fragment.
- The cryptographic primitives in `frontend/src/utils/crypto.ts` and `backend/internal/store/storage.go`.
- Authentication flows (email/password and Google OAuth via Firebase).
- The admin-key model and the super-admin endpoints.
- The rate-limiter and concurrency-control middleware.
- Any Content Security Policy or security-header regression.

---

## Out of Scope

The following will usually be closed without a fix unless you demonstrate user-impact:

- Missing rate limits on the Vite dev server, or anything exposed only in development mode.
- DoS attacks that require flooding faster than the documented rate limits allow.
- Social-engineering or phishing against users.
- Vulnerabilities in third-party platforms we rely on (Firebase, Render, Vercel). Please report those to the vendor directly.
- Missing `SameSite` attributes on cookies we do not set.
- Issues in outdated browsers that Chromium, Firefox, or Safari no longer support.
- Self-XSS that requires the victim to paste attacker-controlled content into DevTools.
- Clickjacking on pages that already send `X-Frame-Options: DENY`.
- Brute-force attacks against weak passwords chosen by the user.

---

## Safe Harbor

We will not pursue legal action against researchers who, in good faith:

1. Only access data they own or that they have explicit permission to access.
2. Avoid privacy violations, service degradation, and data destruction.
3. Give us a reasonable time to respond before disclosing publicly.
4. Do not run automated scanners against production at a rate that degrades service for other users.

If you are unsure whether an activity is permitted, email us and ask first.

---

## Security Model at a Glance

- **Keys never leave the client.** The AES-256 key lives in the URL fragment (`#…`), which browsers do not transmit to the server by design.
- **Ciphertext is padded** to bucket sizes (1 KB / 5 KB / 10 KB) before transmission so message length cannot be inferred from request size.
- **Server-side at-rest encryption.** Ciphertext stored in SQLite is re-encrypted with an AES-GCM master key, so a compromised database file alone is not enough to read secrets.
- **Admin keys are hashed** (`SHA-256`) before storage. All comparison uses `crypto/subtle.ConstantTimeCompare` to block timing attacks.
- **Super-admin endpoints** require a separate `SUPER_ADMIN_KEY` and perform a constant-time equality check.
- **Rate limits**: 20 requests per minute per IP, 100 requests per second globally, and a concurrency semaphore capped at 100 in-flight requests.
- **Request-body cap**: 1 MB per request via `http.MaxBytesReader`.
- **Security headers**: CSP (script-src 'self', frame-ancestors 'none'), HSTS with `preload`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- **Auto-logout** after client-configured inactivity window.
- **Firebase Auth** powers identity; the backend never sees user passwords.

For the full architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Hall of Fame

Researchers who have responsibly disclosed issues in Null-Secret will be credited here.

_No public reports yet. You could be the first._
