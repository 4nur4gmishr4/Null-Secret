# NULL-SECRET: Project Evolution & Audit Summary

This document summarizes the complete architectural transformation, feature additions, and security remediations applied to the codebase throughout its lifecycle. The project evolved from a basic "Complaint Portal" into a production-hardened, zero-knowledge ephemeral secret sharing service dubbed **NULL-SECRET**.

---

## 🛑 What Was Removed / Deprecated

1. **Original Complaint Portal Logic:**
   - Completely stripped out the old `User` and `Complaint` data models, custom token authentication, and role-based access control.
   - Removed the original HTTP handlers.
2. **UI/UX Clutter & Generic Templates:**
   - Deleted unused Vite/React boilerplate assets (`App.css`, `react.svg`, `vite.svg`, `hero.png`).
   - Removed the monolithic `App.tsx` structure in favor of a modular pages/components architecture.
   - Eliminated all non-monochrome styling (e.g., `text-red-600`, `bg-dim`) to strictly enforce the "Brutalist" design system.
   - Replaced broken `lucide-react` brand icons (which caused fatal white-screen crashes) with hardcoded, native SVG vectors to guarantee stability.
3. **Security Vulnerabilities & Bad Practices:**
   - **Wildcard CORS:** Removed the insecure `Access-Control-Allow-Origin: *` in favor of strict origin validation.
   - **IP Spoofing:** Fixed the rate limiter to extract the true client IP from `X-Forwarded-For` rather than trusting arbitrary proxy chains.
   - **Memory Leaks:** Addressed unbounded map growth in the rate limiter by implementing an aggressive background garbage collection routine.
   - **Panic Risks:** Fixed out-of-bounds slice access panics in the backend routing logic.
   - **Stack Overflows:** Re-engineered the cryptography module's Base64 encoding logic to use asynchronous `Blob/FileReader` streams, preventing the browser from crashing with `Maximum Call Stack Size Exceeded` during large file uploads.

---

## 🟢 What Was Integrated / Added

### 1. Core Architecture & Storage
* **Backend Redesign (Go):** Segregated the project into clean `backend/` and `frontend/` directories.
* **Sharded In-Memory Storage:** Implemented a highly concurrent, 256-shard `sync.RWMutex` map structure to eliminate lock contention.
* **Automated Garbage Collection:** Added background goroutines to periodically sweep and permanently destroy expired secrets and stale rate-limit IP records.

### 2. Cryptography & Security ("Zero-Knowledge")
* **Client-Side AES-GCM:** Total shift to client-side encryption using the native Web Crypto API. The server never receives or stores plaintext data.
* **URL Hash Key Management:** Decryption keys are appended as URL fragments (`#KEY`), ensuring they are never transmitted to the backend.
* **Optional Password Protection:** Integrated PBKDF2 (100,000 iterations, SHA-256) to allow users to derive a secondary encryption key from an optional passphrase.
* **Traffic Analysis Mitigation:** Added a padding algorithm that inflates all encrypted payloads to fixed buckets (e.g., nearest 10KB boundary) to prevent length-based metadata guessing.
* **WebAuthn Biometric Locks:** Added the ability to require FaceID/TouchID/Windows Hello verification on the recipient's device before the browser will attempt decryption.
* **Robust Middleware:** Implemented strict IP-based rate limiting (10 req/min) and payload size enforcement (MaxBytesReader up to 10MB) to prevent DDoS and OOM attacks.

### 3. Advanced Features
* **Encrypted File Attachments:** Added support for uploading files (up to 4MB). Files are read into memory, converted to Base64, bundled with the text, encrypted, and padded—all within the browser.
* **Safe Blob Downloads:** Implemented memory-safe file downloading using `URL.createObjectURL()` to prevent browser crashes on large Base64 strings.
* **Multi-View Secrets:** Upgraded the "Burn-on-Read" logic to optionally support 2 or 5 views before atomic destruction. The UI accurately tracks and displays the remaining view count dynamically fetched from the Go server.
* **QR Code Generation:** Integrated local SVG QR code rendering (`qrcode.react`) on the success page for seamless mobile link sharing.

### 4. Brutalist UI/UX (The "NULL" Design System)
* **Aesthetic Enforcement:** Strictly monochrome (`#000000` / `#FFFFFF`), 0px border-radius, and 1px solid borders globally. Custom `Savery` logo fonts and `Inter`/`Jetbrains Mono` typography integrated.
* **Layout Stability:** Built rigid `<div style={{ whiteSpace: 'nowrap', width: '160px' }}>` boundaries around text scrambling effects to permanently eradicate layout jitter during animations.
* **Lottie Animation System:** Integrated 5 premium, state-driven Lottie animations:
  1.  **`logolottie.json`:** Responsive sizing (`w-8` header, `w-28` footer) looping natively alongside the brand logo.
  2.  **`shield-morph.json`:** Exact-timing preloader synchronization and encryption loading states.
  3.  **`privacylock.json`:** View Secret password gates.
  4.  **`redsecurity.json`:** 404/Error warning states.
  5.  **`privacyfull.json`:** Massive hero graphic on the Landing Page.
  - *Note:* All Lotties utilize a custom `.lottie-themed` CSS variable structure to flawlessly auto-invert blacks to whites and hue-shift colors when users toggle Dark Mode.
* **Theme Toggle:** Built a square, state-persistent NULL-BLACK / NULL-WHITE typography-based theme switcher ("A").
* **Accessibility (WCAG 2.2):** Added `aria-live` regions for screen-reader announcements, high-contrast `:focus-visible` outlines for keyboard navigation, and programmatic focus management upon decryption.

### 5. DevOps, Testing & Infrastructure
* **Zero-Delay Free Hosting:** Designed and documented an orchestration model utilizing `Vercel` (Frontend Edge) and `Render` (Backend Go) linked together with an automated `cron-job.org` health check to defeat the 15-minute sleep cycle and guarantee 0ms cold starts for free.
* **Containerization:** Wrote highly optimized, multi-stage `Dockerfile`s for both the Alpine Go backend and the Nginx React frontend.
* **CI/CD Pipeline:** Configured GitHub Actions (`.github/workflows/main.yml`) to automatically test, vet, and build the full stack on every push/PR.
* **Vite Optimizations:** Configured `manualChunks` in the Rollup build step to split large vendor libraries (like Lottie), resolving chunk size warnings and improving load times.
* **Testing:** Implemented automated race-condition and unit testing in Go (`storage_test.go`).
* **Branding:** Replaced the generic Vite icon with the custom provided `favicon.png`.