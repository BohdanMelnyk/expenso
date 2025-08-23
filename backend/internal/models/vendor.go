package models

import "time"

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

type Vendor struct {
	ID        int       `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	Type      string    `json:"type" db:"type"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type CreateVendorRequest struct {
	Name string `json:"name" validate:"required"`
	Type string `json:"type" validate:"required"`
}

type UpdateVendorRequest struct {
	Name *string `json:"name,omitempty"`
	Type *string `json:"type,omitempty"`
}