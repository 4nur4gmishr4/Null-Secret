# Performance & Benchmarks

Null-Secret is engineered to be extremely lightweight and fast. This document outlines the expected performance characteristics, hard limits, and benchmarks of the system.

## 1. Backend Performance (Go + SQLite)

The backend is compiled to a single, statically linked Go binary. 

### Footprint
- **Memory:** The idle memory footprint of the Go API is typically `< 15 MB`. Under heavy load (handling 10 MB payload uploads), it remains bounded by the Go garbage collector and comfortably runs on Render's 512 MB Free Tier limit.
- **Binary Size:** The Docker image uses `gcr.io/distroless/static-debian12`, resulting in a final compressed image size of roughly `~10 MB`.

### Throughput & Rate Limits
- The token-bucket rate limiter enforces a strict **100 requests per second global limit** to prevent CPU exhaustion on small instances.
- Individual IP addresses are throttled to **10 requests per minute**.
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

If Null-Secret needs to scale beyond a single vertical instance, the following architectural bottlenecks must be addressed:

1. **SQLite:** SQLite is a local file-based database. To scale horizontally (multiple backend containers), the storage layer (`internal/store`) must be migrated to a distributed database like PostgreSQL or Redis.
2. **In-Memory Rate Limiting:** The current rate limiter uses an in-memory `sync.Map`. Horizontal scaling would require moving this to a shared Redis instance.
