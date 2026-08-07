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
   To prevent traffic analysis (inferring the secret based on the ciphertext length), the plaintext JSON string is padded with random noise up to the nearest predefined bucket size (1 KB, 5 KB, 10 KB, or 100 KB).
   
3. **Encryption:**
   A 12-byte Initialization Vector (IV) is generated. The padded plaintext is encrypted using AES-256-GCM. The Web Crypto API automatically appends a 16-byte authentication tag to the resulting ciphertext.

4. **Bundling:**
   The IV, the Ciphertext, and the Authentication Tag are concatenated into a single `Uint8Array`.
   *If a password was used:* The base64-encoded salt is appended to the bundle using a custom delimiter.

## Ciphertext Byte Layout

The final payload sent to the Go API is a Base64-encoded string of the bundled array. 

### Standard Layout (No Password)
```text
[ 12 bytes IV ] [ N bytes Ciphertext ] [ 16 bytes Auth Tag ]
```

### Password-Protected Layout
```text
[ 12 bytes IV ] [ N bytes Ciphertext ] [ 16 bytes Auth Tag ] : [ Base64 Salt ]
```

## The "Zero-Knowledge" Guarantee

When the secret is successfully stored on the server, the server responds with a unique `id` (e.g., `a1b2c3d4`). 
The frontend constructs the final sharing link by concatenating the `id` and the raw Base64-encoded Master Key into the URL fragment:

`https://null-secret.vercel.app/v/a1b2c3d4#base64MasterKeyHere`

According to RFC 3986 (Section 3.5), HTTP clients **must not** send the URL fragment (anything after the `#`) to the server. Therefore, the decryption key never touches the network, the backend, or the database. 

When the recipient opens the link, the React frontend extracts the key from `window.location.hash`, fetches the ciphertext from the API using the `id`, and decrypts it locally.
