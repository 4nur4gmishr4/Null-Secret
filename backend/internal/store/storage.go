package store

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"hash/fnv"
	"sync"
	"sync/atomic"
	"time"

	"null-secret/internal/models"
)

const (
	maxSecretsPerShard = 100 // SEC-02: 256 shards * 100 = 25,600 secrets total limit
	rateLimitCapacity  = 10000
	rateLimitWindow    = time.Minute
	rateLimitMaxHits   = 10
	rateLimitScanCap   = 100
)

var ErrCapacityExceeded = errors.New("server capacity exceeded, try again later")

type Shard struct {
	mu      sync.RWMutex
	secrets map[string]*models.Secret
}

type RateLimiter struct {
	mu   sync.Mutex
	hits map[string][]time.Time
}

func (rl *RateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-rateLimitWindow)

	if _, tracked := rl.hits[ip]; !tracked && len(rl.hits) >= rateLimitCapacity {
		if !rl.evictOneExpiredLocked(cutoff) {
			return false
		}
	}

	kept := rl.hits[ip][:0]
	for _, t := range rl.hits[ip] {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}

	if len(kept) >= rateLimitMaxHits {
		rl.hits[ip] = kept
		return false
	}
	rl.hits[ip] = append(kept, now)
	return true
}

func (rl *RateLimiter) evictOneExpiredLocked(cutoff time.Time) bool {
	scanned := 0
	for trackedIP, hits := range rl.hits {
		if scanned >= rateLimitScanCap {
			return false
		}
		if len(hits) == 0 || hits[len(hits)-1].Before(cutoff) {
			delete(rl.hits, trackedIP)
			return true
		}
		scanned++
	}
	return false
}

func (rl *RateLimiter) evictExpired(cutoff time.Time) {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	for ip, hits := range rl.hits {
		kept := hits[:0]
		for _, t := range hits {
			if t.After(cutoff) {
				kept = append(kept, t)
			}
		}
		if len(kept) == 0 {
			delete(rl.hits, ip)
		} else {
			rl.hits[ip] = kept
		}
	}
}

func (rl *RateLimiter) cleanup(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			rl.evictExpired(time.Now().Add(-rateLimitWindow))
		}
	}
}

type Storage struct {
	shards     [256]*Shard
	Limiter    *RateLimiter
	totalBytes atomic.Int64
	cancel     context.CancelFunc
}

const maxGlobalBytes int64 = 250 * 1024 * 1024 // 250 MB

func NewStorage() *Storage {
	ctx, cancel := context.WithCancel(context.Background())
	s := &Storage{
		Limiter: &RateLimiter{hits: make(map[string][]time.Time)},
		cancel:  cancel,
	}
	for i := 0; i < 256; i++ {
		s.shards[i] = &Shard{
			secrets: make(map[string]*models.Secret),
		}
	}
	go s.startGC(ctx)
	go s.Limiter.cleanup(ctx)
	return s
}

// Close stops the background GC and rate-limiter cleanup goroutines.
// Safe to call multiple times via context cancellation idempotency.
func (s *Storage) Close() {
	if s.cancel != nil {
		s.cancel()
	}
}

func (s *Storage) getShard(id string) *Shard {
	h := fnv.New32a()
	_, _ = h.Write([]byte(id))
	return s.shards[h.Sum32()%256]
}

func generateID() (string, error) {
	b := make([]byte, 12)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (s *Storage) Store(payload []byte, expiryHours int, viewLimit int) (string, string, error) {
	payloadLen := int64(len(payload))

	// Enforce strict 10MB payload size limit at storage layer
	if payloadLen > 10*1024*1024 {
		return "", "", errors.New("payload exceeds maximum allowed size (10MB)")
	}

	// CAS loop avoids spurious ErrCapacityExceeded on concurrent callers
	// that would otherwise observe an inflated intermediate total during
	// the optimistic Add-then-revert window.
	for {
		current := s.totalBytes.Load()
		next := current + payloadLen
		if next > maxGlobalBytes {
			return "", "", ErrCapacityExceeded
		}
		if s.totalBytes.CompareAndSwap(current, next) {
			break
		}
	}

	id, err := generateID()
	if err != nil {
		s.totalBytes.Add(-payloadLen)
		return "", "", err
	}
	adminKey, err := generateID()
	if err != nil {
		s.totalBytes.Add(-payloadLen)
		return "", "", err
	}
	secret := &models.Secret{
		ID:        id,
		AdminKey:  adminKey,
		Payload:   payload,
		ExpiresAt: time.Now().Add(time.Duration(expiryHours) * time.Hour),
		ViewLimit: viewLimit,
		Views:     0,
	}

	shard := s.getShard(id)
	shard.mu.Lock()
	if len(shard.secrets) >= maxSecretsPerShard {
		s.gcShardLocked(shard)
		if len(shard.secrets) >= maxSecretsPerShard {
			shard.mu.Unlock()
			s.totalBytes.Add(-payloadLen)
			return "", "", ErrCapacityExceeded
		}
	}
	shard.secrets[id] = secret
	shard.mu.Unlock()

	return id, adminKey, nil
}

func (s *Storage) GetInfo(id string, adminKey string) (*models.SecretInfoResponse, bool) {
	shard := s.getShard(id)
	shard.mu.RLock()
	defer shard.mu.RUnlock()

	secret, ok := shard.secrets[id]
	if !ok || secret.AdminKey != adminKey {
		return nil, false
	}

	return &models.SecretInfoResponse{
		Views:     secret.Views,
		ViewLimit: secret.ViewLimit,
		ExpiresAt: secret.ExpiresAt,
	}, true
}

func (s *Storage) Burn(id string, adminKey string) bool {
	shard := s.getShard(id)
	shard.mu.Lock()
	defer shard.mu.Unlock()

	secret, ok := shard.secrets[id]
	if !ok || secret.AdminKey != adminKey {
		return false
	}

	s.totalBytes.Add(-int64(len(secret.Payload)))
	delete(shard.secrets, id)
	return true
}

func (s *Storage) RetrieveAndDelete(id string) (*models.Secret, bool) {
	shard := s.getShard(id)
	shard.mu.Lock()
	defer shard.mu.Unlock()

	secret, ok := shard.secrets[id]
	if !ok {
		return nil, false
	}

	if time.Now().After(secret.ExpiresAt) {
		s.totalBytes.Add(-int64(len(secret.Payload)))
		delete(shard.secrets, id)
		return nil, false
	}

	secret.Views++

	secretCopy := &models.Secret{
		ID:        secret.ID,
		Payload:   secret.Payload,
		ExpiresAt: secret.ExpiresAt,
		ViewLimit: secret.ViewLimit,
		Views:     secret.Views,
	}

	if secret.Views >= secret.ViewLimit {
		s.totalBytes.Add(-int64(len(secret.Payload)))
		delete(shard.secrets, id)
	}

	return secretCopy, true
}

// gcShardLocked sweeps expired entries from a shard whose mutex is
// already held by the caller. Used by Store to avoid lock-unlock-lock
// TOCTOU where another writer could refill the shard between locks.
func (s *Storage) gcShardLocked(shard *Shard) {
	now := time.Now()
	for id, secret := range shard.secrets {
		if now.After(secret.ExpiresAt) {
			s.totalBytes.Add(-int64(len(secret.Payload)))
			delete(shard.secrets, id)
		}
	}
}

func (s *Storage) gcShard(shard *Shard) {
	shard.mu.Lock()
	defer shard.mu.Unlock()
	s.gcShardLocked(shard)
}

func (s *Storage) startGC(ctx context.Context) {
	ticker := time.NewTicker(1 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			for i := 0; i < 256; i++ {
				s.gcShard(s.shards[i])
			}
		}
	}
}
