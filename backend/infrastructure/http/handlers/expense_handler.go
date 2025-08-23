package handlers

import (
	"net/http"
	"strconv"
	"time"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/http/dto"
	"expenso-backend/usecases/interactors/expense"

	"github.com/gin-gonic/gin"
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

func (h *ExpenseHandler) GetExpenses(c *gin.Context) {
	// Execute use case
	expenses, err := h.getExpensesUseCase.Execute()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch expenses"})
		return
	}

	// Convert domain entities to DTOs
	responseDTO := make([]dto.ExpenseResponseDTO, len(expenses))
	for i, exp := range expenses {
		responseDTO[i] = h.expenseToDTO(exp)
	}

	c.JSON(http.StatusOK, responseDTO)
}

func (h *ExpenseHandler) GetExpense(c *gin.Context) {
	// Parse path parameter
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
		return
	}

	// Execute use case
	exp, err := h.getExpenseUseCase.Execute(entities.ExpenseID(id))
	if err != nil {
		if err == entities.ErrExpenseNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch expense"})
		}
		return
	}

	// Convert domain entity to DTO
	responseDTO := h.expenseToDTO(exp)

	c.JSON(http.StatusOK, responseDTO)
}

func (h *ExpenseHandler) CreateExpense(c *gin.Context) {
	// Syntactic validation - decode JSON
	var requestDTO dto.CreateExpenseRequestDTO
	if err := c.ShouldBindJSON(&requestDTO); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Parse date
	date, err := time.Parse("2006-01-02", requestDTO.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format (use YYYY-MM-DD)"})
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert domain entity to DTO
	responseDTO := h.expenseToDTO(exp)

	c.JSON(http.StatusCreated, responseDTO)
}

func (h *ExpenseHandler) UpdateExpense(c *gin.Context) {
	// Parse path parameter
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
		return
	}

	// Syntactic validation - decode JSON
	var requestDTO dto.UpdateExpenseRequestDTO
	if err := c.ShouldBindJSON(&requestDTO); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
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
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format (use YYYY-MM-DD)"})
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
			c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	// Convert domain entity to DTO
	responseDTO := h.expenseToDTO(exp)

	c.JSON(http.StatusOK, responseDTO)
}

func (h *ExpenseHandler) DeleteExpense(c *gin.Context) {
	// Parse path parameter
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
		return
	}

	// Execute use case
	err = h.deleteExpenseUseCase.Execute(entities.ExpenseID(id))
	if err != nil {
		if err == entities.ErrExpenseNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete expense"})
		}
		return
	}

	c.Status(http.StatusNoContent)
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