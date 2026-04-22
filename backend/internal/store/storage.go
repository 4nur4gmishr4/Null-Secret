package store

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"
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

	// SEC-04: Cap number of tracked IPs to prevent OOM
	if len(rl.hits) > 10000 {
		if _, ok := rl.hits[ip]; !ok {
			rl.hits = make(map[string][]time.Time)
		}
	}

	now := time.Now()
	window := now.Add(-1 * time.Minute)

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
		count := 0
		for ip, hits := range rl.hits {
			if count >= 10000 { // Max 10,000 IPs tracked
				break
			}
			var validHits []time.Time
			for _, t := range hits {
				if t.After(window) {
					validHits = append(validHits, t)
				}
			}
			if len(validHits) > 0 {
				newHits[ip] = validHits
				count++
			}
		}
		rl.hits = newHits
		rl.mu.Unlock()
	}
}

type Storage struct {
	shards  [256]*Shard
	Limiter *RateLimiter
}

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

func (s *Storage) Store(payload []byte, expiryHours int, viewLimit int) (string, error) {
	id, err := generateID()
	if err != nil {
		return "", err
	}
	secret := &models.Secret{
		ID:        id,
		Payload:   payload,
		ExpiresAt: time.Now().Add(time.Duration(expiryHours) * time.Hour),
		ViewLimit: viewLimit,
		Views:     0,
	}

	shard := s.getShard(id)
	shard.mu.Lock()
	
	// Prevent OOM
	if len(shard.secrets) >= maxSecretsPerShard {
		shard.mu.Unlock()
		s.gcShard(shard) // try to free space
		
		shard.mu.Lock()
		if len(shard.secrets) >= maxSecretsPerShard {
			shard.mu.Unlock()
			return "", ErrCapacityExceeded
		}
	}
	
	shard.secrets[id] = secret
	shard.mu.Unlock()

	return id, nil
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
