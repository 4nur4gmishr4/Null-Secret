package main

import (
	"log/slog"
	"net/http"
	"os"

	"null-secret/internal/api"
	"null-secret/internal/store"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	slog.SetDefault(logger)

	s := store.NewStorage()
	a := api.NewAPI(s)

	router := a.SetupRoutes()

	slog.Info("Starting NULL-SECRET API", "port", 8080)
	if err := http.ListenAndServe(":8080", router); err != nil {
		slog.Error("server failed", "error", err)
	}
}
