package income

import (
	"time"

	"expenso-backend/domain/entities"
	"expenso-backend/domain/valueobjects"
	"expenso-backend/usecases/interfaces/repositories"
)

type CreateIncomeCommand struct {
	Amount   float64
	Date     time.Time
	Source   string
	Comment  string
	VendorID *entities.VendorID
	AddedBy  *string          // Optional, defaults to "he" if nil
	TagIDs   []entities.TagID // Optional list of tag IDs to assign
}

// CreateIncomeFromCSVCommand allows setting custom created/updated dates for CSV imports
type CreateIncomeFromCSVCommand struct {
	Amount    float64
	Date      time.Time
	Source    string
	Comment   string
	VendorID  *entities.VendorID
	AddedBy   *string          // Optional, defaults to "he" if nil
	TagIDs    []entities.TagID // Optional list of tag IDs to assign
	CreatedAt time.Time        // Custom created date
	UpdatedAt time.Time        // Custom updated date
}

type UpdateIncomeCommand struct {
	ID       entities.IncomeID
	Amount   *float64
	Date     *time.Time
	Source   *string
	Comment  *string
	VendorID *entities.VendorID
	AddedBy  *string
	TagIDs   *[]entities.TagID // Optional list of tag IDs to assign (nil means no change, empty slice means clear tags)
}

type IncomeInteractor struct {
	incomeRepo repositories.IncomeRepository
	vendorRepo repositories.VendorRepository
	tagRepo    repositories.TagRepository
}

func NewIncomeInteractor(incomeRepo repositories.IncomeRepository, vendorRepo repositories.VendorRepository, tagRepo repositories.TagRepository) *IncomeInteractor {
	return &IncomeInteractor{
		incomeRepo: incomeRepo,
		vendorRepo: vendorRepo,
		tagRepo:    tagRepo,
	}
}

func (i *IncomeInteractor) CreateIncome(cmd CreateIncomeCommand) (*entities.Income, error) {
	// Create money value object
	money, err := valueobjects.NewMoney(cmd.Amount, "USD")
	if err != nil {
		return nil, err
	}

	// Create new income entity
	income, err := entities.NewIncome(money, cmd.Date, cmd.Source, cmd.Comment)
	if err != nil {
		return nil, err
	}

	// Set addedBy if provided, otherwise use default
	if cmd.AddedBy != nil {
		addedBy := entities.AddedBy(*cmd.AddedBy)
		if err := income.UpdateAddedBy(addedBy); err != nil {
			return nil, err
		}
	}

	// Assign vendor if provided
	if cmd.VendorID != nil {
		vendor, err := i.vendorRepo.FindByID(*cmd.VendorID)
		if err != nil {
			return nil, err
		}
		if vendor == nil {
			return nil, entities.ErrVendorNotFound
		}
		income.AssignVendor(vendor)
	}

	// Save the income first to get an ID
	if err := i.incomeRepo.Save(income); err != nil {
		return nil, err
	}

	// Assign tags if provided
	if len(cmd.TagIDs) > 0 {
		for _, tagID := range cmd.TagIDs {
			tag, err := i.tagRepo.GetByID(tagID)
			if err != nil || tag == nil {
				// Skip invalid tags but don't fail the entire operation
				continue
			}
			if err := income.AddTag(tag); err != nil {
				// Skip if tag already exists, but don't fail
				continue
			}
			// Save the tag assignment in the database
			if err := i.tagRepo.AddTagToIncome(income.ID(), tagID); err != nil {
				// Log error but continue
				continue
			}
		}
	}

	return income, nil
}

func (i *IncomeInteractor) CreateIncomeFromCSV(cmd CreateIncomeFromCSVCommand) (*entities.Income, error) {
	// Create money value object
	money, err := valueobjects.NewMoney(cmd.Amount, "USD")
	if err != nil {
		return nil, err
	}

	// Create new income entity
	income, err := entities.NewIncome(money, cmd.Date, cmd.Source, cmd.Comment)
	if err != nil {
		return nil, err
	}

	// Set custom timestamps for CSV imports
	income.SetTimestamps(cmd.CreatedAt, cmd.UpdatedAt)

	// Set addedBy if provided, otherwise use default
	if cmd.AddedBy != nil {
		addedBy := entities.AddedBy(*cmd.AddedBy)
		if err := income.UpdateAddedBy(addedBy); err != nil {
			return nil, err
		}
	}

	// Assign vendor if provided
	if cmd.VendorID != nil {
		vendor, err := i.vendorRepo.FindByID(*cmd.VendorID)
		if err != nil {
			return nil, err
		}
		if vendor == nil {
			return nil, entities.ErrVendorNotFound
		}
		income.AssignVendor(vendor)
	}

	// Save the income first to get an ID
	if err := i.incomeRepo.Save(income); err != nil {
		return nil, err
	}

	// Assign tags if provided
	if len(cmd.TagIDs) > 0 {
		for _, tagID := range cmd.TagIDs {
			tag, err := i.tagRepo.GetByID(tagID)
			if err != nil || tag == nil {
				// Skip invalid tags but don't fail the entire operation
				continue
			}
			if err := income.AddTag(tag); err != nil {
				// Skip if tag already exists, but don't fail
				continue
			}
			// Save the tag assignment in the database
			if err := i.tagRepo.AddTagToIncome(income.ID(), tagID); err != nil {
				// Log error but continue
				continue
			}
		}
	}

	return income, nil
}

func (i *IncomeInteractor) GetIncomeByID(id entities.IncomeID) (*entities.Income, error) {
	income, err := i.incomeRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if income == nil {
		return nil, entities.ErrIncomeNotFound
	}
	return income, nil
}

func (i *IncomeInteractor) GetAllIncomes() ([]*entities.Income, error) {
	return i.incomeRepo.FindAll()
}

func (i *IncomeInteractor) GetIncomesByDateRange(startDate, endDate *time.Time) ([]*entities.Income, error) {
	return i.incomeRepo.FindByDateRange(startDate, endDate)
}

func (i *IncomeInteractor) UpdateIncome(cmd UpdateIncomeCommand) (*entities.Income, error) {
	// Get existing income
	income, err := i.incomeRepo.FindByID(cmd.ID)
	if err != nil {
		return nil, err
	}
	if income == nil {
		return nil, entities.ErrIncomeNotFound
	}

	// Update fields if provided
	if cmd.Amount != nil {
		money, err := valueobjects.NewMoney(*cmd.Amount, "USD")
		if err != nil {
			return nil, err
		}
		if err := income.UpdateAmount(money); err != nil {
			return nil, err
		}
	}

	if cmd.Date != nil {
		if err := income.UpdateDate(*cmd.Date); err != nil {
			return nil, err
		}
	}

	if cmd.Source != nil {
		if err := income.UpdateSource(*cmd.Source); err != nil {
			return nil, err
		}
	}

	if cmd.Comment != nil {
		income.UpdateComment(*cmd.Comment)
	}

	if cmd.AddedBy != nil {
		addedBy := entities.AddedBy(*cmd.AddedBy)
		if err := income.UpdateAddedBy(addedBy); err != nil {
			return nil, err
		}
	}

	// Update vendor if provided
	if cmd.VendorID != nil {
		vendor, err := i.vendorRepo.FindByID(*cmd.VendorID)
		if err != nil {
			return nil, err
		}
		if vendor == nil {
			return nil, entities.ErrVendorNotFound
		}
		income.AssignVendor(vendor)
	}

	// Update tags if provided (nil means no change, empty slice means clear all tags)
	if cmd.TagIDs != nil {
		// Clear existing tags
		income.ClearTags()
		if err := i.tagRepo.ClearIncomeTags(income.ID()); err != nil {
			return nil, err
		}

		// Add new tags
		for _, tagID := range *cmd.TagIDs {
			tag, err := i.tagRepo.GetByID(tagID)
			if err != nil || tag == nil {
				continue // Skip invalid tags
			}
			if err := income.AddTag(tag); err != nil {
				continue // Skip if error adding tag
			}
			// Save the tag assignment in the database
			if err := i.tagRepo.AddTagToIncome(income.ID(), tagID); err != nil {
				continue // Skip if error saving tag assignment
			}
		}
	}

	// Save the updated income
	if err := i.incomeRepo.Update(income); err != nil {
		return nil, err
	}

	return income, nil
}

func (i *IncomeInteractor) DeleteIncome(id entities.IncomeID) error {
	// Check if income exists
	income, err := i.incomeRepo.FindByID(id)
	if err != nil {
		return err
	}
	if income == nil {
		return entities.ErrIncomeNotFound
	}

	// Clear tags first (foreign key constraint)
	if err := i.tagRepo.ClearIncomeTags(id); err != nil {
		return err
	}

	// Delete the income
	return i.incomeRepo.Delete(id)
}

func (i *IncomeInteractor) GetIncomesBySource(source string) ([]*entities.Income, error) {
	return i.incomeRepo.FindBySource(source)
}

func (i *IncomeInteractor) GetIncomesByVendor(vendorID entities.VendorID) ([]*entities.Income, error) {
	return i.incomeRepo.FindByVendor(vendorID)
}

// Business logic methods
func (i *IncomeInteractor) GetTotalIncomeByDateRange(startDate, endDate *time.Time) (float64, error) {
	incomes, err := i.incomeRepo.FindByDateRange(startDate, endDate)
	if err != nil {
		return 0, err
	}

	var total float64
	for _, income := range incomes {
		total += income.Amount().Amount()
	}

	return total, nil
}

func (i *IncomeInteractor) GetIncomeCountByDateRange(startDate, endDate *time.Time) (int, error) {
	incomes, err := i.incomeRepo.FindByDateRange(startDate, endDate)
	if err != nil {
		return 0, err
	}

	return len(incomes), nil
}