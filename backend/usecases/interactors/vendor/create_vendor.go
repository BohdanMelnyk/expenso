package vendor

import (
	"expenso-backend/domain/entities"
	"expenso-backend/usecases/interfaces/repositories"
)

type CreateVendorCommand struct {
	Name string
	Type string
}

type CreateVendorInteractor struct {
	vendorRepo repositories.VendorRepository
}

func NewCreateVendorInteractor(vendorRepo repositories.VendorRepository) *CreateVendorInteractor {
	return &CreateVendorInteractor{
		vendorRepo: vendorRepo,
	}
}

func (i *CreateVendorInteractor) Execute(cmd CreateVendorCommand) (*entities.Vendor, error) {
	// Validate vendor type
	vendorType := entities.VendorType(cmd.Type)
	if !vendorType.IsValid() {
		return nil, entities.ErrInvalidVendorType
	}

	// Create vendor entity (with business rule validation)
	vendor, err := entities.NewVendor(cmd.Name, vendorType)
	if err != nil {
		return nil, err
	}

	// Check if vendor with same name and type already exists
	existingVendor, err := i.vendorRepo.FindByName(vendor.Name())
	if err == nil && existingVendor != nil && existingVendor.Type() == vendor.Type() {
		return nil, entities.ErrVendorAlreadyExists
	}

	// Save vendor
	if err := i.vendorRepo.Save(vendor); err != nil {
		return nil, err
	}

	return vendor, nil
}