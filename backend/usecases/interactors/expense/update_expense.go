package expense

import (
	"time"

	"expenso-backend/domain/entities"
	"expenso-backend/domain/valueobjects"
	"expenso-backend/usecases/interfaces/repositories"
)

type UpdateExpenseCommand struct {
	ID       entities.ExpenseID
	Amount   *float64
	Date     *time.Time
	Category *string
	Comment  *string
	VendorID *entities.VendorID
}

type UpdateExpenseInteractor struct {
	expenseRepo repositories.ExpenseRepository
	vendorRepo  repositories.VendorRepository
}

func NewUpdateExpenseInteractor(expenseRepo repositories.ExpenseRepository, vendorRepo repositories.VendorRepository) *UpdateExpenseInteractor {
	return &UpdateExpenseInteractor{
		expenseRepo: expenseRepo,
		vendorRepo:  vendorRepo,
	}
}

func (i *UpdateExpenseInteractor) Execute(cmd UpdateExpenseCommand) (*entities.Expense, error) {
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