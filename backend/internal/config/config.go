package config

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port           string
	Env            string
	AllowedOrigins []string
	ViteAPIBase    string
	TrustProxy     bool
	SuperAdminKey  string
	DBPath         string
	MasterKey      []byte
	BackupDir      string
}

func Load() *Config {
	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = "8080"
	}

	env := strings.TrimSpace(os.Getenv("ENV"))
	if env == "" {
		env = "development"
	}

	var allowedOrigins []string
	if origins := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS")); origins != "" {
		for _, o := range strings.Split(origins, ",") {
			if o = strings.TrimSpace(o); o != "" {
				allowedOrigins = append(allowedOrigins, o)
			}
		}
	}
	if legacy := strings.TrimSpace(os.Getenv("ALLOWED_ORIGIN")); legacy != "" {
		allowedOrigins = append(allowedOrigins, legacy)
	}

	viteAPIBase := strings.TrimSpace(os.Getenv("VITE_API_BASE"))
	if viteAPIBase == "" {
		if strings.EqualFold(env, "production") {
			slog.Warn("VITE_API_BASE is unset or invalid in production; CSP connect-src falls back to localhost")
		}
		viteAPIBase = "http://localhost:8080"
	}

	trustProxyStr := strings.TrimSpace(os.Getenv("TRUST_PROXY"))
	trustProxy, _ := strconv.ParseBool(trustProxyStr)

	superAdminKey := strings.TrimSpace(os.Getenv("SUPER_ADMIN_KEY"))
	if superAdminKey == "" && strings.EqualFold(env, "production") {
		slog.Warn("SUPER_ADMIN_KEY is unset in production; admin endpoints will be inaccessible")
	}

	dbPath := strings.TrimSpace(os.Getenv("DB_PATH"))
	if dbPath == "" {
		dbPath = "nullsecret.db" // Default to current directory
	}

	backupDir := strings.TrimSpace(os.Getenv("BACKUP_DIR"))
	if backupDir == "" {
		backupDir = "."
	}

	masterKeyStr := strings.TrimSpace(os.Getenv("MASTER_KEY"))
	var masterKey []byte
	if masterKeyStr != "" {
		parsedKey, err := hex.DecodeString(masterKeyStr)
		if err == nil && len(parsedKey) == 32 {
			masterKey = parsedKey
		} else {
			slog.Warn("MASTER_KEY is not a valid 32-byte hex string, falling back to secure random key")
		}
	}
	if len(masterKey) != 32 {
		masterKey = make([]byte, 32)
		if _, err := rand.Read(masterKey); err != nil {
			slog.Error("failed to generate random master key", "error", err)
			os.Exit(1)
		}
		if masterKeyStr == "" {
			slog.Info("MASTER_KEY is unset, using secure random key for session")
		}
	}

	return &Config{
		Port:           port,
		Env:            env,
		AllowedOrigins: allowedOrigins,
		ViteAPIBase:    viteAPIBase,
		TrustProxy:     trustProxy,
		SuperAdminKey:  superAdminKey,
		DBPath:         dbPath,
		MasterKey:      masterKey,
		BackupDir:      backupDir,
	}
}
