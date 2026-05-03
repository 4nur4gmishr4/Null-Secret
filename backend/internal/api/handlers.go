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

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"golang.org/x/time/rate"

	"null-secret/internal/config"
	"null-secret/internal/models"
	"null-secret/internal/store"
)

const (
	adminKeyHeader = "X-Admin-Key"
	maxRequestBody = 1 * 1024 * 1024 // 1 MB
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

// clientIP returns the host portion of r.RemoteAddr, stripping the
// ephemeral TCP port so the rate limiter keys per-host, not per-connection.
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

// adminKeyFrom prefers the X-Admin-Key header (or Authorization: Bearer <k>)
// and falls back to the legacy ?admin_key= query parameter for backward
// compatibility. New clients SHOULD send the header to avoid leaking the
// credential through Referer headers, browser history, and proxy logs.
func adminKeyFrom(r *http.Request) string {
	if k := r.Header.Get(adminKeyHeader); k != "" {
		return k
	}
	if auth := r.Header.Get("Authorization"); strings.HasPrefix(auth, "Bearer ") {
		return strings.TrimPrefix(auth, "Bearer ")
	}
	return r.URL.Query().Get("admin_key")
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

// Middleware enforces CORS for browser-initiated requests. When no Origin header
// is present (e.g. curl, Postman, server-to-server calls), the request is allowed
// through — this is the standard CORS model. Non-browser abuse is mitigated by
// the per-IP rate limiter, not by CORS.
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
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(api.cors.Middleware)
	r.Use(api.GlobalRateLimitMiddleware)
	r.Use(api.RateLimitMiddleware)
	r.Use(api.ConcurrencyMiddleware)

	r.Get("/health", api.HandleHealth) // New health endpoint
	r.Get("/api/v1/healthz", api.HandleHealth) // Alias for backward compatibility
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

func (api *API) HandleHealth(w http.ResponseWriter, r *http.Request) {
	if api.store == nil || api.store.DB() == nil {
		writeError(w, http.StatusInternalServerError, "Storage not initialized")
		return
	}
	if err := api.store.DB().Ping(); err != nil {
		writeError(w, http.StatusServiceUnavailable, "Database unreachable")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"status":  "OK",
		"storage": "healthy",
	})
}

// HandleTelemetry returns detailed runtime metrics. Requires SUPER_ADMIN_KEY.
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
			writeError(w, http.StatusRequestEntityTooLarge, "payload exceeds 10MB")
			return
		}
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if len(req.Payload) == 0 {
		writeError(w, http.StatusBadRequest, "payload is required")
		return
	}
	if req.Expiry <= 0 {
		req.Expiry = 24
	}
	if req.Expiry > 168 { // Max 7 days — matches frontend select options
		req.Expiry = 168
	}
	if req.ViewLimit <= 0 {
		req.ViewLimit = 1
	}
	if req.ViewLimit > 10 { // Max 10 views — sensible cap
		req.ViewLimit = 10
	}

	id, adminKey, err := api.store.Store(req.Payload, req.Expiry, req.ViewLimit)
	if err != nil {
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
	ip := clientIP(r)

	adminKey := adminKeyFrom(r)
	if adminKey == "" {
		writeError(w, http.StatusUnauthorized, "missing admin key")
		return
	}
	info, ok := api.store.GetInfo(id, adminKey)
	if !ok {
		slog.Warn("Secret info not found or invalid admin key", "req_id", reqID, "ip", ip)
		writeError(w, http.StatusNotFound, "secret not found or invalid admin key")
		return
	}
	slog.Info("Secret info retrieved", "req_id", reqID, "ip", ip)
	writeJSON(w, http.StatusOK, info)
}

func (api *API) HandleBurnSecret(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing secret id")
		return
	}
	reqID := middleware.GetReqID(r.Context())
	ip := clientIP(r)

	adminKey := adminKeyFrom(r)
	if adminKey == "" {
		writeError(w, http.StatusUnauthorized, "missing admin key")
		return
	}
	if api.store.Burn(id, adminKey) {
		slog.Info("Secret successfully burned by admin", "req_id", reqID, "ip", ip)
		writeJSON(w, http.StatusOK, map[string]string{"status": "burned"})
		return
	}
	slog.Warn("Failed to burn secret", "req_id", reqID, "ip", ip)
	writeError(w, http.StatusNotFound, "secret not found or invalid admin key")
}

func (api *API) HandleGetSecret(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	reqID := middleware.GetReqID(r.Context())
	ip := clientIP(r)

	if id == "" {
		writeError(w, http.StatusBadRequest, "missing secret id")
		return
	}

	secret, err := api.store.RetrieveAndDelete(id)
	if err != nil {
		slog.Info("Secret retrieval failed", "req_id", reqID, "ip", ip, "error", err)
		if errors.Is(err, store.ErrExpired) {
			writeError(w, http.StatusGone, "secret expired")
		} else {
			writeError(w, http.StatusNotFound, "secret not found")
		}
		return
	}

	slog.Info("Secret successfully retrieved and destroyed", "req_id", reqID, "ip", ip)

	writeJSON(w, http.StatusOK, models.GetSecretResponse{
		Payload:   secret.Payload,
		Views:     secret.Views,
		ViewLimit: secret.ViewLimit,
	})
}

func (api *API) HandlePurgeAll(w http.ResponseWriter, r *http.Request) {
	reqID := middleware.GetReqID(r.Context())
	ip := clientIP(r)

	adminKey := adminKeyFrom(r)
	superKey := api.config.SuperAdminKey

	if adminKey == "" || superKey == "" || subtle.ConstantTimeCompare([]byte(adminKey), []byte(superKey)) != 1 {
		slog.Warn("Unauthorized purge attempt", "req_id", reqID, "ip", ip)
		writeError(w, http.StatusUnauthorized, "invalid or missing admin key")
		return
	}

	count := api.store.PurgeAll()
	slog.Info("All secrets purged by super admin", "req_id", reqID, "ip", ip, "purged_count", count)
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
