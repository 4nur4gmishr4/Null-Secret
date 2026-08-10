# Cryptography Specification

This document details the exact cryptographic primitives, key derivation functions, and byte layouts used by Null-Secret. It serves as a reference for security researchers and developers building interoperable clients.

## High-Level Primitives

Null-Secret relies exclusively on the **Web Crypto API** (`window.crypto.subtle`). No third-party cryptographic libraries are used for the core encryption flow to minimize supply chain risk.

| Operation | Primitive | Parameters |
| :--- | :--- | :--- |
| **Symmetric Encryption** | AES-GCM | 256-bit key, 96-bit (12-byte) IV, 128-bit authentication tag |
| **Key Generation** | CSPRNG | `crypto.getRandomValues(new Uint8Array(32))` |
| **Key Derivation (Optional)** | PBKDF2 | HMAC-SHA256, 600,000 iterations, 128-bit (16-byte) salt |

## The Encryption Pipeline

When a user creates a secret, the following pipeline executes entirely within their browser:

1. **Master Key Generation:**
   A 32-byte (256-bit) cryptographically secure random key is generated using `crypto.getRandomValues()`.
   *If the user specifies an optional password:* The 32-byte key is instead derived from the password using PBKDF2 (HMAC-SHA256) with 600,000 iterations and a securely generated 16-byte random salt.

2. **Bucket Padding:**
   To prevent traffic analysis (inferring the secret based on the ciphertext length), the plaintext JSON string is padded to the nearest predefined bucket size (1 KB, 5 KB, 10 KB). Envelopes that already exceed 10 KB are padded to the next multiple of 10 KB.
   
3. **Encryption:**
   A 12-byte Initialization Vector (IV) is generated. The padded plaintext is encrypted using AES-256-GCM. The Web Crypto API automatically appends a 16-byte authentication tag to the resulting ciphertext.

4. **Bundling:**
   The ciphertext, IV, and optional salt are serialised into a JSON envelope `{ p, i, s? }` where `p` = base64 ciphertext, `i` = base64 IV, `s` = base64 salt (only present in password mode). This envelope is then base64-encoded to form the `payload` field sent to the server. The AES key itself is never included in the bundle — it is exported separately and placed in the URL fragment.

## Payload Envelope

The server-stored payload is a base64-encoded JSON string.

### Standard Layout (No Password)
```json
{ "p": "<base64 ciphertext>", "i": "<base64 IV>" }
```

### Password-Protected Layout
```json
{ "p": "<base64 ciphertext>", "i": "<base64 IV>", "s": "<base64 salt>" }
```

The AES-256 key (32 bytes → 44 characters in base64) is placed in the URL fragment after `#` and is never transmitted to the server.

## The "Zero-Knowledge" Guarantee

When the secret is successfully stored on the server, the server responds with a unique `id` (e.g., `a1b2c3d4`).
The frontend constructs the final sharing link by concatenating the `id` and the raw Base64-encoded AES-256 data key into the URL fragment:

`https://null-secret.app/v/a1b2c3d4#base64AESKeyHere`

According to RFC 3986 (Section 3.5), HTTP clients **must not** send the URL fragment (anything after the `#`) to the server. Therefore, the decryption key never touches the network, the backend, or the database. 

When the recipient opens the link, the React frontend extracts the key from `window.location.hash`, fetches the ciphertext from the API using the `id`, and decrypts it locally.
