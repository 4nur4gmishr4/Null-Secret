package store

import (
	"bytes"
	"sync"
	"testing"
)

func TestStorage_StoreAndRetrieve(t *testing.T) {
	store := NewStorage()
	payload := []byte("test-secret-payload")
	
	id, err := store.Store(payload, 1, 1)
	if err != nil {
		t.Fatalf("failed to store secret: %v", err)
	}
	
	secret, ok := store.RetrieveAndDelete(id)
	if !ok {
		t.Fatalf("failed to retrieve secret")
	}
	
	if !bytes.Equal(secret.Payload, payload) {
		t.Errorf("expected payload %q, got %q", payload, secret.Payload)
	}
	
	// Verify it was deleted
	_, ok2 := store.RetrieveAndDelete(id)
	if ok2 {
		t.Errorf("secret was not deleted after retrieval")
	}
}

func TestStorage_Concurrency(t *testing.T) {
	store := NewStorage()
	payload := []byte("concurrent-test")
	
	id, err := store.Store(payload, 1, 1)
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
			_, ok := store.RetrieveAndDelete(id)
			if ok {
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
