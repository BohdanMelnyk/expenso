# Expenso - Smart Expense Tracking

A modern expense tracking application built with Go backend, React frontend, and PostgreSQL database.

## Features

- ✨ Track expenses with amount, date, type, category, and comments
- 📊 Visualize spending patterns with charts
- 🔍 Get insights and analytics on your spending habits
- 📱 Responsive design for mobile and desktop
- 🎯 Category-based expense organization

## Tech Stack

- **Backend**: Go with Gorilla Mux
- **Frontend**: React with TypeScript
- **Database**: PostgreSQL
- **Containerization**: Docker & Docker Compose

## Quick Start

### Prerequisites

- Go 1.21+
- Node.js 18+
- Docker & Docker Compose

### 1. Clone and Setup

```bash
git clone <repository-url>
cd expenso
```

### 2. Start Database

```bash
docker-compose up postgres -d
```

### 3. Start Backend

```bash
cd backend
go run cmd/server/main.go
```

Backend will be available at `http://localhost:8080`

### 4. Start Frontend

```bash
cd frontend
npm install
npm start
```

Frontend will be available at `http://localhost:3000`

## API Endpoints

### Expenses
- `GET /api/v1/expenses` - Get all expenses
- `POST /api/v1/expenses` - Create new expense
- `GET /api/v1/expenses/{id}` - Get expense by ID
- `PUT /api/v1/expenses/{id}` - Update expense
- `DELETE /api/v1/expenses/{id}` - Delete expense

### Health Check
- `GET /health` - API health status

## Database Schema

### Expenses Table
```sql
- id (SERIAL PRIMARY KEY)
- amount (DECIMAL)
- date (DATE)
- type (VARCHAR) -- 'income' or 'expense'
- category (VARCHAR)
- comment (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### Categories Table
```sql
- id (SERIAL PRIMARY KEY)
- name (VARCHAR)
- color (VARCHAR) -- Hex color code
- icon (VARCHAR)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## Development

### Backend Commands
```bash
cd backend
go run cmd/server/main.go    # Start server
go test ./...                # Run tests
go build -o bin/server cmd/server/main.go  # Build binary
```

### Frontend Commands
```bash
cd frontend
npm start          # Development server
npm run build      # Production build
npm test          # Run tests
npm run lint      # Lint code
```

### Database Management
```bash
docker-compose up postgres    # Start PostgreSQL
docker-compose down           # Stop all services
```

## Environment Variables

Copy `.env` file and adjust values as needed:
- `PORT`: Backend server port (default: 8080)
- `DATABASE_URL`: PostgreSQL connection string
- `ENVIRONMENT`: development/production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request