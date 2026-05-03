# Changelog

All notable changes to Null-Secret are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). The project is rolling-release; dated headings mark user-visible milestones rather than formal version numbers.

---

## [Unreleased]

### Added
- Professional documentation set: `LICENSE` (MIT), `CONTRIBUTING.md`, `CHANGELOG.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `ARCHITECTURE.md`, `API.md`, `DEPLOYMENT.md`, `SUPPORT.md`.
- `.github/ISSUE_TEMPLATE/` with bug-report and feature-request forms.
- `.github/PULL_REQUEST_TEMPLATE.md` that mirrors the contributor checklist.

### Changed
- `.gitignore` rewritten with sectioned, professional patterns. `.env.example` is now correctly excluded from the ignore list so contributors can bootstrap.
- Footer no longer displays a hard-coded version string; the marketing copy now reads "Built for privacy".
- `README.md` no longer references a `v1.0.0` version label.

---

## 2026-05-03 — Error translation and documentation hardening

### Added
- `frontend/src/utils/authErrors.ts`: maps 22 Firebase `auth/*` codes to plain-language messages.
- `PROJECT_STATUS.md`: full project status report with scoring (82/100), architecture diagram, and gap analysis.

### Changed
- `Authscreen.tsx`, `Signup.tsx`, `ForgotPassword.tsx`, `AccountSettings.tsx`, `DestroyVault.tsx` now use the shared `friendlyAuthError` translator. Users no longer see raw `Firebase: Error (auth/...)` strings.
- All auth handlers clear previous errors before each attempt.

---

## 2026-05-03 — Shared layout primitives

### Added
- `SecurityPageHeader` component with `aside`, `lottie`, and `eyebrowColor` props for variant pages.
- `BackLink` component for uniform "Back to …" navigation.

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
- `Authscreen`, `Signup`, `ForgotPassword` rebuilt on top of `AuthLayout` and the new form primitives (removed ≈200 lines of duplication).
- `TwoFactorSetup`, `BiometricSetup` rebuilt on top of `SecurityPageHeader`.
- Replaced `any` types in `Landing.tsx` and the `ProtectedRoute` helper in `App.tsx` with the proper Firebase `User` type.

### Fixed
- **[Security]** `backend/internal/store/storage.go`: `decryptPayload` no longer silently returns unencrypted bytes when the `v1:` prefix is missing; it now errors out loudly.
- **[Security]** Admin-key validation consolidated into `validateAdminKey` using `crypto/subtle.ConstantTimeCompare` exclusively. Removed the plaintext-key fallback path from both `GetInfo` and `Burn`.
- **[Security]** `VACUUM INTO` backup path now escapes single quotes, closing a quote-injection vector that could be triggered by a crafted `BACKUP_DIR` value.

### Removed
- Committed binary artifacts (`backend/api.exe`, `backend/cmd/api/api.exe`) and runtime SQLite files (`backend/test.db*`).
- Stray typo-duplicate markdown files (`FEATURESs.md`, `READMEs.md`).

---

## 2026-05-03 — Terms of Service and streamlined navigation

### Added
- `TermsOfService` page (`/terms`) with 11 sections covering acceptance, responsibilities, privacy, account terms, prohibited uses, and modifications.

### Changed
- Hamburger menu slimmed: removed the verbose "Resources", "Appearance", "Legal", and "Contact" sections. Only "Navigate" and "Your account" remain.
- Footer bottom-bar "Terms of Service" link now points to `/terms` instead of a GitHub LICENSE file.

---

## 2026-05-03 — Mandatory authentication

### Added
- `ProtectedRoute` wrapper component in `App.tsx` that guards authenticated routes: `/app`, `/history`, `/security`, `/security/*`, `/account`.
- Firebase auth state listener in `ProtectedRoute`; unauthenticated users are redirected to `/login`.

### Changed
- Landing-page "View Source" button replaced with "Sign In to Start" and "Create Account" CTAs.
- Desktop header "Create Secret" button now redirects to `/login` when the user is not signed in.
- Hamburger menu "Create Secret" item respects the same protection.

---

## 2026-05-03 — Context-aware landing page

### Changed
- Landing page now reads authentication state. Signed-in users see "Create Secret" and "My Account"; signed-out users see "Sign In to Start" and "Create Account".
- Final CTA section adapts its copy and destination based on authentication state.

---

## 2026-05-03 — UI polish and professional footer

### Added
- 4-column footer: Branding, Product, Resources, Connect. Includes inline SVG icons for GitHub, Twitter/X, LinkedIn, Email. A bottom bar carries Privacy Policy and Terms links.

### Changed
- All "Log out" and "Sign out" UI copy rendered in red (`text-red-500`) across `Layout`, `DeviceSessions`, and `SuperAdmin`.
- `SuperAdmin` "Lock" button adopts the same red treatment.

---

## Pre-May 2026 — Initial public preview

Initial feature set shipped:

- Browser-side AES-256-GCM encryption with PBKDF2-SHA256 (600 000 iterations).
- One-time and time-limited share links.
- File attachments up to 6 MB (single inline, multiple auto-zipped).
- Self-destructing in-memory storage with optional SQLite persistence encrypted at rest.
- Admin links for view-count checking and early burning.
- Firebase email and Google sign-in.
- Light, dark, and system-preference themes.
- Activity log with daily-quota tracking.
- Inactivity-based auto-logout.
- Backend health indicator.
- Per-IP and global rate limiting.
- Content Security Policy, HSTS, and related security headers.
- Graceful shutdown and periodic backup worker.
