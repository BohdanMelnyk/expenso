package entities_test

import (
	"errors"
	"testing"
	"time"

	"expenso-backend/domain/entities"
)

func gifts() *entities.CategoryEntity {
	return entities.ReconstructCategory(9, "Gifts & Donations", "#F0E68C", "🎁", time.Now(), time.Now())
}

func TestNewVendor_TakesCategoryFromEntity(t *testing.T) {
	v, err := entities.NewVendor("Gift", entities.VendorTypeElse, gifts())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if v.CategoryID() != 9 || v.CategoryName() != "Gifts & Donations" {
		t.Errorf("expected category 9 'Gifts & Donations', got %d %q", v.CategoryID(), v.CategoryName())
	}
}

func TestNewVendor_NilCategory(t *testing.T) {
	_, err := entities.NewVendor("Gift", entities.VendorTypeElse, nil)
	if !errors.Is(err, entities.ErrCategoryNotFound) {
		t.Fatalf("expected ErrCategoryNotFound, got %v", err)
	}
}

func TestVendor_UpdateCategory(t *testing.T) {
	v := entities.ReconstructVendor(13, "Gift", entities.VendorTypeElse, 10, "Other", time.Now(), time.Now())
	if err := v.UpdateCategory(gifts()); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if v.CategoryID() != 9 || v.CategoryName() != "Gifts & Donations" {
		t.Errorf("expected category 9 'Gifts & Donations', got %d %q", v.CategoryID(), v.CategoryName())
	}
	if v.Type() != entities.VendorTypeElse {
		t.Errorf("type should be unchanged, got %q", v.Type())
	}
}

func TestVendor_UpdateCategory_Nil(t *testing.T) {
	v := entities.ReconstructVendor(13, "Gift", entities.VendorTypeElse, 10, "Other", time.Now(), time.Now())
	if err := v.UpdateCategory(nil); !errors.Is(err, entities.ErrCategoryNotFound) {
		t.Fatalf("expected ErrCategoryNotFound, got %v", err)
	}
	if v.CategoryID() != 10 {
		t.Errorf("category should be unchanged, got %d", v.CategoryID())
	}
}
