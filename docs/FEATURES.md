# Features

This document details the implemented features of Null-Secret and their constraints, followed by planned modifications.

## Core Capabilities

### Client-Side Encryption
The browser executes AES-256-GCM encryption on user input prior to network transmission. The decryption key transmits entirely within the URL fragment (`#key`). The backend processes only ciphertext.
- **Implementation:** `frontend/src/utils/crypto.ts`
- **Constraint:** Requires a secure context (HTTPS or localhost) for the browser to expose `window.crypto.subtle`.

### Payload Expiration
Secrets exist temporarily. Creators define expiration parameters during creation.
- **View Limits:** Secrets destroy themselves after 1, 2, or 5 successful reads.
- **Time Limits:** Secrets expire after 1 hour, 24 hours, or 7 days, regardless of view count.
- **Implementation:** `backend/internal/store/storage.go`
- **Constraint:** Time-based expiration relies on a background worker executing every 60 seconds.

### Early Deletion
Creators receive an administrative token upon creating a secret. This token grants the ability to manually delete the secret before it expires.
- **Implementation:** `backend/internal/api/handlers.go` and `frontend/src/pages/AdminDashboard.tsx`
- **Constraint:** The backend stores a SHA-256 hash of the token. If the user loses the URL containing the token, deletion is impossible until natural expiration.

## Attachments

### Binary Processing
Users can attach files to their secrets. The browser processes these files into a binary layout (`[4-byte header length][JSON header][file bytes]`) rather than applying base64 text padding.
- **Implementation:** `encryptFilePayload` in `frontend/src/pages/Home.tsx`

### Browser-Side Compression
When a user selects multiple files, the frontend compresses them into a single `secure_attachments.zip` archive before encryption.
- **Implementation:** Uses the `fflate` library within `frontend/src/pages/Home.tsx`
- **Constraint:** Zipping occurs in browser memory. Extremely large file combinations may exhaust client memory limits before encryption begins. Total uncompressed input must remain under 30MB.

## Roadmap

### Secret Retrieval API
A headless decryption client allowing automated systems to retrieve and decrypt secrets without a browser interface.

### End-to-End Encrypted Notifications
A push mechanism alerting creators when a secret is opened, structured to ensure the backend cannot derive the secret's content or intended recipient identity.

### WebAuthn Integration
Transitioning the optional password lock to accept FIDO2 hardware keys or biometric authenticators.
