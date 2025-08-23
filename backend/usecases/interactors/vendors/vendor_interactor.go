package vendors

import (
	"expenso-backend/domain/entities"
	"expenso-backend/usecases/interfaces/repositories"
)

type CreateVendorCommand struct {
	Name string
	Type string
}

type VendorInteractor struct {
	vendorRepo repositories.VendorRepository
}

func NewVendorInteractor(vendorRepo repositories.VendorRepository) *VendorInteractor {
	return &VendorInteractor{
		vendorRepo: vendorRepo,
	}
}

func (i *VendorInteractor) CreateVendor(cmd CreateVendorCommand) (*entities.Vendor, error) {
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
