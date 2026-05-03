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
	
	id, _, err := store.Store(payload, 1, 1)
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
	
	// Verify it was deleted
	_, err = store.RetrieveAndDelete(id)
	if err == nil {
		t.Errorf("secret was not deleted after retrieval")
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
	
	id, _, err := store.Store(payload, 1, 1)
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
