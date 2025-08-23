package expense

import (
	"time"

	"expenso-backend/domain/entities"
	"expenso-backend/domain/valueobjects"
	"expenso-backend/usecases/interfaces/repositories"
)

type CreateExpenseCommand struct {
	Amount   float64
	Date     time.Time
	Type     string
	Category string
	Comment  string
	VendorID *entities.VendorID
}

type CreateExpenseInteractor struct {
	expenseRepo repositories.ExpenseRepository
	vendorRepo  repositories.VendorRepository
}

func NewCreateExpenseInteractor(expenseRepo repositories.ExpenseRepository, vendorRepo repositories.VendorRepository) *CreateExpenseInteractor {
	return &CreateExpenseInteractor{
		expenseRepo: expenseRepo,
		vendorRepo:  vendorRepo,
	}
}

func (i *CreateExpenseInteractor) Execute(cmd CreateExpenseCommand) (*entities.Expense, error) {
	// Create money value object
	money, err := valueobjects.NewMoney(cmd.Amount, "USD")
	if err != nil {
		return nil, err
	}

	// Create category
	category, err := entities.NewCategory(cmd.Category)
	if err != nil {
		return nil, err
	}

	// Validate expense type
	expenseType := entities.ExpenseType(cmd.Type)
	if !expenseType.IsValid() {
		return nil, err
	}

	// Create expense entity (with business rule validation)
	expense, err := entities.NewExpense(money, cmd.Date, expenseType, category, cmd.Comment)
	if err != nil {
		return nil, err
	}

	// Handle vendor assignment if provided
	if cmd.VendorID != nil {
		vendor, err := i.vendorRepo.FindByID(*cmd.VendorID)
		if err != nil {
			return nil, err
		}
		expense.AssignVendor(vendor)
	}

	// Save expense
	if err := i.expenseRepo.Save(expense); err != nil {
		return nil, err
	}

	return expense, nil
}