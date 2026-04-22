# Null-Secret

A zero-knowledge, end-to-end encrypted secret sharing service. Messages are encrypted entirely in the browser using AES-256-GCM — the server never sees plaintext data.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (React + Web Crypto API)                       │
│  ┌───────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │ AES-256   │  │ PBKDF2   │  │ Payload padding      │  │
│  │ GCM       │  │ (opt.)   │  │ (traffic analysis    │  │
│  │ encrypt   │  │ password │  │  mitigation)         │  │
│  └─────┬─────┘  └────┬─────┘  └──────────┬───────────┘  │
│        └─────────────┼──────────────────┘               │
│                      ▼                                  │
│            POST /api/v1/secret                          │
│            { payload: base64(ciphertext) }              │
└──────────────────────┬──────────────────────────────────┘
                       ▼
┌──────────────────────────────────────────────────────────┐
│  Go API Server (in-memory, no database)                  │
│  ┌──────────────────────────────────────────────────┐    │
│  │ 256 sharded maps (FNV-1a) + GC + rate limiter   │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

**Key design principles:**
- The encryption key travels in the URL fragment (`#`), which is never sent to the server.
- Secrets self-destruct after reaching their view limit or expiration time.
- Optional password protection adds a second layer via PBKDF2 key derivation.
- Payload padding rounds ciphertext to fixed bucket sizes to resist traffic analysis.

## Project Structure

```
null-secret/
├── backend/               # Go API server
│   ├── main.go            # HTTP routes and entry point
│   ├── handlers.go        # Request handlers and middleware
│   ├── models.go          # Data structures
│   ├── storage.go         # Sharded in-memory store, GC, rate limiter
│   ├── storage_test.go    # Storage unit tests
│   └── Dockerfile         # Container build
├── frontend/              # React + Vite SPA
│   ├── src/
│   │   ├── App.tsx             # Root component with preloader
│   │   ├── main.tsx            # React DOM entry point
│   │   ├── index.css           # Design system and theme tokens
│   │   ├── components/
│   │   │   ├── Preloader.tsx   # Animated loading screen
│   │   │   └── DecryptedText.tsx  # Scramble text effect
│   │   ├── contexts/
│   │   │   └── ThemeContext.tsx # System-auto + manual theme toggle
│   │   ├── layouts/
│   │   │   └── Layout.tsx      # Page shell with header/footer
│   │   ├── pages/
│   │   │   ├── Home.tsx        # Secret creation form
│   │   │   ├── Success.tsx     # Generated link + QR code
│   │   │   └── ViewSecret.tsx  # Secret decryption and display
│   │   ├── utils/
│   │   │   └── crypto.ts       # AES-GCM, PBKDF2, padding, bundling
│   │   └── assets/
│   │       └── lotties/
│   │           └── shield-morph.json
│   └── index.html
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- [Go](https://go.dev/dl/) 1.21+
- [Node.js](https://nodejs.org/) 20+ with npm
- (Optional) [Docker](https://www.docker.com/) for containerised deployment

### Development

**1. Start the backend:**

```bash
cd backend
go run ./cmd/api
```

The API server will start on `http://localhost:8080`.

**2. Start the frontend:**

```bash
cd frontend
npm install
npm run dev
```

The dev server will start on `http://localhost:5173`.

### Docker

```bash
docker-compose up --build
```

This starts both services:
- Backend at `http://localhost:8080`
- Frontend at `http://localhost:5173`

## API Reference

### Create a Secret

```
POST /api/v1/secret
Content-Type: application/json

{
  "payload": "<base64-encoded encrypted blob>",
  "expiry": 24,
  "viewLimit": 1
}
```

| Field       | Type   | Description                              |
|-------------|--------|------------------------------------------|
| `payload`   | string | Base64-encoded AES-GCM ciphertext bundle |
| `expiry`    | int    | Time to live in hours (default: 24)      |
| `viewLimit` | int    | Number of views before deletion          |

**Response** `201 Created`:
```json
{ "id": "a1b2c3d4e5f6" }
```

### Retrieve a Secret

```
GET /api/v1/secret/{id}
```

**Response** `200 OK`:
```json
{
  "payload": "<base64-encoded encrypted blob>",
  "views": 1,
  "viewLimit": 1
}
```

The secret is automatically deleted when `views >= viewLimit`.

**Response** `404 Not Found`:
```json
{ "error": "secret not found or expired" }
```

### Health Check

```
GET /healthz
```

**Response** `200 OK`:
```json
{ "status": "OK", "storage": "healthy" }
```

## Configuration

| Variable         | Default                   | Description                                    |
|------------------|---------------------------|------------------------------------------------|
| `ALLOWED_ORIGIN` | `http://localhost:5173`   | CORS origin. Set to your production domain.    |
| `TRUST_PROXY`    | (unset)                   | Set to `true` when behind a reverse proxy.     |
| `VITE_API_BASE`  | `http://localhost:8080/api/v1` | Frontend API base URL (build-time).       |

## Theme System

The frontend supports three theme modes:

| Mode       | Behaviour                                            |
|------------|------------------------------------------------------|
| **Auto**   | Follows the operating system's `prefers-color-scheme` |
| **Light**  | Forces light mode                                     |
| **Dark**   | Forces dark mode                                      |

Click the theme toggle in the header to cycle: Auto → Light → Dark → Auto.

## Security Model

| Layer                 | Mechanism                                           |
|-----------------------|-----------------------------------------------------|
| Encryption            | AES-256-GCM (Web Crypto API, browser-side)          |
| Key management        | Key stays in URL fragment, never sent to server     |
| Optional password     | PBKDF2 (100k iterations, SHA-256) key derivation    |
| Traffic analysis      | Payload padded to fixed bucket sizes (1K/5K/10K)    |
| Transport             | HSTS, X-Content-Type-Options, X-Frame-Options       |
| Rate limiting         | 10 requests/minute per IP, sliding window           |
| Destruction           | Atomic delete on view limit; background GC for TTL  |

## Testing

```bash
# Backend unit tests
cd backend
go test -v ./...

# Frontend type check + production build
cd frontend
npm run build
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit changes: `git commit -m "Add your feature"`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please ensure all tests pass and the production build completes without errors before submitting.

## License

This project is proprietary software developed by Prominent Digitech Global. All rights reserved.
