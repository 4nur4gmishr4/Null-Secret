package store

import (
	"container/list"
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"null-secret/internal/models"

	_ "modernc.org/sqlite"
)

var (
	ErrCapacityExceeded = errors.New("server capacity exceeded, try again later")
	ErrNotFound         = errors.New("secret not found")
	ErrExpired          = errors.New("secret expired")
)

const (
	maxSecrets = 1000
	maxPayload = 1024 * 1024 // 1MB
)

const schema = `
CREATE TABLE IF NOT EXISTS secrets (
	id TEXT PRIMARY KEY,
	admin_key TEXT,
	data BLOB,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	expires_at DATETIME,
	view_limit INTEGER,
	views INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_expires_at ON secrets(expires_at);
CREATE INDEX IF NOT EXISTS idx_created_at ON secrets(created_at);
`

type limiterEntry struct {
	ip   string
	hits []time.Time
}

type RateLimiter struct {
	mu    sync.Mutex
	hits  map[string]*list.Element
	order *list.List
	max   int
}

func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		hits:  make(map[string]*list.Element),
		order: list.New(),
		max:   10000,
	}
}

func (rl *RateLimiter) Allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-time.Minute)

	var entry *limiterEntry
	if elem, ok := rl.hits[ip]; ok {
		rl.order.MoveToFront(elem)
		entry = elem.Value.(*limiterEntry)
	} else {
		if rl.order.Len() >= rl.max {
			oldest := rl.order.Back()
			if oldest != nil {
				rl.order.Remove(oldest)
				delete(rl.hits, oldest.Value.(*limiterEntry).ip)
			}
		}
		entry = &limiterEntry{ip: ip, hits: make([]time.Time, 0)}
		elem := rl.order.PushFront(entry)
		rl.hits[ip] = elem
	}

	kept := make([]time.Time, 0)
	for _, t := range entry.hits {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}

	if len(kept) >= 20 { // 20 requests / minute
		entry.hits = kept
		return false
	}

	entry.hits = append(kept, now)
	return true
}

func (rl *RateLimiter) cleanup(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			rl.mu.Lock()
			cutoff := time.Now().Add(-time.Minute)
			var next *list.Element
			for e := rl.order.Front(); e != nil; e = next {
				next = e.Next()
				entry := e.Value.(*limiterEntry)
				kept := make([]time.Time, 0)
				for _, t := range entry.hits {
					if t.After(cutoff) {
						kept = append(kept, t)
					}
				}
				if len(kept) == 0 {
					rl.order.Remove(e)
					delete(rl.hits, entry.ip)
				} else {
					entry.hits = kept
				}
			}
			rl.mu.Unlock()
		}
	}
}

type Storage struct {
	db        *sql.DB
	Limiter   *RateLimiter
	cancel    context.CancelFunc
	wg        sync.WaitGroup
	masterKey []byte
	backupDir string
}

func NewStorage(dbPath string, masterKey []byte, backupDir string) (*Storage, error) {
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}

	if _, err := db.Exec(schema); err != nil {
		return nil, err
	}

	// Optimize SQLite for concurrent reads/writes
	db.Exec("PRAGMA journal_mode=WAL;")
	db.Exec("PRAGMA synchronous=NORMAL;")
	db.Exec("PRAGMA busy_timeout=5000;")
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(4)

	ctx, cancel := context.WithCancel(context.Background())
	s := &Storage{
		db:        db,
		Limiter:   NewRateLimiter(),
		cancel:    cancel,
		masterKey: masterKey,
		backupDir: backupDir,
	}

	s.wg.Add(3)
	go func() {
		defer s.wg.Done()
		s.Limiter.cleanup(ctx)
	}()
	go func() {
		defer s.wg.Done()
		s.startTTLWorker(ctx)
	}()
	go func() {
		defer s.wg.Done()
		s.startBackupWorker(ctx)
	}()

	return s, nil
}

func (s *Storage) Close() {
	if s.cancel != nil {
		s.cancel()
	}
	s.wg.Wait()
	if s.db != nil {
		s.db.Close()
	}
}

func (s *Storage) DB() *sql.DB {
	return s.db
}

type StorageStats struct {
	ActiveSecrets     int   `json:"activeSecrets"`
	TotalPayloadBytes int64 `json:"totalPayloadBytes"`
}

func (s *Storage) Stats() StorageStats {
	var active int
	var bytes sql.NullInt64
	_ = s.db.QueryRow("SELECT COUNT(*), SUM(LENGTH(data)) FROM secrets").Scan(&active, &bytes)

	totalBytes := int64(0)
	if bytes.Valid {
		totalBytes = bytes.Int64
	}

	return StorageStats{
		ActiveSecrets:     active,
		TotalPayloadBytes: totalBytes,
	}
}

func hashAdminKey(key string) string {
	h := sha256.Sum256([]byte(key))
	return hex.EncodeToString(h[:])
}

func encryptPayload(payload, masterKey []byte) ([]byte, error) {
	block, err := aes.NewCipher(masterKey)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	cipherText := gcm.Seal(nonce, nonce, payload, nil)
	res := append([]byte("v1:"), cipherText...)
	return res, nil
}

func decryptPayload(data, masterKey []byte) ([]byte, error) {
	if len(data) < 3 || string(data[:3]) != "v1:" {
		return nil, errors.New("payload missing encryption version prefix")
	}
	cipherText := data[3:]
	block, err := aes.NewCipher(masterKey)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	if len(cipherText) < gcm.NonceSize() {
		return nil, errors.New("malformed ciphertext")
	}
	nonce, cipherText := cipherText[:gcm.NonceSize()], cipherText[gcm.NonceSize():]
	return gcm.Open(nil, nonce, cipherText, nil)
}

func execWithRetry(execFunc func() error) error {
	var err error
	for i := 0; i < 5; i++ {
		err = execFunc()
		if err == nil {
			return nil
		}
		if strings.Contains(err.Error(), "database is locked") {
			time.Sleep(time.Duration(10*(1<<i)) * time.Millisecond)
			continue
		}
		return err
	}
	return err
}

func generateID() (string, error) {
	b := make([]byte, 12)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (s *Storage) Store(payload []byte, expiryHours int, viewLimit int) (string, string, error) {
	if len(payload) > maxPayload {
		return "", "", errors.New("payload exceeds maximum allowed size (1MB)")
	}

	encPayload, err := encryptPayload(payload, s.masterKey)
	if err != nil {
		return "", "", err
	}

	id, err := generateID()
	if err != nil {
		return "", "", err
	}
	adminKey, err := generateID()
	if err != nil {
		return "", "", err
	}
	hashedAdminKey := hashAdminKey(adminKey)

	expiresAt := time.Now().UTC().Add(time.Duration(expiryHours) * time.Hour)

	err = execWithRetry(func() error {
		tx, err := s.db.Begin()
		if err != nil {
			return err
		}
		defer tx.Rollback()

		var count int
		if err := tx.QueryRow("SELECT COUNT(*) FROM secrets").Scan(&count); err != nil {
			return err
		}
		if count >= maxSecrets {
			_, err = tx.Exec("DELETE FROM secrets WHERE id IN (SELECT id FROM secrets ORDER BY created_at ASC LIMIT 10)")
			if err != nil {
				return err
			}
		}

		_, err = tx.Exec(`
			INSERT INTO secrets (id, admin_key, data, expires_at, view_limit, views)
			VALUES (?, ?, ?, ?, ?, ?)
		`, id, hashedAdminKey, encPayload, expiresAt, viewLimit, 0)

		if err != nil {
			return err
		}
		return tx.Commit()
	})

	if err != nil {
		return "", "", err
	}

	return id, adminKey, nil
}

func (s *Storage) GetInfo(id string, adminKey string) (*models.SecretInfoResponse, bool) {
	var storedAdminKey string
	var views, viewLimit int
	var expiresAt time.Time

	err := s.db.QueryRow(`
		SELECT admin_key, views, view_limit, expires_at 
		FROM secrets WHERE id = ?
	`, id).Scan(&storedAdminKey, &views, &viewLimit, &expiresAt)

	if err != nil {
		return nil, false
	}

	if time.Now().UTC().After(expiresAt) {
		return nil, false
	}

	if !validateAdminKey(storedAdminKey, adminKey) {
		return nil, false
	}

	return &models.SecretInfoResponse{
		Views:     views,
		ViewLimit: viewLimit,
		ExpiresAt: expiresAt,
	}, true
}

// validateAdminKey compares the stored hashed admin key with the provided plaintext
// admin key using constant-time comparison to prevent timing attacks.
func validateAdminKey(storedHash, providedKey string) bool {
	hashedProvided := hashAdminKey(providedKey)
	bStored := []byte(storedHash)
	bHashed := []byte(hashedProvided)
	if len(bStored) != len(bHashed) {
		return false
	}
	return subtle.ConstantTimeCompare(bStored, bHashed) == 1
}

func (s *Storage) Burn(id string, adminKey string) bool {
	var storedAdminKey string
	err := s.db.QueryRow("SELECT admin_key FROM secrets WHERE id = ?", id).Scan(&storedAdminKey)
	if err != nil {
		return false
	}

	if !validateAdminKey(storedAdminKey, adminKey) {
		return false
	}

	res, err := s.db.Exec("DELETE FROM secrets WHERE id = ?", id)
	if err != nil {
		return false
	}
	affected, _ := res.RowsAffected()
	return affected > 0
}

func (s *Storage) RetrieveAndDelete(id string) (*models.Secret, error) {
	var payload []byte
	var expiresAt time.Time
	var viewLimit, views int

	err := execWithRetry(func() error {
		tx, err := s.db.Begin()
		if err != nil {
			return err
		}
		defer tx.Rollback()

		err = tx.QueryRow(`
			SELECT data, expires_at, view_limit, views 
			FROM secrets WHERE id = ?
		`, id).Scan(&payload, &expiresAt, &viewLimit, &views)

		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return ErrNotFound
			}
			return err
		}

		if time.Now().UTC().After(expiresAt) {
			tx.Exec("DELETE FROM secrets WHERE id = ?", id)
			tx.Commit()
			return ErrExpired
		}

		views++

		if views >= viewLimit {
			_, err = tx.Exec("DELETE FROM secrets WHERE id = ?", id)
		} else {
			_, err = tx.Exec("UPDATE secrets SET views = ? WHERE id = ?", views, id)
		}

		if err != nil {
			return err
		}

		return tx.Commit()
	})

	if err != nil {
		return nil, err
	}

	decPayload, err := decryptPayload(payload, s.masterKey)
	if err != nil {
		return nil, err
	}

	secret := &models.Secret{
		ID:        id,
		Payload:   decPayload,
		ExpiresAt: expiresAt,
		ViewLimit: viewLimit,
		Views:     views,
	}

	return secret, nil
}

func (s *Storage) PurgeAll() int {
	res, err := s.db.Exec("DELETE FROM secrets")
	if err != nil {
		return 0
	}
	affected, _ := res.RowsAffected()
	return int(affected)
}

func (s *Storage) startTTLWorker(ctx context.Context) {
	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			err := execWithRetry(func() error {
				res, err := s.db.Exec("DELETE FROM secrets WHERE expires_at < CURRENT_TIMESTAMP")
				if err == nil {
					if affected, _ := res.RowsAffected(); affected > 0 {
						slog.Info("TTL Worker purged expired secrets", "count", affected)
					}
				}
				return err
			})
			if err != nil {
				slog.Warn("TTL Worker failed", "error", err)
			}
		}
	}
}

func (s *Storage) startBackupWorker(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			backupFile := filepath.Join(s.backupDir, "backup.db")
			sanitizedPath := strings.ReplaceAll(backupFile, "'", "''")
			err := execWithRetry(func() error {
				_, err := s.db.Exec(fmt.Sprintf("VACUUM INTO '%s'", sanitizedPath))
				return err
			})
			if err != nil {
				slog.Error("Backup worker failed", "error", err)
			} else {
				slog.Info("Database successfully backed up", "file", backupFile)
			}
		}
	}
}
