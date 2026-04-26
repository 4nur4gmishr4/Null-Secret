package models

import "time"

type Secret struct {
	ID        string    `json:"id"`
	AdminKey  string    `json:"-"`
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
	ID       string `json:"id"`
	AdminKey string `json:"adminKey"`
}

type GetSecretResponse struct {
	Payload   []byte `json:"payload"`
	Views     int    `json:"views"`
	ViewLimit int    `json:"viewLimit"`
}

type SecretInfoResponse struct {
	Views     int       `json:"views"`
	ViewLimit int       `json:"viewLimit"`
	ExpiresAt time.Time `json:"expiresAt"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}
