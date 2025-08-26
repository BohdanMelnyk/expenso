package models

import (
	"time"

	"expenso-backend/domain/entities"
	"expenso-backend/domain/valueobjects"
)

// Database Object with DB annotations
type IncomeDBO struct {
	ID        int       `db:"id"`
	Amount    float64   `db:"amount"`
	Date      time.Time `db:"date"`
	Source    string    `db:"source"`
	Comment   string    `db:"comment"`
	VendorID  *int      `db:"vendor_id"`
	AddedBy   string    `db:"added_by"`
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`
}

// Convert domain entity to DBO
func (dbo *IncomeDBO) FromDomainEntity(income *entities.Income) {
	dbo.ID = int(income.ID())
	dbo.Amount = income.Amount().Amount()
	dbo.Date = income.Date()
	dbo.Source = income.Source()
	dbo.Comment = income.Comment()
	dbo.AddedBy = income.AddedBy().String()

	if income.Vendor() != nil {
		vendorID := int(income.Vendor().ID())
		dbo.VendorID = &vendorID
	}

	dbo.CreatedAt = income.CreatedAt()
	dbo.UpdatedAt = income.UpdatedAt()
}

// Convert DBO to domain entity
func (dbo *IncomeDBO) ToDomainEntity() (*entities.Income, error) {
	money, err := valueobjects.NewMoney(dbo.Amount, "USD")
	if err != nil {
		return nil, err
	}

	income := entities.ReconstructIncome(
		entities.IncomeID(dbo.ID),
		money,
		dbo.Date,
		dbo.Source,
		dbo.Comment,
		nil, // vendor will be set separately
		entities.AddedBy(dbo.AddedBy),
		[]*entities.Tag{}, // tags will be set separately
		dbo.CreatedAt,
		dbo.UpdatedAt,
	)

	return income, nil
}