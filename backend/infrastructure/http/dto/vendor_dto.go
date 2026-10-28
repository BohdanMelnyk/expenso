package dto

import "time"

// Request DTOs with JSON annotations for syntactic validation
type CreateVendorRequestDTO struct {
	Name       string `json:"name" validate:"required"`
	CategoryID int    `json:"category_id" validate:"required"`
	Type       string `json:"type,omitempty"`
}

type UpdateVendorRequestDTO struct {
	Name       *string `json:"name,omitempty"`
	CategoryID *int    `json:"category_id,omitempty"`
	Type       *string `json:"type,omitempty"`
}

// Response DTOs with JSON annotations
type VendorResponseDTO struct {
	ID         int       `json:"id"`
	Name       string    `json:"name"`
	Type       string    `json:"type"`
	CategoryID int       `json:"category_id"`
	Category   string    `json:"category"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}
