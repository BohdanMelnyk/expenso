package vendors

import (
	"strings"

	"expenso-backend/domain/entities"
	"expenso-backend/usecases/interfaces/repositories"
)

type CreateVendorCommand struct {
	Name       string
	Type       string
	CategoryID entities.CategoryID
}

type UpdateVendorCommand struct {
	ID         entities.VendorID
	Name       *string
	Type       *string
	CategoryID *entities.CategoryID
}

type VendorInteractor struct {
	vendorRepo   repositories.VendorRepository
	categoryRepo repositories.CategoryRepository
}

func NewVendorInteractor(vendorRepo repositories.VendorRepository, categoryRepo repositories.CategoryRepository) *VendorInteractor {
	return &VendorInteractor{
		vendorRepo:   vendorRepo,
		categoryRepo: categoryRepo,
	}
}

func (i *VendorInteractor) CreateVendor(cmd CreateVendorCommand) (*entities.Vendor, error) {
	// Type is secondary to the category; default to the catch-all type
	vendorType := entities.VendorTypeElse
	if cmd.Type != "" {
		vendorType = entities.VendorType(cmd.Type)
	}
	if !vendorType.IsValid() {
		return nil, entities.ErrInvalidVendorType
	}

	category, err := i.categoryRepo.FindByID(cmd.CategoryID)
	if err != nil {
		return nil, err
	}

	// Create vendor entity (with business rule validation)
	vendor, err := entities.NewVendor(cmd.Name, vendorType, category)
	if err != nil {
		return nil, err
	}

	// Vendor names are unique within a category
	existingVendors, err := i.vendorRepo.FindAll()
	if err != nil {
		return nil, err
	}
	for _, existing := range existingVendors {
		if strings.EqualFold(existing.Name(), vendor.Name()) && existing.CategoryID() == vendor.CategoryID() {
			return nil, entities.ErrVendorAlreadyExists
		}
	}

	// Save vendor
	if err := i.vendorRepo.Save(vendor); err != nil {
		return nil, err
	}

	return vendor, nil
}

func (i *VendorInteractor) GetVendors() ([]*entities.Vendor, error) {
	return i.vendorRepo.FindAll()
}

func (i *VendorInteractor) GetVendor(id entities.VendorID) (*entities.Vendor, error) {
	return i.vendorRepo.FindByID(id)
}

func (i *VendorInteractor) GetVendorsByType(vendorType entities.VendorType) ([]*entities.Vendor, error) {
	if !vendorType.IsValid() {
		return nil, entities.ErrInvalidVendorType
	}
	return i.vendorRepo.FindByType(vendorType)
}

func (i *VendorInteractor) UpdateVendor(cmd UpdateVendorCommand) (*entities.Vendor, error) {
	// Find existing vendor
	vendor, err := i.vendorRepo.FindByID(cmd.ID)
	if err != nil {
		return nil, err
	}

	// Update name if provided
	if cmd.Name != nil {
		if err := vendor.UpdateName(*cmd.Name); err != nil {
			return nil, err
		}
	}

	// Update type if provided
	if cmd.Type != nil {
		vendorType := entities.VendorType(*cmd.Type)
		if err := vendor.UpdateType(vendorType); err != nil {
			return nil, err
		}
	}

	// Update category if provided
	if cmd.CategoryID != nil {
		category, err := i.categoryRepo.FindByID(*cmd.CategoryID)
		if err != nil {
			return nil, err
		}
		if err := vendor.UpdateCategory(category); err != nil {
			return nil, err
		}
	}

	// Save updated vendor
	if err := i.vendorRepo.Update(vendor); err != nil {
		return nil, err
	}

	return vendor, nil
}

func (i *VendorInteractor) DeleteVendor(id entities.VendorID) error {
	return i.vendorRepo.Delete(id)
}
