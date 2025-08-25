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
	expenseInteractor *expense.ExpenseInteractor
}

func NewExpenseHandler(expenseInteractor *expense.ExpenseInteractor) *ExpenseHandler {
	return &ExpenseHandler{
		expenseInteractor: expenseInteractor,
	}
}

// GetExpenses godoc
// @Summary Get all expenses
// @Description Get a list of all expenses with optional date range filtering
// @Tags expenses
// @Accept json
// @Produce json
// @Param start_date query string false "Start date (YYYY-MM-DD)"
// @Param end_date query string false "End date (YYYY-MM-DD)"
// @Success 200 {array} dto.ExpenseResponseDTO
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /expenses [get]
func (h *ExpenseHandler) GetExpenses(c *gin.Context) {
	// Parse optional date range parameters
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	var startDate, endDate *time.Time

	// Parse start date if provided
	if startDateStr != "" {
		parsed, err := time.Parse("2006-01-02", startDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format (use YYYY-MM-DD)"})
			return
		}
		startDate = &parsed
	}

	// Parse end date if provided
	if endDateStr != "" {
		parsed, err := time.Parse("2006-01-02", endDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format (use YYYY-MM-DD)"})
			return
		}
		endDate = &parsed
	}

	var expenses []*entities.Expense
	var err error

	// Execute appropriate use case based on parameters
	if startDate != nil || endDate != nil {
		expenses, err = h.expenseInteractor.GetExpensesByDateRange(startDate, endDate)
	} else {
		expenses, err = h.expenseInteractor.GetExpenses()
	}

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

// GetExpense godoc
// @Summary Get an expense by ID
// @Description Get a single expense by its ID
// @Tags expenses
// @Accept json
// @Produce json
// @Param id path int true "Expense ID"
// @Success 200 {object} dto.ExpenseResponseDTO
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /expenses/{id} [get]
func (h *ExpenseHandler) GetExpense(c *gin.Context) {
	// Parse path parameter
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
		return
	}

	// Execute use case
	exp, err := h.expenseInteractor.GetExpense(entities.ExpenseID(id))
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

// CreateExpense godoc
// @Summary Create a new expense
// @Description Create a new expense with the provided data
// @Tags expenses
// @Accept json
// @Produce json
// @Param expense body dto.CreateExpenseRequestDTO true "Expense data"
// @Success 201 {object} dto.ExpenseResponseDTO
// @Failure 400 {object} map[string]string
// @Router /expenses [post]
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
		Amount:     requestDTO.Amount,
		Date:       date,
		Type:       requestDTO.Type,
		Category:   requestDTO.Category,
		Comment:    requestDTO.Comment,
		PaidByCard: requestDTO.PaidByCard, // Will be nil if not provided, defaults to true
	}

	if requestDTO.VendorID != nil {
		vendorID := entities.VendorID(*requestDTO.VendorID)
		cmd.VendorID = &vendorID
	}

	// Execute use case
	exp, err := h.expenseInteractor.CreateExpense(cmd)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert domain entity to DTO
	responseDTO := h.expenseToDTO(exp)

	c.JSON(http.StatusCreated, responseDTO)
}

// UpdateExpense godoc
// @Summary Update an expense
// @Description Update an existing expense by ID
// @Tags expenses
// @Accept json
// @Produce json
// @Param id path int true "Expense ID"
// @Param expense body dto.UpdateExpenseRequestDTO true "Updated expense data"
// @Success 200 {object} dto.ExpenseResponseDTO
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /expenses/{id} [put]
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
	exp, err := h.expenseInteractor.UpdateExpense(cmd)
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

// DeleteExpense godoc
// @Summary Delete an expense
// @Description Delete an expense by ID
// @Tags expenses
// @Accept json
// @Produce json
// @Param id path int true "Expense ID"
// @Success 204
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /expenses/{id} [delete]
func (h *ExpenseHandler) DeleteExpense(c *gin.Context) {
	// Parse path parameter
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
		return
	}

	// Execute use case
	err = h.expenseInteractor.DeleteExpense(entities.ExpenseID(id))
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
		ID:         int(exp.ID()),
		Amount:     exp.Amount().Amount(),
		Date:       exp.Date().Format("2006-01-02"),
		Type:       string(exp.Type()),
		Category:   exp.Category().String(),
		Comment:    exp.Comment(),
		PaidByCard: exp.PaidByCard(),
		CreatedAt:  exp.CreatedAt(),
		UpdatedAt:  exp.UpdatedAt(),
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
