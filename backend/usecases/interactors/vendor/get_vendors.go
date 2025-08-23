package vendor

import (
	"expenso-backend/domain/entities"
	"expenso-backend/usecases/interfaces/repositories"
)

type GetVendorsInteractor struct {
	vendorRepo repositories.VendorRepository
}

func NewGetVendorsInteractor(vendorRepo repositories.VendorRepository) *GetVendorsInteractor {
	return &GetVendorsInteractor{
		vendorRepo: vendorRepo,
	}
}

func (i *GetVendorsInteractor) Execute() ([]*entities.Vendor, error) {
	return i.vendorRepo.FindAll()
}

type GetVendorInteractor struct {
	vendorRepo repositories.VendorRepository
}

func NewGetVendorInteractor(vendorRepo repositories.VendorRepository) *GetVendorInteractor {
	return &GetVendorInteractor{
		vendorRepo: vendorRepo,
	}
}

func (i *GetVendorInteractor) Execute(id entities.VendorID) (*entities.Vendor, error) {
	return i.vendorRepo.FindByID(id)
}

type GetVendorsByTypeInteractor struct {
	vendorRepo repositories.VendorRepository
}

func NewGetVendorsByTypeInteractor(vendorRepo repositories.VendorRepository) *GetVendorsByTypeInteractor {
	return &GetVendorsByTypeInteractor{
		vendorRepo: vendorRepo,
	}
}

func (i *GetVendorsByTypeInteractor) Execute(vendorType entities.VendorType) ([]*entities.Vendor, error) {
	if !vendorType.IsValid() {
		return nil, entities.ErrInvalidVendorType
	}
	return i.vendorRepo.FindByType(vendorType)
}