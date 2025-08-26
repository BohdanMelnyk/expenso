package dto

import (
	"time"

	"expenso-backend/domain/entities"
)

// Request DTOs with JSON annotations for syntactic validation
type CreateIncomeRequestDTO struct {
	Amount   float64 `json:"amount" validate:"required,gt=0"`
	Date     string  `json:"date" validate:"required"`
	Source   string  `json:"source" validate:"required"`
	Comment  string  `json:"comment"`
	VendorID *int    `json:"vendor_id,omitempty"`
	AddedBy  *string `json:"added_by,omitempty" validate:"omitempty,oneof=he she"` // Optional, defaults to "he" if not provided
	TagIDs   *[]int  `json:"tag_ids,omitempty"`                                    // Optional list of tag IDs
}

type UpdateIncomeRequestDTO struct {
	Amount   *float64 `json:"amount,omitempty" validate:"omitempty,gt=0"`
	Date     *string  `json:"date,omitempty"`
	Source   *string  `json:"source,omitempty"`
	Comment  *string  `json:"comment,omitempty"`
	VendorID *int     `json:"vendor_id,omitempty"`
	AddedBy  *string  `json:"added_by,omitempty" validate:"omitempty,oneof=he she"`
	TagIDs   *[]int   `json:"tag_ids,omitempty"`
}

// Response DTOs with JSON annotations
type IncomeResponseDTO struct {
	ID        int                `json:"id"`
	Amount    float64            `json:"amount"`
	Date      string             `json:"date"`
	Source    string             `json:"source"`
	Comment   string             `json:"comment"`
	Vendor    *VendorResponseDTO `json:"vendor,omitempty"`
	AddedBy   string             `json:"added_by"`
	Tags      []TagResponseDTO   `json:"tags,omitempty"`
	CreatedAt time.Time          `json:"created_at"`
	UpdatedAt time.Time          `json:"updated_at"`
}

// Summary DTO
type IncomeSummaryDTO struct {
	TotalIncome float64 `json:"total_income"`
	IncomeCount int     `json:"income_count"`
}

// Helper function to convert domain entity to response DTO
func ToIncomeResponseDTO(income *entities.Income) IncomeResponseDTO {
	dto := IncomeResponseDTO{
		ID:        int(income.ID()),
		Amount:    income.Amount().Amount(),
		Date:      income.Date().Format("2006-01-02"),
		Source:    income.Source(),
		Comment:   income.Comment(),
		AddedBy:   income.AddedBy().String(),
		CreatedAt: income.CreatedAt(),
		UpdatedAt: income.UpdatedAt(),
	}

	// Add vendor if present
	if income.Vendor() != nil {
		vendorDTO := VendorResponseDTO{
			ID:        int(income.Vendor().ID()),
			Name:      income.Vendor().Name(),
			Type:      string(income.Vendor().Type()),
			CreatedAt: income.Vendor().CreatedAt(),
			UpdatedAt: income.Vendor().UpdatedAt(),
		}
		dto.Vendor = &vendorDTO
	}

	// Add tags if present
	if len(income.Tags()) > 0 {
		for _, tag := range income.Tags() {
			tagDTO := TagResponseDTO{
				ID:        int(tag.ID()),
				Name:      tag.Name(),
				Color:     tag.Color(),
				CreatedAt: tag.CreatedAt(),
				UpdatedAt: tag.UpdatedAt(),
			}
			dto.Tags = append(dto.Tags, tagDTO)
		}
	}

	return dto
}