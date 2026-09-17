// backend/infrastructure/http/dto/auth_dto.go
package dto

import "time"

type LoginRequestDTO struct {
	Username string `json:"username" validate:"required"`
	Password string `json:"password" validate:"required"`
	TOTPCode string `json:"totp_code" validate:"required"`
}

type LoginResponseDTO struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expires_at"`
}

type MeResponseDTO struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
}
