package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"expenso-backend/internal/database"
	"expenso-backend/internal/models"

	"github.com/gorilla/mux"
)

type ExpenseHandler struct {
	db *database.DB
}

func NewExpenseHandler(db *database.DB) *ExpenseHandler {
	return &ExpenseHandler{db: db}
}

func (h *ExpenseHandler) GetExpenses(w http.ResponseWriter, r *http.Request) {
	query := `
		SELECT id, amount, date, type, category, comment, created_at, updated_at
		FROM expenses
		ORDER BY date DESC
	`
	
	rows, err := h.db.Query(query)
	if err != nil {
		http.Error(w, "Failed to fetch expenses", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var expenses []models.Expense
	for rows.Next() {
		var expense models.Expense
		err := rows.Scan(
			&expense.ID, &expense.Amount, &expense.Date, &expense.Type,
			&expense.Category, &expense.Comment, &expense.CreatedAt, &expense.UpdatedAt,
		)
		if err != nil {
			http.Error(w, "Failed to scan expense", http.StatusInternalServerError)
			return
		}
		expenses = append(expenses, expense)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(expenses)
}

func (h *ExpenseHandler) GetExpense(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid expense ID", http.StatusBadRequest)
		return
	}

	query := `
		SELECT id, amount, date, type, category, comment, created_at, updated_at
		FROM expenses WHERE id = $1
	`
	
	var expense models.Expense
	err = h.db.QueryRow(query, id).Scan(
		&expense.ID, &expense.Amount, &expense.Date, &expense.Type,
		&expense.Category, &expense.Comment, &expense.CreatedAt, &expense.UpdatedAt,
	)
	if err != nil {
		http.Error(w, "Expense not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(expense)
}

func (h *ExpenseHandler) CreateExpense(w http.ResponseWriter, r *http.Request) {
	var req models.CreateExpenseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		http.Error(w, "Invalid date format", http.StatusBadRequest)
		return
	}

	query := `
		INSERT INTO expenses (amount, date, type, category, comment, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
		RETURNING id, created_at, updated_at
	`
	
	var expense models.Expense
	expense.Amount = req.Amount
	expense.Date = date
	expense.Type = req.Type
	expense.Category = req.Category
	expense.Comment = req.Comment

	err = h.db.QueryRow(query, req.Amount, date, req.Type, req.Category, req.Comment).Scan(
		&expense.ID, &expense.CreatedAt, &expense.UpdatedAt,
	)
	if err != nil {
		http.Error(w, "Failed to create expense", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(expense)
}

func (h *ExpenseHandler) UpdateExpense(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid expense ID", http.StatusBadRequest)
		return
	}

	var req models.UpdateExpenseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	query := `
		UPDATE expenses 
		SET amount = COALESCE($2, amount),
		    date = COALESCE($3, date),
		    type = COALESCE($4, type),
		    category = COALESCE($5, category),
		    comment = COALESCE($6, comment),
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, amount, date, type, category, comment, created_at, updated_at
	`
	
	var date *time.Time
	if req.Date != nil {
		parsedDate, err := time.Parse("2006-01-02", *req.Date)
		if err != nil {
			http.Error(w, "Invalid date format", http.StatusBadRequest)
			return
		}
		date = &parsedDate
	}

	var expense models.Expense
	err = h.db.QueryRow(query, id, req.Amount, date, req.Type, req.Category, req.Comment).Scan(
		&expense.ID, &expense.Amount, &expense.Date, &expense.Type,
		&expense.Category, &expense.Comment, &expense.CreatedAt, &expense.UpdatedAt,
	)
	if err != nil {
		http.Error(w, "Failed to update expense", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(expense)
}

func (h *ExpenseHandler) DeleteExpense(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid expense ID", http.StatusBadRequest)
		return
	}

	query := `DELETE FROM expenses WHERE id = $1`
	result, err := h.db.Exec(query, id)
	if err != nil {
		http.Error(w, "Failed to delete expense", http.StatusInternalServerError)
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil || rowsAffected == 0 {
		http.Error(w, "Expense not found", http.StatusNotFound)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}