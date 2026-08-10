// Copyright (c) 2026 Anurag Mishra. All Rights Reserved. PROPRIETARY AND CONFIDENTIAL.
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
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"null-secret/internal/models"

	_ "modernc.org/sqlite"
)

var (
	ErrNotFound	= errors.New("secret not found")
	ErrExpired	= errors.New("secret expired")
	ErrAliasTaken	= errors.New("alias is already taken")
	ErrLocked	= errors.New("secret is time-locked")
)

const (
	maxSecrets	= 1000
	// 48MB: the largest stored payload the frontend can produce is the bundle for
	// a 30MB attachment (~40MB after base64 expansion). Sized above that to leave
	// headroom; must stay in sync with api.maxRequestBody (handlers.go).
	maxPayload	= 48 * 1024 * 1024
)

// MaxSecrets returns the hard cap on concurrently stored secrets. Exposed so
// the health/telemetry handlers can report capacity without duplicating the
// constant.
func MaxSecrets() int {
	return maxSecrets
}

const schema = `
CREATE TABLE IF NOT EXISTS secrets (
	id TEXT PRIMARY KEY,
	admin_key TEXT,
	data BLOB,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	expires_at DATETIME,
	unlock_at DATETIME,
	view_limit INTEGER,
	views INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_expires_at ON secrets(expires_at);
CREATE INDEX IF NOT EXISTS idx_created_at ON secrets(created_at);
`

type limiterEntry struct {
	ip	string
	hits	[]time.Time
}

type RateLimiter struct {
	mu	sync.Mutex
	hits	map[string]*list.Element
	order	*list.List
	max	int
}

// NewRateLimiter returns an empty per-IP sliding-window limiter. The window is
// one minute and the map is capped at max entries; the oldest IPs are evicted
// when the cap is reached so a flood of distinct addresses cannot grow memory
// without bound.
func NewRateLimiter() *RateLimiter {
	return &RateLimiter{
		hits:	make(map[string]*list.Element),
		order:	list.New(),
		max:	10000,
	}
}

// Allow reports whether ip may proceed given the sliding one-minute window.
// Hit timestamps older than the window are dropped before the decision is
// made, and a successful call records the hit. It is safe for concurrent use.
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

	if len(kept) >= 20 {
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
	db		*sql.DB
	Limiter		*RateLimiter
	cancel		context.CancelFunc
	wg		sync.WaitGroup
	masterKey	[]byte
	backupDir	string
}

// sqliteDSN forces every transaction to BEGIN IMMEDIATE so the read-modify-
// write sequences in Store and RetrieveAndDelete take the write lock up front.
// With the driver default (deferred), two concurrent readers can each see a
// stale snapshot and then deadlock trying to upgrade to a writer; IMMEDIATE
// fails fast with SQLITE_BUSY, which execWithRetry already backsoff on.
func sqliteDSN(dbPath string) string {
	dsn := dbPath
	if !strings.HasPrefix(dsn, "file:") {
		dsn = "file:" + dsn
	}
	sep := "?"
	if strings.Contains(dsn, "?") {
		sep = "&"
	}
	return dsn + sep + "_txlock=immediate"
}

// NewStorage opens (or creates) the SQLite database at dbPath, applies the
// schema and WAL pragmas, and starts the TTL, backup, and rate-limiter cleanup
// workers. masterKey is used for at-rest encryption and must be stable across
// restarts or previously stored secrets become unrecoverable. Call Close to
// stop the workers and release the file handle.
func NewStorage(dbPath string, masterKey []byte, backupDir string) (*Storage, error) {
	db, err := sql.Open("sqlite", sqliteDSN(dbPath))
	if err != nil {
		return nil, err
	}

	if _, err := db.Exec(schema); err != nil {
		return nil, err
	}

	db.Exec("ALTER TABLE secrets ADD COLUMN unlock_at DATETIME;")

	// Verify WAL actually took effect: if it silently falls back (e.g. a
	// read-only filesystem), the WAL-dependent backup and concurrency behavior
	// is not what operators believe it is.
	var journalMode string
	if err := db.QueryRow("PRAGMA journal_mode=WAL;").Scan(&journalMode); err != nil {
		slog.Warn("failed to read journal_mode", "error", err)
	} else if !strings.EqualFold(journalMode, "wal") {
		slog.Warn("journal_mode is not WAL; backups and concurrency are degraded", "journal_mode", journalMode)
	}
	db.Exec("PRAGMA synchronous=NORMAL;")
	db.Exec("PRAGMA busy_timeout=5000;")
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(4)

	ctx, cancel := context.WithCancel(context.Background())
	s := &Storage{
		db:		db,
		Limiter:	NewRateLimiter(),
		cancel:		cancel,
		masterKey:	masterKey,
		backupDir:	backupDir,
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

// Close cancels the background workers, waits for them to finish, and closes
// the underlying database handle. It is safe to call exactly once.
func (s *Storage) Close() {
	if s.cancel != nil {
		s.cancel()
	}
	s.wg.Wait()
	if s.db != nil {
		s.db.Close()
	}
}

// DB exposes the raw *sql.DB handle for health checks and super-admin queries
// that do not go through the higher-level secret methods.
func (s *Storage) DB() *sql.DB {
	return s.db
}

type StorageStats struct {
	ActiveSecrets		int	`json:"activeSecrets"`
	TotalPayloadBytes	int64	`json:"totalPayloadBytes"`
}

// Stats returns the number of currently stored secrets and the total size in
// bytes of their encrypted payloads. Read errors are swallowed deliberately:
// telemetry degrades to zeros rather than failing a health probe.
func (s *Storage) Stats() StorageStats {
	var active int
	var bytes sql.NullInt64
	_ = s.db.QueryRow("SELECT COUNT(*), SUM(LENGTH(data)) FROM secrets").Scan(&active, &bytes)

	totalBytes := int64(0)
	if bytes.Valid {
		totalBytes = bytes.Int64
	}

	return StorageStats{
		ActiveSecrets:		active,
		TotalPayloadBytes:	totalBytes,
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

// Store persists an encrypted payload and returns the secret id plus the
// plaintext admin key (only the SHA-256 hash of the admin key is kept on
// disk). expiryHours is clamped to a sane range by the caller; alias, when
// non-empty, is used as the id and must be unique. If the database is at
// capacity the oldest secrets are evicted first.
func (s *Storage) Store(payload []byte, expiryHours int, viewLimit int, alias string, unlockAt *time.Time) (string, string, error) {
	if len(payload) > maxPayload {
		return "", "", errors.New("payload exceeds maximum allowed size")
	}

	encPayload, err := encryptPayload(payload, s.masterKey)
	if err != nil {
		return "", "", err
	}

	id := alias
	if id == "" {
		id, err = generateID()
		if err != nil {
			return "", "", err
		}
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
			INSERT INTO secrets (id, admin_key, data, expires_at, unlock_at, view_limit, views)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`, id, hashedAdminKey, encPayload, expiresAt, unlockAt, viewLimit, 0)

		if err != nil {
			return err
		}
		return tx.Commit()
	})

	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			return "", "", ErrAliasTaken
		}
		return "", "", fmt.Errorf("store secret: %w", err)
	}

	return id, adminKey, nil
}

// GetInfo returns views, limits and expiry for a secret after verifying the
// caller holds the admin key. A nil response wrapped in ErrNotFound means the
// secret does not exist, is expired, or the admin key is invalid — the caller
// must not distinguish these cases. Any other error is a storage failure and
// must be surfaced rather than treated as a miss.
func (s *Storage) GetInfo(id string, adminKey string) (*models.SecretInfoResponse, error) {
	var storedAdminKey string
	var views, viewLimit int
	var expiresAt time.Time
	var unlockAt *time.Time

	err := s.db.QueryRow(`
		SELECT admin_key, views, view_limit, expires_at, unlock_at
		FROM secrets WHERE id = ?
	`, id).Scan(&storedAdminKey, &views, &viewLimit, &expiresAt, &unlockAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("lookup secret info: %w", err)
	}

	if time.Now().UTC().After(expiresAt) {
		return nil, ErrNotFound
	}

	if !validateAdminKey(storedAdminKey, adminKey) {
		return nil, ErrNotFound
	}

	return &models.SecretInfoResponse{
		Views:		views,
		ViewLimit:	viewLimit,
		ExpiresAt:	expiresAt,
		UnlockAt:	unlockAt,
	}, nil
}

func validateAdminKey(storedHash, providedKey string) bool {
	hashedProvided := hashAdminKey(providedKey)
	bStored := []byte(storedHash)
	bHashed := []byte(hashedProvided)
	if len(bStored) != len(bHashed) {
		return false
	}
	return subtle.ConstantTimeCompare(bStored, bHashed) == 1
}

// Burn deletes a secret when the caller holds the matching admin key. The
// bool reports whether a row was actually removed: false with a nil error
// means the secret does not exist or the admin key is invalid, while a non-nil
// error signals a storage failure that must be surfaced to the caller.
func (s *Storage) Burn(id string, adminKey string) (bool, error) {
	var storedAdminKey string
	err := s.db.QueryRow("SELECT admin_key FROM secrets WHERE id = ?", id).Scan(&storedAdminKey)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return false, nil
		}
		return false, fmt.Errorf("lookup secret for burn: %w", err)
	}

	if !validateAdminKey(storedAdminKey, adminKey) {
		return false, nil
	}

	res, err := s.db.Exec("DELETE FROM secrets WHERE id = ?", id)
	if err != nil {
		return false, fmt.Errorf("burn secret: %w", err)
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return false, fmt.Errorf("count burned rows: %w", err)
	}
	return affected > 0, nil
}

func (s *Storage) RetrieveAndDelete(id string) (*models.Secret, error) {
	var payload []byte
	var expiresAt time.Time
	var unlockAt *time.Time
	var viewLimit, views int
	var lockedSecret *models.Secret
	var secret *models.Secret

	err := execWithRetry(func() error {
		tx, err := s.db.Begin()
		if err != nil {
			return err
		}
		defer tx.Rollback()

		err = tx.QueryRow(`
			SELECT data, expires_at, unlock_at, view_limit, views 
			FROM secrets WHERE id = ?
		`, id).Scan(&payload, &expiresAt, &unlockAt, &viewLimit, &views)

		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return ErrNotFound
			}
			return err
		}

		if time.Now().UTC().After(expiresAt) {
			// Deleting the row here is the entire point of the 410: if the delete
			// or commit fails, the caller must see the error instead of assuming
			// the row is gone while it silently survives in the table.
			if _, err = tx.Exec("DELETE FROM secrets WHERE id = ?", id); err != nil {
				return err
			}
			if err = tx.Commit(); err != nil {
				return err
			}
			return ErrExpired
		}

		if unlockAt != nil && time.Now().UTC().Before(*unlockAt) {
			lockedSecret = &models.Secret{
				UnlockAt: unlockAt,
			}
			return ErrLocked
		}

		views++

		// Decrypt before the row is destroyed: a decrypt failure (corrupted
		// ciphertext, master key rotated) must not delete the secret and then
		// return an error, leaving the data gone-but-unreadable. Rollback keeps
		// the row intact and the secret can be read again later.
		decPayload, err := decryptPayload(payload, s.masterKey)
		if err != nil {
			return err
		}

		if views >= viewLimit {
			_, err = tx.Exec("DELETE FROM secrets WHERE id = ?", id)
		} else {
			_, err = tx.Exec("UPDATE secrets SET views = ? WHERE id = ?", views, id)
		}

		if err != nil {
			return err
		}

		secret = &models.Secret{
			ID:		id,
			Payload:	decPayload,
			ExpiresAt:	expiresAt,
			UnlockAt:	unlockAt,
			ViewLimit:	viewLimit,
			Views:		views,
		}

		return tx.Commit()
	})

	if err != nil {
		if errors.Is(err, ErrLocked) {
			return lockedSecret, err
		}
		return nil, err
	}

	return secret, nil
}

// PurgeAll removes every stored secret and returns the number of rows that
// were deleted. Unlike the other mutating methods the error is propagated so
// the super-admin handler can report a real 503 instead of claiming a purge
// happened when the DELETE never ran.
func (s *Storage) PurgeAll() (int, error) {
	res, err := s.db.Exec("DELETE FROM secrets")
	if err != nil {
		return 0, fmt.Errorf("purge secrets: %w", err)
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return 0, fmt.Errorf("count purged rows: %w", err)
	}
	return int(affected), nil
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
				res, err := s.db.Exec("DELETE FROM secrets WHERE expires_at < ?", time.Now().UTC())
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
			// Write to a temp path and atomically rename over the previous backup
			// only after VACUUM INTO succeeds, so a failed backup never leaves a
			// gap where the last good copy has already been deleted.
			tmpFile := filepath.Join(s.backupDir, "backup.db.tmp")
			sanitizedTmp := strings.ReplaceAll(tmpFile, "'", "''")
			err := execWithRetry(func() error {
				if _, err := s.db.Exec(fmt.Sprintf("VACUUM INTO '%s'", sanitizedTmp)); err != nil {
					return err
				}
				return os.Rename(tmpFile, backupFile)
			})
			if err != nil {
				_ = os.Remove(tmpFile)
				slog.Error("Backup worker failed", "error", err)
			} else {
				slog.Info("Database successfully backed up", "file", backupFile)
			}
		}
	}
}
