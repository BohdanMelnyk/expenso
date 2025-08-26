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
	PaidByCard *bool            // Optional, defaults to true if nil
	AddedBy    *string          // Optional, defaults to "he" if nil
	TagIDs     []entities.TagID // Optional list of tag IDs to assign
}

// CreateExpenseFromCSVCommand allows setting custom created/updated dates for CSV imports
type CreateExpenseFromCSVCommand struct {
	Amount     float64
	Date       time.Time
	Type       string
	Category   string
	Comment    string
	VendorID   *entities.VendorID
	PaidByCard *bool            // Optional, defaults to true if nil
	AddedBy    *string          // Optional, defaults to "he" if nil
	TagIDs     []entities.TagID // Optional list of tag IDs to assign
	CreatedAt  time.Time        // Custom created date
	UpdatedAt  time.Time        // Custom updated date
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
	TagIDs     *[]entities.TagID // Optional list of tag IDs to assign (nil means no change, empty slice means clear tags)
}

type ExpenseInteractor struct {
	expenseRepo repositories.ExpenseRepository
	vendorRepo  repositories.VendorRepository
	tagRepo     repositories.TagRepository
}

func NewExpenseInteractor(expenseRepo repositories.ExpenseRepository, vendorRepo repositories.VendorRepository, tagRepo repositories.TagRepository) *ExpenseInteractor {
	return &ExpenseInteractor{
		expenseRepo: expenseRepo,
		vendorRepo:  vendorRepo,
		tagRepo:     tagRepo,
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

	// Save expense first to get the ID
	if err := i.expenseRepo.Save(expense); err != nil {
		return nil, err
	}

	// Handle tag assignment if provided
	if len(cmd.TagIDs) > 0 {
		if err := i.assignTagsToExpense(expense.ID(), cmd.TagIDs); err != nil {
			return nil, err
		}
		// Reload expense with tags
		expense, err = i.expenseRepo.FindByID(expense.ID())
		if err != nil {
			return nil, err
		}
	}

	return expense, nil
}

func (i *ExpenseInteractor) CreateExpenseFromCSV(cmd CreateExpenseFromCSVCommand) (*entities.Expense, error) {
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

	// Handle AddedBy field - if not provided, defaults to "he"
	if cmd.AddedBy != nil {
		addedBy := entities.AddedBy(*cmd.AddedBy)
		if err := expense.UpdateAddedBy(addedBy); err != nil {
			return nil, err
		}
	}

	// Handle vendor assignment if provided
	if cmd.VendorID != nil {
		vendor, err := i.vendorRepo.FindByID(*cmd.VendorID)
		if err != nil {
			return nil, err
		}
		expense.AssignVendor(vendor)
	}

	// Set custom created/updated timestamps for CSV import
	expense.SetTimestamps(cmd.CreatedAt, cmd.UpdatedAt)

	// Save expense first to get the ID
	if err := i.expenseRepo.Save(expense); err != nil {
		return nil, err
	}

	// Handle tag assignment if provided
	if len(cmd.TagIDs) > 0 {
		if err := i.assignTagsToExpense(expense.ID(), cmd.TagIDs); err != nil {
			return nil, err
		}
		// Reload expense with tags
		expense, err = i.expenseRepo.FindByID(expense.ID())
		if err != nil {
			return nil, err
		}
	}

	return expense, nil
}

func (i *ExpenseInteractor) GetExpenses() ([]*entities.Expense, error) {
	return i.expenseRepo.FindAll()
}

func (i *ExpenseInteractor) GetExpensesByDateRange(startDate, endDate *time.Time) ([]*entities.Expense, error) {
	return i.expenseRepo.FindByDateRange(startDate, endDate)
}

// GetActualExpensesByDateRange returns expenses excluding salary entries
func (i *ExpenseInteractor) GetActualExpensesByDateRange(startDate, endDate *time.Time) ([]*entities.Expense, error) {
	allExpenses, err := i.expenseRepo.FindByDateRange(startDate, endDate)
	if err != nil {
		return nil, err
	}

	var actualExpenses []*entities.Expense
	for _, expense := range allExpenses {
		// Exclude salary entries from regular expense calculations
		if expense.Vendor() != nil && expense.Vendor().Type() != entities.VendorTypeSalary {
			actualExpenses = append(actualExpenses, expense)
		}
	}
	return actualExpenses, nil
}

// GetEarningsByDateRange returns only salary entries (earnings)
func (i *ExpenseInteractor) GetEarningsByDateRange(startDate, endDate *time.Time) ([]*entities.Expense, error) {
	allExpenses, err := i.expenseRepo.FindByDateRange(startDate, endDate)
	if err != nil {
		return nil, err
	}

	var earnings []*entities.Expense
	for _, expense := range allExpenses {
		// Include only salary entries as earnings
		if expense.Vendor() != nil && expense.Vendor().Type() == entities.VendorTypeSalary {
			earnings = append(earnings, expense)
		}
	}
	return earnings, nil
}

// GetBalanceSummaryByDateRange calculates earnings vs spending with balance
func (i *ExpenseInteractor) GetBalanceSummaryByDateRange(startDate, endDate *time.Time) (map[string]interface{}, error) {
	earnings, err := i.GetEarningsByDateRange(startDate, endDate)
	if err != nil {
		return nil, err
	}

	expenses, err := i.GetActualExpensesByDateRange(startDate, endDate)
	if err != nil {
		return nil, err
	}

	var totalEarnings, totalExpenses float64

	for _, earning := range earnings {
		totalEarnings += earning.Amount().Amount()
	}

	for _, expense := range expenses {
		totalExpenses += expense.Amount().Amount()
	}

	balance := totalEarnings - totalExpenses

	return map[string]interface{}{
		"total_earnings": totalEarnings,
		"total_expenses": totalExpenses,
		"balance":        balance,
		"earnings_count": len(earnings),
		"expenses_count": len(expenses),
	}, nil
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

	// Update tags if provided
	if cmd.TagIDs != nil {
		// Clear existing tags first
		if err := i.tagRepo.ClearExpenseTags(expense.ID()); err != nil {
			return nil, err
		}

		// Assign new tags if any
		if len(*cmd.TagIDs) > 0 {
			if err := i.assignTagsToExpense(expense.ID(), *cmd.TagIDs); err != nil {
				return nil, err
			}
		}

		// Clear tags from entity and reload with new tags
		expense.ClearTags()
	}

	// Save updated expense
	if err := i.expenseRepo.Update(expense); err != nil {
		return nil, err
	}

	// If tags were updated, reload the expense to get the updated tags
	if cmd.TagIDs != nil {
		expense, err := i.expenseRepo.FindByID(expense.ID())
		if err != nil {
			return nil, err
		}
		return expense, nil
	}

	return expense, nil
}

func (i *ExpenseInteractor) DeleteExpense(id entities.ExpenseID) error {
	// Check if expense exists
	_, err := i.expenseRepo.FindByID(id)
	if err != nil {
		return err
	}

	// Delete expense (tags will be deleted via cascade)
	return i.expenseRepo.Delete(id)
}

// assignTagsToExpense is a helper method to assign multiple tags to an expense
func (i *ExpenseInteractor) assignTagsToExpense(expenseID entities.ExpenseID, tagIDs []entities.TagID) error {
	for _, tagID := range tagIDs {
		// Verify tag exists
		tag, err := i.tagRepo.GetByID(tagID)
		if err != nil {
			return err
		}
		if tag == nil {
			return errors.New("tag not found")
		}

		// Add tag to expense
		if err := i.tagRepo.AddTagToExpense(expenseID, tagID); err != nil {
			return err
		}
	}
	return nil
}
