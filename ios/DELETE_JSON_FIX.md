# Fix: JSON Decoding Error on DELETE Operations

## Problem

When deleting expenses or incomes in the iOS app, the deletion was successful on the backend, but the iOS app threw a JSON decoding error:

```
JSON Decoding Error: dataCorrupted(Swift.DecodingError.Context(codingPath: [],
debugDescription: "The given data was not valid JSON.",
underlyingError: Optional(Error Domain=NSCocoaErrorDomain Code=3840
"Unexpected end of file" UserInfo={NSDebugDescription=Unexpected end of file})))
❌ DashboardViewModel: Error deleting expense - Failed to decode response
```

### Root Cause

The backend DELETE endpoints return an **empty response body** (or 204 No Content status), but the iOS `APIService.deleteExpense()` and `APIService.deleteIncome()` methods were trying to decode the empty response as JSON using the generic `request<T: Codable>` method.

**The flow was:**
1. iOS sends DELETE request
2. Backend successfully deletes the item
3. Backend returns empty response (status 200 or 204)
4. iOS tries to decode empty response as `EmptyResponse` struct
5. JSON decoder fails because there's no JSON to decode
6. Error bubbles up to ViewModel
7. User sees error message (despite successful deletion)

## Solution

Created a new `requestWithoutResponse()` method specifically for DELETE operations that:
1. Sends the HTTP request
2. Validates the status code (200-299)
3. Returns `Void` without attempting JSON decoding
4. Handles errors appropriately

### Code Changes

#### 1. Created `requestWithoutResponse()` Method

**File:** `ios/ExpensoApp/ExpensoApp/APIService.swift:52-92`

```swift
// Request method for operations that don't return a response body (like DELETE)
private func requestWithoutResponse(
    endpoint: String,
    method: HTTPMethod = .DELETE,
    body: Data? = nil
) -> AnyPublisher<Void, APIError> {
    guard let url = URL(string: baseURL + endpoint) else {
        return Fail(error: APIError.invalidURL)
            .eraseToAnyPublisher()
    }

    var request = URLRequest(url: url)
    request.httpMethod = method.rawValue
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = body

    return session.dataTaskPublisher(for: request)
        .tryMap { _, response -> Void in
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.networkError(NSError(domain: "Invalid response", code: 0))
            }

            guard 200...299 ~= httpResponse.statusCode else {
                throw APIError.serverError(httpResponse.statusCode)
            }

            // Successfully deleted, return void
            return ()
        }
        .mapError { error in
            if let apiError = error as? APIError {
                return apiError
            } else {
                if ConfigurationManager.shared.enableDebugLogging {
                    print("🌐 Network Error: \(error)")
                }
                return APIError.networkError(error)
            }
        }
        .eraseToAnyPublisher()
}
```

**Key Points:**
- Ignores response data (doesn't attempt to decode)
- Only validates HTTP status code
- Returns `Void` on success
- Properly handles errors

#### 2. Updated `deleteExpense()`

**File:** `ios/ExpensoApp/ExpensoApp/APIService.swift:218-220`

**Before:**
```swift
func deleteExpense(id: Int) -> AnyPublisher<Void, APIError> {
    let emptyRequest: AnyPublisher<EmptyResponse, APIError> = request(endpoint: "/expenses/\(id)", method: .DELETE, body: nil)
    return emptyRequest
        .map { (_: EmptyResponse) in () }
        .eraseToAnyPublisher()
}
```

**After:**
```swift
func deleteExpense(id: Int) -> AnyPublisher<Void, APIError> {
    return requestWithoutResponse(endpoint: "/expenses/\(id)", method: .DELETE)
}
```

#### 3. Updated `deleteIncome()`

**File:** `ios/ExpensoApp/ExpensoApp/APIService.swift:259-261`

**Before:**
```swift
func deleteIncome(id: Int) -> AnyPublisher<Void, APIError> {
    let emptyRequest: AnyPublisher<EmptyResponse, APIError> = request(endpoint: "/incomes/\(id)", method: .DELETE, body: nil)
    return emptyRequest
        .map { (_: EmptyResponse) in () }
        .eraseToAnyPublisher()
}
```

**After:**
```swift
func deleteIncome(id: Int) -> AnyPublisher<Void, APIError> {
    return requestWithoutResponse(endpoint: "/incomes/\(id)", method: .DELETE)
}
```

## Comparison: Before vs After

### Before (Broken)
```
┌──────────────────────────┐
│ iOS: DELETE /expenses/123│
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ Backend: Delete success  │
│ Returns: Empty body      │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ iOS: Try decode JSON     │
│ from empty response      │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ ❌ JSON Decoder Error    │
│ "Unexpected end of file" │
└──────────────────────────┘
```

### After (Fixed)
```
┌──────────────────────────┐
│ iOS: DELETE /expenses/123│
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ Backend: Delete success  │
│ Returns: Empty body      │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ iOS: Check status code   │
│ 200-299? ✅ Yes          │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│ ✅ Return Void (success) │
│ No JSON decoding needed  │
└──────────────────────────┘
```

## Testing

### Test Scenario 1: Delete Expense
1. Open iOS app
2. Navigate to expense list
3. Swipe to delete an expense
4. Confirm deletion
5. ✅ **Expected:** Expense deleted successfully, no error messages
6. ✅ **Actual:** Works correctly

### Test Scenario 2: Delete Income
1. Open iOS app
2. Navigate to income list
3. Delete an income entry
4. ✅ **Expected:** Income deleted successfully, no error messages
5. ✅ **Actual:** Works correctly

### Test Scenario 3: Delete Non-Existent Item
1. Try to delete an item that doesn't exist (ID: 999999)
2. ✅ **Expected:** Server returns 404, iOS shows appropriate error
3. ✅ **Actual:** Error handled correctly

## Benefits

✅ **No More JSON Errors** - DELETE operations don't try to decode empty responses
✅ **Cleaner Code** - Simpler, more readable delete methods
✅ **Better Performance** - Skips unnecessary JSON decoding step
✅ **Proper Error Handling** - Still catches and reports actual errors
✅ **Consistent Behavior** - Works with any DELETE endpoint

## Files Modified

- `ios/ExpensoApp/ExpensoApp/APIService.swift`
  - Added `requestWithoutResponse()` method (lines 52-92)
  - Updated `deleteExpense()` (lines 218-220)
  - Updated `deleteIncome()` (lines 259-261)

## Technical Details

### Why This Happens

**HTTP DELETE specifications:**
- DELETE requests may return:
  - `200 OK` with response body (rare)
  - `204 No Content` with no body (common)
  - `200 OK` with empty body (common)

**iOS URLSession behavior:**
- When response body is empty, `data` is an empty `Data` object
- JSON decoder expects valid JSON, even if it's just `{}`
- Empty data → JSON decoder throws "Unexpected end of file"

### Alternative Solutions Considered

1. **Return JSON from Backend** ✗
   - Breaks REST conventions
   - Unnecessary overhead

2. **Make EmptyResponse optional** ✗
   - Still tries to decode
   - Adds complexity

3. **Check data length before decoding** ✗
   - Hacky solution
   - Doesn't handle 204 properly

4. **Separate method for no-response requests** ✅
   - Clean separation of concerns
   - Follows REST properly
   - Easy to maintain

## Related Issues

This fix also prevents similar issues with:
- Any future DELETE endpoints
- PUT/PATCH endpoints that return empty responses
- 204 No Content responses

## Future Enhancements

Potential improvements:

1. **Response inspection:** Log response bodies in debug mode
2. **Status code mapping:** Map specific codes to specific errors
3. **Retry logic:** Add retry for network failures
4. **Offline queue:** Queue deletes when offline
5. **Optimistic deletion:** Remove from UI before confirming

## Related Documentation

- `ios/OFFLINE_FUNCTIONALITY.md` - Offline support documentation
- `backend/ERROR_LOGGING.md` - Backend error logging
- Apple Documentation: [URLSession](https://developer.apple.com/documentation/foundation/urlsession)
- HTTP Spec: [RFC 7231 - DELETE](https://tools.ietf.org/html/rfc7231#section-4.3.5)
