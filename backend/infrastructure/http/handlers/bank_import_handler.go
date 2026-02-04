package handlers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/http/dto"
	"expenso-backend/infrastructure/logger"
	"expenso-backend/usecases/interactors/expense"
)

// BankImportHandler handles bank statement CSV import operations
type BankImportHandler struct {
	expenseInteractor *expense.ExpenseInteractor
}

// NewBankImportHandler creates a new bank import handler
func NewBankImportHandler(expenseInteractor *expense.ExpenseInteractor) *BankImportHandler {
	return &BankImportHandler{
		expenseInteractor: expenseInteractor,
	}
}

// UploadBankCSV godoc
// @Summary Upload and preview bank CSV file
// @Description Upload a bank statement CSV file, parse transactions, and return preview with LLM suggestions
// @Tags bank_import
// @Accept multipart/form-data
// @Produce json
// @Param file formData file true "CSV file to upload"
// @Param format formData string true "CSV format (e.g., 'haspa_credit')"
// @Success 200 {object} dto.BankImportPreviewResponse
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /expenses/import/bank/preview [post]
func (h *BankImportHandler) UploadBankCSV(c *gin.Context) {
	// Get file header from multipart form
	header, err := c.FormFile("file")
	if err != nil {
		logger.Error("Failed to get file from request", logger.Fields{
			"error": err.Error(),
		})
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}

	// Open the uploaded file
	file, err := header.Open()
	if err != nil {
		logger.Error("Failed to open uploaded file", logger.Fields{
			"error": err.Error(),
		})
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read file"})
		return
	}
	defer file.Close()

	// Get format parameter
	format := c.PostForm("format")
	if format == "" {
		format = "haspa_credit" // Default to Haspa credit
	}

	logger.Info("Bank CSV upload started", logger.Fields{
		"filename":  header.Filename,
		"format":    format,
		"file_size": header.Size,
	})

	// Parse CSV and get transactions
	parsedExpenses, err := h.expenseInteractor.ParseBankCSV(format, file)
	if err != nil {
		logger.Error("Failed to parse bank CSV", logger.Fields{
			"error":    err.Error(),
			"format":   format,
			"filename": header.Filename,
		})
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Failed to parse CSV: %s", err.Error())})
		return
	}

	// Convert ParsedExpenseData to DTOs
	transactions := make([]dto.BankTransactionDTO, len(parsedExpenses))
	for i, parsed := range parsedExpenses {
		txDTO := dto.BankTransactionDTO{
			RawData: map[string]string{
				"merchant": parsed.VendorName,
				"location": "",
			},
			ParsedExpense: dto.ParsedExpenseResponseDTO{
				Amount:            parsed.Amount,
				Currency:          parsed.Currency,
				Category:          parsed.Category,
				VendorName:        parsed.VendorName,
				VendorType:        parsed.VendorType,
				VendorTypeID:      parsed.VendorTypeID,
				Date:              parsed.Date,
				PaymentMethod:     parsed.PaymentMethod,
				AddedBy:           parsed.AddedBy,
				Description:       parsed.Description,
				ConfidenceScore:   parsed.ConfidenceScore,
				MatchedVendorID:   parsed.MatchedVendorID,
				MatchedVendorName: parsed.MatchedVendorName,
			},
			OriginalAmount:   parsed.Amount, // Simplified for now - could store original amount if available
			OriginalCurrency: parsed.Currency,
			BookingAmount:    parsed.Amount,
			BookingCurrency:  parsed.Currency,
			TransactionDate:  parsed.Date,
			Merchant:         parsed.VendorName,
			Location:         "",
			ConfidenceScore:  parsed.ConfidenceScore,
			BookingReference: "",
		}
		transactions[i] = txDTO
	}

	response := dto.BankImportPreviewResponse{
		Transactions: transactions,
		TotalCount:   len(transactions),
		Format:       format,
	}

	logger.Info("Bank CSV upload completed successfully", logger.Fields{
		"transaction_count": len(transactions),
		"format":            format,
	})

	c.JSON(http.StatusOK, response)
}

// CreateExpenseFromBank godoc
// @Summary Create expense from bank transaction
// @Description Confirm and create an expense from a reviewed bank transaction
// @Tags bank_import
// @Accept json
// @Produce json
// @Param request body dto.CreateExpenseFromBankRequest true "Transaction and expense data"
// @Success 201 {object} dto.ExpenseResponseDTO
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /expenses/import/bank/confirm [post]
func (h *BankImportHandler) CreateExpenseFromBank(c *gin.Context) {
	var request dto.CreateExpenseFromBankRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		logger.Error("Failed to bind request", logger.Fields{
			"error": err.Error(),
		})
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid request: %s", err.Error())})
		return
	}

	logger.Info("Creating expense from bank transaction", logger.Fields{
		"merchant": request.TransactionData.Merchant,
		"amount":   request.TransactionData.BookingAmount,
		"date":     request.TransactionData.TransactionDate,
	})

	// Parse the transaction date
	transactionDate, err := time.Parse("2006-01-02", request.TransactionData.TransactionDate)
	if err != nil {
		logger.Error("Invalid transaction date", logger.Fields{
			"error": err.Error(),
			"date":  request.TransactionData.TransactionDate,
		})
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid transaction date: %s", err.Error())})
		return
	}

	// Create command from request DTO
	cmd := expense.CreateExpenseFromCSVCommand{
		Amount:        request.ExpenseData.Amount,
		Date:          transactionDate,
		Type:          request.ExpenseData.Type,
		Category:      request.ExpenseData.Category,
		Comment:       request.ExpenseData.Comment,
		PaymentMethod: nil, // Use default from expense entity
		AddedBy:       request.ExpenseData.AddedBy,
		TagIDs:        convertIntSliceToTagIDs(request.ExpenseData.TagIDs),
		CreatedAt:     transactionDate, // Use transaction date as created date
		UpdatedAt:     time.Now(),      // Current time as updated date
	}

	// Handle VendorID if provided
	if request.ExpenseData.VendorID != nil {
		vendorID := entities.VendorID(*request.ExpenseData.VendorID)
		cmd.VendorID = &vendorID
	}

	// Handle PaymentMethod if provided
	if request.ExpenseData.PaymentMethod != nil {
		paymentMethod := entities.PaymentMethod(*request.ExpenseData.PaymentMethod)
		cmd.PaymentMethod = &paymentMethod
	}

	// Create the expense
	createdExpense, err := h.expenseInteractor.CreateExpenseFromCSV(cmd)
	if err != nil {
		logger.Error("Failed to create expense from bank transaction", logger.Fields{
			"error":    err.Error(),
			"merchant": request.TransactionData.Merchant,
		})
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to create expense: %s", err.Error())})
		return
	}

	// Convert to response DTO
	responseDTO := convertExpenseToDTO(createdExpense)

	logger.Info("Expense created from bank transaction successfully", logger.Fields{
		"expense_id": createdExpense.ID(),
		"amount":     createdExpense.Amount().Amount(),
		"merchant":   request.TransactionData.Merchant,
	})

	c.JSON(http.StatusCreated, responseDTO)
}

// Helper functions

// convertIntSliceToTagIDs converts a slice of ints to TagIDs
func convertIntSliceToTagIDs(intSlice []int) []entities.TagID {
	tagIDs := make([]entities.TagID, len(intSlice))
	for i, v := range intSlice {
		tagIDs[i] = entities.TagID(v)
	}
	return tagIDs
}

// convertExpenseToDTO converts an expense entity to a response DTO
func convertExpenseToDTO(exp *entities.Expense) dto.ExpenseResponseDTO {
	responseDTO := dto.ExpenseResponseDTO{
		ID:            int(exp.ID()),
		Amount:        exp.Amount().Amount(),
		Date:          exp.Date().Format("2006-01-02"),
		Type:          string(exp.Type()),
		Category:      string(exp.Category()),
		Comment:       exp.Comment(),
		PaymentMethod: string(exp.PaymentMethod()),
		AddedBy:       string(exp.AddedBy()),
		CreatedAt:     exp.CreatedAt(),
		UpdatedAt:     exp.UpdatedAt(),
	}

	// Add vendor if assigned
	if exp.Vendor() != nil {
		vendor := exp.Vendor()
		responseDTO.Vendor = &dto.VendorResponseDTO{
			ID:   int(vendor.ID()),
			Name: vendor.Name(),
			Type: string(vendor.Type()),
		}
	}

	return responseDTO
}
