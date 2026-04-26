package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"null-secret/internal/models"
	"null-secret/internal/store"
)

type API struct {
	store *store.Storage
}

func NewAPI(s *store.Storage) *API {
	return &API{store: s}
}

func (api *API) SetupRoutes() *chi.Mux {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	if os.Getenv("TRUST_PROXY") == "true" {
		r.Use(middleware.RealIP)
	}
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(api.CorsMiddleware)
	r.Use(api.RateLimitMiddleware)

	r.Get("/api/v1/healthz", api.HandleHealthz)
	r.Post("/api/v1/secret", api.HandleCreateSecret)
	r.Get("/api/v1/secret/{id}", api.HandleGetSecret)
	r.Get("/api/v1/secret/{id}/info", api.HandleGetSecretInfo)
	r.Delete("/api/v1/secret/{id}", api.HandleBurnSecret)

	return r
}

func (api *API) CorsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reqOrigin := r.Header.Get("Origin")
		origin := ""

		envOrigin := os.Getenv("ALLOWED_ORIGIN")
		
		// If ALLOWED_ORIGIN is set, allow only that and localhost for development
		if reqOrigin == "http://localhost:5173" || reqOrigin == "http://localhost:8080" {
			origin = reqOrigin
		} else if envOrigin != "" && reqOrigin == envOrigin {
			origin = reqOrigin
		} else if envOrigin != "" {
			origin = envOrigin // Fallback for browsers that don't send Origin header (though they usually do for CORS)
		} else {
			origin = "http://localhost:5173" // Default dev origin
		}

		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		// CSP connect-src must allow the API base and Firebase for auth
		apiBase := os.Getenv("VITE_API_BASE")
		if apiBase == "" {
			apiBase = "http://localhost:8080"
		}
		csp := fmt.Sprintf("default-src 'self'; connect-src 'self' %s https://*.firebaseio.com https://*.googleapis.com; img-src 'self' data: blob: https://*.googleusercontent.com; style-src 'self' 'unsafe-inline'; font-src 'self' data: https://fonts.gstatic.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;", apiBase)
		
		w.Header().Set("Content-Security-Policy", csp)
		w.Header().Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (api *API) RateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Rely on chi's RealIP middleware to set RemoteAddr securely
		ip := r.RemoteAddr

		if !api.store.Limiter.Allow(ip) {
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
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func writeError(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, models.ErrorResponse{Error: msg})
}

func (api *API) HandleCreateSecret(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "only POST allowed")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 10*1024*1024)

	var req models.CreateSecretRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body or payload too large")
		return
	}

	if len(req.Payload) == 0 {
		writeError(w, http.StatusBadRequest, "payload is required")
		return
	}

	if req.Expiry <= 0 {
		req.Expiry = 24
	}

	id, adminKey, err := api.store.Store(req.Payload, req.Expiry, req.ViewLimit)
	if err != nil {
		if errors.Is(err, store.ErrCapacityExceeded) {
			writeError(w, http.StatusServiceUnavailable, err.Error())
		} else {
			writeError(w, http.StatusInternalServerError, "failed to generate secret ID")
		}
		return
	}
	writeJSON(w, http.StatusCreated, models.CreateSecretResponse{ID: id, AdminKey: adminKey})
}

func (api *API) HandleGetSecretInfo(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	reqID := middleware.GetReqID(r.Context())
	ip := r.RemoteAddr

	adminKey := r.URL.Query().Get("admin_key")
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
	ip := r.RemoteAddr

	adminKey := r.URL.Query().Get("admin_key")
	if api.store.Burn(id, adminKey) {
		slog.Info("Secret successfully burned by admin", "req_id", reqID, "ip", ip)
		writeJSON(w, http.StatusOK, map[string]string{"status": "burned"})
	} else {
		slog.Warn("Failed to burn secret", "req_id", reqID, "ip", ip)
		writeError(w, http.StatusNotFound, "secret not found or invalid admin key")
	}
}

func (api *API) HandleGetSecret(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	reqID := middleware.GetReqID(r.Context())
	ip := r.RemoteAddr

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
