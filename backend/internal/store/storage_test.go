// Copyright (c) 2026 Anurag Mishra. All Rights Reserved. PROPRIETARY AND CONFIDENTIAL.
package store

import (
	"bytes"
	"sync"
	"testing"
)

func TestStorage_StoreAndRetrieve(t *testing.T) {
	dummyKey := make([]byte, 32)
	store, err := NewStorage("file::memory:?cache=shared", dummyKey, ".")
	if err != nil {
		t.Fatalf("failed to init storage: %v", err)
	}
	defer store.Close()
	payload := []byte("test-secret-payload")

	id, _, err := store.Store(payload, 1, 1, "", nil)
	if err != nil {
		t.Fatalf("failed to store secret: %v", err)
	}

	secret, err := store.RetrieveAndDelete(id)
	if err != nil {
		t.Fatalf("failed to retrieve secret: %v", err)
	}

	if !bytes.Equal(secret.Payload, payload) {
		t.Errorf("expected payload %q, got %q", payload, secret.Payload)
	}

	_, err = store.RetrieveAndDelete(id)
	if err == nil {
		t.Errorf("secret was not deleted after retrieval")
	}
}

func TestRateLimiter_AllowsTwentyPerMinutePerIP(t *testing.T) {
	rl := NewRateLimiter()
	for i := 0; i < 20; i++ {
		if !rl.Allow("1.2.3.4") {
			t.Fatalf("expected call %d to be allowed", i+1)
		}
	}
	if rl.Allow("1.2.3.4") {
		t.Error("expected the 21st call within the window to be denied")
	}
	// A distinct IP is on its own budget.
	if !rl.Allow("5.6.7.8") {
		t.Error("expected an unrelated IP to be allowed")
	}
}

func TestDecryptPayload_RejectsMissingVersionPrefix(t *testing.T) {
	key := make([]byte, 32)
	if _, err := decryptPayload([]byte("not-an-encrypted-payload"), key); err == nil {
		t.Error("expected an error when the v1: prefix is missing")
	}
}

func TestDecryptPayload_RoundTrip(t *testing.T) {
	key := make([]byte, 32)
	enc, err := encryptPayload([]byte("hello-world"), key)
	if err != nil {
		t.Fatalf("encryptPayload failed: %v", err)
	}
	if !bytes.HasPrefix(enc, []byte("v1:")) {
		t.Errorf("expected v1: version prefix, got %q", enc[:3])
	}
	dec, err := decryptPayload(enc, key)
	if err != nil {
		t.Fatalf("decryptPayload failed: %v", err)
	}
	if string(dec) != "hello-world" {
		t.Errorf("round trip mismatch: got %q", dec)
	}
}

func TestStorage_Concurrency(t *testing.T) {
	dummyKey := make([]byte, 32)
	store, err := NewStorage("file::memory:?cache=shared", dummyKey, ".")
	if err != nil {
		t.Fatalf("failed to init storage: %v", err)
	}
	defer store.Close()
	payload := []byte("concurrent-test")

	id, _, err := store.Store(payload, 1, 1, "", nil)
	if err != nil {
		t.Fatalf("failed to store secret: %v", err)
	}

	var wg sync.WaitGroup
	var successes int
	var mu sync.Mutex

	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, err := store.RetrieveAndDelete(id)
			if err == nil {
				mu.Lock()
				successes++
				mu.Unlock()
			}
		}()
	}

	wg.Wait()

	if successes != 1 {
		t.Errorf("expected exactly 1 successful retrieval, got %d", successes)
	}
}
