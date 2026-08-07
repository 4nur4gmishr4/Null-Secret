// Copyright (c) 2026 Anurag Mishra. All Rights Reserved. PROPRIETARY AND CONFIDENTIAL.
package models

import "time"

type Secret struct {
	ID		string		`json:"id"`
	AdminKey	string		`json:"-"`
	Payload		[]byte		`json:"payload"`
	CreatedAt	time.Time	`json:"createdAt"`
	ExpiresAt	time.Time	`json:"expiresAt"`
	UnlockAt	*time.Time	`json:"unlockAt,omitempty"`
	ViewLimit	int		`json:"viewLimit"`
	Views		int		`json:"views"`
}

type CreateSecretRequest struct {
	Payload		[]byte		`json:"payload"`
	Expiry		int		`json:"expiry"`
	ViewLimit	int		`json:"viewLimit"`
	Alias		string		`json:"alias,omitempty"`
	UnlockAt	*time.Time	`json:"unlockAt,omitempty"`
}

type CreateSecretResponse struct {
	ID		string	`json:"id"`
	AdminKey	string	`json:"adminKey"`
}

type GetSecretResponse struct {
	Payload		[]byte	`json:"payload"`
	Views		int	`json:"views"`
	ViewLimit	int	`json:"viewLimit"`
}

type SecretInfoResponse struct {
	Views		int		`json:"views"`
	ViewLimit	int		`json:"viewLimit"`
	ExpiresAt	time.Time	`json:"expiresAt"`
	UnlockAt	*time.Time	`json:"unlockAt,omitempty"`
}

type APIError struct {
	Code	string	`json:"code"`
	Message	string	`json:"message"`
}

type SecretLockedResponse struct {
	Error		string		`json:"error"`
	UnlockAt	time.Time	`json:"unlockAt"`
}

type ErrorResponse struct {
	Error APIError `json:"error"`
}
