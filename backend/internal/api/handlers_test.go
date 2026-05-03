package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"null-secret/internal/config"
	"null-secret/internal/models"
	"null-secret/internal/store"
)

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
		Expiry:    9999,    // should be capped to 168
		ViewLimit: 100,     // should be capped to 10
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

	// Verify the stored secret has capped values by retrieving its info
	info, ok := s.GetInfo(resp.ID, resp.AdminKey)
	if !ok {
		t.Fatal("could not retrieve secret info")
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

	// Store a secret first
	_, _, err := s.Store([]byte("to-purge"), 1, 1)
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
