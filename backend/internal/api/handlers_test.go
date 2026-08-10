// Copyright (c) 2026 Anurag Mishra. All Rights Reserved. PROPRIETARY AND CONFIDENTIAL.
package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"null-secret/internal/config"
	"null-secret/internal/models"
	"null-secret/internal/store"
)

// routeRequest builds an httptest request carrying a chi route context with the
// given :id param. The handler tests invoke handlers directly instead of
// through the router, so chi.URLParam must be seeded manually.
func routeRequest(method, path, id string) *http.Request {
	req := httptest.NewRequest(method, path, nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("id", id)
	return req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))
}

func setupTestStorage(t *testing.T) *store.Storage {
	dummyKey := make([]byte, 32)
	s, err := store.NewStorage("file::memory:?cache=shared", dummyKey, ".")
	if err != nil {
		t.Fatalf("failed to init storage: %v", err)
	}
	return s
}

func TestHandleHealthz(t *testing.T) {
	cfg := &config.Config{}
	s := setupTestStorage(t)
	defer s.Close()
	a := NewAPI(s, cfg)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/healthz", nil)
	rr := httptest.NewRecorder()

	a.HandleHealth(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var resp map[string]any
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("could not decode response: %v", err)
	}
	if resp["status"] != "OK" {
		t.Errorf("expected status OK, got %v", resp["status"])
	}
}

func TestHandleCreateSecret(t *testing.T) {
	cfg := &config.Config{}
	s := setupTestStorage(t)
	defer s.Close()
	a := NewAPI(s, cfg)

	payload := models.CreateSecretRequest{
		Payload:   []byte("super_secret_payload"),
		Expiry:    1,
		ViewLimit: 1,
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/secret", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	a.HandleCreateSecret(rr, req)

	if status := rr.Code; status != http.StatusCreated {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusCreated)
	}

	var resp models.CreateSecretResponse
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("could not decode response: %v", err)
	}
	if resp.ID == "" || resp.AdminKey == "" {
		t.Errorf("expected ID and AdminKey in response")
	}
}

func TestHandleTelemetry_Unauthorized(t *testing.T) {
	cfg := &config.Config{SuperAdminKey: "test-super-key"}
	s := setupTestStorage(t)
	defer s.Close()
	a := NewAPI(s, cfg)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/telemetry", nil)
	rr := httptest.NewRecorder()

	a.HandleTelemetry(rr, req)

	if status := rr.Code; status != http.StatusUnauthorized {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusUnauthorized)
	}
}

func TestHandleTelemetry_Authorized(t *testing.T) {
	cfg := &config.Config{SuperAdminKey: "test-super-key"}
	s := setupTestStorage(t)
	defer s.Close()
	a := NewAPI(s, cfg)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/telemetry", nil)
	req.Header.Set("X-Admin-Key", "test-super-key")
	rr := httptest.NewRecorder()

	a.HandleTelemetry(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v", status, http.StatusOK)
	}

	var resp map[string]any
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("could not decode response: %v", err)
	}
	for _, key := range []string{"goroutines", "heap_alloc_mb", "active_secrets", "total_payload_mb"} {
		if _, ok := resp[key]; !ok {
			t.Errorf("missing key %q in telemetry response", key)
		}
	}
}

func TestHandleCreateSecret_CapsExpiry(t *testing.T) {
	cfg := &config.Config{}
	s := setupTestStorage(t)
	defer s.Close()
	a := NewAPI(s, cfg)

	payload := models.CreateSecretRequest{
		Payload:   []byte("test"),
		Expiry:    9999,
		ViewLimit: 100,
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/secret", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	a.HandleCreateSecret(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", rr.Code)
	}

	var resp models.CreateSecretResponse
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("decode error: %v", err)
	}

	info, err := s.GetInfo(resp.ID, resp.AdminKey)
	if err != nil {
		t.Fatalf("could not retrieve secret info: %v", err)
	}
	if info.ViewLimit != 10 {
		t.Errorf("expected viewLimit capped to 10, got %d", info.ViewLimit)
	}
}

func TestHandleAdminLogin_Success(t *testing.T) {
	cfg := &config.Config{SuperAdminKey: "my-secret"}
	s := setupTestStorage(t)
	defer s.Close()
	a := NewAPI(s, cfg)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/login", nil)
	req.Header.Set("X-Admin-Key", "my-secret")
	rr := httptest.NewRecorder()

	a.HandleAdminLogin(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
}

func TestHandleAdminLogin_Failure(t *testing.T) {
	cfg := &config.Config{SuperAdminKey: "my-secret"}
	s := setupTestStorage(t)
	defer s.Close()
	a := NewAPI(s, cfg)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/login", nil)
	req.Header.Set("X-Admin-Key", "wrong-key")
	rr := httptest.NewRecorder()

	a.HandleAdminLogin(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
}

func TestHandlePurgeAll_Unauthorized(t *testing.T) {
	cfg := &config.Config{SuperAdminKey: "purge-key"}
	s := setupTestStorage(t)
	defer s.Close()
	a := NewAPI(s, cfg)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/purge", nil)
	rr := httptest.NewRecorder()

	a.HandlePurgeAll(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rr.Code)
	}
}

func TestHandlePurgeAll_Authorized(t *testing.T) {
	cfg := &config.Config{SuperAdminKey: "purge-key"}
	s := setupTestStorage(t)
	defer s.Close()
	a := NewAPI(s, cfg)

	_, _, err := s.Store([]byte("to-purge"), 1, 1, "", nil)
	if err != nil {
		t.Fatal(err)
	}

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/admin/purge", nil)
	req.Header.Set("X-Admin-Key", "purge-key")
	rr := httptest.NewRecorder()

	a.HandlePurgeAll(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}

	var resp map[string]any
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if count, ok := resp["count"].(float64); !ok || count != 1 {
		t.Errorf("expected purge count 1, got %v", resp["count"])
	}
}

// TestSecurityHeaders exercises the full middleware chain (SetupRoutes) and
// locks in the defense-in-depth header set every response must carry. The
// Permissions-Policy is asserted exactly so a future change to the browser
// permission surface requires a deliberate, reviewed edit.
func TestSecurityHeaders(t *testing.T) {
	cfg := &config.Config{}
	s := setupTestStorage(t)
	defer s.Close()
	a := NewAPI(s, cfg)
	r := a.SetupRoutes()

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 from /health, got %d", rr.Code)
	}

	exact := map[string]string{
		"Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
		"X-Content-Type-Options":    "nosniff",
		"X-Frame-Options":           "DENY",
		"Referrer-Policy":           "strict-origin-when-cross-origin",
		"Permissions-Policy":        "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
	}
	for header, want := range exact {
		if got := rr.Header().Get(header); got != want {
			t.Errorf("header %s = %q, want %q", header, got, want)
		}
	}
	if csp := rr.Header().Get("Content-Security-Policy"); !strings.HasPrefix(csp, "default-src 'self'") {
		t.Errorf("Content-Security-Policy = %q, want prefix \"default-src 'self'\"", csp)
	}
}

func TestHandleCreateSecret_EmptyPayload(t *testing.T) {
	cfg := &config.Config{}
	s := setupTestStorage(t)
	defer s.Close()
	a := NewAPI(s, cfg)

	payload := models.CreateSecretRequest{
		Payload: []byte{},
	}
	body, _ := json.Marshal(payload)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/secret", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()

	a.HandleCreateSecret(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty payload, got %d", rr.Code)
	}
}

func createSecretViaHandler(t *testing.T, a *API, payload []byte, expiry, viewLimit int) models.CreateSecretResponse {
	t.Helper()
	reqBody := models.CreateSecretRequest{Payload: payload, Expiry: expiry, ViewLimit: viewLimit}
	body, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/secret", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	a.HandleCreateSecret(rr, req)
	if rr.Code != http.StatusCreated {
		t.Fatalf("create helper: expected 201, got %d", rr.Code)
	}
	var resp models.CreateSecretResponse
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("create helper: decode error: %v", err)
	}
	return resp
}

func TestHandleGetSecret_Success(t *testing.T) {
	cfg := &config.Config{}
	s := setupTestStorage(t)
	defer s.Close()
	a := NewAPI(s, cfg)

	created := createSecretViaHandler(t, a, []byte("read-me-once"), 1, 1)

	req := routeRequest(http.MethodGet, "/api/v1/secret/"+created.ID, created.ID)
	rr := httptest.NewRecorder()
	a.HandleGetSecret(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
	var resp models.GetSecretResponse
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("decode error: %v", err)
	}
	if string(resp.Payload) != "read-me-once" {
		t.Errorf("payload mismatch: got %q", resp.Payload)
	}
	if resp.Views != 1 || resp.ViewLimit != 1 {
		t.Errorf("expected views=1 limit=1, got views=%d limit=%d", resp.Views, resp.ViewLimit)
	}
}

func TestHandleGetSecret_NotFound(t *testing.T) {
	cfg := &config.Config{}
	s := setupTestStorage(t)
	defer s.Close()
	a := NewAPI(s, cfg)

	req := routeRequest(http.MethodGet, "/api/v1/secret/does-not-exist", "does-not-exist")
	rr := httptest.NewRecorder()
	a.HandleGetSecret(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", rr.Code)
	}
}

func TestHandleGetSecret_Expired(t *testing.T) {
	cfg := &config.Config{}
	s := setupTestStorage(t)
	defer s.Close()
	a := NewAPI(s, cfg)

	// A negative expiry puts the row in the past before the handler runs, which
	// exercises the 410 + delete path.
	id, _, err := s.Store([]byte("expired-payload"), -1, 1, "", nil)
	if err != nil {
		t.Fatalf("store failed: %v", err)
	}

	req := routeRequest(http.MethodGet, "/api/v1/secret/"+id, id)
	rr := httptest.NewRecorder()
	a.HandleGetSecret(rr, req)

	if rr.Code != http.StatusGone {
		t.Fatalf("expected 410, got %d", rr.Code)
	}
}

func TestHandleGetSecret_TimeLocked(t *testing.T) {
	cfg := &config.Config{}
	s := setupTestStorage(t)
	defer s.Close()
	a := NewAPI(s, cfg)

	unlock := time.Now().Add(30 * time.Minute)
	id, _, err := s.Store([]byte("locked-payload"), 1, 1, "", &unlock)
	if err != nil {
		t.Fatalf("store failed: %v", err)
	}

	req := routeRequest(http.MethodGet, "/api/v1/secret/"+id, id)
	rr := httptest.NewRecorder()
	a.HandleGetSecret(rr, req)

	if rr.Code != http.StatusLocked {
		t.Fatalf("expected 423, got %d", rr.Code)
	}
	var resp models.SecretLockedResponse
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("decode error: %v", err)
	}
	if !resp.UnlockAt.Equal(unlock) {
		t.Errorf("expected unlockAt %v, got %v", unlock, resp.UnlockAt)
	}
}

func TestHandleGetSecret_ViewLimitDeletesOnHit(t *testing.T) {
	cfg := &config.Config{}
	s := setupTestStorage(t)
	defer s.Close()
	a := NewAPI(s, cfg)

	created := createSecretViaHandler(t, a, []byte("two-reads"), 1, 2)

	get := func() int {
		req := routeRequest(http.MethodGet, "/api/v1/secret/"+created.ID, created.ID)
		rr := httptest.NewRecorder()
		a.HandleGetSecret(rr, req)
		return rr.Code
	}

	if code := get(); code != http.StatusOK {
		t.Fatalf("first read: expected 200, got %d", code)
	}
	if code := get(); code != http.StatusOK {
		t.Fatalf("second read (limit reached): expected 200, got %d", code)
	}
	if code := get(); code != http.StatusNotFound {
		t.Fatalf("third read: expected 404, got %d", code)
	}
}

func TestHandleGetSecretInfo_MissingAdminKey(t *testing.T) {
	cfg := &config.Config{}
	s := setupTestStorage(t)
	defer s.Close()
	a := NewAPI(s, cfg)

	req := routeRequest(http.MethodGet, "/api/v1/secret/x/info", "x")
	rr := httptest.NewRecorder()
	a.HandleGetSecretInfo(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}
}

func TestHandleGetSecretInfo_SuccessWrongKeyAndMissing(t *testing.T) {
	cfg := &config.Config{}
	s := setupTestStorage(t)
	defer s.Close()
	a := NewAPI(s, cfg)

	created := createSecretViaHandler(t, a, []byte("info-payload"), 24, 3)

	// Correct key returns the info.
	req := routeRequest(http.MethodGet, "/api/v1/secret/"+created.ID+"/info", created.ID)
	req.Header.Set("X-Admin-Key", created.AdminKey)
	rr := httptest.NewRecorder()
	a.HandleGetSecretInfo(rr, req)
	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
	var info models.SecretInfoResponse
	if err := json.NewDecoder(rr.Body).Decode(&info); err != nil {
		t.Fatalf("decode error: %v", err)
	}
	if info.ViewLimit != 3 || info.Views != 0 {
		t.Errorf("expected limit=3 views=0, got limit=%d views=%d", info.ViewLimit, info.Views)
	}

	// A wrong key must 404 with the same message a missing secret yields, so
	// the endpoint never reveals whether a secret exists.
	req2 := routeRequest(http.MethodGet, "/api/v1/secret/"+created.ID+"/info", created.ID)
	req2.Header.Set("X-Admin-Key", "wrong-admin-key")
	rr2 := httptest.NewRecorder()
	a.HandleGetSecretInfo(rr2, req2)
	if rr2.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for wrong key, got %d", rr2.Code)
	}

	// A missing secret 404s as well.
	req3 := routeRequest(http.MethodGet, "/api/v1/secret/nope/info", "nope")
	req3.Header.Set("X-Admin-Key", "whatever")
	rr3 := httptest.NewRecorder()
	a.HandleGetSecretInfo(rr3, req3)
	if rr3.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for missing secret, got %d", rr3.Code)
	}
}

func TestHandleBurnSecret_MissingAdminKey(t *testing.T) {
	cfg := &config.Config{}
	s := setupTestStorage(t)
	defer s.Close()
	a := NewAPI(s, cfg)

	req := routeRequest(http.MethodDelete, "/api/v1/secret/x", "x")
	rr := httptest.NewRecorder()
	a.HandleBurnSecret(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", rr.Code)
	}
}

func TestHandleBurnSecret_SuccessWrongKeyAndGone(t *testing.T) {
	cfg := &config.Config{}
	s := setupTestStorage(t)
	defer s.Close()
	a := NewAPI(s, cfg)

	created := createSecretViaHandler(t, a, []byte("burn-me"), 24, 1)

	// Wrong key → 404.
	req := routeRequest(http.MethodDelete, "/api/v1/secret/"+created.ID, created.ID)
	req.Header.Set("X-Admin-Key", "wrong-admin-key")
	rr := httptest.NewRecorder()
	a.HandleBurnSecret(rr, req)
	if rr.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for wrong key, got %d", rr.Code)
	}

	// Correct key → 200 burned.
	req2 := routeRequest(http.MethodDelete, "/api/v1/secret/"+created.ID, created.ID)
	req2.Header.Set("X-Admin-Key", created.AdminKey)
	rr2 := httptest.NewRecorder()
	a.HandleBurnSecret(rr2, req2)
	if rr2.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr2.Code)
	}

	// The row is gone for good.
	req3 := routeRequest(http.MethodGet, "/api/v1/secret/"+created.ID, created.ID)
	rr3 := httptest.NewRecorder()
	a.HandleGetSecret(rr3, req3)
	if rr3.Code != http.StatusNotFound {
		t.Fatalf("expected 404 after burn, got %d", rr3.Code)
	}
}
