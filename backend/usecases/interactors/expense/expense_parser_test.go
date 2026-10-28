package expense

import (
	"strings"
	"testing"
	"time"

	"expenso-backend/domain/entities"
)

func testCatalog() *vendorCatalog {
	vendors := []*entities.Vendor{
		entities.ReconstructVendor(13, "Gift", entities.VendorTypeElse, 9, "Gifts & Donations", time.Now(), time.Now()),
		entities.ReconstructVendor(11, "Else", entities.VendorTypeElse, 10, "Other", time.Now(), time.Now()),
		entities.ReconstructVendor(16, "Else", entities.VendorTypeFoodStore, 1, "Food Store", time.Now(), time.Now()),
		entities.ReconstructVendor(41, "DB", entities.VendorTypeTransport, 2, "Transportation", time.Now(), time.Now()),
		entities.ReconstructVendor(10, "Restaurant", entities.VendorTypeEatingOut, 17, "Dining", time.Now(), time.Now()),
		entities.ReconstructVendor(67, "Restaurant", entities.VendorTypeDiningWithFriends, 21, "Dining with Friends", time.Now(), time.Now()),
	}
	catalog := &vendorCatalog{byID: map[int]*entities.Vendor{}, all: vendors}
	for _, v := range vendors {
		catalog.byID[int(v.ID())] = v
	}
	catalog.Categories = []string{"Food Store", "Transportation", "Entertainment", "Gifts & Donations", "Other", "Dining", "Dining with Friends"}
	return catalog
}

func intPtr(i int) *int { return &i }

func TestResolveVendor(t *testing.T) {
	tests := []struct {
		name         string
		in           ParsedExpenseData
		wantVendorID *int
		wantCategory string
	}{
		{
			name:         "vendor_id wins and category follows the vendor",
			in:           ParsedExpenseData{VendorID: intPtr(13), Category: "Other"},
			wantVendorID: intPtr(13),
			wantCategory: "Gifts & Donations",
		},
		{
			name:         "unknown vendor_id falls back to category catch-all",
			in:           ParsedExpenseData{VendorID: intPtr(999), Category: "Food Store"},
			wantVendorID: intPtr(16),
			wantCategory: "Food Store",
		},
		{
			name:         "unique exact name match when vendor_id is missing",
			in:           ParsedExpenseData{VendorName: "db", Category: "Travel"},
			wantVendorID: intPtr(41),
			wantCategory: "Transportation",
		},
		{
			name:         "no substring matching: city containing 'else' is not a vendor",
			in:           ParsedExpenseData{VendorName: "Gelsenkirchen Kiosk", Category: "Food Store"},
			wantVendorID: intPtr(16),
			wantCategory: "Food Store",
		},
		{
			name:         "ambiguous name is not guessed",
			in:           ParsedExpenseData{VendorName: "Restaurant", Category: "Dining with Friends"},
			wantVendorID: nil,
			wantCategory: "Dining with Friends",
		},
		{
			name:         "Else name is never matched directly",
			in:           ParsedExpenseData{VendorName: "Else", Category: "Food Store"},
			wantVendorID: intPtr(16),
			wantCategory: "Food Store",
		},
		{
			name:         "category without catch-all leaves vendor empty",
			in:           ParsedExpenseData{VendorName: "Elbphilharmonie", Category: "Entertainment"},
			wantVendorID: nil,
			wantCategory: "Entertainment",
		},
		{
			name:         "unknown category becomes Other with its catch-all",
			in:           ParsedExpenseData{VendorName: "Mystery", Category: "Investment"},
			wantVendorID: intPtr(11),
			wantCategory: "Other",
		},
	}

	p := &ExpenseParser{}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data := tt.in
			p.resolveVendor(&data, testCatalog())

			if data.Category != tt.wantCategory {
				t.Errorf("category = %q, want %q", data.Category, tt.wantCategory)
			}
			switch {
			case tt.wantVendorID == nil && data.MatchedVendorID != nil:
				t.Errorf("matched vendor = %d, want none", *data.MatchedVendorID)
			case tt.wantVendorID != nil && data.MatchedVendorID == nil:
				t.Errorf("matched vendor = none, want %d", *tt.wantVendorID)
			case tt.wantVendorID != nil && *data.MatchedVendorID != *tt.wantVendorID:
				t.Errorf("matched vendor = %d, want %d", *data.MatchedVendorID, *tt.wantVendorID)
			}
		})
	}
}

func TestPromptTemplatesRender(t *testing.T) {
	catalog := testCatalog()
	catalog.Vendors = []promptVendor{{ID: 13, Name: "Gift", Category: "Gifts & Donations"}}

	prompt, err := (&ExpenseParser{}).buildPrompt("20 euro flowers for mom", catalog)
	if err != nil {
		t.Fatalf("expense prompt: %v", err)
	}
	for _, want := range []string{"13 | Gift | Gifts & Donations", "- Gifts & Donations", "20 euro flowers for mom"} {
		if !strings.Contains(prompt, want) {
			t.Errorf("expense prompt missing %q", want)
		}
	}

	tx, err := entities.NewBankTransaction("1234", time.Now(), time.Now(), -12.5, "EUR", 1, -12.5, "EUR", "SPOTIFY AB", "", "")
	if err != nil {
		t.Fatalf("bank transaction: %v", err)
	}
	prompt, err = (&BankTransactionMapper{}).buildPrompt(tx, catalog)
	if err != nil {
		t.Fatalf("bank prompt: %v", err)
	}
	for _, want := range []string{"13 | Gift | Gifts & Donations", "SPOTIFY AB"} {
		if !strings.Contains(prompt, want) {
			t.Errorf("bank prompt missing %q", want)
		}
	}
}
