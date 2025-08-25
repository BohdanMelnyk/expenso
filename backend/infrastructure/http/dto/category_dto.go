package dto

import "time"

// Request DTOs
type CreateCategoryRequestDTO struct {
	Name  string `json:"name" validate:"required"`
	Color string `json:"color" validate:"required"`
	Icon  string `json:"icon"`
}

type UpdateCategoryRequestDTO struct {
	Name  *string `json:"name,omitempty"`
	Color *string `json:"color,omitempty"`
	Icon  *string `json:"icon,omitempty"`
}

// Response DTOs
type CategoryResponseDTO struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Color     string    `json:"color"`
	Icon      string    `json:"icon"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
