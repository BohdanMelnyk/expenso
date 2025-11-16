# iOS Vendor-Category Filtering Implementation Guide

## Overview
This document outlines the changes needed to implement vendor filtering by category in the iOS app.

## Changes Required

### 1. Update Vendor Model (`Models.swift`)

**Add category field to Vendor struct:**
```swift
struct Vendor: Codable, Identifiable {
    let id: Int
    let name: String
    let type: VendorType
    let category: String  // ADD THIS
    let createdAt: String
    let updatedAt: String

    private enum CodingKeys: String, CodingKey {
        case id, name, type, category  // ADD category
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
```

**Add new vendor types to VendorType enum:**
```swift
enum VendorType: String, Codable, CaseIterable {
    // ... existing cases ...
    case dining = "dining"
    case diningWithField = "dining_with_field"

    var displayName: String {
        switch self {
        // ... existing cases ...
        case .dining: return "Dining"
        case .diningWithField: return "Dining with Friends"
        }
    }
}
```

### 2. Create Vendor-Category Mapping

**Add extension to VendorType for category mapping:**
```swift
extension VendorType {
    var categoryName: String {
        switch self {
        case .care: return "Health & Fitness"
        case .clothing: return "Shopping"
        case .eatingOut: return "Dining"
        case .else_: return "Other"
        case .foodStore: return "Food Store"
        case .household: return "Household"
        case .living: return "Living"
        case .salary: return "Salary"
        case .subscriptions: return "Bills & Utilities"
        case .transport: return "Transportation"
        case .tourism: return "Travel"
        case .car: return "Car"
        case .shop: return "Shopping"
        case .dining: return "Dining"
        case .diningWithField: return "Dining with Friends"
        }
    }
}
```

### 3. Update Vendor Picker Views

**Wherever vendors are selected (AddExpense, EditExpense, etc.), filter vendors by selected category:**

```swift
// In your view or view model:
var filteredVendors: [Vendor] {
    if let selectedCategory = selectedCategory {
        return vendors.filter { $0.category == selectedCategory }
    }
    return vendors
}
```

**Example in AddTransactionView or similar:**
```swift
Picker("Vendor", selection: $viewModel.selectedVendor) {
    Text("Select Vendor").tag(nil as Vendor?)
    ForEach(filteredVendors) { vendor in
        Text(vendor.name).tag(vendor as Vendor?)
    }
}
```

### 4. Key Files to Update

1. **Models.swift** - Update Vendor struct and VendorType enum
2. **AddTransactionViewModel.swift** - Add vendor filtering logic
3. **EditExpenseViewModel.swift** - Add vendor filtering logic
4. Any view that displays vendor picker

### 5. Mapping Reference

```
'care' → 'Health & Fitness'
'clothing' → 'Shopping'
'eating_out' → 'Dining'
'else' → 'Other'
'food_store' → 'Food Store'
'household' → 'Household'
'living' → 'Living'
'salary' → 'Salary'
'subscriptions' → 'Bills & Utilities'
'transport' → 'Transportation'
'tourism' → 'Travel'
'car' → 'Car'
'shop' → 'Shopping'
'dining' → 'Dining'
'dining_with_field' → 'Dining with Friends'
```

## Testing
1. Select a category
2. Verify that only vendors with matching category are shown in the vendor picker
3. Verify that all vendor types map to correct categories
