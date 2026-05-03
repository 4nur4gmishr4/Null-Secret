# Contributing to Null-Secret

Thanks for your interest in improving Null-Secret. This document explains how to propose changes, what the review bar looks like, and how to keep your patches from sitting in limbo.

---

## Table of Contents

- [Ground Rules](#ground-rules)
- [Getting Started](#getting-started)
- [Development Loop](#development-loop)
- [Branch & Commit Conventions](#branch--commit-conventions)
- [Code Style](#code-style)
- [Testing Expectations](#testing-expectations)
- [Security Considerations](#security-considerations)
- [Pull Request Checklist](#pull-request-checklist)
- [Release Process](#release-process)

---

## Ground Rules

- **Respect the threat model.** Null-Secret is zero-knowledge by design. No change should allow the server to see plaintext, log user identifiers, or weaken the encryption-on-client contract.
- **Never commit secrets or binaries.** The repo excludes `.env*`, `*.db`, `*.exe`, `*.key`, `*.pem`. If `git status` shows one, stop and remove it before committing.
- **Small, focused PRs win.** One bug fix or one feature per pull request. Refactors separate from behaviour changes.
- **Prefer upstream fixes over workarounds.** Identify and remove the root cause rather than patching symptoms.
- **Ask before large changes.** Open an issue with a short design sketch before writing more than ~200 lines of new code.

---

## Getting Started

### Prerequisites

| Tool | Version |
|---|---|
| Go | 1.25 or newer |
| Node | 20 or newer (22 recommended) |
| Git | 2.40 or newer |
| A Firebase project | Auth + Firestore enabled |

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
# Populate VITE_FIREBASE_* and VITE_API_BASE in .env.local
npm install
cd ..
```

### Run locally

```powershell
# Terminal 1
cd backend
go run ./cmd/api

# Terminal 2
cd frontend
npm run dev
```

Backend listens on `:8080`; frontend on `:5173`. CORS is allow-listed for localhost in development mode.

---

## Development Loop

1. **Sync** the latest `main`: `git pull --rebase origin main`
2. **Branch** from `main`: `git switch -c <type>/<short-description>`
3. **Code.** Keep commits atomic and compilable.
4. **Verify locally** before opening a PR:

   ```powershell
   # Backend
   cd backend
   go build ./...
   go test ./...

   # Frontend
   cd ..\frontend
   npx tsc -b --noEmit
   npm run build
   ```

5. **Push** and open a pull request against `main`.

---

## Branch & Commit Conventions

### Branch naming

```
<type>/<short-kebab-description>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `security`.

Examples:
- `feat/totp-enrollment`
- `fix/decrypt-padding-edge-case`
- `security/constant-time-admin-compare`

### Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/) when practical:

```
<type>(<scope>): <short imperative subject>

<body: what and why, not how>

<footer: BREAKING CHANGE, refs, etc.>
```

Good:

```
feat(auth): translate Firebase error codes to friendly messages

Adds utils/authErrors.ts mapping 22 codes. Removes raw
"Firebase: Error (auth/...)" strings from the signup and
login screens.
```

Bad:

```
update stuff
```

---

## Code Style

### Go

- Run `gofmt` before committing.
- Keep exported identifiers documented with a comment that begins with the identifier name.
- Use `log/slog` for structured logging, never `log.Print*`.
- Propagate `context.Context` through long-lived operations.
- Prefer `errors.Is` / `errors.As` over string matching.
- Constant-time comparison (`crypto/subtle`) is mandatory for any secret comparison.

### TypeScript

- Strict mode stays on. Do not disable with `// @ts-ignore` unless accompanied by a comment explaining why.
- No `any` outside of documented interop shims (currently only `LottieView` for an ESM interop edge case).
- Prefer the shared components: `AuthLayout`, `SecurityPageHeader`, `BackLink`, `PasswordInput`, `GoogleSignInButton`, `NoiseBackground`. Do not re-implement these.
- Use CSS variables (`var(--text-primary)`) and the utility classes (`.eyebrow-label`, `.section-title`, `.caps-button`) instead of ad-hoc Tailwind stacks.
- Keep imports at the top; never import inside a function body.
- Names: components in `PascalCase`, hooks in `useCamelCase`, files that export one component take the component name.

### Commenting discipline

- Write **why**, not **what**. The code already says what.
- Only comment when business logic or a non-obvious constraint is involved.
- Remove stale comments immediately when the code beneath them changes.

---

## Testing Expectations

| Layer | Minimum bar |
|---|---|
| Backend | New public function → a table-driven test in `*_test.go`. Run `go test ./...`. |
| Frontend | New component with state or API calls → add smoke coverage once Vitest lands. Until then, run the [manual checklist](./PROJECT_STATUS.md#testing--verification). |
| Security changes | Must include a regression test. No exceptions. |

Never weaken or delete tests without an explicit reason documented in the PR description.

---

## Security Considerations

- The **URL fragment** (`#...`) is the user's only protection on the wire. Do not store, transmit, or log it.
- The **master key** on the backend protects data at rest. Keep it in environment variables only.
- The **admin key** stored in SQLite must always be hashed (`SHA-256`). Never store the plaintext.
- All **secret comparisons** must use `crypto/subtle.ConstantTimeCompare` in Go or `crypto.subtle` equivalents in TS.
- Any change that touches crypto requires a second reviewer.
- Report security issues privately via [SECURITY.md](./SECURITY.md). Do not open a public issue for a vulnerability.

---

## Pull Request Checklist

Copy this into your PR description and tick what applies.

- [ ] `go build ./...` passes
- [ ] `go test ./...` passes
- [ ] `npx tsc -b --noEmit` passes
- [ ] `npm run build` succeeds
- [ ] No new `any` types without justification
- [ ] No new inline-style duplication where a shared component or utility class applies
- [ ] No committed secrets, binaries, or `.env.*` files
- [ ] New public API documented in [`API.md`](./API.md)
- [ ] Noteworthy change added to [`CHANGELOG.md`](./CHANGELOG.md) under `## [Unreleased]`
- [ ] Screenshot or screencast attached for UI changes
- [ ] Manual smoke-test steps listed if automated tests are not feasible yet

---

## Release Process

This is a rolling-release project; `main` is always the deployable tip.

1. Merge the PR.
2. Move the `## [Unreleased]` entries in `CHANGELOG.md` under a new dated heading.
3. Tag the commit: `git tag -a release-YYYY-MM-DD -m "<short summary>"`.
4. Push the tag: `git push origin release-YYYY-MM-DD`.
5. Let the deployment platforms (Render + Vercel) auto-deploy from `main`.

---

Thanks for contributing. The review bar exists to keep user trust, not to keep you out — if something is unclear, open a draft PR or an issue and ask.
