// Copyright (c) 2026 Anurag Mishra. All Rights Reserved. PROPRIETARY AND CONFIDENTIAL.
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
	Port		string
	Env		string
	AllowedOrigins	[]string
	ViteAPIBase	string
	TrustProxy	bool
	SuperAdminKey	string
	DBPath		string
	MasterKey	[]byte
	BackupDir	string
}

// Load reads configuration from environment variables, applying development
// defaults where a variable is unset. In production it refuses to start when
// MASTER_KEY is missing or malformed, since a per-boot random key would make
// every stored secret unrecoverable after a restart.
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
				allowedOrigins = append(allowedOrigins, strings.TrimRight(o, "/"))
			}
		}
	}
	if legacy := strings.TrimSpace(os.Getenv("ALLOWED_ORIGIN")); legacy != "" {
		allowedOrigins = append(allowedOrigins, strings.TrimRight(legacy, "/"))
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
		dbPath = "nullsecret.db"
	}

	backupDir := strings.TrimSpace(os.Getenv("BACKUP_DIR"))
	if backupDir == "" {
		backupDir = "."
	}

	masterKeyStr := strings.TrimSpace(os.Getenv("MASTER_KEY"))
	var masterKey []byte
	valid := false
	if masterKeyStr != "" {
		parsedKey, err := hex.DecodeString(masterKeyStr)
		if err == nil && len(parsedKey) == 32 {
			masterKey = parsedKey
			valid = true
		} else {
			slog.Warn("MASTER_KEY is not a valid 32-byte hex string")
		}
	}

	// A random per-boot key silently makes every stored secret unrecoverable
	// after restart. In production that is data loss, so refuse to start
	// instead of degrading. The random fallback exists only for local dev.
	if !valid && strings.EqualFold(env, "production") {
		slog.Error("MASTER_KEY is missing or not a valid 32-byte hex string; refusing to start in production (stored secrets would be unrecoverable after restart)")
		os.Exit(1)
	}
	if len(masterKey) != 32 {
		masterKey = make([]byte, 32)
		if _, err := rand.Read(masterKey); err != nil {
			slog.Error("failed to generate random master key", "error", err)
			os.Exit(1)
		}
		if masterKeyStr == "" {
			slog.Info("MASTER_KEY is unset, using secure random key for this dev session")
		} else {
			slog.Warn("MASTER_KEY is not a valid 32-byte hex string, using secure random key for this dev session")
		}
	}

	return &Config{
		Port:		port,
		Env:		env,
		AllowedOrigins:	allowedOrigins,
		ViteAPIBase:	viteAPIBase,
		TrustProxy:	trustProxy,
		SuperAdminKey:	superAdminKey,
		DBPath:		dbPath,
		MasterKey:	masterKey,
		BackupDir:	backupDir,
	}
}
