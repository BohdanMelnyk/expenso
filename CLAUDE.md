# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Expenso is a multi-platform expense tracking application with Go backend, React frontend, and iOS native app.

## Tech Stack

- **Backend**: Go with Gin framework, Clean Architecture pattern
- **Frontend**: React with TypeScript
- **iOS**: SwiftUI native app
- **Database**: PostgreSQL
- **API**: RESTful API with Swagger documentation

## Project Structure

```
expenso/
├── backend/                # Go backend (Clean Architecture)
│   ├── cmd/server/        # Application entry point
│   ├── domain/            # Domain layer (entities, business rules)
│   │   ├── entities/      # Core business entities
│   │   └── valueobjects/  # Value objects
│   ├── usecases/          # Use case layer (business logic)
│   │   ├── interactors/   # Use case implementations
│   │   └── interfaces/    # Repository interfaces
│   ├── infrastructure/    # Infrastructure layer (external concerns)
│   │   ├── http/          # HTTP handlers, DTOs, middleware
│   │   ├── persistence/   # Database repositories
│   │   ├── logger/        # Logging implementation
│   │   └── config/        # Configuration management
│   ├── migrations/        # SQL migration files (numbered)
│   └── configs/           # YAML configuration files
├── frontend/              # React TypeScript app
│   └── src/
│       ├── components/    # React components
│       ├── api/          # API client
│       └── hooks/        # Custom React hooks
└── ios/ExpensoApp/        # iOS SwiftUI app
    └── ExpensoApp/        # App source files
```

## Development Commands

### Starting the Application

```bash
# Start backend (from backend/)
go run cmd/server/main.go

# Start frontend (from frontend/)
npm install  # First time only
npm start

# Backend runs on http://localhost:8080
# Frontend runs on http://localhost:3000
# Swagger docs at http://localhost:8080/swagger/index.html
```

### Backend Commands

```bash
cd backend

# Run server
go run cmd/server/main.go

# Run tests
go test ./...

# Build binary
go build -o bin/server cmd/server/main.go

# Update Swagger docs (after API changes)
swag init -g cmd/server/main.go

# Format code
go fmt ./...
```

### Frontend Commands

```bash
cd frontend

# Development
npm start

# Build for production
npm run build

# Run tests
npm test

# Lint
npm run lint
```

### Database Management

```bash
# Database runs locally without Docker
# Configure connection in backend/configs/local.yaml

# Migrations run automatically on server start
# Located in backend/migrations/ (numbered: 001_, 002_, etc.)
```

## Backend Architecture (Clean Architecture)

### Layer Dependencies (Dependency Inversion)
```
Infrastructure → Usecases → Domain
(HTTP, DB)       (Business)  (Entities)
```

### Data Flow
```
Request → Handler (HTTP) → Interactor (UseCase) → Repository Interface
                    ↓                                       ↑
                  DTO ←→ Entity                   Implementation (DB)
```

### Key Components

**Domain Layer** (`domain/`):
- Entities: Core business objects (Expense, Category, Vendor, etc.)
- Value Objects: Immutable objects (e.g., Money)
- Business rules and validation embedded in entities
- NO external dependencies

**Use Case Layer** (`usecases/`):
- Interactors: Implement business use cases
- Interfaces: Define repository contracts
- Orchestrates entities and repositories
- Framework-agnostic business logic

**Infrastructure Layer** (`infrastructure/`):
- HTTP: Handlers, DTOs, middleware, routing
- Persistence: Repository implementations, database models
- Logger: Structured logging with fields
- Config: YAML-based configuration

### Important Patterns

1. **Entity Creation**: Use factory methods (`NewExpenseEntity()`)
2. **Error Handling**: Domain errors defined in entities (`ErrExpenseNotFound`)
3. **DTOs**: Separate request/response objects from entities
4. **Repository Pattern**: Interfaces in usecases, implementations in infrastructure
5. **Dependency Injection**: Manual DI in `main.go`

### Configuration

Backend uses YAML configuration files in `backend/configs/`:
- `local.yaml` - Local development settings
- `prod.yaml` - Production settings

Select environment via `APP_ENV` environment variable (defaults to "local").

## Database Schema

### Core Tables
- `expenses` - Expense transactions
- `income` - Income transactions (migrated from expenses)
- `categories` - Expense categories
- `vendors` - Merchants/vendors with types
- `tags` - Custom tags for categorization
- `expense_tags` - Many-to-many relationship

### Vendor-Category Mapping

Vendors have types that map to categories:
- Mapping defined in `backend/domain/entities/vendor_category_mapping.go`
- API returns `category` field for each vendor
- Frontend/iOS filter vendors by selected category

**Example mapping**:
```
'food_store' → 'Food Store'
'dining' → 'Dining'
'dining_with_friends' → 'Dining with Friends'
```

## Migration System

- Located in `backend/migrations/`
- Numbered sequentially: `001_name.sql`, `002_name.sql`
- Run automatically on server startup
- Tracked in `schema_migrations` table
- **Important**: Enum additions must be done carefully (see migration 014-016 for example)

## Frontend Architecture

### Component Structure
- `components/` - Reusable React components
- Form components use `useFormValidation` custom hook
- API calls via centralized `api/client.ts`
- TypeScript interfaces for type safety

### Key Components
- `AddExpense.tsx` - Add new expense form
- `EditExpenseModal.tsx` - Edit existing expense
- `CategorySelector.tsx` - Category picker with autocomplete
- `VendorSelector.tsx` - Vendor picker (filters by category)
- `Dashboard.tsx` - Main dashboard view

### Vendor Filtering
When category is selected, `VendorSelector` automatically filters vendors:
```typescript
<VendorSelector
  selectedVendorId={vendorId}
  onVendorSelect={handleSelect}
  selectedCategoryName={categoryName}  // Filters by this
/>
```

## iOS App Architecture

### Structure
- SwiftUI for UI
- MVVM pattern (View + ViewModel)
- Combine framework for reactive programming
- APIService for backend communication

### Key Files
- `Models.swift` - Data models matching API
- `APIService.swift` - API client
- `ContentView.swift` - Main app view
- `*ViewModel.swift` - Business logic per feature
- `AddTransactionViewModel.swift` - Contains VendorPickerViewModel

### Vendor Filtering
VendorPickerViewModel filters by category:
```swift
var filteredVendors: [Vendor] {
    // Filter by selectedCategory if present
    // Then filter by searchText
}
```

## Git Workflow (MANDATORY)

**CRITICAL**: This project uses **feature branch workflow**. See `.claude/rules.md`.

### Branch Rules
- ❌ **NEVER commit directly to main**
- ✅ **ALWAYS create feature branches**
- Branch format: `feature/description` or `fix/description`

### Workflow
```bash
# Start new feature
git checkout main
git pull origin main
git checkout -b feature/feature-name

# Work and commit
git add .
git commit -m "description"

# Push feature branch
git push -u origin feature/feature-name

# Create PR (don't merge directly)
```

## API Documentation

Swagger documentation automatically generated and available at:
```
http://localhost:8080/swagger/index.html
```

### Key Endpoints
- `/api/v1/expenses` - Expense CRUD
- `/api/v1/income` - Income CRUD
- `/api/v1/categories` - Category management
- `/api/v1/vendors` - Vendor management
- `/api/v1/tags` - Tag management

## Common Tasks

### Adding a New Entity

1. **Domain** (`domain/entities/`): Create entity with factory method
2. **UseCase Interface** (`usecases/interfaces/repositories/`): Define repository interface
3. **UseCase Interactor** (`usecases/interactors/`): Implement business logic
4. **Infrastructure DTO** (`infrastructure/http/dto/`): Request/response DTOs
5. **Infrastructure Handler** (`infrastructure/http/handlers/`): HTTP endpoints
6. **Infrastructure Repository** (`infrastructure/persistence/repositories/`): DB implementation
7. **Migration** (`migrations/`): Create numbered SQL file
8. **Wire in main.go**: Add DI setup

### Adding a Migration

1. Create file: `migrations/XXX_description.sql` (increment number)
2. Write SQL for schema changes
3. Restart server (migrations run automatically)
4. **Note**: ALTER TYPE ADD VALUE for enums cannot run in transactions - handle carefully

### Updating Swagger Docs

```bash
cd backend
swag init -g cmd/server/main.go
```

## Testing Strategy

- Backend: `go test ./...`
- Frontend: `npm test`
- Manual testing via Swagger UI

## Logging

Backend uses structured logging:
```go
logger.Info("message", logger.Fields{"key": "value"})
logger.Error("error", logger.Fields{"error": err.Error()})
```

Configured in `infrastructure/logger/`.

## Important Notes

- **Enum Values**: Adding to PostgreSQL enums requires special handling (cannot be in transaction)
- **Vendor Categories**: Centralized mapping in `vendor_category_mapping.go`
- **Migrations**: Automatically run on startup, tracked in `schema_migrations`
- **Configuration**: Use YAML files, not environment variables (except APP_ENV)
- **Error Handling**: Domain-specific errors defined in entity files
