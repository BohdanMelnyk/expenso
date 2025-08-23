# Expenso Backend Architecture

This document describes the backend architecture following Clean Architecture principles.

![The Clean Architecture](https://miro.medium.com/max/1400/1*B7LkQDyDqLN3rRSrNYkETA.jpeg)

## Overview

The Expenso backend implements Clean Architecture with three distinct layers:
- **Domain Layer** (innermost) - Business rules and logic
- **Use Case Layer** (middle) - Application business logic and orchestration  
- **Interface Layer** (outermost) - External interfaces and implementation details

## Project Structure

```
backend/
├── domain/                    # Domain layer (innermost)
│   ├── entities/             # Domain models/entities
│   │   ├── expense.go        # Expense domain model
│   │   └── vendor.go         # Vendor domain model
│   └── valueobjects/         # Value objects
│       └── money.go          # Money value object
├── usecases/                 # Use case layer (middle)
│   ├── interfaces/           # Interface definitions
│   │   ├── repositories/     # Repository interfaces
│   │   └── services/         # External service interfaces
│   └── interactors/          # Use case implementations
│       ├── expense/          # Expense use cases
│       └── vendor/           # Vendor use cases
├── infrastructure/           # Interface layer (outermost)
│   ├── http/                 # HTTP handlers/controllers
│   │   ├── handlers/         # HTTP request handlers
│   │   ├── dto/              # Data Transfer Objects
│   │   └── middleware/       # HTTP middleware
│   ├── persistence/          # Database implementation
│   │   ├── repositories/     # Repository implementations
│   │   ├── models/           # Database models (DBOs)
│   │   └── migrations/       # Database migrations
│   └── config/               # Configuration
├── cmd/                      # Application entry points
│   └── server/               # Server main
└── pkg/                      # Shared utilities
```

## Layer Responsibilities

### Domain Layer (Innermost)

**Location**: `backend/domain/`

#### Responsibilities
- Implements business rules and logic 
- Enforces invariants in the domain models constructors
- Has no dependencies on other layers
- Semantic validations - check business rules (meaning)
    - implemented in the domain model constructors
    - check if the attribute is in the correct range, e.g. is year > 0, is timestamp between today and tomorrow, etc.
    - check invariants
- Domain models can never be in an invalid state, if the semantic validation fails while creating the new model an error is returned instead
- Domain models encapsulate the logic that operates on the attributes of a model in the model
- Domain models attributes have no JSON, Avro, DB, or other annotations
- Domain models attributes are not exported i.e. they are private

#### Examples
```go
// Domain entity with private attributes and business logic
type Expense struct {
    id       ExpenseID
    amount   Money
    date     time.Time
    category Category
    comment  string
    vendor   *Vendor
}

// Constructor with semantic validation
func NewExpense(amount Money, date time.Time, category Category, comment string) (*Expense, error) {
    if amount.IsZero() || amount.IsNegative() {
        return nil, errors.New("expense amount must be positive")
    }
    if date.After(time.Now()) {
        return nil, errors.New("expense date cannot be in the future")
    }
    // ... more business rules
    return &Expense{
        id:       NewExpenseID(),
        amount:   amount,
        date:     date,
        category: category,
        comment:  comment,
    }, nil
}
```

### Use Case Layer (Middle)

**Location**: `backend/usecases/`

#### Responsibilities
- As the use case layer has dependency only on the domain layer it works only with domain models (and primitives), not with DTOs and DBOs declared in the interface layer (dependencies flow inwards)
- Interactor implementations in the use case layer are responsible for executing the business logic (implemented in the domain layer) and orchestration 
- Declarations of interfaces for all other dependencies, e.g. event publishers, gateways, repositories, ...

#### Examples
```go
// Repository interface declared in use case layer
type ExpenseRepository interface {
    Save(expense *domain.Expense) error
    FindByID(id domain.ExpenseID) (*domain.Expense, error)
    FindAll() ([]*domain.Expense, error)
}

// Use case interactor
type CreateExpenseInteractor struct {
    expenseRepo ExpenseRepository
    eventBus    EventBus
}

func (i *CreateExpenseInteractor) Execute(cmd CreateExpenseCommand) (*domain.Expense, error) {
    // Business logic orchestration
    expense, err := domain.NewExpense(cmd.Amount, cmd.Date, cmd.Category, cmd.Comment)
    if err != nil {
        return nil, err
    }
    
    if err := i.expenseRepo.Save(expense); err != nil {
        return nil, err
    }
    
    i.eventBus.Publish(ExpenseCreatedEvent{ExpenseID: expense.ID()})
    return expense, nil
}
```

### Interface Layer (Outermost)

**Location**: `backend/infrastructure/`

#### Responsibilities
- Implementation of controllers
- Implementation of interfaces from the use case layer
  - Execution of DB queries
  - Making remote service calls
  - Publishing events
  - Reading/writing to S3
  - ...
- Serialization/deserialization of requests/responses
- Implementation of DTOs, DBOs, etc.
  - DTO/DBO attributes have JSON/Avro/DB annotations as required
- Conversion of DTOs and DBOs to domain models and back
- Syntactic validations - check format (syntax)
   - check if the input format is correct, e.g. is an attribute a string or an integer, etc. 
   - check if the mandatory attributes are present

#### Examples
```go
// DTO with JSON annotations
type CreateExpenseDTO struct {
    Amount   float64 `json:"amount" validate:"required,gt=0"`
    Date     string  `json:"date" validate:"required"`
    Category string  `json:"category" validate:"required"`
    Comment  string  `json:"comment"`
}

// DBO with DB annotations
type ExpenseDBO struct {
    ID        int       `db:"id"`
    Amount    float64   `db:"amount"`
    Date      time.Time `db:"date"`
    Category  string    `db:"category"`
    Comment   string    `db:"comment"`
    CreatedAt time.Time `db:"created_at"`
    UpdatedAt time.Time `db:"updated_at"`
}

// HTTP Handler
func (h *ExpenseHandler) CreateExpense(w http.ResponseWriter, r *http.Request) {
    // 1. Syntactic validation
    var dto CreateExpenseDTO
    if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
        http.Error(w, "Invalid JSON", http.StatusBadRequest)
        return
    }
    
    // 2. Convert DTO to use case command
    cmd := CreateExpenseCommand{
        Amount:   Money(dto.Amount),
        Date:     parseDate(dto.Date),
        Category: Category(dto.Category),
        Comment:  dto.Comment,
    }
    
    // 3. Execute use case
    expense, err := h.createExpenseUseCase.Execute(cmd)
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    
    // 4. Convert domain model to response DTO
    response := ExpenseResponseDTO{
        ID:       expense.ID().String(),
        Amount:   expense.Amount().Value(),
        Category: expense.Category().String(),
        // ...
    }
    
    json.NewEncoder(w).Encode(response)
}
```

## Dependency Flow

```
Interface Layer → Use Case Layer → Domain Layer
(Controllers)   → (Interactors) → (Entities)
```

- **Interface Layer** depends on **Use Case Layer**
- **Use Case Layer** depends on **Domain Layer**  
- **Domain Layer** has no dependencies (pure business logic)

## Key Principles

1. **Dependency Inversion**: High-level modules don't depend on low-level modules. Both depend on abstractions.
2. **Single Responsibility**: Each layer has a single, well-defined responsibility.
3. **Open/Closed**: Open for extension, closed for modification.
4. **Interface Segregation**: Clients shouldn't depend on interfaces they don't use.
5. **Dependency Injection**: Dependencies are injected, not created.

## Benefits

- **Testability**: Each layer can be tested in isolation
- **Maintainability**: Clear separation of concerns
- **Flexibility**: Easy to swap implementations (database, web framework, etc.)
- **Business Logic Protection**: Core business rules are isolated and protected
- **Technology Independence**: Business logic doesn't depend on frameworks or external tools