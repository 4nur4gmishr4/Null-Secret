package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"os"
	"strings"

	"null-secret/internal/models"
	"null-secret/internal/store"
)

type API struct {
	store *store.Storage
}

func NewAPI(s *store.Storage) *API {
	return &API{store: s}
}

func (api *API) CorsMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		origin := os.Getenv("ALLOWED_ORIGIN")
		reqOrigin := r.Header.Get("Origin")

		if origin == "" {
			allowedOrigins := map[string]bool{
				"http://localhost:5173":            true,
				"http://localhost:8080":            true,
				"https://null-secret.vercel.app":   true,
			}
			if allowedOrigins[reqOrigin] {
				origin = reqOrigin
			} else {
				origin = "https://null-secret.vercel.app"
			}
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		// Add Security Headers
		w.Header().Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next(w, r)
	}
}

func (api *API) RateLimitMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ip := strings.Split(r.RemoteAddr, ":")[0]
		if proxyIP := r.Header.Get("X-Forwarded-For"); proxyIP != "" && os.Getenv("TRUST_PROXY") == "true" {
			ips := strings.Split(proxyIP, ",")
			ip = strings.TrimSpace(ips[0])
		}

		if !api.store.Limiter.Allow(ip) {
			writeError(w, http.StatusTooManyRequests, "rate limit exceeded")
			return
		}
		next(w, r)
	}
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

	id, err := api.store.Store(req.Payload, req.Expiry, req.ViewLimit)
	if err != nil {
		if errors.Is(err, store.ErrCapacityExceeded) {
			writeError(w, http.StatusServiceUnavailable, err.Error())
		} else {
			writeError(w, http.StatusInternalServerError, "failed to generate secret ID")
		}
		return
	}
	writeJSON(w, http.StatusCreated, models.CreateSecretResponse{ID: id})
}

func (api *API) HandleGetSecret(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "only GET allowed")
		return
	}

	pathParts := strings.Split(r.URL.Path, "/")
	if len(pathParts) < 5 || pathParts[4] == "" {
		writeError(w, http.StatusBadRequest, "missing secret id")
		return
	}
	id := pathParts[4]

	secret, ok := api.store.RetrieveAndDelete(id)
	if !ok {
		writeError(w, http.StatusNotFound, "secret not found or expired")
		return
	}

	writeJSON(w, http.StatusOK, models.GetSecretResponse{
		Payload:   secret.Payload,
		Views:     secret.Views,
		ViewLimit: secret.ViewLimit,
	})
}
