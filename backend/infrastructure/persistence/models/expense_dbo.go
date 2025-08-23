package models

import (
	"time"

	"expenso-backend/domain/entities"
	"expenso-backend/domain/valueobjects"
)

// Database Object with DB annotations
type ExpenseDBO struct {
	ID        int       `db:"id"`
	Amount    float64   `db:"amount"`
	Date      time.Time `db:"date"`
	Type      string    `db:"type"`
	Category  string    `db:"category"`
	Comment   string    `db:"comment"`
	VendorID  *int      `db:"vendor_id"`
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`
}

// Convert domain entity to DBO
func (dbo *ExpenseDBO) FromDomainEntity(expense *entities.Expense) {
	dbo.ID = int(expense.ID())
	dbo.Amount = expense.Amount().Amount()
	dbo.Date = expense.Date()
	dbo.Type = string(expense.Type())
	dbo.Category = expense.Category().String()
	dbo.Comment = expense.Comment()
	
	if expense.Vendor() != nil {
		vendorID := int(expense.Vendor().ID())
		dbo.VendorID = &vendorID
	}
	
	dbo.CreatedAt = expense.CreatedAt()
	dbo.UpdatedAt = expense.UpdatedAt()
}

// Convert DBO to domain entity
func (dbo *ExpenseDBO) ToDomainEntity() (*entities.Expense, error) {
	money, err := valueobjects.NewMoney(dbo.Amount, "USD")
	if err != nil {
		return nil, err
	}

	category, err := entities.NewCategory(dbo.Category)
	if err != nil {
		return nil, err
	}

	expense := entities.ReconstructExpense(
		entities.ExpenseID(dbo.ID),
		money,
		dbo.Date,
		entities.ExpenseType(dbo.Type),
		category,
		dbo.Comment,
		nil, // vendor will be set separately
		dbo.CreatedAt,
		dbo.UpdatedAt,
	)

	return expense, nil
}