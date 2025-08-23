package repositories

import (
	"expenso-backend/domain/entities"
)

type VendorRepository interface {
	Save(vendor *entities.Vendor) error
	FindByID(id entities.VendorID) (*entities.Vendor, error)
	FindAll() ([]*entities.Vendor, error)
	FindByType(vendorType entities.VendorType) ([]*entities.Vendor, error)
	Update(vendor *entities.Vendor) error
	Delete(id entities.VendorID) error
	FindByName(name string) (*entities.Vendor, error)
}