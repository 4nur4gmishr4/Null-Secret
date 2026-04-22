package main

import (
	"fmt"
	"net/http"

	"null-secret/internal/api"
	"null-secret/internal/store"
)

func main() {
	s := store.NewStorage()
	a := api.NewAPI(s)

	http.HandleFunc("/api/v1/secret", a.CorsMiddleware(a.RateLimitMiddleware(a.HandleCreateSecret)))
	http.HandleFunc("/api/v1/secret/", a.CorsMiddleware(a.RateLimitMiddleware(a.HandleGetSecret)))
	http.HandleFunc("/healthz", a.HandleHealthz)

	fmt.Println("NULL-SECRET API running on :8080")
	if err := http.ListenAndServe(":8080", nil); err != nil {
		fmt.Printf("server failed: %v\n", err)
	}
}
