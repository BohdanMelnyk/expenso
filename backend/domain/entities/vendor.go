package entities

import (
	"errors"
	"strings"
	"time"
)

type VendorType string

const (
	VendorTypeFoodStore     VendorType = "food_store"
	VendorTypeShop          VendorType = "shop"
	VendorTypeEatingOut     VendorType = "eating_out"
	VendorTypeSubscriptions VendorType = "subscriptions"
	VendorTypeElse          VendorType = "else"
)

func (vt VendorType) IsValid() bool {
	switch vt {
	case VendorTypeFoodStore, VendorTypeShop, VendorTypeEatingOut, VendorTypeSubscriptions, VendorTypeElse:
		return true
	}
	return false
}

type VendorID int

type Vendor struct {
	id        VendorID
	name      string
	vendorType VendorType
	createdAt time.Time
	updatedAt time.Time
}

func NewVendor(name string, vendorType VendorType) (*Vendor, error) {
	if strings.TrimSpace(name) == "" {
		return nil, errors.New("vendor name cannot be empty")
	}
	
	if !vendorType.IsValid() {
		return nil, errors.New("invalid vendor type")
	}

	now := time.Now()
	return &Vendor{
		name:       strings.TrimSpace(name),
		vendorType: vendorType,
		createdAt:  now,
		updatedAt:  now,
	}, nil
}

func ReconstructVendor(id VendorID, name string, vendorType VendorType, createdAt, updatedAt time.Time) *Vendor {
	return &Vendor{
		id:        id,
		name:      name,
		vendorType: vendorType,
		createdAt: createdAt,
		updatedAt: updatedAt,
	}
}

func (v *Vendor) ID() VendorID {
	return v.id
}

func (v *Vendor) Name() string {
	return v.name
}

func (v *Vendor) Type() VendorType {
	return v.vendorType
}

func (v *Vendor) CreatedAt() time.Time {
	return v.createdAt
}

func (v *Vendor) UpdatedAt() time.Time {
	return v.updatedAt
}

func (v *Vendor) UpdateName(name string) error {
	if strings.TrimSpace(name) == "" {
		return errors.New("vendor name cannot be empty")
	}
	v.name = strings.TrimSpace(name)
	v.updatedAt = time.Now()
	return nil
}

func (v *Vendor) UpdateType(vendorType VendorType) error {
	if !vendorType.IsValid() {
		return errors.New("invalid vendor type")
	}
	v.vendorType = vendorType
	v.updatedAt = time.Now()
	return nil
}

func (v *Vendor) SetID(id VendorID) {
	v.id = id
}