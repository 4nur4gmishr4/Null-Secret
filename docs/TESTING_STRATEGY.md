# Testing Strategy

Null-Secret strictly enforces automated testing to guarantee the cryptographic integrity of the system and prevent regressions. This document outlines our testing philosophy, the tools we use, and how to write tests for both the Go backend and React frontend.

---

## 1. Backend Testing (Go)

The backend is responsible for secure storage, strict rate limiting, and garbage collection. Since the backend never handles plaintext, our tests focus heavily on **concurrency**, **database integrity**, and **HTTP middleware**.

### Running Tests
To run the full suite with the race detector enabled:
```bash
cd backend
go test -v -race ./...
```

### Philosophy & Patterns
- **Standard Library Only:** We use Go's built-in `testing` package and `net/http/httptest`. We do not use third-party assertion libraries (like `testify`) to keep the dependency tree absolutely minimal.
- **In-Memory SQLite:** All database tests use an in-memory SQLite instance (`file::memory:?cache=shared`). This ensures tests run in milliseconds without touching the disk or requiring Docker.
- **Concurrency Testing:** Because rate limiters and SQLite garbage collection run asynchronously, we use the `-race` flag heavily. When writing tests for the `store` package, ensure multiple goroutines are spawned to simulate high concurrent load.

### Key Test Areas
- **Storage Layer (`store_test.go`):** Verify that secrets are inserted correctly, `views` are atomically incremented, and secrets are permanently deleted once the `viewLimit` is hit.
- **Garbage Collection (`gc_test.go`):** Verify that expired secrets are swept from the database accurately based on timestamp boundary conditions.
- **Handlers (`handlers_test.go`):** Verify HTTP status codes (e.g., `413 Payload Too Large` for files > 15MB, `429 Too Many Requests`).

---

## 2. Frontend Testing (React / TypeScript)

The frontend is responsible for the actual cryptographic heavy lifting via the Web Crypto API. 

### Running Tests
Our CI pipeline runs static analysis and type checking. To run them locally:
```bash
cd frontend
npm run lint
npm run build # Validates TypeScript types
```

### Philosophy & Patterns
- **Type Safety First:** We rely heavily on strict TypeScript configuration (`strict: true` in `tsconfig.json`). Ensure all external payloads (like Firebase JWTs and API responses) are typed accurately.
- **Cryptographic Mocks:** When writing unit tests for `utils/crypto.ts`, testing in a pure Node.js environment requires polyfilling `window.crypto.subtle`. We recommend using `node:crypto` webcrypto implementations for tests.
- **Firebase Mocking:** Do not run live Firebase calls in tests. Firebase Auth and Firestore should be mocked so that local tests do not pollute production usage metrics.

---

## 3. Continuous Integration (CI)

Our GitHub Actions pipeline acts as the final gatekeeper before code is merged into `main`.

1. **Null-Secret CI (`ci.yml`):** Triggers on Push and Pull Request. Runs Go tests, Go vet, ESLint, and the Vite production build.
2. **CodeQL Security Scan (`codeql.yml`):** Runs static application security testing (SAST) to detect vulnerabilities, leaked secrets, or unsafe JavaScript patterns.

### Merging Requirements
- Branch protection requires the CI pipeline to pass before merging.
- Any new backend feature **must** be accompanied by a corresponding unit test in the Go `_test.go` file.
