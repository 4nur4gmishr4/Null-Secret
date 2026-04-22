package models

import "time"

type Secret struct {
	ID        string    `json:"id"`
	Payload   []byte    `json:"payload"`
	ExpiresAt time.Time `json:"expiresAt"`
	ViewLimit int       `json:"viewLimit"`
	Views     int       `json:"views"`
}

type CreateSecretRequest struct {
	Payload   []byte `json:"payload"`
	Expiry    int    `json:"expiry"`
	ViewLimit int    `json:"viewLimit"`
}

type CreateSecretResponse struct {
	ID string `json:"id"`
}

type GetSecretResponse struct {
	Payload   []byte `json:"payload"`
	Views     int    `json:"views"`
	ViewLimit int    `json:"viewLimit"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}
