package handlers

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"
	"strings"
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
		AddedBy:    requestDTO.AddedBy,    // Will be nil if not provided, defaults to "he"
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

	if requestDTO.AddedBy != nil {
		cmd.AddedBy = requestDTO.AddedBy
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
		AddedBy:    exp.AddedBy().String(),
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

// ExportExpensesCSV godoc
// @Summary Export expenses as CSV
// @Description Export expenses filtered by card payment and "he" as CSV with vendor type columns
// @Tags expenses
// @Accept json
// @Produce text/csv
// @Param start_date query string false "Start date (YYYY-MM-DD)"
// @Param end_date query string false "End date (YYYY-MM-DD)"
// @Success 200 {string} string "CSV file"
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /expenses/export/csv [get]
func (h *ExpenseHandler) ExportExpensesCSV(c *gin.Context) {
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

	// Filter expenses: only card payments by "he"
	var filteredExpenses []*entities.Expense
	for _, expense := range expenses {
		if expense.PaidByCard() && expense.AddedBy().String() == "he" {
			filteredExpenses = append(filteredExpenses, expense)
		}
	}

	// Group expenses by date and vendor type
	dateExpenseMap := make(map[string]map[string]float64)

	for _, expense := range filteredExpenses {
		// Format date in Central European Time
		loc, _ := time.LoadLocation("Europe/Berlin")
		dateInCET := expense.Date().In(loc)
		dateKey := dateInCET.Format("Mon Jan 02 2006 15:04:05") + " GMT+0100 (Central European Standard Time)"

		if dateExpenseMap[dateKey] == nil {
			dateExpenseMap[dateKey] = make(map[string]float64)
		}

		// Map vendor types to CSV column names
		var columnName string
		if expense.Vendor() != nil {
			switch expense.Vendor().Type() {
			case "food_store":
				columnName = "food"
			case "eating_out":
				columnName = "eating out"
			case "else":
				columnName = "else"
			case "subscriptions":
				columnName = "fees"
			case "household":
				columnName = "household"
			case "transport":
				columnName = "car"
			case "clothing":
				columnName = "clothing"
			case "living":
				columnName = "living"
			case "tourism":
				columnName = "turismo"
			default:
				columnName = "else" // Default fallback
			}
		} else {
			columnName = "else" // Default for expenses without vendor
		}

		dateExpenseMap[dateKey][columnName] += expense.Amount().Amount()
	}

	// Set response headers for CSV download
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", "attachment; filename=expenses_export.csv")

	// Create CSV writer
	writer := csv.NewWriter(c.Writer)
	defer writer.Flush()

	// Write CSV header
	header := []string{
		"date", "food", "eating out", "else", "fees", "household",
		"car", "clothing", "living", "transport", "turismo",
	}
	if err := writer.Write(header); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write CSV header"})
		return
	}

	// Write CSV data
	for dateKey, expensesByType := range dateExpenseMap {
		row := []string{
			dateKey,
			fmt.Sprintf("%.2f", expensesByType["food"]),
			fmt.Sprintf("%.2f", expensesByType["eating out"]),
			fmt.Sprintf("%.2f", expensesByType["else"]),
			fmt.Sprintf("%.2f", expensesByType["fees"]),
			fmt.Sprintf("%.2f", expensesByType["household"]),
			fmt.Sprintf("%.2f", expensesByType["car"]),
			fmt.Sprintf("%.2f", expensesByType["clothing"]),
			fmt.Sprintf("%.2f", expensesByType["living"]),
			fmt.Sprintf("%.2f", expensesByType["transport"]),
			fmt.Sprintf("%.2f", expensesByType["turismo"]),
		}

		if err := writer.Write(row); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to write CSV row"})
			return
		}
	}

	c.Status(http.StatusOK)
}

// ImportExpensesCSVPreview godoc
// @Summary Preview CSV import
// @Description Parse and preview CSV data for import validation
// @Tags expenses
// @Accept json
// @Produce json
// @Param csv_data body dto.CSVImportRequestDTO true "CSV data to preview"
// @Success 200 {object} dto.CSVImportPreviewDTO
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /expenses/import/csv/preview [post]
func (h *ExpenseHandler) ImportExpensesCSVPreview(c *gin.Context) {
	var requestDTO dto.CSVImportRequestDTO
	if err := c.ShouldBindJSON(&requestDTO); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Parse CSV data
	reader := csv.NewReader(strings.NewReader(requestDTO.CSVData))
	records, err := reader.ReadAll()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse CSV: " + err.Error()})
		return
	}

	if len(records) < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "CSV must have at least a header row"})
		return
	}

	// Expected headers
	expectedHeaders := []string{"date", "food", "eating out", "else", "fees", "household", "car", "clothing", "living", "transport", "turismo"}
	headers := records[0]

	// Validate headers
	if len(headers) != len(expectedHeaders) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "CSV must have exactly 11 columns: date, food, eating out, else, fees, household, car, clothing, living, transport, turismo"})
		return
	}

	// Map column names to vendor types
	columnToVendorType := map[string]string{
		"food":       "food_store",
		"eating out": "eating_out",
		"else":       "else",
		"fees":       "subscriptions",
		"household":  "household",
		"car":        "transport",
		"clothing":   "clothing",
		"living":     "living",
		"transport":  "transport",
		"turismo":    "tourism",
	}

	var previewRows []dto.CSVRowPreviewDTO

	// Process data rows
	for rowIdx, record := range records[1:] {
		rowNumber := rowIdx + 2 // +2 because we skip header and arrays are 0-indexed

		if len(record) != len(headers) {
			previewRows = append(previewRows, dto.CSVRowPreviewDTO{
				RowNumber: rowNumber,
				Issues:    []string{"Row has wrong number of columns"},
			})
			continue
		}

		var issues []string
		var parsedExpenses []dto.ParsedExpenseDTO
		expenses := make(map[string]float64)

		// Parse date
		dateStr := record[0]
		parsedDate, dateErr := h.parseCSVDate(dateStr)
		if dateErr != nil {
			issues = append(issues, "Invalid date format: "+dateErr.Error())
		}

		// Parse amounts for each vendor type
		for i := 1; i < len(record); i++ {
			columnName := headers[i]
			amountStr := strings.TrimSpace(record[i])

			if amountStr == "" || amountStr == "0" || amountStr == "0.00" {
				expenses[columnName] = 0.0
				continue
			}

			amount, err := strconv.ParseFloat(amountStr, 64)
			if err != nil {
				issues = append(issues, fmt.Sprintf("Invalid amount for %s: %s", columnName, amountStr))
				continue
			}

			if amount > 0 {
				expenses[columnName] = amount

				// Create parsed expense
				vendorType := columnToVendorType[columnName]
				parsedExpense := dto.ParsedExpenseDTO{
					Comment:    fmt.Sprintf("Imported %s expense", columnName),
					Amount:     amount,
					Date:       parsedDate,
					VendorType: vendorType,
					Category:   h.getDefaultCategoryForVendorType(vendorType),
				}

				// Check for potential issues
				if parsedExpense.Category == "" {
					parsedExpense.Issues = append(parsedExpense.Issues, "No default category found for vendor type")
				}

				parsedExpenses = append(parsedExpenses, parsedExpense)
			}
		}

		previewRows = append(previewRows, dto.CSVRowPreviewDTO{
			RowNumber: rowNumber,
			Date:      dateStr,
			Expenses:  expenses,
			Issues:    issues,
			Parsed:    parsedExpenses,
		})
	}

	response := dto.CSVImportPreviewDTO{
		Rows: previewRows,
	}

	c.JSON(http.StatusOK, response)
}

// ImportExpensesCSVConfirm godoc
// @Summary Confirm and import CSV row
// @Description Confirm and create expenses from a CSV row
// @Tags expenses
// @Accept json
// @Produce json
// @Param import_data body dto.CSVImportConfirmRequestDTO true "Expenses to import"
// @Success 201 {array} dto.ExpenseResponseDTO
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /expenses/import/csv/confirm [post]
func (h *ExpenseHandler) ImportExpensesCSVConfirm(c *gin.Context) {
	var requestDTO dto.CSVImportConfirmRequestDTO
	if err := c.ShouldBindJSON(&requestDTO); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	var createdExpenses []dto.ExpenseResponseDTO

	for _, expenseRequest := range requestDTO.Expenses {
		// Set defaults for imported expenses
		if expenseRequest.PaidByCard == nil {
			paidByCard := true
			expenseRequest.PaidByCard = &paidByCard
		}
		if expenseRequest.AddedBy == nil {
			addedBy := "he"
			expenseRequest.AddedBy = &addedBy
		}
		if expenseRequest.Type == "" {
			expenseRequest.Type = "expense"
		}

		// Parse date
		date, err := time.Parse("2006-01-02", expenseRequest.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid date format: %s", expenseRequest.Date)})
			return
		}

		// For CSV imports, use the expense date as both created and updated timestamps
		// This ensures the expense appears to have been created when it actually happened
		expenseDateTime := time.Date(date.Year(), date.Month(), date.Day(), 12, 0, 0, 0, time.UTC)

		// Convert to use case command for CSV import
		cmd := expense.CreateExpenseFromCSVCommand{
			Amount:     expenseRequest.Amount,
			Date:       date,
			Type:       expenseRequest.Type,
			Category:   expenseRequest.Category,
			Comment:    expenseRequest.Comment,
			PaidByCard: expenseRequest.PaidByCard,
			AddedBy:    expenseRequest.AddedBy,
			CreatedAt:  expenseDateTime,
			UpdatedAt:  expenseDateTime,
		}

		if expenseRequest.VendorID != nil {
			vendorID := entities.VendorID(*expenseRequest.VendorID)
			cmd.VendorID = &vendorID
		}

		// Create expense from CSV
		exp, err := h.expenseInteractor.CreateExpenseFromCSV(cmd)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Convert to DTO
		responseDTO := h.expenseToDTO(exp)
		createdExpenses = append(createdExpenses, responseDTO)
	}

	c.JSON(http.StatusCreated, createdExpenses)
}

// Helper functions for CSV import
func (h *ExpenseHandler) parseCSVDate(dateStr string) (string, error) {
	// Expected format: "01/01/2025" (MM/DD/YYYY)
	// Try to parse different formats
	layouts := []string{
		"01/02/2006", // MM/DD/YYYY (primary expected format)
		"02/01/2006", // DD/MM/YYYY (alternative)
		"2006-01-02", // YYYY-MM-DD
		"Mon Jan 02 2006 15:04:05 GMT-0700 (Central European Standard Time)",
		"Mon Jan 02 2006 15:04:05 GMT+0100 (Central European Standard Time)",
		"02.01.2006", // DD.MM.YYYY
	}

	var parsedTime time.Time
	var err error

	for _, layout := range layouts {
		parsedTime, err = time.Parse(layout, strings.TrimSpace(dateStr))
		if err == nil {
			break
		}
	}

	if err != nil {
		return "", fmt.Errorf("unable to parse date: %s", dateStr)
	}

	// Return in YYYY-MM-DD format
	return parsedTime.Format("2006-01-02"), nil
}

func (h *ExpenseHandler) getDefaultCategoryForVendorType(vendorType string) string {
	// Map vendor types to default categories - this should probably come from a service
	categoryMap := map[string]string{
		"food_store":    "Food & Groceries",
		"eating_out":    "Food & Groceries",
		"else":          "Other",
		"subscriptions": "Bills & Utilities",
		"household":     "Home & Garden",
		"transport":     "Transportation",
		"clothing":      "Shopping",
		"living":        "Home & Garden",
		"tourism":       "Entertainment",
	}
	return categoryMap[vendorType]
}
