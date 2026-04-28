package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"null-secret/internal/models"
	"null-secret/internal/store"
)

const (
	adminKeyHeader = "X-Admin-Key"
	maxRequestBody = 10 * 1024 * 1024 // 10 MB
)

type API struct {
	store *store.Storage
	cors  *corsConfig
}

func NewAPI(s *store.Storage) *API {
	return &API{store: s, cors: newCORS()}
}

// clientIP returns the host portion of r.RemoteAddr, stripping the
// ephemeral TCP port so the rate limiter keys per-host, not per-connection.
func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
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

func newCORS() *corsConfig {
	allowed := make(map[string]struct{})
	for _, o := range strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",") {
		if o = strings.TrimSpace(o); o != "" {
			allowed[o] = struct{}{}
		}
	}
	if legacy := strings.TrimSpace(os.Getenv("ALLOWED_ORIGIN")); legacy != "" {
		allowed[legacy] = struct{}{}
	}
	if !strings.EqualFold(os.Getenv("ENV"), "production") {
		for _, o := range []string{
			"http://localhost:5173",
			"http://localhost:5174",
			"http://localhost:8080",
		} {
			allowed[o] = struct{}{}
		}
	}

	apiBase := strings.TrimSpace(os.Getenv("VITE_API_BASE"))
	if u, err := url.Parse(apiBase); err != nil || u.Scheme == "" || u.Host == "" {
		apiBase = "http://localhost:8080"
	}

	csp := fmt.Sprintf(
		"default-src 'self'; connect-src 'self' %s https://*.firebaseio.com https://*.googleapis.com; "+
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
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, "+adminKeyHeader)
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
	if os.Getenv("TRUST_PROXY") == "true" {
		r.Use(middleware.RealIP)
	}
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(api.cors.Middleware)
	r.Use(api.RateLimitMiddleware)

	r.Get("/api/v1/healthz", api.HandleHealthz)
	r.Post("/api/v1/secret", api.HandleCreateSecret)
	r.Get("/api/v1/secret/{id}", api.HandleGetSecret)
	r.Get("/api/v1/secret/{id}/info", api.HandleGetSecretInfo)
	r.Delete("/api/v1/secret/{id}", api.HandleBurnSecret)

	return r
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

func (api *API) HandleHealthz(w http.ResponseWriter, r *http.Request) {
	if api.store == nil {
		writeError(w, http.StatusInternalServerError, "Storage not initialized")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "OK", "storage": "healthy"})
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
	writeJSON(w, status, models.ErrorResponse{Error: msg})
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
	if req.ViewLimit <= 0 {
		req.ViewLimit = 1
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

	secret, ok := api.store.RetrieveAndDelete(id)
	if !ok {
		slog.Info("Secret not found or expired", "req_id", reqID, "ip", ip)
		writeError(w, http.StatusNotFound, "secret not found or expired")
		return
	}

	slog.Info("Secret successfully retrieved and destroyed", "req_id", reqID, "ip", ip)

	writeJSON(w, http.StatusOK, models.GetSecretResponse{
		Payload:   secret.Payload,
		Views:     secret.Views,
		ViewLimit: secret.ViewLimit,
	})
}
