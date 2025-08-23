# Expenso Backend

Smart expense tracking application backend built with Go, using Clean Architecture principles.

## Features

- Clean Architecture with Gin framework
- PostgreSQL database with automatic migrations
- Swagger UI for API documentation
- Docker support for easy deployment
- CRUD operations for expenses and vendors

## Quick Start with Docker

1. **Start the application with Docker Compose:**
   ```bash
   docker-compose up --build
   ```

2. **Access the application:**
   - API: http://localhost:8080
   - Swagger UI: http://localhost:8080/swagger/index.html
   - Health check: http://localhost:8080/health

3. **Stop the application:**
   ```bash
   docker-compose down
   ```

## Development Setup

1. **Install dependencies:**
   ```bash
   go mod download
   ```

2. **Start PostgreSQL:**
   ```bash
   docker-compose up postgres -d
   ```

3. **Run migrations:**
   ```bash
   ./scripts/migrate.sh
   ```

4. **Start the application:**
   ```bash
   go run cmd/server/main.go
   ```

## Database Migrations

Migrations are automatically applied when the Docker container starts. For manual migration:

```bash
# Make sure PostgreSQL is running
docker-compose up postgres -d

# Run migrations
./scripts/migrate.sh
```

## API Endpoints

### Expenses
- `GET /api/v1/expenses` - Get all expenses
- `POST /api/v1/expenses` - Create expense
- `GET /api/v1/expenses/{id}` - Get expense by ID
- `PUT /api/v1/expenses/{id}` - Update expense
- `DELETE /api/v1/expenses/{id}` - Delete expense

### Vendors
- `GET /api/v1/vendors` - Get all vendors
- `POST /api/v1/vendors` - Create vendor
- `GET /api/v1/vendors/{id}` - Get vendor by ID
- `GET /api/v1/vendors/type/{type}` - Get vendors by type

### Vendor Types
- `food_store` - Grocery stores, supermarkets, etc.
- `shop` - Retail stores, online shops, etc.
- `eating_out` - Restaurants, cafes, food trucks, etc.
- `subscriptions` - Netflix, Spotify, software subscriptions, etc.
- `else` - ATM withdrawals, cash payments, misc.

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `PORT` - Server port (default: 8080)
- `GIN_MODE` - Gin mode (debug/release)

## Architecture

The project follows Clean Architecture principles:

```
├── cmd/server/          # Application entry point
├── domain/              # Business entities and value objects
├── usecases/            # Business logic (interactors)
├── infrastructure/      # External concerns (HTTP, DB, etc.)
├── migrations/          # Database migrations
└── docs/               # Generated Swagger documentation
```

## Regenerate Swagger Documentation

```bash
go run github.com/swaggo/swag/cmd/swag@latest init -g cmd/server/main.go
```