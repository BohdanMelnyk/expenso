# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Expenso is a smart expense tracking application that provides insights and analytics for personal financial management.

## Tech Stack

- **Backend**: Go (Golang) with Gin/Echo framework
- **Frontend**: React with TypeScript
- **Database**: PostgreSQL
- **API**: RESTful API

## Project Structure

```
expenso/
├── backend/           # Go backend application
│   ├── cmd/          # Application entry points
│   ├── internal/     # Private application code
│   ├── pkg/          # Public library code
│   ├── migrations/   # Database migrations
│   └── go.mod        # Go module file
├── frontend/         # React frontend application
│   ├── src/          # Source code
│   ├── public/       # Static assets
│   └── package.json  # Node dependencies
├── docker-compose.yml # Local development setup
└── README.md         # Project documentation
```

## Development Commands

### Backend (Go)
```bash
cd backend
go mod init expenso-backend
go run cmd/server/main.go
go test ./...
go build -o bin/server cmd/server/main.go
```

### Frontend (React)
```bash
cd frontend
npm install
npm start           # Development server
npm run build       # Production build
npm test           # Run tests
npm run lint       # Lint code
```

### Database
```bash
# Start PostgreSQL with Docker
docker-compose up postgres

# Run migrations
cd backend && go run cmd/migrate/main.go up
```

## Core Features

### Frontend Components
- Expense input form (amount, date, type, category, comment)
- Expense charts and visualizations
- Insights and analytics dashboard
- Category management

### Backend APIs
- CRUD operations for expenses
- Category management
- Data aggregation for insights
- User authentication (future)

### Database Schema
- expenses table: id, amount, date, type, category, comment, created_at, updated_at
- categories table: id, name, color, icon, created_at, updated_at

## Development Workflow

**IMPORTANT**: This project uses a **feature branch workflow**. See `.claude/rules.md` for complete guidelines.

### Git Workflow
1. Always work on feature branches: `feature/description`, `fix/description`
2. Never commit directly to main branch
3. Create pull requests for all changes
4. Keep PRs small and focused

### Development Steps
1. Set up PostgreSQL database
2. Initialize Go backend with proper structure  
3. Create React frontend with modern tooling
4. Implement CRUD APIs
5. Build responsive UI components
6. Add data visualization
7. Implement insights and analytics

### Branch Naming Convention
- `feature/add-expense-api` - New features
- `fix/chart-render-bug` - Bug fixes  
- `chore/update-deps` - Tooling/config
- `docs/api-documentation` - Documentation