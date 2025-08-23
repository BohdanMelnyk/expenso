package dto

import "time"

// Request DTOs with JSON annotations for syntactic validation
type CreateVendorRequestDTO struct {
	Name string `json:"name" validate:"required"`
	Type string `json:"type" validate:"required"`
}

type UpdateVendorRequestDTO struct {
	Name *string `json:"name,omitempty"`
	Type *string `json:"type,omitempty"`
}

// Response DTOs with JSON annotations
type VendorResponseDTO struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Type      string    `json:"type"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}