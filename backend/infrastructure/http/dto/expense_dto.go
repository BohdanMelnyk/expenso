package dto

import "time"

// Request DTOs with JSON annotations for syntactic validation
type CreateExpenseRequestDTO struct {
	Amount     float64 `json:"amount" validate:"required,gt=0"`
	Date       string  `json:"date" validate:"required"`
	Type       string  `json:"type" validate:"required"`
	Category   string  `json:"category" validate:"required"`
	Comment    string  `json:"comment"`
	VendorID   *int    `json:"vendor_id,omitempty"`
	PaidByCard *bool   `json:"paid_by_card,omitempty"`                               // Optional, defaults to true if not provided
	AddedBy    *string `json:"added_by,omitempty" validate:"omitempty,oneof=he she"` // Optional, defaults to "he" if not provided
}

type UpdateExpenseRequestDTO struct {
	Amount     *float64 `json:"amount,omitempty" validate:"omitempty,gt=0"`
	Date       *string  `json:"date,omitempty"`
	Type       *string  `json:"type,omitempty"`
	Category   *string  `json:"category,omitempty"`
	Comment    *string  `json:"comment,omitempty"`
	VendorID   *int     `json:"vendor_id,omitempty"`
	PaidByCard *bool    `json:"paid_by_card,omitempty"`
	AddedBy    *string  `json:"added_by,omitempty" validate:"omitempty,oneof=he she"`
}

// Response DTOs with JSON annotations
type ExpenseResponseDTO struct {
	ID         int                `json:"id"`
	Amount     float64            `json:"amount"`
	Date       string             `json:"date"`
	Type       string             `json:"type"`
	Category   string             `json:"category"`
	Comment    string             `json:"comment"`
	Vendor     *VendorResponseDTO `json:"vendor,omitempty"`
	PaidByCard bool               `json:"paid_by_card"`
	AddedBy    string             `json:"added_by"`
	CreatedAt  time.Time          `json:"created_at"`
	UpdatedAt  time.Time          `json:"updated_at"`
}
