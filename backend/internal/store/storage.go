package store

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"
	"sync/atomic"
	"time"

	"null-secret/internal/models"
)

const maxSecretsPerShard = 100 // SEC-02: 256 shards * 100 = 25,600 secrets total limit

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
	window := now.Add(-1 * time.Minute)

	if len(rl.hits) > 10000 {
		if _, exists := rl.hits[ip]; !exists {
			freedSpace := false
			scanCount := 0
			for trackIP, hits := range rl.hits {
				if len(hits) == 0 || hits[len(hits)-1].Before(window) {
					delete(rl.hits, trackIP)
					freedSpace = true
					break
				}
				scanCount++
				if scanCount > 100 {
					break
				}
			}
			if !freedSpace {
				return false
			}
		}
	}

	var validHits []time.Time
	for _, t := range rl.hits[ip] {
		if t.After(window) {
			validHits = append(validHits, t)
		}
	}

	if len(validHits) >= 10 { // 10 requests per minute
		rl.hits[ip] = validHits
		return false
	}

	rl.hits[ip] = append(validHits, now)
	return true
}

func (rl *RateLimiter) cleanup() {
	ticker := time.NewTicker(5 * time.Minute)
	for range ticker.C {
		rl.mu.Lock()
		now := time.Now()
		window := now.Add(-1 * time.Minute)
		
		newHits := make(map[string][]time.Time)
		for ip, hits := range rl.hits {
			var validHits []time.Time
			for _, t := range hits {
				if t.After(window) {
					validHits = append(validHits, t)
				}
			}
			if len(validHits) > 0 {
				newHits[ip] = validHits
			}
		}
		rl.hits = newHits
		rl.mu.Unlock()
	}
}

type Storage struct {
	shards     [256]*Shard
	Limiter    *RateLimiter
	totalBytes atomic.Int64
}

const maxGlobalBytes int64 = 250 * 1024 * 1024 // 250 MB

func NewStorage() *Storage {
	s := &Storage{
		Limiter: &RateLimiter{hits: make(map[string][]time.Time)},
	}
	for i := 0; i < 256; i++ {
		s.shards[i] = &Shard{
			secrets: make(map[string]*models.Secret),
		}
	}
	go s.startGC()
	go s.Limiter.cleanup()
	return s
}

func (s *Storage) getShard(id string) *Shard {
	var hash uint32 = 2166136261
	for i := 0; i < len(id); i++ {
		hash ^= uint32(id[i])
		hash *= 16777619
	}
	return s.shards[hash%256]
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

	if s.totalBytes.Add(payloadLen) > maxGlobalBytes {
		s.totalBytes.Add(-payloadLen) // Revert
		return "", "", ErrCapacityExceeded
	}

	id, err := generateID()
	if err != nil {
		s.totalBytes.Add(-payloadLen) // Revert
		return "", "", err
	}
	adminKey, err := generateID()
	if err != nil {
		s.totalBytes.Add(-payloadLen) // Revert
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
	
	// Prevent OOM per shard
	if len(shard.secrets) >= maxSecretsPerShard {
		shard.mu.Unlock()
		s.gcShard(shard) // try to free space
		
		shard.mu.Lock()
		if len(shard.secrets) >= maxSecretsPerShard {
			shard.mu.Unlock()
			s.totalBytes.Add(-payloadLen) // Revert
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

func (s *Storage) gcShard(shard *Shard) {
	shard.mu.Lock()
	defer shard.mu.Unlock()
	now := time.Now()
	for id, secret := range shard.secrets {
		if now.After(secret.ExpiresAt) {
			s.totalBytes.Add(-int64(len(secret.Payload)))
			delete(shard.secrets, id)
		}
	}
}

func (s *Storage) startGC() {
	ticker := time.NewTicker(1 * time.Minute)
	for range ticker.C {
		for i := 0; i < 256; i++ {
			s.gcShard(s.shards[i])
		}
	}
}
