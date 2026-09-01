# Cryptography Specification

This document details the exact cryptographic implementations in Null-Secret. The codebase applies encryption twice: once in the browser (`frontend/src/utils/crypto.ts`) and once in the backend (`backend/internal/store/storage.go`).

## Browser Encryption

The React application uses the native `window.crypto.subtle` API to encrypt data before making HTTP requests.

### Key Generation

If the user does not supply a password, the browser generates a random 256-bit key:
```typescript
window.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
```
The browser exports this key to a raw `ArrayBuffer`, encodes it to base64, and places it in the URL fragment (`#<base64_key>`).

### Key Derivation

If the user supplies a password, the browser derives the key using PBKDF2:
1. Generates a 16-byte random salt using `crypto.getRandomValues`.
2. Encodes the password string to bytes.
3. Derives a 256-bit key using PBKDF2 with HMAC-SHA256 and exactly 600,000 iterations.
4. Includes the base64-encoded salt in the final API payload so the recipient can re-derive the key.

### Text Payload Padding

To prevent traffic analysis based on payload length, the browser pads text-only secrets.
1. The plaintext is wrapped in a JSON envelope: `{"d": "plaintext", "p": "xxxx"}`.
2. The padding field `p` expands until the JSON string matches the nearest bucket size.
3. Bucket boundaries are 1,024 bytes, 5,120 bytes, and 10,240 bytes. Payloads exceeding 10,240 bytes are padded to the next multiple of 10,240.

### File Payload Layout

File payloads do not use base64-string padding, as converting a 30MB file to base64 before padding expands it unnecessarily. Instead, files use a binary layout.

The layout consists of a 4-byte length prefix, a JSON metadata string, and the raw file bytes:
```
[ 4-byte Big-Endian Unsigned Integer ] (Header Length)
[ JSON String ] (Header: name, type, text)
[ Raw File Bytes ]
```

When a user attaches multiple files, the frontend compresses them using the `fflate` library. The resulting zip archive becomes the raw file byte segment.

### AES-GCM Execution

The browser generates a new 12-byte initialization vector (IV) for every operation. It passes the padded string or binary buffer into `crypto.subtle.encrypt` using the AES-GCM algorithm.

The browser base64-encodes the ciphertext and the IV, assembling a JSON bundle:
```json
{
  "p": "<base64_ciphertext>",
  "i": "<base64_iv>",
  "s": "<base64_salt>"
}
```
The application sends this bundle to the backend. The `s` field is omitted if no password was used.

## Backend Encryption

The Go backend treats the incoming JSON bundle as untrusted data. It encrypts the payload before writing to the database.

### Operations

1. The backend reads a 32-byte hex-encoded `MASTER_KEY` from the environment on startup.
2. When handling a POST request, `storage.go` generates a 12-byte IV using `crypto/rand`.
3. The backend executes AES-256-GCM encryption on the JSON bundle.
4. The backend prepends `v1:` to the ciphertext, followed by the IV, and stores the resulting blob in SQLite.

### Admin Key Hashing

The backend returns a random admin key to the client during secret creation. The backend stores this key as a SHA-256 hash.

When the client issues a DELETE request, it supplies the admin key in a header. The backend hashes the provided key and compares it against the database record using `crypto/subtle.ConstantTimeCompare`. A mismatch results in a 403 Forbidden response.

## Failure Handling

- If the browser receives a manipulated payload (e.g., altered ciphertext or IV), the AES-GCM authentication tag fails to validate. `crypto.subtle.decrypt` throws an error, and the UI displays a generic failure message.
- If the backend receives an admin key that fails constant-time comparison, it does not alter the record.
- If the backend reads a database row missing the `v1:` prefix, it returns a 500 Internal Server Error, assuming data corruption.
