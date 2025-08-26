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
	Tags       []TagResponseDTO   `json:"tags,omitempty"`
	CreatedAt  time.Time          `json:"created_at"`
	UpdatedAt  time.Time          `json:"updated_at"`
}

// CSV Import DTOs
type CSVImportRequestDTO struct {
	CSVData string `json:"csv_data" validate:"required"`
}

type CSVImportPreviewDTO struct {
	Rows []CSVRowPreviewDTO `json:"rows"`
}

type CSVRowPreviewDTO struct {
	RowNumber int                `json:"row_number"`
	Date      string             `json:"date"`
	Expenses  map[string]float64 `json:"expenses"`
	Issues    []string           `json:"issues,omitempty"`
	Parsed    []ParsedExpenseDTO `json:"parsed_expenses"`
}

type ParsedExpenseDTO struct {
	Comment    string   `json:"comment"`
	Amount     float64  `json:"amount"`
	Date       string   `json:"date"`
	VendorType string   `json:"vendor_type"`
	Category   string   `json:"category"`
	Issues     []string `json:"issues,omitempty"`
}

type CSVImportConfirmRequestDTO struct {
	RowNumber int                       `json:"row_number"`
	Expenses  []CreateExpenseRequestDTO `json:"expenses"`
}

// Tag DTOs
type CreateTagRequestDTO struct {
	Name  string `json:"name" validate:"required"`
	Color string `json:"color" validate:"required"`
}

type UpdateTagRequestDTO struct {
	Name  *string `json:"name,omitempty"`
	Color *string `json:"color,omitempty"`
}

type TagResponseDTO struct {
	ID        int       `json:"id"`
	Name      string    `json:"name"`
	Color     string    `json:"color"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
