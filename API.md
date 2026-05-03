# API Reference

The Null-Secret backend exposes a small JSON HTTP API over `/api/v1`. This document describes every endpoint, its request and response shape, authentication requirements, and error cases.

All responses are `application/json`. All requests that have a body must set `Content-Type: application/json`.

---

## Table of Contents

- [Base URL](#base-url)
- [Authentication](#authentication)
- [Rate Limits](#rate-limits)
- [Error Shape](#error-shape)
- [Endpoints](#endpoints)
  - [GET /health](#get-health)
  - [GET /api/v1/healthz](#get-apiv1healthz)
  - [POST /api/v1/secret](#post-apiv1secret)
  - [GET /api/v1/secret/{id}](#get-apiv1secretid)
  - [GET /api/v1/secret/{id}/info](#get-apiv1secretidinfo)
  - [DELETE /api/v1/secret/{id}](#delete-apiv1secretid)
  - [POST /api/v1/admin/login](#post-apiv1adminlogin)
  - [GET /api/v1/admin/telemetry](#get-apiv1admintelemetry)
  - [DELETE /api/v1/admin/purge](#delete-apiv1adminpurge)
- [Status Codes](#status-codes)
- [Security Headers](#security-headers)

---

## Base URL

| Environment | URL |
|---|---|
| Local | `http://localhost:8080/api/v1` |
| Production | `https://<your-backend-domain>/api/v1` |

The `/health` alias at the root path is available for platform health probes.

---

## Authentication

Three distinct credentials are used, all as HTTP headers.

### Per-secret admin key

Created alongside every secret and returned in the `POST /api/v1/secret` response. Required for reading stats or burning the secret early.

```
X-Admin-Key: <admin-key>
```

or (legacy / Bearer-compatible):

```
Authorization: Bearer <admin-key>
```

The legacy `?admin_key=…` query parameter is still accepted but **strongly discouraged** because it leaks into Referer headers, browser history, and proxy logs. New clients must use the header form.

### Super-admin key

Set via the `SUPER_ADMIN_KEY` environment variable on the backend. Required for `/api/v1/admin/*` endpoints.

```
X-Admin-Key: <super-admin-key>
```

All comparison is constant-time via `crypto/subtle.ConstantTimeCompare`.

### No user-identity auth

The secret-lifecycle endpoints are **anonymous**. Any browser can create a secret. Firebase identity is used only on the frontend for quota tracking and history logging.

---

## Rate Limits

Three independent layers applied to every request under `/api/v1/*`:

| Layer | Limit | Response |
|---|---|---|
| Global token bucket | 100 req/s, burst 100 | `429 global rate limit exceeded` |
| Per-IP sliding window | 20 req/min | `429 rate limit exceeded` |
| Concurrency semaphore | 100 in-flight | `503 server at capacity` |

Per-IP limiting keys on the host portion of `RemoteAddr`. IPv6 addresses are collapsed to a `/64` prefix.

---

## Error Shape

Every error response follows this shape:

```json
{
  "error": {
    "code": "Not Found",
    "message": "secret not found"
  }
}
```

`code` is the standard HTTP status text (`Bad Request`, `Unauthorized`, `Too Many Requests`, etc.); `message` is a human-readable detail. Clients should not parse the message — key off the HTTP status code.

---

## Endpoints

### `GET /health`

Platform liveness probe.

**Auth:** none.
**Response:** `200 OK`

```json
{
  "status": "OK",
  "storage": "healthy"
}
```

Returns `500` if storage is not initialised, `503` if the database is unreachable.

---

### `GET /api/v1/healthz`

Alias of `/health` kept for backward compatibility with existing platform configurations.

---

### `POST /api/v1/secret`

Create a new secret.

**Auth:** none.

**Request body:**

```json
{
  "payload": "<base64 ciphertext bundle>",
  "expiry": 24,
  "viewLimit": 1
}
```

| Field | Type | Required | Default | Bounds |
|---|---|---|---|---|
| `payload` | string (bytes, base64-decoded) | yes | — | 1 B – 1 MB |
| `expiry` | integer (hours) | no | `24` | Capped to `168` (7 days) |
| `viewLimit` | integer | no | `1` | Capped to `10` |

**Request size cap:** 1 MB total body (`http.MaxBytesReader`). Exceeding it yields `413 Request Entity Too Large` with message `payload exceeds 10MB`.

**Response:** `201 Created`

```json
{
  "id": "6b3f…",
  "adminKey": "a9ef…"
}
```

| Field | Notes |
|---|---|
| `id` | 24-character hex. Used in the share URL path. |
| `adminKey` | 24-character hex. Shown once. Required for `/info` and burn operations. |

**Errors:**

| Status | Condition |
|---|---|
| `400 Bad Request` | Missing or invalid body, empty payload |
| `413 Request Entity Too Large` | Body exceeds 1 MB |
| `429 Too Many Requests` | Rate limit |
| `503 Service Unavailable` | Storage capacity exceeded or semaphore full |

---

### `GET /api/v1/secret/{id}`

Retrieve a secret. Atomically increments the view counter and deletes the row when the limit is reached.

**Auth:** none — anyone with the link may read.

**Response:** `200 OK`

```json
{
  "payload": "<base64 ciphertext bundle>",
  "views": 1,
  "viewLimit": 1
}
```

**Errors:**

| Status | Condition |
|---|---|
| `400 Bad Request` | Missing id |
| `404 Not Found` | Id does not exist or was already burned |
| `410 Gone` | Secret expired before being read |
| `429 Too Many Requests` | Rate limit |

---

### `GET /api/v1/secret/{id}/info`

Read stats for a secret without incrementing the view counter.

**Auth:** per-secret admin key (`X-Admin-Key`).

**Response:** `200 OK`

```json
{
  "views": 0,
  "viewLimit": 1,
  "expiresAt": "2026-05-04T09:15:32Z"
}
```

**Errors:**

| Status | Condition |
|---|---|
| `400 Bad Request` | Missing id |
| `401 Unauthorized` | Missing admin key |
| `404 Not Found` | Id does not exist, is expired, or admin key does not match |

---

### `DELETE /api/v1/secret/{id}`

Burn a secret before it has been read the allowed number of times.

**Auth:** per-secret admin key.

**Response:** `200 OK`

```json
{
  "status": "burned"
}
```

**Errors:**

| Status | Condition |
|---|---|
| `400 Bad Request` | Missing id |
| `401 Unauthorized` | Missing admin key |
| `404 Not Found` | Id does not exist or admin key does not match |

---

### `POST /api/v1/admin/login`

Verify a super-admin key. Used by the `/super-admin` frontend page to gate the telemetry dashboard.

**Auth:** super-admin key (`X-Admin-Key`).

**Response:** `200 OK`

```json
{
  "status": "authenticated"
}
```

**Errors:** `401 Unauthorized` for any mismatch or missing header.

---

### `GET /api/v1/admin/telemetry`

Return runtime and storage statistics.

**Auth:** super-admin key.

**Response:** `200 OK`

```json
{
  "status": "OK",
  "goroutines": 18,
  "heap_alloc_mb": 6.42,
  "active_secrets": 2,
  "total_payload_mb": 0.003
}
```

**Errors:** `401 Unauthorized` if the key is missing or wrong.

---

### `DELETE /api/v1/admin/purge`

Delete every secret in storage. Destructive; intended only for emergency wipe.

**Auth:** super-admin key.

**Response:** `200 OK`

```json
{
  "status": "purged",
  "count": 17
}
```

**Errors:** `401 Unauthorized` if the key is missing or wrong.

---

## Status Codes

| Code | Meaning in Null-Secret |
|---|---|
| `200 OK` | Request succeeded |
| `201 Created` | Secret created |
| `400 Bad Request` | Malformed or missing field |
| `401 Unauthorized` | Missing or invalid admin key |
| `403 Forbidden` | CORS: origin not in allow-list |
| `404 Not Found` | Secret not found or admin key mismatch |
| `410 Gone` | Secret expired |
| `413 Request Entity Too Large` | Body over 1 MB |
| `429 Too Many Requests` | Rate limit tripped |
| `500 Internal Server Error` | Storage init failure or encoding panic |
| `503 Service Unavailable` | Storage capacity exceeded or semaphore full |

---

## Security Headers

Every response carries:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; script-src 'self'; worker-src 'self';
    connect-src 'self' <VITE_API_BASE> https://*.firebaseio.com https://*.googleapis.com;
    img-src 'self' data: blob: https://*.googleusercontent.com;
    style-src 'self' 'unsafe-inline';
    font-src 'self' data: https://fonts.gstatic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
```

The CSP `connect-src` source list is derived from `VITE_API_BASE`; ensure this matches your deployed backend URL.

---

## Example Flows

### Creating and reading a secret (curl)

```bash
# 1. Create
RESP=$(curl -s -X POST http://localhost:8080/api/v1/secret \
  -H "Content-Type: application/json" \
  -d '{"payload":"aGVsbG8=","expiry":24,"viewLimit":1}')
echo "$RESP"
# { "id": "…", "adminKey": "…" }

ID=$(echo "$RESP" | jq -r .id)

# 2. Read (burns after 1 view)
curl -s http://localhost:8080/api/v1/secret/$ID
```

### Checking stats then burning (admin)

```bash
ADMIN="…admin-key-from-create-response…"

curl -s http://localhost:8080/api/v1/secret/$ID/info \
  -H "X-Admin-Key: $ADMIN"
# { "views": 0, "viewLimit": 1, "expiresAt": "…" }

curl -s -X DELETE http://localhost:8080/api/v1/secret/$ID \
  -H "X-Admin-Key: $ADMIN"
# { "status": "burned" }
```

### Super-admin purge

```bash
curl -s -X DELETE http://localhost:8080/api/v1/admin/purge \
  -H "X-Admin-Key: $SUPER_ADMIN_KEY"
# { "status": "purged", "count": 42 }
```
