package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
	"time"

	"null-secret/internal/api"
	"null-secret/internal/store"
)

const (
	defaultPort     = "8080"
	shutdownTimeout = 15 * time.Second
)

// resolveListenAddr honours the $PORT env var that PaaS providers
// (Render, Heroku, Fly, Railway, Cloud Run) inject at runtime. Falls
// back to defaultPort for local development. Rejects malformed input
// loudly so a typo cannot silently bind to ":0".
func resolveListenAddr() (string, error) {
	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		return ":" + defaultPort, nil
	}
	n, err := strconv.Atoi(port)
	if err != nil || n <= 0 || n > 65535 {
		return "", errors.New("PORT must be an integer in 1..65535")
	}
	return ":" + port, nil
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	listenAddr, err := resolveListenAddr()
	if err != nil {
		slog.Error("invalid PORT", "error", err)
		os.Exit(1)
	}

	s := store.NewStorage()
	defer s.Close()

	a := api.NewAPI(s)
	router := a.SetupRoutes()

	srv := &http.Server{
		Addr:              listenAddr,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	serverErr := make(chan error, 1)
	go func() {
		slog.Info("Starting NULL-SECRET API", "addr", listenAddr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverErr <- err
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-serverErr:
		slog.Error("server failed", "error", err)
		os.Exit(1)
	case sig := <-stop:
		slog.Info("shutdown signal received", "signal", sig.String())
	}

	ctx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("graceful shutdown failed", "error", err)
		return
	}
	slog.Info("server stopped cleanly")
}
