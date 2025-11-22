package entities

// VendorTypeToCategoryMapping maps vendor types to their corresponding category names
var VendorTypeToCategoryMapping = map[VendorType]string{
	VendorTypeCare:            "Health & Fitness",
	VendorTypeClothing:        "Shopping",
	VendorTypeEatingOut:       "Dining",
	VendorTypeElse:            "Other",
	VendorTypeFoodStore:       "Food Store",
	VendorTypeHousehold:       "Household",
	VendorTypeLiving:          "Living",
	VendorTypeSalary:          "Salary",
	VendorTypeSubscriptions:   "Bills & Utilities",
	VendorTypeTransport:       "Transportation",
	VendorTypeTourism:         "Travel",
	VendorTypeCar:             "Car",
	VendorTypeShop:            "Shopping",
	VendorTypeDining:          "Dining",
	VendorTypeDiningWithFriends: "Dining with Friends",
}

// GetCategoryForVendorType returns the category name for a given vendor type
func GetCategoryForVendorType(vendorType VendorType) string {
	if category, exists := VendorTypeToCategoryMapping[vendorType]; exists {
		return category
	}
	return "Other" // Default to "Other" if mapping not found
}

// GetVendorTypesForCategory returns all vendor types that map to a given category
func GetVendorTypesForCategory(categoryName string) []VendorType {
	var vendorTypes []VendorType
	for vendorType, category := range VendorTypeToCategoryMapping {
		if category == categoryName {
			vendorTypes = append(vendorTypes, vendorType)
		}
	}
	return vendorTypes
}
