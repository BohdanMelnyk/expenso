# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Expenso is a multi-platform expense tracking application: Go backend (Gin + Clean Architecture), React/TypeScript web frontend, and SwiftUI iOS app. PostgreSQL is the only datastore. AI features (free-text expense parsing, bank statement enrichment) are powered by Anthropic Claude.

> Note: `README.md` lists "Gorilla Mux" — that's stale. The backend uses Gin.

## Quick Start

### Prerequisites
- Go 1.21+
- Node.js 18+
- PostgreSQL running locally on port 5432
- For Swagger regen: `go install github.com/swaggo/swag/cmd/swag@latest`

### First-time setup

1. **Backend env:**
   ```bash
   cp backend/.env.example backend/.env
   # Set ANTHROPIC_API_KEY=sk-ant-...
   ```
   Get a key at https://console.anthropic.com/account/keys.

2. **Database:** edit `backend/configs/local.yaml` (host/port/user/password/database). Migrations run automatically on server start.

### Run

```bash
# Terminal 1
cd backend && go run cmd/server/main.go         # http://localhost:8080
                                                 # Swagger: /swagger/index.html

# Terminal 2
cd frontend && npm install && npm start          # http://localhost:3000
```

## Common Commands

### Backend (`cd backend`)
```bash
go run cmd/server/main.go          # run server
go test ./...                      # all tests
go test ./infrastructure/csv/...   # one package
go build -o bin/server cmd/server/main.go
swag init -g cmd/server/main.go    # regenerate Swagger after API changes
go fmt ./...
```

### Frontend (`cd frontend`)
```bash
npm start            # dev server (CRA)
npm run build        # prod build
npm test             # Jest watch mode
npm run lint
```

### Configuration

YAML in `backend/configs/`. Selected by `APP_ENV` (default `local`). Only secrets (e.g. `ANTHROPIC_API_KEY`) live in env vars; everything else is YAML. The `llm.api_key` field interpolates `${ANTHROPIC_API_KEY}` at load time.

## Backend Architecture

Clean Architecture, dependency inversion: Infrastructure → Usecases → Domain. DI is **manual** in `cmd/server/main.go` — there's no DI framework, so wiring up a new entity means editing `main.go`.

### Layer layout (non-obvious bits)

- `domain/entities/` — entities (including `bank_transaction.go`), value objects, and **domain errors live alongside their entity** (`ErrExpenseNotFound`, etc.). The vendor→category mapping is centralized in `vendor_category_mapping.go`.
- `usecases/interactors/` — split **per feature** (`category/`, `expense/`, `income/`, `tag/`, `vendors/`), not flat.
- `usecases/interfaces/` — `repositories/` (DB contracts) and `services/` (external service contracts).
- `infrastructure/` — beyond the obvious `http/`, `persistence/`, `logger/`, `config/`, also contains:
  - `llm/` — Anthropic client + **prompt files as `.txt`** (see "AI/LLM" below).
  - `csv/` — bank statement parsers (Haspa giro + credit card).
  - `migration/` — embedded migration runner.

### Request flow
```
Handler (HTTP)  →  Interactor (UseCase)  →  Repository interface
   ↕ DTO              ↕ Entity                    ↑
                                          Repo impl (Postgres)
```

DTOs are in `infrastructure/http/dto/`; never leak entities to HTTP. Entities are constructed via factory methods (`NewExpenseEntity(...)`).

## AI / LLM Integration

The backend uses Anthropic Claude for two features. **Prompts are plain-text files**, not string literals in Go — edit them directly:

- `backend/infrastructure/llm/expense_parser_prompt.txt` — powers `/api/v1/expenses/parse` (free-text → structured expense). Frontend entry point: `AIExpenseParser.tsx`.
- `backend/infrastructure/llm/bank_transaction_prompt.txt` — categorizes/enriches imported bank rows during the review step.

Model + `max_tokens` come from `llm:` in YAML config. The Anthropic client is `infrastructure/llm/anthropic_client.go`. Default model is currently `claude-haiku-4-5-20251001`.

## Bank Statement Import

Pipeline: upload CSV → parse → human review → commit as expenses.

- Parser: `infrastructure/csv/haspa_parser.go` (Haspa giro + Haspa credit). Adheres to `csv_parser_interface.go`. **Settlement rows** (`ABSCHLUSS`, `ENTGELTABSCHLUSS`) must be skipped — they're not transactions; this has bitten us before.
- HTTP: `infrastructure/http/handlers/bank_import_handler.go`.
- Frontend review flow: `BankImportScreen.tsx` → `BankTransactionReview.tsx` → `BankTransactionCard.tsx`. The review step calls the LLM to suggest categories before the user commits.

To add a new bank's parser: implement `csv_parser_interface.go`, register it in the bank import handler, and skip any non-transaction rows the bank emits (settlement, summary, opening balance).

## Database & Migrations

- Files: `backend/migrations/NNN_description.sql`, applied in order on startup, tracked in `schema_migrations`.
- **PostgreSQL enum gotcha:** `ALTER TYPE ... ADD VALUE` cannot run inside a transaction. The migration runner wraps each file in a transaction by default — for enum additions, look at migrations 014–017 for the pattern (split rename/add across files, sometimes use a `payment_method` enum like 019).
- Core tables: `expenses`, `income` (split off from `expenses` in 012/013), `categories`, `vendors`, `tags`, `expense_tags`.

### Vendor → Category mapping

Vendors carry a `type` enum that maps to a category name. Mapping lives in `domain/entities/vendor_category_mapping.go` and is returned in the API as `vendor.category`. Both the React `VendorSelector` and iOS `VendorPickerViewModel` filter the vendor list by the currently-selected category — keep this mapping in sync when adding vendor types.

## Frontend Architecture

- Single API client in `src/api/client.ts`.
- Cross-cutting state via Context: `contexts/PeriodContext.tsx` (global period selector consumed by Statistics/Dashboard/etc.) and `contexts/ThemeContext.tsx` (dark mode).
- Custom hooks in `src/hooks/`: `useApiRequest`, `useFormValidation`, `usePeriodDateRange`, `useToast`.
- Forms standardize on `useFormValidation` + `FormField.tsx`.
- `VendorSelector` accepts `selectedCategoryName` and filters vendors via the mapping above.

## iOS App

SwiftUI + MVVM in `ios/ExpensoApp/`. `APIService.swift` mirrors `client.ts`; vendor filtering by category lives in `VendorPickerViewModel` inside `AddTransactionViewModel.swift`.

## Logging

Structured logger in `infrastructure/logger/`:
```go
logger.Info("message", logger.Fields{"key": "value"})
logger.Error("failure", logger.Fields{"error": err.Error()})
```

## Git Workflow

Feature-branch only — **never commit to `main`**. Full rules in `.claude/rules.md`. Branch names: `feature/<desc>` or `fix/<desc>`.

## API

Swagger UI: `http://localhost:8080/swagger/index.html`. Base path `/api/v1`. Regenerate with `swag init -g cmd/server/main.go` after changing handler annotations.
