# Changelog

All notable changes to Null-Secret are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The project is rolling-release; dated headings mark user-visible milestones rather than formal version numbers.

---

## [Unreleased]

### Added
- Documentation set: `LICENSE` (Proprietary), `CHANGELOG.md`, `SECURITY.md`, `README.md`, `docs/ARCHITECTURE.md`, `docs/CRYPTOGRAPHY_SPEC.md`, `docs/THREAT_MODEL.md`, `docs/FEATURES.md`, `docs/PERFORMANCE.md`, `docs/USER_GUIDE.md`, `.github/SUPPORT.md`.
- `.github/ISSUE_TEMPLATE/` with bug-report and feature-request forms.
- `.github/workflows/release.yml`: tag-driven (`v*`) release pipeline that re-runs the CI gate, cross-compiles the backend, builds the frontend bundle, and drafts a GitHub Release.
- `.github/workflows/dependency-review.yml`: blocks PRs whose dependency changes introduce high-severity vulnerabilities.
- CI verifies the Render deploy artifact: builds `backend/Dockerfile` and smoke-tests the image.

### Removed
- `docs/PROJECT_STATUS.md`: duplicated README and contained an outdated self-score.

### Changed
- `.github/workflows/ci.yml`: added least-privilege `permissions`, per-ref `concurrency`, made the workflow reusable via `workflow_call`, and added the Docker image verification job.
- `.github/dependabot.yml`: added the `github-actions` ecosystem.
- `LICENSE` strengthened with trademark clause, reverse-engineering prohibition, copyright-notice preservation, limitation of liability, and governing law.
- `README.md`: removed duplicated features list and fixed a broken self-link.
- `docs/FEATURES.md`: removed shipped features from the roadmap; it is now the forward-looking roadmap and completed features reference.
- `docs/ARCHITECTURE.md`: added the `unlock_at` column to the schema block.
- `SECURITY.md`: added `Permissions-Policy` to the security headers list.
- `.gitignore` rewritten with sectioned patterns. `.env.example` is correctly excluded from the ignore list.
- Footer no longer displays a hard-coded version string.
- `README.md` no longer references a `v1.0.0` version label.

---

## 2026-05-03 — Error translation and documentation hardening

### Added
- `frontend/src/utils/authErrors.ts`: maps 22 Firebase `auth/*` codes to plain-language messages.

### Changed
- `Authscreen.tsx`, `Signup.tsx`, `ForgotPassword.tsx`, `AccountSettings.tsx`, `DestroyVault.tsx` now use the shared `friendlyAuthError` translator.
- All auth handlers clear previous errors before each attempt.

---

## 2026-05-03 — Shared layout primitives

### Added
- `SecurityPageHeader` component with `aside`, `lottie`, and `eyebrowColor` props.
- `BackLink` component.

### Changed
- `SessionTimeout`, `SecuritySettings`, `DeviceSessions`, `UsageHistory`, `AccountSettings`, `DestroyVault` refactored to use `SecurityPageHeader`.
- `SecuritySettings` and `DeviceSessions` now use `BackLink`.
- Repeated `text-xs font-bold uppercase tracking-widest` utility stacks replaced by the `.section-title` CSS utility.

---

## 2026-05-03 — Deduplication and security hardening

### Added
- Shared components: `AuthLayout`, `NoiseBackground`, `GoogleSignInButton`, `PasswordInput`.
- CSS utility classes: `.eyebrow-label`, `.section-title`, `.caps-button`.

### Changed
- `Authscreen`, `Signup`, `ForgotPassword` rebuilt on top of `AuthLayout` and the new form primitives.
- `TwoFactorSetup`, `BiometricSetup` rebuilt on top of `SecurityPageHeader`.
- Replaced `any` types in `Landing.tsx` and the `ProtectedRoute` helper in `App.tsx` with the Firebase `User` type.

### Fixed
- **[Security]** `backend/internal/store/storage.go`: `decryptPayload` errors out loudly when the `v1:` prefix is missing.
- **[Security]** Admin-key validation consolidated into `validateAdminKey` using `crypto/subtle.ConstantTimeCompare`.
- **[Security]** `VACUUM INTO` backup path now escapes single quotes to close an injection vector.

### Removed
- Committed binary artifacts and runtime SQLite files.
- Stray typo-duplicate markdown files.

---

## 2026-05-03 — Terms of Service and streamlined navigation

### Added
- `TermsOfService` page (`/terms`) with 11 sections.

### Changed
- Hamburger menu slimmed down to "Navigate" and "Your account".
- Footer bottom-bar "Terms of Service" link now points to `/terms`.

---

## 2026-05-03 — Mandatory authentication

### Added
- `ProtectedRoute` wrapper component in `App.tsx` that guards authenticated routes.
- Firebase auth state listener in `ProtectedRoute`.

### Changed
- Landing-page CTA replaced with "Sign In to Start".
- Header "Create Secret" button redirects to `/login` when the user is not signed in.

---

## 2026-05-03 — Context-aware landing page

### Changed
- Landing page reads authentication state. Signed-in users see "Create Secret" and "My Account"; signed-out users see "Sign In to Start" and "Create Account".
- Final CTA section adapts its copy and destination based on authentication state.

---

## 2026-05-03 — UI polish and professional footer

### Added
- 4-column footer with links.

### Changed
- Log out UI copy rendered in red (`text-red-500`).
- `SuperAdmin` "Lock" button adopts the same red treatment.

---

## Pre-May 2026 — Initial public preview

Initial feature set shipped:

- Browser-side AES-256-GCM encryption with PBKDF2-SHA256.
- One-time and time-limited share links.
- File attachments up to 30 MB.
- Self-destructing SQLite storage.
- Admin links for view-count checking and early burning.
- Firebase email and Google sign-in.
- Light, dark, and system-preference themes.
- Activity log with daily-quota tracking.
- Inactivity-based auto-logout.
- Backend health indicator.
- Per-IP and global rate limiting.
- Graceful shutdown and periodic backup worker.
