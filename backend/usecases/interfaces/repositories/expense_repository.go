package repositories

import (
	"expenso-backend/domain/entities"
)

type ExpenseRepository interface {
	Save(expense *entities.Expense) error
	FindByID(id entities.ExpenseID) (*entities.Expense, error)
	FindAll() ([]*entities.Expense, error)
	Update(expense *entities.Expense) error
	Delete(id entities.ExpenseID) error
	FindByCategory(category entities.Category) ([]*entities.Expense, error)
	FindByVendor(vendorID entities.VendorID) ([]*entities.Expense, error)
}