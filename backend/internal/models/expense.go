package models

import (
	"time"
)

type Expense struct {
	ID        int       `json:"id" db:"id"`
	Amount    float64   `json:"amount" db:"amount"`
	Date      time.Time `json:"date" db:"date"`
	Type      string    `json:"type" db:"type"`
	Category  string    `json:"category" db:"category"`
	Comment   string    `json:"comment" db:"comment"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type CreateExpenseRequest struct {
	Amount   float64 `json:"amount" validate:"required,gt=0"`
	Date     string  `json:"date" validate:"required"`
	Type     string  `json:"type" validate:"required"`
	Category string  `json:"category" validate:"required"`
	Comment  string  `json:"comment"`
}

type UpdateExpenseRequest struct {
	Amount   *float64 `json:"amount,omitempty" validate:"omitempty,gt=0"`
	Date     *string  `json:"date,omitempty"`
	Type     *string  `json:"type,omitempty"`
	Category *string  `json:"category,omitempty"`
	Comment  *string  `json:"comment,omitempty"`
}