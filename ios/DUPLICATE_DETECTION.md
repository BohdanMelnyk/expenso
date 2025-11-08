# Duplicate Detection Feature for iOS App

## Overview
Added duplicate expense detection to the iOS app, matching the functionality already present in the web frontend. When users attempt to add an expense, the system automatically checks for similar expenses and warns them before proceeding.

## Implementation Details

### Backend Integration
- **API Endpoint**: `GET /api/v1/expenses/check-duplicates`
- **Parameters**:
  - `amount`: The expense amount to check
  - `date`: The expense date (YYYY-MM-DD format)
  - `day_range`: Number of days to search (±2 days by default)

### iOS Components Added

#### 1. **APIService.swift**
Added `checkDuplicates` method:
```swift
func checkDuplicates(amount: Double, date: String, dayRange: Int = 2) -> AnyPublisher<[Expense], APIError>
```

#### 2. **AddTransactionViewModel.swift**
Enhanced with duplicate detection logic:
- New published properties:
  - `isCheckingDuplicates`: Loading state for duplicate check
  - `showDuplicateWarning`: Controls warning modal visibility
  - `duplicates`: Array of found duplicate expenses
  - `pendingRequest`: Stores the expense request pending user decision

- New methods:
  - `checkForDuplicates(request:)`: Performs API call to check for duplicates
  - `confirmAddDespiteDuplicates()`: Proceeds with adding expense despite duplicates
  - `cancelDuplicateWarning()`: Cancels the operation and dismisses warning

#### 3. **DuplicateWarningView.swift**
New SwiftUI view that displays:
- The new expense being added (highlighted in blue)
- List of similar existing expenses with:
  - Comment/description
  - Amount (with "Exact match" badge if amounts are identical)
  - Date and days difference
  - Payment method (Card/Cash)
  - Added by (He/She)
  - Vendor information
- Action buttons:
  - "Add Anyway" - Confirms addition despite duplicates
  - "Cancel & Review" - Cancels and returns to form

#### 4. **ContentView.swift**
Updated both `AddTransactionView` and `QuickAddExpenseView`:
- Wrapped in `ZStack` to support modal overlay
- Added duplicate warning overlay that appears when duplicates are detected
- Updated submit button to show "Checking..." state during duplicate check
- Button disabled during duplicate checking process

## User Flow

1. User fills out expense form and taps "Add Expense"
2. **If expense type is "expense" and device is online**:
   - System checks for duplicates with same amount within ±2 days
   - If duplicates found:
     - Shows warning modal with comparison
     - User can review existing expenses
     - User decides to either:
       - Add anyway (proceeds with creation)
       - Cancel and review (returns to form)
   - If no duplicates found:
     - Proceeds directly with expense creation
3. **If expense type is "income" or device is offline**:
   - Skips duplicate check and proceeds directly

## Key Features

- **Smart Detection**: Only checks expenses (not income)
- **Online-Only**: Duplicate checking only works when device is connected to internet
- **Date Range**: Searches ±2 days from the specified expense date
- **Exact Match Highlighting**: Shows "Exact match" badge when amounts are identical
- **Days Apart Indicator**: Shows how many days separate the new expense from existing ones
- **Detailed Comparison**: Shows all relevant details to help user make informed decision
- **Non-Blocking**: If duplicate check fails, creation proceeds normally

## Benefits

1. **Prevents Accidental Duplicates**: Catches common data entry errors
2. **Consistent Experience**: Matches web frontend functionality
3. **User-Friendly**: Clear visual comparison helps users make quick decisions
4. **Flexible**: Allows users to add legitimate duplicates when needed
5. **Resilient**: Gracefully handles network failures

## Testing Scenarios

1. **Exact Duplicate**: Same amount, same date
2. **Near Duplicate**: Same amount, 1-2 days apart
3. **Multiple Duplicates**: Multiple expenses with same amount in date range
4. **No Duplicates**: Unique expense proceeds without warning
5. **Offline Mode**: Skips duplicate check, saves offline
6. **Income Entry**: Skips duplicate check entirely
7. **Network Failure**: Proceeds with creation if duplicate check fails

## Files Modified

1. `ios/ExpensoApp/ExpensoApp/APIService.swift` - Added checkDuplicates method
2. `ios/ExpensoApp/ExpensoApp/AddTransactionViewModel.swift` - Added duplicate detection logic
3. `ios/ExpensoApp/ExpensoApp/ContentView.swift` - Updated UI to show warning modal
4. `ios/ExpensoApp/ExpensoApp/DuplicateWarningView.swift` - New file for warning UI

## Future Enhancements

- Cache recent duplicate checks to reduce API calls
- Add user preference to enable/disable duplicate checking
- Support fuzzy matching for similar descriptions
- Allow adjusting the day range for duplicate detection
