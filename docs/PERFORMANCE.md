# Performance

This document records the exact capacity limits and scaling behaviors of Null-Secret. The architecture prioritizes predictable memory usage and denial-of-service resilience over unbounded throughput.

## Configured Limits

The following limits are hardcoded into the Go backend (`backend/internal/api/handlers.go` and `backend/internal/store/storage.go`):

| Component | Limit | Behavior on Violation |
| :--- | :--- | :--- |
| **Global Token Bucket** | 100 req/sec | Returns `429 Too Many Requests`. |
| **IP Sliding Window** | 20 req/min | Returns `429 Too Many Requests`. Evaluates IPv6 addresses by `/64` prefix. |
| **In-Flight Semaphore** | 100 concurrent requests | Returns `503 Service Unavailable`. |
| **Request Body Size** | 56 MB | Connection closed by `http.MaxBytesReader`. |
| **SQLite Row Count** | 1,000 active rows | Database evicts the 10 oldest rows during `INSERT`. |

## Source Code Observations

- **Payload Expansion:** Encrypting a file in the browser increases its size before transmission. Base64 encoding expands binary data by ~33%. To fit within the 48MB database limit and 56MB HTTP limit, the frontend restricts raw file inputs to 30MB.
- **Client-Side Zipping:** Selecting multiple files triggers browser-side compression via `fflate`. This reduces network egress overhead but requires the client to hold the uncompressed files, the zip archive, and the final ciphertext in memory simultaneously. Devices with low RAM may crash the browser tab if attempting to compress 30MB of highly incompressible data.

## Expected Bottlenecks

1. **Client Memory Exhaustion:** For large payloads, the browser is the primary bottleneck. The AES-GCM buffer operations require contiguous memory allocation. 
2. **Network Bandwidth:** Serving a 48MB payload blocks an HTTP connection until the transfer completes. The in-flight semaphore caps connections at 100. If 100 clients concurrently download 48MB payloads on slow network links, the server blocks all subsequent requests until a slot frees up.
3. **SQLite Write Contention:** SQLite in WAL mode permits concurrent readers but only one writer. Heavy, sustained POST requests will queue on the SQLite write lock. The `busy_timeout` is configured to 5000ms. Writes taking longer than 5 seconds will fail with `SQLITE_BUSY`.

## Unmeasured Assumptions

- The precise memory footprint of the Go binary under sustained maximum load (100 concurrent 56MB uploads) is unmeasured. We assume the Go garbage collector handles the 5.6GB theoretical heap expansion aggressively enough to prevent an Out Of Memory (OOM) kill on instances with limited RAM.
- We assume the 5-minute background rate-limiter cleanup interval prevents memory leaks from the `sync.Map` of IP addresses, but this has not been profiled against a distributed botnet rotating millions of IPs.
