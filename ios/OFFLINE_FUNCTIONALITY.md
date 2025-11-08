# iOS App Offline Functionality

## Overview

The Expenso iOS app now has comprehensive offline functionality that allows users to continue using the app even when there's no internet connection. The app caches essential data and syncs pending changes when the connection is restored.

## Key Features

### 1. **Cached Reference Data**

The following data is automatically cached for offline access:

- **Categories** - All expense/income categories
- **Vendors** - All vendors with their types
- **Tags** - All available tags
- **Recent Expenses** - Last 30 days of expenses

### 2. **Offline Expense Creation**

When offline, users can:
- Create new expenses with cached categories and vendors
- Expenses are saved locally as `PendingExpense`
- Expenses are automatically synced when connection is restored

### 3. **Automatic Synchronization**

The app includes a smart sync mechanism:
- **Auto-sync**: Attempts to sync every 30 seconds when there are pending items
- **Retry logic**: Up to 5 retry attempts for failed syncs
- **Connection monitoring**: Automatically detects when connection is restored
- **Background sync**: Syncs happen automatically without user intervention

### 4. **Network Status Detection**

The app actively monitors network status:
- Detects WiFi, Cellular, and Ethernet connections
- Shows connection quality (Excellent, Good, Fair, Poor, None)
- Provides visual indicators of network status
- Automatically adjusts behavior based on connectivity

## Architecture

### Core Components

#### 1. **NetworkManager** (`NetworkManager.swift`)
- Monitors network connectivity using `NWPathMonitor`
- Provides real-time connection status updates
- Determines connection type (WiFi, Cellular, Ethernet)
- Publishes `isConnected` state for reactive updates

#### 2. **OfflineStorageManager** (`OfflineStorageManager.swift`)
- Persists data to `UserDefaults` for long-term storage
- Manages pending expenses queue
- Stores cached reference data (categories, vendors, tags)
- Tracks last sync date

#### 3. **DataCacheManager** (`DataCacheManager.swift`)
- Two-tier caching system:
  - **Memory cache** (NSCache): Fast access, limited capacity (10MB)
  - **Persistent storage** (UserDefaults): Survives app restarts
- Automatic cache expiration:
  - Expenses: 2-5 minutes (based on size)
  - Categories: 1 hour
  - Vendors: 1 hour
  - Tags: 1 hour

#### 4. **SyncManager** (`SyncManager.swift`)
- Manages synchronization of pending expenses
- Auto-sync every 30 seconds
- Retry logic with exponential backoff
- Success/failure tracking
- Notification system for sync completion

#### 5. **DataPrefetcher** (`DataPrefetcher.swift`)
- Proactively caches essential data
- Triggers on:
  - App becomes active
  - Network becomes available
- Smart prefetching based on user behavior
- Prevents redundant API calls

#### 6. **APIService** (`APIService.swift`)
- RESTful API client using Combine framework
- Endpoints for all CRUD operations
- Error handling and timeout management
- JSON encoding/decoding

### Data Flow

```
┌─────────────────┐
│   User Action   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│ Network Check   │─Yes─▶│  API Call        │
└────────┬────────┘      └────────┬─────────┘
         │                        │
        No                      Success
         │                        │
         ▼                        ▼
┌─────────────────┐      ┌──────────────────┐
│ Save to Local   │      │  Cache Result    │
│ Storage (Queue) │      └──────────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│ SyncManager     │─────▶│  Retry Sync      │
│ (Auto 30s)      │      │  (Max 5 times)   │
└─────────────────┘      └──────────────────┘
```

## Implementation Details

### PendingExpense Model

```swift
struct PendingExpense: Codable, Identifiable {
    let id: UUID
    let comment: String
    let amount: Double
    let vendorId: Int
    let date: String
    let category: String
    let type: TransactionType
    let paidByCard: Bool
    let addedBy: String
    let tagIds: [Int]?
    let createdAt: Date
    let retryCount: Int
    let lastError: String?
}
```

### Caching Strategy

1. **Check Memory Cache First**
   - Fast access with NSCache
   - Automatic memory management
   - Size limits: 10MB, 100 items max

2. **Fallback to Persistent Storage**
   - UserDefaults for reliable persistence
   - Survives app restarts
   - No size limits (within reason)

3. **Fetch from API if Needed**
   - Only if both caches miss
   - Results are cached immediately
   - Failed requests use cached data

### Sync Process

1. **Pending Item Detection**
   - SyncManager checks every 30 seconds
   - Only runs if items pending and online

2. **Sequential Processing**
   - Each pending expense synced individually
   - Success: Remove from queue
   - Failure: Increment retry count, keep in queue

3. **Retry Logic**
   - Maximum 5 retries per item
   - Stores last error for debugging
   - Failed items remain in queue for manual review

4. **Completion Notification**
   - Broadcasts `expenseSyncCompleted` notification
   - ViewModels can react and refresh data
   - Updates last sync timestamp

## User Experience

### Online Mode
1. User creates expense
2. Sent directly to API
3. Cached for offline access
4. Immediately available in UI

### Offline Mode
1. User creates expense
2. Saved to local queue
3. "Saved offline" toast message shown
4. Expense visible in pending state
5. Auto-syncs when connection restored
6. "Synced successfully" notification

### Returning Online
1. NetworkManager detects connection
2. DataPrefetcher refreshes reference data
3. SyncManager starts syncing queue
4. Pending count indicator updates
5. User sees seamless transition

## Configuration

Settings available in `ConfigurationManager.swift`:

- `requestTimeout`: API timeout (default: 30s)
- `enableDebugLogging`: Verbose logging for development
- `defaultUserName`: User identifier for expenses

## Testing Offline Mode

### Simulator
1. Turn off Mac WiFi
2. Or use Network Link Conditioner
3. App will detect offline state
4. Create expenses - they'll queue
5. Turn WiFi back on
6. Watch auto-sync happen

### Device
1. Enable Airplane Mode
2. Create test expenses
3. Disable Airplane Mode
4. Observe sync indicator

## Best Practices

### For Developers

1. **Always check cache first** before making API calls
2. **Use DataPrefetcher** to proactively load data
3. **Handle offline state gracefully** with user feedback
4. **Monitor sync status** using SyncManager published properties
5. **Test offline scenarios** regularly

### For Users

1. **Reference data is cached** - categories/vendors available offline
2. **Pending expenses sync automatically** - no manual action needed
3. **Check pending count** - indicator shows items waiting to sync
4. **Failed syncs** - contact support if items don't sync after 5 retries

## Future Enhancements

Potential improvements:

1. **Manual sync trigger** - Pull to refresh sync
2. **Conflict resolution** - Handle concurrent edits
3. **Partial sync** - Sync only changed data
4. **Background sync** - Sync even when app is backgrounded
5. **Offline analytics** - Track offline usage patterns
6. **Batch sync** - Sync multiple items in one request
7. **Optimistic UI** - Show changes immediately, undo on failure
8. **CoreData/SwiftData** - More robust local storage
9. **Differential sync** - Only sync changes since last sync
10. **Compression** - Reduce data usage for syncing

## Troubleshooting

### Data Not Syncing

1. Check network connection status
2. Verify SyncManager is running: `SyncManager.shared.isSyncing`
3. Check pending count: `SyncManager.shared.pendingCount`
4. Enable debug logging to see detailed sync process
5. Check for API errors in console

### Cache Not Working

1. Verify DataPrefetcher is initialized
2. Check cache expiration settings
3. Clear cache and rebuild: `OfflineStorageManager.shared.clearAllCache()`
4. Verify UserDefaults permissions

### Network Detection Issues

1. Restart NetworkManager: Stop and start monitoring
2. Check iOS network permissions
3. Test with different connection types
4. Verify NWPathMonitor is working

## Related Files

- `ios/ExpensoApp/ExpensoApp/NetworkManager.swift` - Network monitoring
- `ios/ExpensoApp/ExpensoApp/OfflineStorageManager.swift` - Persistent storage
- `ios/ExpensoApp/ExpensoApp/DataCacheManager.swift` - Memory caching
- `ios/ExpensoApp/ExpensoApp/SyncManager.swift` - Synchronization logic
- `ios/ExpensoApp/ExpensoApp/DataPrefetcher.swift` - Proactive caching
- `ios/ExpensoApp/ExpensoApp/PendingExpense.swift` - Offline expense model
- `ios/ExpensoApp/ExpensoApp/APIService.swift` - API client
- `ios/ExpensoApp/ExpensoApp/AddTransactionViewModel.swift` - Expense creation
