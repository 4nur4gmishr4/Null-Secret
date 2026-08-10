# Performance & Benchmarks

Null-Secret is engineered to be extremely lightweight and fast. This document outlines the expected performance characteristics, hard limits, and benchmarks of the system.

## 1. Backend Performance (Go + SQLite)

The backend is compiled to a single, statically linked Go binary. 

### Footprint
- **Memory:** The idle memory footprint of the Go API is typically `< 15 MB`. Under heavy load (handling 10 MB payload uploads), it remains bounded by the Go garbage collector and comfortably runs on Render's 512 MB Free Tier limit.
- **Binary Size:** The Docker image uses `gcr.io/distroless/static-debian12`, resulting in a final compressed image size of roughly `~10 MB`.

### Throughput & Rate Limits
- The token-bucket rate limiter enforces a strict **100 requests per second global limit** to prevent CPU exhaustion on small instances.
- Individual IP addresses are throttled to **20 requests per minute** (sliding window, IPv6 collapsed to `/64`).
- **SQLite Concurrency:** SQLite is configured with WAL (Write-Ahead Logging) mode (`_journal_mode=WAL`). This allows simultaneous readers and a single writer, allowing the application to achieve thousands of reads per second on minimal hardware without locking the database.

### Payload Limits
To prevent Out-Of-Memory (OOM) crashes, the `maxRequestBody` middleware strictly caps incoming payloads at **15 MB**. Any request exceeding this limit is rejected instantly with a `413 Payload Too Large` status code, before the body is buffered into memory.

## 2. Frontend Performance (React)

The frontend is built for speed and security, optimized using Vite.

### Bundle Size
- **Lazy Loading:** Heavy assets, such as Lottie animations (which can be >300 KB of JSON), are lazy-loaded via dynamic imports (`import()`) only when the user scrolls them into view.
- **Tree Shaking:** The Web Crypto API requires zero external dependencies, saving hundreds of kilobytes compared to bundling libraries like `crypto-js` or `libsodium.js`.

### Cryptographic Speed
The Web Crypto API (`window.crypto.subtle`) leverages native C/C++ implementations (and hardware acceleration where available) provided by the browser. 
- **AES-256-GCM:** Encrypting a maximum 10 MB payload takes milliseconds on a modern CPU.
- **PBKDF2:** The key derivation function is intentionally configured to be computationally expensive (600,000 iterations). This will typically pause the main thread for `~200ms to ~800ms` depending on the device CPU. A loading state ("Locking your message...") is rendered to provide immediate user feedback while the CPU churns.

## 3. Scaling

Null-Secret is architected as a **single vertical instance**: one Go process + one SQLite file + in-memory rate limiting. This comfortably serves the design targets (thousands of reads/sec on minimal hardware, < 15 MB idle RAM). At the moment this stops being true, scale out in the order below — each step is independent and additive, so the service keeps running at every stage.

**When to act:** monitor `(created + retrieved) / sec` from the `/api/v1/admin/telemetry` endpoint, or the global rate limiter's `429` count. Sustained 429s from the global 100 req/s token bucket, or a single DB file on a disk at capacity, are the triggers.

### Step 1 — Move the storage layer to PostgreSQL (unblocks horizontal replicas)

SQLite is the hard single-writer constraint: only one process may hold a write transaction at a time. To run more than one backend container, swap the storage backend:

1. `internal/store/storage.go` defines the full surface used by the API: `Store`, `GetInfo`, `RetrieveAndDelete`, `Burn`, `PurgeAll`, and the TTL sweep. Extract these into a `Store` interface in `internal/store` (the API already depends only on the concrete `*store.Storage` via `api.store` — introduce the interface there and type `API.store` as it).
2. Add a Postgres implementation behind that interface. The schema is small (one `secrets` table + a rate-limit key-value table); port the schema and use `SELECT ... FOR UPDATE` where `BEGIN IMMEDIATE` was used (the write-path transactions in `RetrieveAndDelete` and `Burn`).
3. Encryption at rest (`MASTER_KEY`, `v1:` prefix) and the decrypt-before-delete invariant live in `storage.go` and must be carried into the new implementation unchanged — do not touch the crypto.
4. Move the TTL worker and `VACUUM INTO` backup worker out of `NewStorage` into a per-implementation concern. Postgres needs no WAL or `VACUUM`; schedule the expiry `DELETE` on the same 60s ticker, and keep backups with `pg_dump` or logical replication instead of `VACUUM INTO`.

### Step 2 — Move rate limiting to Redis (shared state across instances)

The per-IP sliding-window limiter (`RateLimiter` in `storage.go`) and the global token bucket live in process memory, so each replica enforces its own budget. Swap the per-IP limiter for a shared Redis one:

1. `RateLimiter.Allow(ip)` is the only method the API calls. Extract the `Allow(ip) bool` signature into an interface and add a Redis-backed implementation using a sorted set per window (`ZREMRANGEBYSCORE` + `ZCARD` + `ZADD`, one key per `ip`, TTL = window). The in-memory implementation stays as the default and is what unit tests use.
2. The global 100 req/s token bucket (`rate.NewLimiter` in `handlers.go`) is the circuit-breaker for CPU exhaustion on a small instance — it is fine to keep it per-process (it is not the correctness boundary, the per-IP limiter is). Document that choice in the interface.
3. Add `REDIS_URL` to `config/config.go`; when unset, keep the in-memory path (backwards-compatible, zero-config deploys).

### Step 3 — Multi-replica deployment

With Step 1 + Step 2 complete, `backend/render.yaml` (or any platform) can scale the web service to N replicas behind the load balancer:

- Each replica runs the same stateless Go binary; the only shared state is Postgres + Redis.
- Sessions and admin keys are bearer tokens — nothing sticky is required.
- `TRUST_PROXY` must be `true` so per-IP limits see the real client IP behind the proxy (already defaulted in `render.yaml`).

**Deliberately out of scope:** this project intentionally ships as a single vertical instance. Steps 1–3 exist to keep the migration cheap if the service grows; nothing before that point is engineered around them.
