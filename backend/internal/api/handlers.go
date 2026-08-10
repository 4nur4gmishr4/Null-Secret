// Copyright (c) 2026 Anurag Mishra. All Rights Reserved. PROPRIETARY AND CONFIDENTIAL.
package api

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"runtime"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"golang.org/x/time/rate"

	"null-secret/internal/config"
	"null-secret/internal/models"
	"null-secret/internal/store"
)

const (
	adminKeyHeader = "X-Admin-Key"
	// 56MB: the frontend advertises a 30MB combined file limit. File bytes are
	// base64-encoded twice in flight (~1.78x total — ciphertext to string, then
	// the payload bundle to string), so a 30MB file peaks near 53.3MB of body.
	// Must stay in sync with store.maxPayload (storage.go), which limits what is
	// actually persisted (the stored bundle for 30MB is ~40MB).
	maxRequestBody = 56 * 1024 * 1024
)

type API struct {
	store         *store.Storage
	config        *config.Config
	cors          *corsConfig
	globalLimiter *rate.Limiter
	sem           chan struct{}
}

func NewAPI(s *store.Storage, cfg *config.Config) *API {
	return &API{
		store:         s,
		config:        cfg,
		cors:          newCORS(cfg),
		globalLimiter: rate.NewLimiter(100, 100),
		sem:           make(chan struct{}, 100),
	}
}

func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	ip := net.ParseIP(host)
	if ip == nil {
		return host
	}
	if ip.To4() != nil {
		return ip.String()
	}
	mask := net.CIDRMask(64, 128)
	return ip.Mask(mask).String()
}

// adminKeyFrom resolves the admin key from headers only. Query parameters are
// deliberately ignored: URLs (and therefore query strings) end up in proxies,
// browser history, and request logs, so a key passed there would leak.
func adminKeyFrom(r *http.Request) string {
	if k := r.Header.Get(adminKeyHeader); k != "" {
		return k
	}
	if auth := r.Header.Get("Authorization"); strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}
	return ""
}

// redactingLogFormatter emits one structured log line per request via slog
// without writing the client IP or the full URI. Query strings are excluded
// so that any credentials passed as query parameters (accidentally or not)
// never reach stdout or the log pipeline.
type redactingLogFormatter struct{}

func (redactingLogFormatter) NewLogEntry(r *http.Request) middleware.LogEntry {
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	return &redactingLogEntry{
		scheme: scheme,
		method: r.Method,
		path:   r.URL.Path,
		proto:  r.Proto,
	}
}

type redactingLogEntry struct {
	scheme string
	method string
	path   string
	proto  string
}

func (e *redactingLogEntry) Write(status, bytes int, _ http.Header, elapsed time.Duration, _ any) {
	slog.Info("request completed",
		"method", e.method,
		"path", e.path,
		"proto", e.proto,
		"status", status,
		"bytes", bytes,
		"elapsed_ms", elapsed.Milliseconds(),
	)
}

func (e *redactingLogEntry) Panic(v any, stack []byte) {
	slog.Error("panic recovered",
		"method", e.method,
		"path", e.path,
		"panic", v,
	)
}

type corsConfig struct {
	allowed map[string]struct{}
	csp     string
}

func newCORS(cfg *config.Config) *corsConfig {
	allowed := make(map[string]struct{})
	for _, o := range cfg.AllowedOrigins {
		if o = strings.TrimSpace(o); o != "" {
			allowed[o] = struct{}{}
		}
	}
	if !strings.EqualFold(cfg.Env, "production") {
		for _, o := range []string{
			"http://localhost:5173",
			"http://localhost:5174",
			"http://localhost:8080",
		} {
			allowed[o] = struct{}{}
		}
	}

	apiBase := cfg.ViteAPIBase
	if u, err := url.Parse(apiBase); err != nil || u.Scheme == "" || u.Host == "" {
		apiBase = "http://localhost:8080"
	}

	csp := fmt.Sprintf(
		"default-src 'self'; script-src 'self'; worker-src 'self'; "+
			"connect-src 'self' %s https://*.firebaseio.com https://*.googleapis.com; "+
			"img-src 'self' data: blob: https://*.googleusercontent.com; style-src 'self' 'unsafe-inline'; "+
			"font-src 'self' data: https://fonts.gstatic.com; object-src 'none'; base-uri 'self'; "+
			"form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;",
		apiBase,
	)
	return &corsConfig{allowed: allowed, csp: csp}
}

func (c *corsConfig) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" {
			if _, ok := c.allowed[origin]; !ok {
				writeError(w, http.StatusForbidden, "origin not allowed")
				return
			}
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
		}
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, "+adminKeyHeader)
		w.Header().Set("Access-Control-Max-Age", "600")
		w.Header().Set("Content-Security-Policy", c.csp)
		w.Header().Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		// Null-Secret needs none of the browser permission surface — deny all.
		// Guards against a compromised page or dependency abusing sensors,
		// camera/mic, geolocation, or payment APIs.
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (api *API) SetupRoutes() *chi.Mux {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	if api.config.TrustProxy {
		r.Use(middleware.RealIP)
	}
	r.Use(middleware.RequestLogger(redactingLogFormatter{}))
	r.Use(middleware.Recoverer)
	r.Use(api.cors.Middleware)
	r.Use(api.GlobalRateLimitMiddleware)
	r.Use(api.RateLimitMiddleware)
	r.Use(api.ConcurrencyMiddleware)

	r.Get("/health", api.HandleHealth)
	r.Get("/api/v1/healthz", api.HandleHealth)
	r.Get("/api/v1/admin/telemetry", api.HandleTelemetry)
	r.Post("/api/v1/secret", api.HandleCreateSecret)
	r.Get("/api/v1/secret/{id}", api.HandleGetSecret)
	r.Get("/api/v1/secret/{id}/info", api.HandleGetSecretInfo)
	r.Delete("/api/v1/secret/{id}", api.HandleBurnSecret)
	r.Delete("/api/v1/admin/purge", api.HandlePurgeAll)
	r.Post("/api/v1/admin/login", api.HandleAdminLogin)

	return r
}

func (api *API) GlobalRateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !api.globalLimiter.Allow() {
			writeError(w, http.StatusTooManyRequests, "global rate limit exceeded")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (api *API) ConcurrencyMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		select {
		case api.sem <- struct{}{}:
			defer func() { <-api.sem }()
			next.ServeHTTP(w, r)
		default:
			writeError(w, http.StatusServiceUnavailable, "server at capacity")
		}
	})
}

func (api *API) RateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !api.store.Limiter.Allow(clientIP(r)) {
			writeError(w, http.StatusTooManyRequests, "rate limit exceeded")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// HandleHealth reports storage health and basic capacity stats so operators
// can monitor how close the store is to the eviction ceiling.
func (api *API) HandleHealth(w http.ResponseWriter, r *http.Request) {
	if api.store == nil || api.store.DB() == nil {
		writeError(w, http.StatusInternalServerError, "Storage not initialized")
		return
	}
	if err := api.store.DB().Ping(); err != nil {
		writeError(w, http.StatusServiceUnavailable, "Database unreachable")
		return
	}
	stats := api.store.Stats()
	writeJSON(w, http.StatusOK, map[string]any{
		"status":         "OK",
		"storage":        "healthy",
		"active_secrets": stats.ActiveSecrets,
		"capacity":       store.MaxSecrets(),
	})
}

func (api *API) HandleTelemetry(w http.ResponseWriter, r *http.Request) {
	adminKey := adminKeyFrom(r)
	superKey := api.config.SuperAdminKey
	if adminKey == "" || superKey == "" || subtle.ConstantTimeCompare([]byte(adminKey), []byte(superKey)) != 1 {
		writeError(w, http.StatusUnauthorized, "invalid or missing admin key")
		return
	}

	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	stats := api.store.Stats()

	writeJSON(w, http.StatusOK, map[string]any{
		"status":           "OK",
		"goroutines":       runtime.NumGoroutine(),
		"heap_alloc_mb":    float64(m.Alloc) / (1024 * 1024),
		"active_secrets":   stats.ActiveSecrets,
		"total_payload_mb": float64(stats.TotalPayloadBytes) / (1024 * 1024),
	})
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	buf, err := json.Marshal(data)
	if err != nil {
		slog.Error("response marshal failed", "error", err)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"error":"internal encoding error"}`))
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if _, err := w.Write(buf); err != nil {
		slog.Warn("response write failed", "error", err)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, models.ErrorResponse{Error: models.APIError{Code: http.StatusText(status), Message: msg}})
}

func (api *API) HandleCreateSecret(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, maxRequestBody)

	var req models.CreateSecretRequest
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) {
			writeError(w, http.StatusRequestEntityTooLarge, fmt.Sprintf("payload exceeds %dMB", maxRequestBody/(1024*1024)))
			return
		}
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Alias != "" {

		for _, ch := range req.Alias {
			if !((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9') || ch == '-' || ch == '_') {
				writeError(w, http.StatusBadRequest, "alias can only contain letters, numbers, dashes, and underscores")
				return
			}
		}
		if len(req.Alias) < 3 || len(req.Alias) > 64 {
			writeError(w, http.StatusBadRequest, "alias must be between 3 and 64 characters")
			return
		}
	}

	if len(req.Payload) == 0 {
		writeError(w, http.StatusBadRequest, "payload is required")
		return
	}
	if req.Expiry <= 0 {
		req.Expiry = 24
	}
	if req.Expiry > 168 {
		req.Expiry = 168
	}
	if req.ViewLimit <= 0 {
		req.ViewLimit = 1
	}
	if req.ViewLimit > 10 {
		req.ViewLimit = 10
	}

	id, adminKey, err := api.store.Store(req.Payload, req.Expiry, req.ViewLimit, req.Alias, req.UnlockAt)
	if err != nil {
		if errors.Is(err, store.ErrAliasTaken) {
			writeError(w, http.StatusConflict, err.Error())
			return
		}
		if errors.Is(err, store.ErrCapacityExceeded) {
			writeError(w, http.StatusServiceUnavailable, err.Error())
			return
		}
		slog.Error("store failed", "error", err)
		writeError(w, http.StatusInternalServerError, "failed to store secret")
		return
	}
	writeJSON(w, http.StatusCreated, models.CreateSecretResponse{ID: id, AdminKey: adminKey})
}

func (api *API) HandleGetSecretInfo(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing secret id")
		return
	}
	reqID := middleware.GetReqID(r.Context())

	adminKey := adminKeyFrom(r)
	if adminKey == "" {
		writeError(w, http.StatusUnauthorized, "missing admin key")
		return
	}
	info, ok := api.store.GetInfo(id, adminKey)
	if !ok {
		slog.Warn("Secret info not found or invalid admin key", "req_id", reqID)
		writeError(w, http.StatusNotFound, "secret not found or invalid admin key")
		return
	}
	slog.Info("Secret info retrieved", "req_id", reqID)
	writeJSON(w, http.StatusOK, info)
}

func (api *API) HandleBurnSecret(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing secret id")
		return
	}
	reqID := middleware.GetReqID(r.Context())

	adminKey := adminKeyFrom(r)
	if adminKey == "" {
		writeError(w, http.StatusUnauthorized, "missing admin key")
		return
	}
	if api.store.Burn(id, adminKey) {
		slog.Info("Secret successfully burned by admin", "req_id", reqID)
		writeJSON(w, http.StatusOK, map[string]string{"status": "burned"})
		return
	}
	slog.Warn("Failed to burn secret", "req_id", reqID)
	writeError(w, http.StatusNotFound, "secret not found or invalid admin key")
}

func (api *API) HandleGetSecret(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	reqID := middleware.GetReqID(r.Context())

	if id == "" {
		writeError(w, http.StatusBadRequest, "missing secret id")
		return
	}

	secret, err := api.store.RetrieveAndDelete(id)
	if err != nil {
		if errors.Is(err, store.ErrLocked) && secret != nil && secret.UnlockAt != nil {
			slog.Info("Secret is time-locked", "req_id", reqID, "unlock_at", *secret.UnlockAt)
			writeJSON(w, http.StatusLocked, models.SecretLockedResponse{
				Error:    "secret is time-locked",
				UnlockAt: *secret.UnlockAt,
			})
			return
		}

		slog.Info("Secret retrieval failed", "req_id", reqID, "error", err)
		if errors.Is(err, store.ErrExpired) {
			writeError(w, http.StatusGone, "secret expired")
		} else {
			writeError(w, http.StatusNotFound, "secret not found")
		}
		return
	}

	slog.Info("Secret successfully retrieved and destroyed", "req_id", reqID)

	writeJSON(w, http.StatusOK, models.GetSecretResponse{
		Payload:   secret.Payload,
		Views:     secret.Views,
		ViewLimit: secret.ViewLimit,
	})
}

func (api *API) HandlePurgeAll(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())

	adminKey := adminKeyFrom(r)
	superKey := api.config.SuperAdminKey

	if adminKey == "" || superKey == "" || subtle.ConstantTimeCompare([]byte(adminKey), []byte(superKey)) != 1 {
		slog.Warn("Unauthorized purge attempt", "req_id", reqID)
		writeError(w, http.StatusUnauthorized, "invalid or missing admin key")
		return
	}

	count := api.store.PurgeAll()
	slog.Info("All secrets purged by super admin", "req_id", reqID, "purged_count", count)
	writeJSON(w, http.StatusOK, map[string]any{"status": "purged", "count": count})
}

func (api *API) HandleAdminLogin(w http.ResponseWriter, r *http.Request) {
	adminKey := adminKeyFrom(r)
	superKey := api.config.SuperAdminKey

	if adminKey == "" || superKey == "" || subtle.ConstantTimeCompare([]byte(adminKey), []byte(superKey)) != 1 {
		writeError(w, http.StatusUnauthorized, "invalid or missing admin key")
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "authenticated"})
}
