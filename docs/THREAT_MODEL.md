# Threat Model

Null-Secret is designed with a **Zero-Knowledge Architecture**. This document outlines our formal threat model using the STRIDE methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) to analyze potential attack vectors and how the system mitigates them.

## Trust Boundaries

The system is divided by several critical trust boundaries:
1. **The Client (Browser):** Trusted to perform AES-256-GCM encryption/decryption securely via the Web Crypto API.
2. **The Transport Layer:** Untrusted network (mitigated by strict TLS/HTTPS requirements).
3. **The Server (Go API & SQLite):** Untrusted with plaintext data. Trusted only to store ciphertext and enforce rate limits.
4. **The Database (Firebase Firestore):** Untrusted with ciphertext. Trusted only to store user metadata (Secret IDs and timestamps).

## STRIDE Analysis

### 1. Spoofing (Impersonating a user or system)
- **Attack:** An attacker attempts to spoof a user's identity to view their history or usage quota.
- **Mitigation:** Authenticated endpoints rely on Firebase Authentication JWTs. Firestore rules strictly enforce that `request.auth.uid == uid`, mathematically guaranteeing that users can only read/write their own metadata.

### 2. Tampering (Modifying data in transit or at rest)
- **Attack:** An attacker gains access to the SQLite database and modifies the ciphertext of a stored secret to trick the recipient.
- **Mitigation:** The ciphertext is authenticated using the GCM (Galois/Counter Mode) authentication tag. If a single bit of the ciphertext or Initialization Vector (IV) is modified at rest, the `window.crypto.subtle.decrypt` function on the recipient's browser will fail with an authentication error and refuse to output plaintext.

### 3. Repudiation (Denying an action occurred)
- **Attack:** A malicious actor spams the system and denies doing so, leading to IP bans for legitimate users.
- **Mitigation:** The system relies on standard IP-based token bucket rate limiting (100 req/sec global, 10 req/min per IP). In an authenticated context (Firebase), daily quotas are strictly enforced per `uid` via Firestore atomic transactions, providing a non-repudiable audit log of usage counters.

### 4. Information Disclosure (Exposing private data)
- **Attack 1 (Server Compromise):** A nation-state or malicious insider gains full root access to the Go server and dumps the SQLite database.
  - **Mitigation:** The database only contains AES-256-GCM ciphertext. The decryption key is generated on the creator's device and appended to the URL fragment (`#key`). Browsers explicitly strip the URL fragment before sending the HTTP request (RFC 3986 §3.5). The server *never* sees the key, making the ciphertext mathematically useless to the attacker.
- **Attack 2 (Traffic Analysis):** An attacker intercepts the encrypted payload and uses its exact byte size to infer the contents (e.g., guessing a specific password length).
  - **Mitigation:** Null-Secret employs **Bucket Padding**. Before encryption, the plaintext is padded with random noise to the nearest bucket size (1KB, 5KB, 10KB, or 100KB). An attacker cannot differentiate between a 12-character password and a 900-byte private key.

### 5. Denial of Service (Crashing or exhausting the system)
- **Attack:** An attacker uploads massive payloads to exhaust the server's RAM (OOM kill) or disk space.
- **Mitigation:**
  - **RAM Exhaustion:** The Go backend enforces a strict 15 MB `maxRequestBody` limit middleware on the `/api/v1/secret` endpoint. Requests exceeding this are dropped before the body is fully parsed.
  - **Disk Exhaustion:** Secrets are automatically garbage collected. A background goroutine sweeps the SQLite database every 60 seconds and permanently deletes any secrets whose `expiresAt` timestamp has passed or whose `views >= viewLimit`. 

### 6. Elevation of Privilege (Gaining unauthorized capabilities)
- **Attack:** An attacker attempts to delete a secret they did not create.
- **Mitigation:** When a secret is created, the server returns a cryptographically secure, randomly generated `adminKey`. The `DELETE /api/v1/secret/{id}` endpoint requires this specific `adminKey` to be provided in the `X-Admin-Key` header. Without it, early deletion is impossible.

## Out of Scope

The following vectors are explicitly out of scope for this threat model:
1. **Endpoint Compromise:** If the sender or recipient's device is infected with a keylogger, screen-scraper, or malicious browser extension, the plaintext is compromised before encryption or after decryption.
2. **Supply Chain Attacks (Frontend):** If an attacker compromises the Vercel deployment pipeline and serves a malicious JavaScript bundle that exfiltrates the URL fragment (`#key`) to a third party, the system is compromised. (Mitigated partially by Subresource Integrity and strict CSP, but ultimately reliant on the host's integrity).
