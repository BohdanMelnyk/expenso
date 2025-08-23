package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/http/dto"
	"expenso-backend/usecases/interactors/expense"

	"github.com/gorilla/mux"
)

type ExpenseHandler struct {
	createExpenseUseCase *expense.CreateExpenseInteractor
	getExpensesUseCase   *expense.GetExpensesInteractor
	getExpenseUseCase    *expense.GetExpenseInteractor
	updateExpenseUseCase *expense.UpdateExpenseInteractor
	deleteExpenseUseCase *expense.DeleteExpenseInteractor
}

func NewExpenseHandler(
	createUC *expense.CreateExpenseInteractor,
	getExpensesUC *expense.GetExpensesInteractor,
	getExpenseUC *expense.GetExpenseInteractor,
	updateUC *expense.UpdateExpenseInteractor,
	deleteUC *expense.DeleteExpenseInteractor,
) *ExpenseHandler {
	return &ExpenseHandler{
		createExpenseUseCase: createUC,
		getExpensesUseCase:   getExpensesUC,
		getExpenseUseCase:    getExpenseUC,
		updateExpenseUseCase: updateUC,
		deleteExpenseUseCase: deleteUC,
	}
}

func (h *ExpenseHandler) GetExpenses(w http.ResponseWriter, r *http.Request) {
	// Execute use case
	expenses, err := h.getExpensesUseCase.Execute()
	if err != nil {
		http.Error(w, "Failed to fetch expenses", http.StatusInternalServerError)
		return
	}

	// Convert domain entities to DTOs
	responseDTO := make([]dto.ExpenseResponseDTO, len(expenses))
	for i, exp := range expenses {
		responseDTO[i] = h.expenseToDTO(exp)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(responseDTO)
}

func (h *ExpenseHandler) GetExpense(w http.ResponseWriter, r *http.Request) {
	// Parse path parameter
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid expense ID", http.StatusBadRequest)
		return
	}

	// Execute use case
	exp, err := h.getExpenseUseCase.Execute(entities.ExpenseID(id))
	if err != nil {
		if err == entities.ErrExpenseNotFound {
			http.Error(w, "Expense not found", http.StatusNotFound)
		} else {
			http.Error(w, "Failed to fetch expense", http.StatusInternalServerError)
		}
		return
	}

	// Convert domain entity to DTO
	responseDTO := h.expenseToDTO(exp)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(responseDTO)
}

func (h *ExpenseHandler) CreateExpense(w http.ResponseWriter, r *http.Request) {
	// Syntactic validation - decode JSON
	var requestDTO dto.CreateExpenseRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&requestDTO); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Parse date
	date, err := time.Parse("2006-01-02", requestDTO.Date)
	if err != nil {
		http.Error(w, "Invalid date format (use YYYY-MM-DD)", http.StatusBadRequest)
		return
	}

	// Convert DTO to use case command
	cmd := expense.CreateExpenseCommand{
		Amount:   requestDTO.Amount,
		Date:     date,
		Type:     requestDTO.Type,
		Category: requestDTO.Category,
		Comment:  requestDTO.Comment,
	}

	if requestDTO.VendorID != nil {
		vendorID := entities.VendorID(*requestDTO.VendorID)
		cmd.VendorID = &vendorID
	}

	// Execute use case
	exp, err := h.createExpenseUseCase.Execute(cmd)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Convert domain entity to DTO
	responseDTO := h.expenseToDTO(exp)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(responseDTO)
}

func (h *ExpenseHandler) UpdateExpense(w http.ResponseWriter, r *http.Request) {
	// Parse path parameter
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid expense ID", http.StatusBadRequest)
		return
	}

	// Syntactic validation - decode JSON
	var requestDTO dto.UpdateExpenseRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&requestDTO); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Convert DTO to use case command
	cmd := expense.UpdateExpenseCommand{
		ID: entities.ExpenseID(id),
	}

	if requestDTO.Amount != nil {
		cmd.Amount = requestDTO.Amount
	}

	if requestDTO.Date != nil {
		date, err := time.Parse("2006-01-02", *requestDTO.Date)
		if err != nil {
			http.Error(w, "Invalid date format (use YYYY-MM-DD)", http.StatusBadRequest)
			return
		}
		cmd.Date = &date
	}

	if requestDTO.Category != nil {
		cmd.Category = requestDTO.Category
	}

	if requestDTO.Comment != nil {
		cmd.Comment = requestDTO.Comment
	}

	if requestDTO.VendorID != nil {
		vendorID := entities.VendorID(*requestDTO.VendorID)
		cmd.VendorID = &vendorID
	}

	// Execute use case
	exp, err := h.updateExpenseUseCase.Execute(cmd)
	if err != nil {
		if err == entities.ErrExpenseNotFound {
			http.Error(w, "Expense not found", http.StatusNotFound)
		} else {
			http.Error(w, err.Error(), http.StatusBadRequest)
		}
		return
	}

	// Convert domain entity to DTO
	responseDTO := h.expenseToDTO(exp)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(responseDTO)
}

func (h *ExpenseHandler) DeleteExpense(w http.ResponseWriter, r *http.Request) {
	// Parse path parameter
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		http.Error(w, "Invalid expense ID", http.StatusBadRequest)
		return
	}

	// Execute use case
	err = h.deleteExpenseUseCase.Execute(entities.ExpenseID(id))
	if err != nil {
		if err == entities.ErrExpenseNotFound {
			http.Error(w, "Expense not found", http.StatusNotFound)
		} else {
			http.Error(w, "Failed to delete expense", http.StatusInternalServerError)
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Helper method to convert domain entity to DTO
func (h *ExpenseHandler) expenseToDTO(exp *entities.Expense) dto.ExpenseResponseDTO {
	responseDTO := dto.ExpenseResponseDTO{
		ID:        int(exp.ID()),
		Amount:    exp.Amount().Amount(),
		Date:      exp.Date().Format("2006-01-02"),
		Type:      string(exp.Type()),
		Category:  exp.Category().String(),
		Comment:   exp.Comment(),
		CreatedAt: exp.CreatedAt(),
		UpdatedAt: exp.UpdatedAt(),
	}

	// Add vendor if present
	if exp.Vendor() != nil {
		responseDTO.Vendor = &dto.VendorResponseDTO{
			ID:        int(exp.Vendor().ID()),
			Name:      exp.Vendor().Name(),
			Type:      string(exp.Vendor().Type()),
			CreatedAt: exp.Vendor().CreatedAt(),
			UpdatedAt: exp.Vendor().UpdatedAt(),
		}
	}

	return responseDTO
}