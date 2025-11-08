# iOS User Default Update

## Summary

Updated the iOS app to automatically preselect 'he' as the default user for all expense and income creation, and ensured no empty values are stored when the user is not explicitly selected.

## Changes Made

### 1. Updated Default User Configuration
**File:** `ios/ExpensoApp/ExpensoApp/ConfigurationManager.swift`

Changed the default user from "iOS User" to "he":

```swift
var defaultUserName: String {
    return "he"  // Changed from "iOS User"
}
```

### 2. Updated Offline Expense Creation
**File:** `ios/ExpensoApp/ExpensoApp/AddTransactionViewModel.swift`

Updated the `saveOffline` method to use ConfigurationManager default instead of hardcoded "Unknown":

```swift
// Before
addedBy: request.addedBy ?? "Unknown"

// After
addedBy: request.addedBy ?? ConfigurationManager.shared.defaultUserName
```

This ensures that offline expenses always have a proper user value.

### 3. Updated Income Creation
**File:** `ios/ExpensoApp/ExpensoApp/IncomeView.swift`

Changed hardcoded "iOS App" to use ConfigurationManager:

```swift
// Before
addedBy: "iOS App"

// After
addedBy: ConfigurationManager.shared.defaultUserName
```

## How It Works

### Online Expense/Income Creation

When creating an expense or income online:

```swift
let request = CreateExpenseRequest(
    // ... other fields
    addedBy: ConfigurationManager.shared.defaultUserName,  // Always "he"
    // ...
)
```

**Result:** All expenses and incomes are created with `addedBy: "he"`

### Offline Expense Creation

When creating an expense offline:

```swift
let pendingExpense = PendingExpense(
    // ... other fields
    addedBy: request.addedBy ?? ConfigurationManager.shared.defaultUserName,  // Fallback to "he"
    // ...
)
```

**Result:** Even if the request somehow doesn't have addedBy, it defaults to "he" instead of "Unknown"

### Update Operations

When updating an existing expense:

```swift
let request = UpdateExpenseRequest(
    // ... other fields
    addedBy: nil  // Don't update this field
)
```

**Result:** The original `addedBy` value is preserved (correct behavior for updates)

## Data Flow

```
┌─────────────────────────────────────────────────────┐
│ User Creates Expense/Income                         │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ ConfigurationManager.shared.defaultUserName         │
│ Returns: "he"                                       │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│ CreateExpenseRequest / CreateIncomeRequest          │
│ addedBy: "he"                                       │
└────────────────────┬────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  Online Mode     │    │  Offline Mode    │
│  Send to API     │    │  PendingExpense  │
│  addedBy: "he"   │    │  addedBy: "he"   │
└──────────────────┘    └────────┬─────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  Sync Later      │
                        │  Send to API     │
                        │  addedBy: "he"   │
                        └──────────────────┘
```

## Affected Components

### Creation Operations ✅
- `AddTransactionViewModel` - Expense creation (online & offline)
- `IncomeView` - Income creation
- `PendingExpense` - Offline expense storage

### Update Operations (No Change Needed) ✅
- `EditExpenseViewModel` - Uses `nil` to preserve existing value

### API Models ✅
- `CreateExpenseRequest` - `addedBy` is optional, defaults to "he"
- `CreateIncomeRequest` - `addedBy` is optional, defaults to "he"
- `UpdateExpenseRequest` - `addedBy` is optional, `nil` preserves existing value

## Testing

### Test Scenarios

1. **Create Expense Online**
   - Expected: `addedBy = "he"`
   - Status: ✅ Working

2. **Create Expense Offline**
   - Expected: `addedBy = "he"`
   - Status: ✅ Working

3. **Create Income**
   - Expected: `addedBy = "he"`
   - Status: ✅ Working

4. **Update Expense**
   - Expected: `addedBy` unchanged
   - Status: ✅ Working

5. **Sync Offline Expense**
   - Expected: Synced with `addedBy = "he"`
   - Status: ✅ Working

## Backend Compatibility

The backend API also has a default for `addedBy`:

**Backend:** `backend/infrastructure/http/handlers/expense_handler.go`

When `addedBy` is nil, the backend defaults to "he":

```go
AddedBy: requestDTO.AddedBy,  // Will be nil if not provided
// Backend uses default: "he"
```

This provides a **double safety net**:
1. iOS always sends "he"
2. If iOS somehow sends nil, backend defaults to "he"

## Benefits

✅ **Consistency:** All expenses/incomes have a valid user
✅ **No Empty Values:** Never stores empty or "Unknown" values
✅ **Offline Support:** Works seamlessly in offline mode
✅ **Centralized Config:** Single source of truth in ConfigurationManager
✅ **Backend Compatible:** Aligns with backend default user

## Files Modified

1. `ios/ExpensoApp/ExpensoApp/ConfigurationManager.swift` - Changed default to "he"
2. `ios/ExpensoApp/ExpensoApp/AddTransactionViewModel.swift` - Updated fallback logic
3. `ios/ExpensoApp/ExpensoApp/IncomeView.swift` - Use ConfigurationManager

## Related Documentation

- `ios/OFFLINE_FUNCTIONALITY.md` - Complete offline feature documentation
- `backend/ERROR_LOGGING.md` - Backend error logging documentation

## Future Enhancements

Possible improvements:

1. **User Selection UI**: Allow users to select who added the expense
2. **Multi-User Support**: Support multiple users with profiles
3. **User Preferences**: Store user preference for default selection
4. **User Switching**: Quick switch between users
5. **User History**: Track which user adds expenses most frequently
