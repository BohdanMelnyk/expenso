package models

import (
	"time"

	"expenso-backend/domain/entities"
)

// Database Object with DB annotations
type VendorDBO struct {
	ID        int       `db:"id"`
	Name      string    `db:"name"`
	Type      string    `db:"type"`
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`
}

// Convert domain entity to DBO
func (dbo *VendorDBO) FromDomainEntity(vendor *entities.Vendor) {
	dbo.ID = int(vendor.ID())
	dbo.Name = vendor.Name()
	dbo.Type = string(vendor.Type())
	dbo.CreatedAt = vendor.CreatedAt()
	dbo.UpdatedAt = vendor.UpdatedAt()
}

// Convert DBO to domain entity
func (dbo *VendorDBO) ToDomainEntity() *entities.Vendor {
	return entities.ReconstructVendor(
		entities.VendorID(dbo.ID),
		dbo.Name,
		entities.VendorType(dbo.Type),
		dbo.CreatedAt,
		dbo.UpdatedAt,
	)
}