# Expenso - Architecture Documentation

> **Version:** 1.0
> **Last Updated:** 2025-10-26
> **Status:** Production-Ready

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [System Architecture](#system-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Frontend Architecture](#frontend-architecture)
6. [iOS Architecture](#ios-architecture)
7. [Data Flow](#data-flow)
8. [API Design](#api-design)
9. [Database Schema](#database-schema)
10. [Deployment Architecture](#deployment-architecture)
11. [Security Architecture](#security-architecture)

---

## System Overview

**Expenso** is a smart expense tracking application that provides insights and analytics for personal financial management. It's built with a modern, scalable architecture supporting multiple platforms.

### Key Features

- ✅ **Multi-platform Support**: Web (React), iOS (SwiftUI), Backend (Go)
- ✅ **Offline-First iOS App**: Works without internet, syncs when connected
- ✅ **Real-time Analytics**: Cash flow analysis, trends, category breakdown
- ✅ **Smart Insights**: Duplicate detection, vendor statistics, savings rate
- ✅ **Data Import/Export**: CSV support for bulk operations
- ✅ **Modern UI**: Dark mode, glassmorphism (iOS 18), responsive design

### Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend** | Go (Golang) | 1.24.3 |
| **Web Framework** | Gin | 1.10.1 |
| **Frontend** | React + TypeScript | 19.1.1 |
| **iOS** | SwiftUI | iOS 15+ |
| **Database** | PostgreSQL | Latest |
| **API Documentation** | Swagger/OpenAPI | 3.0 |
| **Charts** | Recharts (Web), Swift Charts (iOS) | Latest |

---

## Architecture Principles

### 1. **Clean Architecture**

The system follows **Clean Architecture** principles with clear separation of concerns:

```
┌─────────────────────────────────────────────────────┐
│                  Presentation Layer                  │
│         (UI, Controllers, View Models)              │
├─────────────────────────────────────────────────────┤
│                  Application Layer                   │
│         (Use Cases, Business Logic)                 │
├─────────────────────────────────────────────────────┤
│                    Domain Layer                      │
│         (Entities, Value Objects, Rules)            │
├─────────────────────────────────────────────────────┤
│                Infrastructure Layer                  │
│    (DB, APIs, External Services, Frameworks)        │
└─────────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Testability: Business logic independent of frameworks
- ✅ Maintainability: Clear boundaries between layers
- ✅ Flexibility: Easy to swap implementations
- ✅ Scalability: Add features without breaking existing code

### 2. **SOLID Principles**

- **S**ingle Responsibility: Each module has one reason to change
- **O**pen/Closed: Open for extension, closed for modification
- **L**iskov Substitution: Interfaces can be swapped seamlessly
- **I**nterface Segregation: Clients depend on minimal interfaces
- **D**ependency Inversion: Depend on abstractions, not concretions

### 3. **Offline-First (iOS)**

iOS app works completely offline with automatic background sync:

```
User Action → Local Storage → Background Sync → Server
                    ↓
              Immediate UI Update
```

### 4. **API-First Design**

RESTful API serves as the single source of truth:

```
Web App  ────┐
             ├──→ REST API ──→ PostgreSQL
iOS App  ────┘
```

---

## System Architecture

### High-Level Architecture Diagram

```mermaid
graph TB
    subgraph "Client Layer"
        Web[React Web App<br/>Port 3000]
        iOS[iOS SwiftUI App<br/>Offline-First]
    end

    subgraph "API Gateway"
        API[Go REST API<br/>Port 8080<br/>Gin Framework]
        Swagger[Swagger UI<br/>/swagger]
    end

    subgraph "Business Logic"
        Interactors[Use Case Interactors<br/>- Expense<br/>- Income<br/>- Vendor<br/>- Category<br/>- Tag]
    end

    subgraph "Data Layer"
        Repos[Repositories<br/>Data Access Layer]
        DB[(PostgreSQL<br/>Database)]
    end

    subgraph "iOS Offline"
        Storage[UserDefaults<br/>JSON Storage]
        Sync[Sync Manager<br/>Auto-sync every 30s]
        Network[Network Monitor<br/>Connectivity Detection]
    end

    Web -->|HTTP/REST| API
    iOS -->|HTTP/REST| API
    iOS -->|Offline Mode| Storage
    Storage -->|When Online| Sync
    Sync -->|Background| API
    Network -->|Status| iOS

    API --> Interactors
    Interactors --> Repos
    Repos --> DB

    API -.->|Documentation| Swagger

    style Web fill:#61dafb
    style iOS fill:#007aff
    style API fill:#00add8
    style DB fill:#336791
    style Storage fill:#ffa500
```

### Component Communication

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│              │  HTTP   │              │  SQL    │              │
│   Clients    │────────▶│  API Server  │────────▶│  PostgreSQL  │
│  (Web/iOS)   │◀────────│   (Go/Gin)   │◀────────│   Database   │
│              │  JSON   │              │  Rows   │              │
└──────────────┘         └──────────────┘         └──────────────┘
       │
       │ (iOS Only)
       ▼
┌──────────────┐
│   Local      │
│   Storage    │
│ (UserDefaults)
└──────────────┘
```

---

## Backend Architecture

### Layer Architecture (Go)

```
backend/
├── cmd/
│   └── server/
│       └── main.go              # Entry point, dependency injection
├── domain/
│   ├── entities/                # Business entities (Expense, Income, etc.)
│   │   ├── expense.go
│   │   ├── income.go
│   │   ├── vendor.go
│   │   ├── category.go
│   │   └── tag.go
│   └── valueobjects/            # Value objects (Money, etc.)
│       └── money.go
├── usecases/
│   ├── interfaces/              # Repository interfaces
│   │   └── repositories/
│   │       ├── expense_repository.go
│   │       ├── income_repository.go
│   │       └── ...
│   └── interactors/             # Business logic implementation
│       ├── expense/
│       │   └── expense_interactor.go
│       ├── income/
│       │   └── income_interactor.go
│       └── ...
├── infrastructure/
│   ├── http/
│   │   ├── handlers/            # HTTP request handlers
│   │   │   ├── expense_handler.go
│   │   │   ├── income_handler.go
│   │   │   └── ...
│   │   └── dto/                 # Data Transfer Objects
│   │       ├── expense_dto.go
│   │       └── ...
│   ├── persistence/
│   │   ├── models/              # Database models (DBOs)
│   │   │   ├── expense_dbo.go
│   │   │   └── ...
│   │   └── repositories/        # Repository implementations
│   │       ├── expense_repository_impl.go
│   │       └── ...
│   ├── config/                  # Configuration management
│   │   └── config.go
│   └── migration/               # Database migrations
│       └── migrator.go
└── migrations/                  # SQL migration files
    ├── 001_initial_schema.up.sql
    └── ...
```

### Dependency Flow

```
┌────────────────────────────────────────────────────┐
│                   HTTP Handlers                     │
│  (expense_handler, income_handler, vendor_handler) │
└────────────────┬───────────────────────────────────┘
                 │ depends on
                 ▼
┌────────────────────────────────────────────────────┐
│                Use Case Interactors                 │
│  (expense_interactor, income_interactor, etc.)     │
└────────────────┬───────────────────────────────────┘
                 │ depends on (interfaces)
                 ▼
┌────────────────────────────────────────────────────┐
│              Repository Interfaces                  │
│  (expense_repository, income_repository, etc.)     │
└────────────────┬───────────────────────────────────┘
                 │ implemented by
                 ▼
┌────────────────────────────────────────────────────┐
│          Repository Implementations                 │
│  (expense_repository_impl, PostgreSQL access)      │
└────────────────────────────────────────────────────┘
```

### Key Backend Patterns

#### 1. **Repository Pattern**

Abstracts data access logic:

```go
// Interface (in usecases/interfaces/repositories)
type ExpenseRepository interface {
    Create(expense *entities.Expense) error
    GetByID(id int) (*entities.Expense, error)
    GetAll(filters *ExpenseFilters) ([]*entities.Expense, error)
    Update(expense *entities.Expense) error
    Delete(id int) error
}

// Implementation (in infrastructure/persistence/repositories)
type ExpenseRepositoryImpl struct {
    db *sql.DB
}

func (r *ExpenseRepositoryImpl) Create(expense *entities.Expense) error {
    // PostgreSQL implementation
}
```

#### 2. **Interactor Pattern (Use Cases)**

Encapsulates business logic:

```go
type ExpenseInteractor struct {
    expenseRepo repositories.ExpenseRepository
    vendorRepo  repositories.VendorRepository
    tagRepo     repositories.TagRepository
}

func (i *ExpenseInteractor) CreateExpense(req *CreateExpenseRequest) (*Expense, error) {
    // 1. Validate input
    // 2. Check business rules
    // 3. Interact with repositories
    // 4. Return result
}
```

#### 3. **DTO Pattern**

Separates external API contracts from internal domain models:

```go
// DTO for API
type CreateExpenseDTO struct {
    Comment    string  `json:"comment" binding:"required"`
    Amount     float64 `json:"amount" binding:"required,gt=0"`
    VendorID   int     `json:"vendorId" binding:"required"`
    // ...
}

// Domain Entity
type Expense struct {
    ID        int
    Comment   string
    Amount    Money
    Vendor    *Vendor
    // ...
}
```

---

## Frontend Architecture

### Component Structure (React)

```
frontend/src/
├── components/
│   ├── AddExpense.tsx           # Expense creation form
│   ├── Dashboard.tsx            # Main dashboard view
│   ├── ExpenseOverview.tsx      # Expense list and management
│   ├── IncomeOverview.tsx       # Income list and management
│   ├── CashFlow.tsx             # Cash flow analysis
│   ├── Statistics.tsx           # Statistical charts
│   ├── Trends.tsx               # Trend analysis
│   ├── BalanceDashboard.tsx     # Balance summary
│   ├── VendorStatistics.tsx     # Vendor breakdown
│   ├── CategoryStatistics.tsx   # Category breakdown
│   ├── EditExpenseModal.tsx     # Expense editing
│   ├── ImportExpenseModal.tsx   # CSV import
│   ├── DuplicateWarning.tsx     # Duplicate detection
│   ├── Toast.tsx                # Toast notifications
│   ├── ErrorBoundary.tsx        # Error handling
│   ├── ThemeToggle.tsx          # Dark/light mode
│   └── ...
├── contexts/
│   └── ThemeContext.tsx         # Theme state management
├── hooks/
│   ├── useApiRequest.ts         # API call abstraction
│   ├── useToast.ts              # Toast notifications
│   └── useFormValidation.ts     # Form validation
├── utils/
│   ├── errorHandler.ts          # Error handling utilities
│   └── pdfExport.ts             # PDF export functionality
├── api/
│   └── client.ts                # API client configuration
├── App.tsx                      # Main app component
└── index.tsx                    # Entry point
```

### Component Hierarchy

```
App
├── ThemeContext.Provider
│   ├── Router
│   │   ├── Dashboard
│   │   │   ├── BalanceDashboard
│   │   │   ├── ExpenseOverview
│   │   │   └── IncomeOverview
│   │   ├── Statistics
│   │   │   ├── CategoryStatistics
│   │   │   ├── VendorStatistics
│   │   │   └── VendorTypeStatistics
│   │   ├── Trends
│   │   │   └── Charts (Recharts)
│   │   ├── CashFlow
│   │   │   ├── Summary Cards
│   │   │   └── Breakdown Charts
│   │   └── AddExpense
│   │       ├── VendorSelector
│   │       ├── CategorySelector
│   │       └── FormField
│   └── Toast (Global)
└── ErrorBoundary
```

### State Management Strategy

**Local State (useState)**
- Component-specific UI state
- Form inputs
- Modal visibility

**Context API (useContext)**
- Theme preferences (dark/light mode)
- Global notifications

**Server State (Custom Hooks)**
- API data fetching
- Caching strategy
- Error handling

```typescript
// Custom hook for API requests
const useApiRequest = <T,>(
  apiCall: () => Promise<T>,
  dependencies: any[]
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Fetch data, handle errors, update state
  }, dependencies);

  return { data, loading, error };
};
```

### Key Frontend Patterns

#### 1. **Custom Hooks for Reusability**

```typescript
// useToast.ts
export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error') => {
    // Add toast logic
  };

  return { toasts, showToast };
};
```

#### 2. **Error Boundaries**

```typescript
<ErrorBoundary fallback={<ErrorMessage />}>
  <Dashboard />
</ErrorBoundary>
```

#### 3. **Lazy Loading**

```typescript
const Statistics = lazy(() => import('./components/Statistics'));
const Trends = lazy(() => import('./components/Trends'));
```

---

## iOS Architecture

### MVVM Architecture (SwiftUI)

```
ios/ExpensoApp/ExpensoApp/
├── Models/
│   ├── Expense.swift            # Data models
│   ├── Income.swift
│   ├── Vendor.swift
│   ├── Category.swift
│   └── PendingExpense.swift     # Offline storage model
├── ViewModels/
│   ├── DashboardViewModel.swift
│   ├── CashFlowViewModel.swift
│   ├── TrendsViewModel.swift
│   ├── AddTransactionViewModel.swift
│   └── ...
├── Views/
│   ├── ContentView.swift        # Main tab view
│   ├── DashboardView.swift
│   ├── CashFlowView.swift
│   ├── TrendsView.swift
│   ├── StatisticsView.swift
│   ├── AddTransactionView.swift
│   └── Components/
│       ├── SummaryCard.swift
│       ├── SyncIndicatorView.swift
│       ├── ToastView.swift
│       └── ...
├── Services/
│   ├── APIService.swift         # Backend communication
│   ├── NetworkManager.swift     # Connectivity monitoring
│   ├── SyncManager.swift        # Offline sync
│   ├── OfflineStorageManager.swift
│   ├── DataCacheManager.swift   # In-memory caching
│   ├── PerformanceManager.swift # Request deduplication
│   └── ConfigurationManager.swift
├── Managers/
│   └── ToastManager.swift       # Toast notifications
├── Modifiers/
│   └── GlassModifiers.swift     # iOS 18 glassmorphism
└── Utils/
    └── Extensions.swift
```

### MVVM Pattern Flow

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│              │         │              │         │              │
│     View     │────────▶│  ViewModel   │────────▶│    Model     │
│   (SwiftUI)  │         │  (@Published)│         │  (Entities)  │
│              │◀────────│              │         │              │
└──────────────┘         └──────────────┘         └──────────────┘
       │                        │                         │
       │                        │                         │
       ▼                        ▼                         ▼
  User Actions           Business Logic            Data Layer
  (buttons, etc)         (filtering, calc)         (API, Storage)
```

### Offline-First Architecture

```mermaid
graph LR
    subgraph "User Layer"
        UI[SwiftUI Views]
    end

    subgraph "ViewModel Layer"
        VM[View Models<br/>@Published state]
    end

    subgraph "Service Layer"
        API[API Service<br/>Combine Publishers]
        NM[Network Manager<br/>NWPathMonitor]
        SM[Sync Manager<br/>Auto-sync Timer]
        OSM[Offline Storage<br/>UserDefaults]
    end

    subgraph "Decision Logic"
        Online{Is Online?}
    end

    UI -->|User Action| VM
    VM --> Online
    Online -->|Yes| API
    Online -->|No| OSM
    API -->|Failure| OSM
    OSM -->|Save| Pending[Pending Queue]
    NM -->|Monitors| Online
    Pending -->|When Online| SM
    SM -->|Background Sync| API
    API -->|Success| VM
    VM -->|@Published| UI

    style UI fill:#007aff
    style OSM fill:#ffa500
    style SM fill:#34c759
```

### Key iOS Patterns

#### 1. **Offline Storage with UserDefaults**

```swift
class OfflineStorageManager {
    static let shared = OfflineStorageManager()

    private let pendingKey = "pending_expenses"

    func savePendingExpense(_ expense: PendingExpense) {
        var pending = getPendingExpenses()
        pending.append(expense)

        if let data = try? JSONEncoder().encode(pending) {
            UserDefaults.standard.set(data, forKey: pendingKey)
        }
    }

    func getPendingExpenses() -> [PendingExpense] {
        guard let data = UserDefaults.standard.data(forKey: pendingKey),
              let expenses = try? JSONDecoder().decode([PendingExpense].self, from: data)
        else { return [] }
        return expenses
    }
}
```

#### 2. **Automatic Background Sync**

```swift
class SyncManager: ObservableObject {
    @Published var isSyncing = false
    @Published var pendingCount = 0

    private var syncTimer: Timer?

    func startAutoSync() {
        // Auto-sync every 30 seconds if pending items exist
        syncTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            self?.syncIfNeeded()
        }
    }

    func sync() async {
        let pending = storageManager.getPendingExpenses()

        for expense in pending {
            let result = await syncExpense(expense)
            if result {
                storageManager.removePendingExpense(expense.id)
            }
        }
    }
}
```

#### 3. **Network Monitoring**

```swift
import Network

class NetworkManager: ObservableObject {
    @Published var isConnected = true
    @Published var connectionType: ConnectionType = .unknown

    private let monitor = NWPathMonitor()

    init() {
        monitor.pathUpdateHandler = { [weak self] path in
            DispatchQueue.main.async {
                self?.isConnected = path.status == .satisfied
                self?.connectionType = self?.getConnectionType(from: path) ?? .unknown
            }
        }
        monitor.start(queue: DispatchQueue.global(qos: .background))
    }

    var isOnline: Bool { return isConnected }
}
```

#### 4. **Request Deduplication & Caching**

```swift
class PerformanceManager {
    static let shared = PerformanceManager()

    private var activeRequests: [String: AnyCancellable] = [:]

    func optimizeAPIRequest<T>(
        operation: String,
        request: AnyPublisher<T, APIService.APIError>
    ) -> AnyPublisher<T, APIService.APIError> {
        // If same request is in progress, return existing
        if let existing = activeRequests[operation] {
            return existing as! AnyPublisher<T, APIService.APIError>
        }

        // Store and execute new request
        let publisher = request.share()
        activeRequests[operation] = publisher as? AnyCancellable

        return publisher.handleEvents(receiveCompletion: { [weak self] _ in
            self?.activeRequests.removeValue(forKey: operation)
        }).eraseToAnyPublisher()
    }
}
```

#### 5. **iOS 18 Glassmorphism**

```swift
extension View {
    func frostedGlass(tintColor: Color = .white, cornerRadius: CGFloat = 12) -> some View {
        self.modifier(FrostedGlass(tintColor: tintColor, cornerRadius: cornerRadius))
    }
}

struct FrostedGlass: ViewModifier {
    var tintColor: Color
    var cornerRadius: CGFloat

    func body(content: Content) -> some View {
        content
            .background(
                ZStack {
                    RoundedRectangle(cornerRadius: cornerRadius)
                        .fill(tintColor.opacity(0.1))
                    RoundedRectangle(cornerRadius: cornerRadius)
                        .fill(.ultraThinMaterial)
                }
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .strokeBorder(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(0.6),
                                Color.white.opacity(0.1),
                                Color.white.opacity(0.3)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1.5
                    )
            )
    }
}
```

---

## Data Flow

### 1. Creating an Expense (Web/iOS Online)

```mermaid
sequenceDiagram
    participant User
    participant UI as View/Component
    participant VM as ViewModel/State
    participant API as API Service
    participant Server as Backend Server
    participant DB as PostgreSQL

    User->>UI: Enter expense details
    User->>UI: Click "Add Expense"
    UI->>VM: Validate form
    VM->>API: POST /api/v1/expenses
    API->>Server: HTTP Request
    Server->>Server: Validate DTO
    Server->>Server: Execute Interactor
    Server->>DB: INSERT expense
    DB-->>Server: Success
    Server-->>API: 201 Created + Expense
    API-->>VM: Update state
    VM-->>UI: Refresh expense list
    UI-->>User: Show success toast
```

### 2. Creating an Expense (iOS Offline)

```mermaid
sequenceDiagram
    participant User
    participant UI as SwiftUI View
    participant VM as ViewModel
    participant NM as Network Manager
    participant Storage as Offline Storage
    participant Sync as Sync Manager
    participant API as API Service

    User->>UI: Enter expense details
    User->>UI: Tap "Add Expense"
    UI->>VM: submitTransaction()
    VM->>NM: Check isOnline
    NM-->>VM: false (offline)
    VM->>Storage: savePendingExpense()
    Storage-->>Storage: Save to UserDefaults
    Storage-->>VM: Success
    VM-->>UI: Show "Saved offline" toast
    UI-->>User: Immediate feedback

    Note over Sync: Timer triggers (30s later)

    NM->>Sync: Network now available
    Sync->>Storage: getPendingExpenses()
    Storage-->>Sync: [PendingExpense]
    loop For each pending
        Sync->>API: POST /api/v1/expenses
        API-->>Sync: Success
        Sync->>Storage: removePendingExpense()
    end
    Sync-->>UI: Post notification
    UI-->>User: Show "Synced" indicator
```

### 3. Loading Dashboard Data (All Platforms)

```mermaid
sequenceDiagram
    participant User
    participant View
    participant VM as ViewModel
    participant Cache as Data Cache
    participant API as API Service
    participant Server

    User->>View: Open Dashboard
    View->>VM: loadData()
    VM->>Cache: Check cache
    Cache-->>VM: Cached data (if exists)
    VM-->>View: Display cached data

    par Fetch Fresh Data
        VM->>API: getExpenses()
        VM->>API: getIncomes()
        VM->>API: getBalance()
    end

    API->>Server: GET /api/v1/expenses
    Server-->>API: [Expense]
    API->>Server: GET /api/v1/incomes
    Server-->>API: [Income]
    API->>Server: GET /api/v1/expenses/balance
    Server-->>API: BalanceSummary

    API-->>VM: Combined results
    VM->>Cache: Update cache
    VM->>VM: Process data
    VM-->>View: Update @Published state
    View-->>User: Render updated UI
```

---

## API Design

### RESTful Endpoints

#### Expense Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/expenses` | Get all expenses (with filters) |
| POST | `/api/v1/expenses` | Create new expense |
| GET | `/api/v1/expenses/:id` | Get expense by ID |
| PUT | `/api/v1/expenses/:id` | Update expense |
| DELETE | `/api/v1/expenses/:id` | Delete expense |
| GET | `/api/v1/expenses/actual` | Get actual expenses (filtered) |
| GET | `/api/v1/expenses/balance` | Get balance summary |
| GET | `/api/v1/expenses/earnings` | Get earnings data |
| GET | `/api/v1/expenses/by-category` | Get expenses by category |
| GET | `/api/v1/expenses/check-duplicates` | Check for duplicates |
| GET | `/api/v1/expenses/export/csv` | Export as CSV |
| POST | `/api/v1/expenses/import/csv/preview` | Preview CSV import |
| POST | `/api/v1/expenses/import/csv/confirm` | Confirm CSV import |

#### Income Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/incomes` | Get all incomes |
| POST | `/api/v1/incomes` | Create new income |
| GET | `/api/v1/incomes/:id` | Get income by ID |
| PUT | `/api/v1/incomes/:id` | Update income |
| DELETE | `/api/v1/incomes/:id` | Delete income |
| GET | `/api/v1/incomes/source/:source` | Get incomes by source |
| GET | `/api/v1/incomes/summary` | Get income summary |

#### Vendor Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/vendors` | Get all vendors |
| POST | `/api/v1/vendors` | Create new vendor |
| GET | `/api/v1/vendors/:id` | Get vendor by ID |
| PUT | `/api/v1/vendors/:id` | Update vendor |
| DELETE | `/api/v1/vendors/:id` | Delete vendor |
| GET | `/api/v1/vendors/type/:type` | Get vendors by type |

### API Request/Response Examples

#### Create Expense

**Request:**
```http
POST /api/v1/expenses
Content-Type: application/json

{
  "comment": "Grocery shopping",
  "amount": 150.75,
  "vendorId": 5,
  "date": "2025-10-26",
  "category": "Food",
  "type": "expense",
  "paidByCard": true,
  "addedBy": "John Doe",
  "tagIds": [1, 3]
}
```

**Response:**
```http
HTTP/1.1 201 Created
Content-Type: application/json

{
  "id": 123,
  "comment": "Grocery shopping",
  "amount": 150.75,
  "vendor": {
    "id": 5,
    "name": "Whole Foods",
    "type": "grocery"
  },
  "date": "2025-10-26",
  "category": "Food",
  "type": "expense",
  "paidByCard": true,
  "addedBy": "John Doe",
  "tags": [
    {"id": 1, "name": "essential"},
    {"id": 3, "name": "weekly"}
  ],
  "createdAt": "2025-10-26T10:30:00Z",
  "updatedAt": "2025-10-26T10:30:00Z"
}
```

### Error Handling

**Standard Error Response:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid expense data",
    "details": [
      {
        "field": "amount",
        "message": "Amount must be greater than 0"
      }
    ]
  }
}
```

**HTTP Status Codes:**
- `200 OK` - Successful GET/PUT
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Validation error
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Database Schema

### Entity-Relationship Diagram

```mermaid
erDiagram
    EXPENSES ||--o{ EXPENSE_TAGS : has
    EXPENSES }o--|| VENDORS : "belongs to"
    INCOMES }o--|| VENDORS : "belongs to"
    INCOMES ||--o{ INCOME_TAGS : has
    TAGS ||--o{ EXPENSE_TAGS : used_in
    TAGS ||--o{ INCOME_TAGS : used_in
    VENDORS ||--o{ EXPENSES : has
    VENDORS ||--o{ INCOMES : has

    EXPENSES {
        int id PK
        string comment
        decimal amount
        int vendor_id FK
        date date
        string category
        string type
        boolean paid_by_card
        string added_by
        timestamp created_at
        timestamp updated_at
    }

    INCOMES {
        int id PK
        string comment
        decimal amount
        int vendor_id FK
        date date
        string source
        string added_by
        timestamp created_at
        timestamp updated_at
    }

    VENDORS {
        int id PK
        string name
        string type
        timestamp created_at
        timestamp updated_at
    }

    TAGS {
        int id PK
        string name
        string color
        timestamp created_at
        timestamp updated_at
    }

    EXPENSE_TAGS {
        int expense_id FK
        int tag_id FK
    }

    INCOME_TAGS {
        int income_id FK
        int tag_id FK
    }

    CATEGORIES {
        int id PK
        string name
        string icon
        string color
        timestamp created_at
        timestamp updated_at
    }
```

### Database Tables

#### expenses
```sql
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    comment TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    category VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'expense',
    paid_by_card BOOLEAN DEFAULT true,
    added_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_expenses_date ON expenses(date DESC);
CREATE INDEX idx_expenses_vendor ON expenses(vendor_id);
CREATE INDEX idx_expenses_category ON expenses(category);
```

#### incomes
```sql
CREATE TABLE incomes (
    id SERIAL PRIMARY KEY,
    comment TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    source VARCHAR(100) NOT NULL,
    added_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_incomes_date ON incomes(date DESC);
CREATE INDEX idx_incomes_source ON incomes(source);
```

#### vendors
```sql
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vendors_type ON vendors(type);
```

---

## Deployment Architecture

### Development Environment

```
┌─────────────────────────────────────────────────────────┐
│                  Developer Machine                       │
├─────────────────────────────────────────────────────────┤
│  Frontend (React)      Backend (Go)      iOS (SwiftUI) │
│  localhost:3000        localhost:8080    Simulator      │
│                                                          │
│  PostgreSQL (Docker)                                     │
│  localhost:5432                                          │
└─────────────────────────────────────────────────────────┘
```

### Production Deployment (Recommended)

```
┌──────────────────────────────────────────────────────────┐
│                      Cloud Provider                       │
│              (AWS, GCP, Azure, or DigitalOcean)          │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐   ┌──────────────┐   ┌─────────────┐ │
│  │  Web App     │   │  API Server  │   │  Database   │ │
│  │  (Static)    │   │  (Container) │   │ (Managed)   │ │
│  │  S3/CDN      │   │  Port 8080   │   │ PostgreSQL  │ │
│  └──────────────┘   └──────────────┘   └─────────────┘ │
│         │                   │                   │        │
│         └──────────┬────────┴───────────────────┘        │
│                    │                                     │
│              Load Balancer                               │
│            (SSL/TLS Termination)                         │
│                                                           │
└──────────────────────────────────────────────────────────┘
                         │
                         │ HTTPS
                         ▼
                   ┌──────────┐
                   │  Users   │
                   │ (Web/iOS)│
                   └──────────┘
```

### Docker Deployment

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:latest
    environment:
      POSTGRES_DB: expenso
      POSTGRES_USER: expenso_user
      POSTGRES_PASSWORD: secure_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      DATABASE_URL: postgres://expenso_user:secure_password@postgres:5432/expenso
    depends_on:
      - postgres

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      REACT_APP_API_URL: http://localhost:8080

volumes:
  postgres_data:
```

---

## Security Architecture

### 1. **API Security**

#### CORS Configuration
```go
router.Use(func(c *gin.Context) {
    c.Header("Access-Control-Allow-Origin", "http://localhost:3000")
    c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
    c.Header("Access-Control-Allow-Headers", "*")

    if c.Request.Method == "OPTIONS" {
        c.AbortWithStatus(204)
        return
    }

    c.Next()
})
```

#### Input Validation
```go
type CreateExpenseDTO struct {
    Comment  string  `json:"comment" binding:"required,min=1,max=500"`
    Amount   float64 `json:"amount" binding:"required,gt=0"`
    VendorID int     `json:"vendorId" binding:"required"`
    // ...
}
```

### 2. **Database Security**

- ✅ **Prepared Statements**: All queries use parameterized statements
- ✅ **SQL Injection Prevention**: No string concatenation in queries
- ✅ **Connection Pooling**: Limited concurrent connections
- ✅ **Constraints**: CHECK constraints on amounts, foreign keys

### 3. **iOS Security**

- ✅ **HTTPS Only**: All network requests use HTTPS in production
- ✅ **Local Storage Encryption**: UserDefaults for non-sensitive data only
- ✅ **No API Keys in Code**: Configuration-based secrets
- ✅ **App Transport Security**: Enforced by iOS

### 4. **Future Security Enhancements**

- 🔄 **Authentication**: JWT-based user authentication
- 🔄 **Authorization**: Role-based access control (RBAC)
- 🔄 **Rate Limiting**: API request throttling
- 🔄 **Audit Logging**: Track all data modifications
- 🔄 **Data Encryption**: At-rest encryption for sensitive data

---

## Performance Optimizations

### Backend

1. **Database Indexing**: Indexes on frequently queried columns (date, vendor_id, category)
2. **Connection Pooling**: Reuse database connections
3. **Efficient Queries**: Avoid N+1 queries, use JOINs appropriately
4. **Pagination**: Limit result sets for large data

### Frontend (React)

1. **Code Splitting**: Lazy load routes and components
2. **Memoization**: `useMemo`, `useCallback` for expensive computations
3. **Virtual Scrolling**: For long lists (future enhancement)
4. **Debouncing**: Search inputs debounced
5. **Caching**: API response caching

### iOS

1. **Request Deduplication**: Prevent duplicate concurrent API calls
2. **In-Memory Caching**: DataCacheManager for vendors/categories
3. **Lazy Loading**: Load data on demand
4. **Background Sync**: Non-blocking offline sync
5. **SwiftUI Performance**: `.id()` modifier usage minimized

---

## Monitoring and Observability

### Logging Strategy

**Backend (Go):**
```go
log.Printf("📊 Created expense: ID=%d, Amount=%.2f, User=%s",
    expense.ID, expense.Amount, expense.AddedBy)
```

**iOS (Swift):**
```swift
if ConfigurationManager.shared.enableDebugLogging {
    print("💾 Saved expense offline: \(pendingExpense.comment)")
}
```

### Health Checks

```go
router.GET("/health", func(c *gin.Context) {
    c.JSON(200, gin.H{"status": "OK"})
})
```

### Future Observability

- 🔄 **Structured Logging**: JSON-formatted logs
- 🔄 **Metrics**: Prometheus/Grafana integration
- 🔄 **Tracing**: Distributed tracing (OpenTelemetry)
- 🔄 **Alerting**: Error rate monitoring

---

## Testing Strategy

### Backend Tests

```go
// Unit tests for interactors
func TestExpenseInteractor_CreateExpense(t *testing.T) {
    // Test business logic in isolation
}

// Integration tests for repositories
func TestExpenseRepository_Create(t *testing.T) {
    // Test database interactions
}
```

### Frontend Tests

```typescript
// Component tests
test('renders expense form', () => {
    render(<AddExpense />);
    expect(screen.getByText('Add Expense')).toBeInTheDocument();
});

// Hook tests
test('useApiRequest handles loading state', async () => {
    // Test custom hooks
});
```

### iOS Tests (Future)

```swift
// Unit tests
func testCashFlowCalculation() {
    // Test ViewModel logic
}

// UI tests
func testAddExpenseFlow() {
    // Test complete user flows
}
```

---

## Conclusion

Expenso's architecture is designed for:

✅ **Scalability**: Clean separation allows independent scaling
✅ **Maintainability**: Clear boundaries reduce coupling
✅ **Testability**: Dependency injection enables easy testing
✅ **Reliability**: Offline-first iOS ensures data never lost
✅ **Performance**: Caching, deduplication, efficient queries
✅ **Developer Experience**: Modern tooling, clear patterns

### Next Steps

1. Implement user authentication (JWT)
2. Add real-time notifications (WebSockets)
3. Implement advanced analytics (ML insights)
4. Add recurring expense tracking
5. Build budget planning features
6. Create mobile apps for Android

---

**Document Version:** 1.0
**Last Updated:** 2025-10-26
**Maintained By:** Development Team
