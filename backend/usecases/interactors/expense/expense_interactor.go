package expense

import (
	"errors"
	"time"

	"expenso-backend/domain/entities"
	"expenso-backend/domain/valueobjects"
	"expenso-backend/usecases/interfaces/repositories"
)

type CreateExpenseCommand struct {
	Amount     float64
	Date       time.Time
	Type       string
	Category   string
	Comment    string
	VendorID   *entities.VendorID
	PaidByCard *bool   // Optional, defaults to true if nil
	AddedBy    *string // Optional, defaults to "he" if nil
}

type UpdateExpenseCommand struct {
	ID         entities.ExpenseID
	Amount     *float64
	Date       *time.Time
	Category   *string
	Comment    *string
	VendorID   *entities.VendorID
	PaidByCard *bool
	AddedBy    *string
}

type ExpenseInteractor struct {
	expenseRepo repositories.ExpenseRepository
	vendorRepo  repositories.VendorRepository
}

func NewExpenseInteractor(expenseRepo repositories.ExpenseRepository, vendorRepo repositories.VendorRepository) *ExpenseInteractor {
	return &ExpenseInteractor{
		expenseRepo: expenseRepo,
		vendorRepo:  vendorRepo,
	}
}

func (i *ExpenseInteractor) CreateExpense(cmd CreateExpenseCommand) (*entities.Expense, error) {
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
		return nil, errors.New("invalid expense type")
	}

	// Create expense entity (with business rule validation)
	expense, err := entities.NewExpense(money, cmd.Date, expenseType, category, cmd.Comment)
	if err != nil {
		return nil, err
	}

	// Handle PaidByCard field - if not provided, defaults to true (card payment)
	if cmd.PaidByCard != nil {
		expense.UpdatePaidByCard(*cmd.PaidByCard)
	}
	// If cmd.PaidByCard is nil, the default value (true) from NewExpense is used

	// Handle AddedBy field - if not provided, defaults to "he"
	if cmd.AddedBy != nil {
		addedBy := entities.AddedBy(*cmd.AddedBy)
		if err := expense.UpdateAddedBy(addedBy); err != nil {
			return nil, err
		}
	}
	// If cmd.AddedBy is nil, the default value ("he") from NewExpense is used

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

func (i *ExpenseInteractor) GetExpenses() ([]*entities.Expense, error) {
	return i.expenseRepo.FindAll()
}

func (i *ExpenseInteractor) GetExpensesByDateRange(startDate, endDate *time.Time) ([]*entities.Expense, error) {
	return i.expenseRepo.FindByDateRange(startDate, endDate)
}

func (i *ExpenseInteractor) GetExpense(id entities.ExpenseID) (*entities.Expense, error) {
	return i.expenseRepo.FindByID(id)
}

func (i *ExpenseInteractor) UpdateExpense(cmd UpdateExpenseCommand) (*entities.Expense, error) {
	// Find existing expense
	expense, err := i.expenseRepo.FindByID(cmd.ID)
	if err != nil {
		return nil, err
	}

	// Update amount if provided
	if cmd.Amount != nil {
		money, err := valueobjects.NewMoney(*cmd.Amount, "USD")
		if err != nil {
			return nil, err
		}
		if err := expense.UpdateAmount(money); err != nil {
			return nil, err
		}
	}

	// Update date if provided
	if cmd.Date != nil {
		if err := expense.UpdateDate(*cmd.Date); err != nil {
			return nil, err
		}
	}

	// Update category if provided
	if cmd.Category != nil {
		category, err := entities.NewCategory(*cmd.Category)
		if err != nil {
			return nil, err
		}
		if err := expense.UpdateCategory(category); err != nil {
			return nil, err
		}
	}

	// Update comment if provided
	if cmd.Comment != nil {
		expense.UpdateComment(*cmd.Comment)
	}

	// Update addedBy if provided
	if cmd.AddedBy != nil {
		addedBy := entities.AddedBy(*cmd.AddedBy)
		if err := expense.UpdateAddedBy(addedBy); err != nil {
			return nil, err
		}
	}

	// Update vendor if provided
	if cmd.VendorID != nil {
		if *cmd.VendorID == 0 {
			// Remove vendor
			expense.RemoveVendor()
		} else {
			vendor, err := i.vendorRepo.FindByID(*cmd.VendorID)
			if err != nil {
				return nil, err
			}
			expense.AssignVendor(vendor)
		}
	}

	// Save updated expense
	if err := i.expenseRepo.Update(expense); err != nil {
		return nil, err
	}

	return expense, nil
}

func (i *ExpenseInteractor) DeleteExpense(id entities.ExpenseID) error {
	// Check if expense exists
	_, err := i.expenseRepo.FindByID(id)
	if err != nil {
		return err
	}

	// Delete expense
	return i.expenseRepo.Delete(id)
}
