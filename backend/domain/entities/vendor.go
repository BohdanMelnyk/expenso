package entities

import (
	"errors"
	"strings"
	"time"
)

type VendorType string

const (
	VendorTypeFoodStore         VendorType = "food_store"
	VendorTypeShop              VendorType = "shop"
	VendorTypeEatingOut         VendorType = "eating_out"
	VendorTypeSubscriptions     VendorType = "subscriptions"
	VendorTypeCare              VendorType = "care"
	VendorTypeClothing          VendorType = "clothing"
	VendorTypeElse              VendorType = "else"
	VendorTypeHousehold         VendorType = "household"
	VendorTypeLiving            VendorType = "living"
	VendorTypeSalary            VendorType = "salary"
	VendorTypeTransport         VendorType = "transport"
	VendorTypeTourism           VendorType = "tourism"
	VendorTypeCar               VendorType = "car"
	VendorTypeDining            VendorType = "dining"
	VendorTypeDiningWithFriends VendorType = "dining_with_friends"
)

func (vt VendorType) IsValid() bool {
	switch vt {
	case VendorTypeFoodStore, VendorTypeCar, VendorTypeTourism, VendorTypeTransport, VendorTypeSalary, VendorTypeLiving, VendorTypeHousehold, VendorTypeCare, VendorTypeClothing, VendorTypeShop, VendorTypeEatingOut, VendorTypeSubscriptions, VendorTypeElse, VendorTypeDining, VendorTypeDiningWithFriends:
		return true
	}
	return false
}

type VendorID int

type Vendor struct {
	id           VendorID
	name         string
	vendorType   VendorType
	categoryID   CategoryID
	categoryName string
	createdAt    time.Time
	updatedAt    time.Time
}

func NewVendor(name string, vendorType VendorType, category *CategoryEntity) (*Vendor, error) {
	if strings.TrimSpace(name) == "" {
		return nil, errors.New("vendor name cannot be empty")
	}

	if !vendorType.IsValid() {
		return nil, errors.New("invalid vendor type")
	}

	if category == nil {
		return nil, ErrCategoryNotFound
	}

	now := time.Now()
	return &Vendor{
		name:         strings.TrimSpace(name),
		vendorType:   vendorType,
		categoryID:   category.ID(),
		categoryName: category.Name(),
		createdAt:    now,
		updatedAt:    now,
	}, nil
}

func ReconstructVendor(id VendorID, name string, vendorType VendorType, categoryID CategoryID, categoryName string, createdAt, updatedAt time.Time) *Vendor {
	return &Vendor{
		id:           id,
		name:         name,
		vendorType:   vendorType,
		categoryID:   categoryID,
		categoryName: categoryName,
		createdAt:    createdAt,
		updatedAt:    updatedAt,
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

func (v *Vendor) CategoryID() CategoryID {
	return v.categoryID
}

func (v *Vendor) CategoryName() string {
	return v.categoryName
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

func (v *Vendor) UpdateCategory(category *CategoryEntity) error {
	if category == nil {
		return ErrCategoryNotFound
	}
	v.categoryID = category.ID()
	v.categoryName = category.Name()
	v.updatedAt = time.Now()
	return nil
}

func (v *Vendor) SetID(id VendorID) {
	v.id = id
}
