package repositories

import (
	"expenso-backend/domain/entities"
	"time"
)

type IncomeRepository interface {
	Save(income *entities.Income) error
	FindByID(id entities.IncomeID) (*entities.Income, error)
	FindAll() ([]*entities.Income, error)
	FindByDateRange(startDate, endDate *time.Time) ([]*entities.Income, error)
	Update(income *entities.Income) error
	Delete(id entities.IncomeID) error
	FindBySource(source string) ([]*entities.Income, error)
	FindByVendor(vendorID entities.VendorID) ([]*entities.Income, error)
}