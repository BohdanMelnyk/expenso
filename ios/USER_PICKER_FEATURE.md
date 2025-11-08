# User Picker Feature for iOS App

## Overview

Added a user selection picker to the "Add New Transaction" screen in the iOS app, allowing users to select who added the expense (he, she, or both). The field defaults to "he" as requested.

## Changes Made

### 1. **Updated ConfigurationManager** (`ConfigurationManager.swift`)

Added available users list:

```swift
// Available users for expense tracking
var availableUsers: [String] {
    return ["he", "she", "both"]
}
```

**Location:** `ios/ExpensoApp/ExpensoApp/ConfigurationManager.swift:20-23`

### 2. **Updated AddTransactionViewModel** (`AddTransactionViewModel.swift`)

Added selectedUser property with default value:

```swift
@Published var selectedUser: String = ConfigurationManager.shared.defaultUserName
```

Updated expense creation to use selected user:

```swift
let request = CreateExpenseRequest(
    // ... other fields
    addedBy: selectedUser,  // Changed from ConfigurationManager.shared.defaultUserName
    // ...
)
```

Reset form includes user reset:

```swift
private func resetForm() {
    // ... other resets
    selectedUser = ConfigurationManager.shared.defaultUserName
    // ...
}
```

**Locations:**
- Property: Line 12
- Usage: Line 69
- Reset: Line 130

### 3. **Created UserPicker Component** (`ContentView.swift`)

New SwiftUI component with:
- Dropdown picker UI matching existing picker style
- Sheet presentation with user list
- Visual icons for each user (👨 He, 👩 She, 👫 Both)
- Checkmark indicator for selected user
- Cancel button

```swift
struct UserPicker: View {
    @Binding var selectedUser: String
    @State private var isPresented = false

    private let availableUsers = ConfigurationManager.shared.availableUsers

    var body: some View {
        Button(action: { isPresented = true }) {
            HStack {
                Text(getUserDisplayName(selectedUser))
                Spacer()
                Image(systemName: "chevron.down")
                    .foregroundColor(.secondary)
                    .font(.caption)
            }
        }
        .foregroundColor(.primary)
        .sheet(isPresented: $isPresented) {
            // ... sheet content
        }
    }

    private func getUserDisplayName(_ user: String) -> String {
        switch user {
        case "he":
            return "👨 He"
        case "she":
            return "👩 She"
        case "both":
            return "👫 Both"
        default:
            return user
        }
    }
}
```

**Location:** `ios/ExpensoApp/ExpensoApp/ContentView.swift:660-721`

### 4. **Added User Picker to Add Transaction Form** (`ContentView.swift`)

Added new form field after Vendor picker:

```swift
VStack(alignment: .leading, spacing: 8) {
    Text("Added By")
        .font(.caption)
        .foregroundColor(.secondary)

    UserPicker(selectedUser: $viewModel.selectedUser)
}
```

**Location:** `ios/ExpensoApp/ExpensoApp/ContentView.swift:476-482`

## UI Changes

### Before
```
┌─────────────────────────────────┐
│ Transaction Details             │
│ - Description                   │
│ - Type                          │
│ - Amount                        │
│                                 │
│ Categorization                  │
│ - Category                      │
│ - Payment Method                │
│ - Vendor                        │
│ - Date                          │
│                                 │
│ [Add Expense]                   │
└─────────────────────────────────┘
```

### After
```
┌─────────────────────────────────┐
│ Transaction Details             │
│ - Description                   │
│ - Type                          │
│ - Amount                        │
│                                 │
│ Categorization                  │
│ - Category                      │
│ - Payment Method                │
│ - Vendor                        │
│ - Added By    [👨 He     ▼]    │ ← NEW
│ - Date                          │
│                                 │
│ [Add Expense]                   │
└─────────────────────────────────┘
```

## User Experience

### Default Behavior
1. User opens "Add New Transaction"
2. "Added By" field shows "👨 He" (default)
3. User can proceed without changing (defaults to "he")

### Selecting Different User
1. Tap on "Added By" field
2. Sheet opens with user list:
   - 👨 He ✓ (checked - current selection)
   - 👩 She
   - 👫 Both
3. Tap different user
4. Sheet closes automatically
5. Field updates to show selected user

### After Submission
1. Expense created with selected user
2. Form resets to defaults
3. "Added By" resets to "👨 He"

## Data Flow

```
┌─────────────────────────────────────┐
│ User Opens Add Transaction          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ selectedUser initialized            │
│ = ConfigurationManager.defaultUser  │
│ = "he"                              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ UserPicker displays "👨 He"         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ User can change selection           │
│ (Optional)                          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Submit Transaction                  │
│ addedBy = selectedUser              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Online: Send to API                 │
│ Offline: Save to PendingExpense     │
│ Both use selectedUser value         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Reset Form                          │
│ selectedUser = "he" (default)       │
└─────────────────────────────────────┘
```

## Implementation Details

### Available Users
Currently hardcoded in ConfigurationManager:
- `"he"` - He (👨)
- `"she"` - She (👩)
- `"both"` - Both (👫)

### User Display Format
The UserPicker shows user-friendly labels with icons:

| Value  | Display   |
|--------|-----------|
| "he"   | 👨 He     |
| "she"  | 👩 She    |
| "both" | 👫 Both   |

### Default Value
- Always defaults to "he"
- Persists across the session until form is reset
- Resets to "he" after successful submission

### Integration Points

1. **Online Expense Creation**
   - `AddTransactionViewModel.submitTransaction()`
   - Uses `selectedUser` directly in `CreateExpenseRequest`

2. **Offline Expense Creation**
   - `AddTransactionViewModel.saveOffline()`
   - Passes `selectedUser` to `PendingExpense`
   - Syncs with correct user when connection restored

3. **Form Reset**
   - `AddTransactionViewModel.resetForm()`
   - Resets `selectedUser` to default

## Benefits

✅ **User Flexibility** - Users can select who added the expense
✅ **Default Behavior** - Still defaults to "he" as requested
✅ **Consistent UI** - Matches existing picker patterns
✅ **Visual Clarity** - Icons make selection clear
✅ **Easy to Use** - Familiar iOS sheet pattern
✅ **Offline Support** - Works seamlessly offline
✅ **Backend Compatible** - Sends correct value to API

## Testing Scenarios

### Test 1: Default User
1. Open Add Transaction
2. Don't change "Added By" field
3. Submit expense
4. ✅ Expected: Expense created with `addedBy: "he"`

### Test 2: Select Different User
1. Open Add Transaction
2. Tap "Added By" → Select "👩 She"
3. Submit expense
4. ✅ Expected: Expense created with `addedBy: "she"`

### Test 3: Form Reset
1. Open Add Transaction
2. Select "👩 She"
3. Submit expense
4. Form resets
5. ✅ Expected: "Added By" shows "👨 He" again

### Test 4: Offline Mode
1. Turn off internet
2. Open Add Transaction
3. Select "👫 Both"
4. Submit expense
5. Turn on internet
6. ✅ Expected: Synced expense has `addedBy: "both"`

### Test 5: User Switching
1. Create expense with "he"
2. Create expense with "she"
3. Create expense with "both"
4. ✅ Expected: All three have correct user values

## Files Modified

1. `ios/ExpensoApp/ExpensoApp/ConfigurationManager.swift` - Added availableUsers
2. `ios/ExpensoApp/ExpensoApp/AddTransactionViewModel.swift` - Added selectedUser property
3. `ios/ExpensoApp/ExpensoApp/ContentView.swift` - Created UserPicker & added to form

## Future Enhancements

Possible improvements:

1. **Custom Users**: Allow adding custom user names
2. **User Profiles**: Create full user profiles with preferences
3. **User Stats**: Show breakdown by user in statistics
4. **User Filtering**: Filter expenses by user
5. **User Colors**: Assign colors to users for visual distinction
6. **Quick Switch**: Add quick user toggle button
7. **Remember Last**: Option to remember last selected user
8. **User Permissions**: Different permissions per user
9. **Shared Expenses**: Track how much each user spent
10. **User Notes**: Add notes specific to each user

## Related Documentation

- `ios/USER_DEFAULT_UPDATE.md` - Previous user default update
- `ios/OFFLINE_FUNCTIONALITY.md` - Offline support documentation
