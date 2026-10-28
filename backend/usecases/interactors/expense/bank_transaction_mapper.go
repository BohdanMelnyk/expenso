package expense

import (
	"encoding/json"
	"fmt"
	"time"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/llm"
	"expenso-backend/infrastructure/logger"
	"expenso-backend/usecases/interfaces/repositories"
)

// BankTransactionMapper handles mapping bank transactions to structured expense data using LLM
type BankTransactionMapper struct {
	llmClient     *llm.AnthropicClient
	vendorRepo    repositories.VendorRepository
	expenseParser *ExpenseParser
}

// NewBankTransactionMapper creates a new bank transaction mapper
func NewBankTransactionMapper(
	llmClient *llm.AnthropicClient,
	vendorRepo repositories.VendorRepository,
	expenseParser *ExpenseParser,
) *BankTransactionMapper {
	return &BankTransactionMapper{
		llmClient:     llmClient,
		vendorRepo:    vendorRepo,
		expenseParser: expenseParser,
	}
}

// MapToExpenseData converts a bank transaction to structured expense data
func (m *BankTransactionMapper) MapToExpenseData(transaction *entities.BankTransaction) (*ParsedExpenseData, error) {
	logger.Info("Starting bank transaction mapping", logger.Fields{
		"merchant":      transaction.TransactionDesc(),
		"amount":        transaction.BookingAmount(),
		"document_date": transaction.DocumentDate().Format("2006-01-02"),
		"booking_date":  transaction.BookingDate().Format("2006-01-02"),
	})

	// 1. Load current vendors and categories, then build LLM prompt
	catalog, err := m.expenseParser.loadCatalog()
	if err != nil {
		return nil, err
	}
	prompt, err := m.buildPrompt(transaction, catalog)
	if err != nil {
		return nil, err
	}

	// 2. Call LLM API
	response, err := m.llmClient.SendMessage(prompt)
	if err != nil {
		logger.Error("LLM API call failed", logger.Fields{
			"error":    err.Error(),
			"merchant": transaction.TransactionDesc(),
		})
		return nil, fmt.Errorf("LLM API call failed: %w", err)
	}

	// 3. Parse JSON response
	// Strip markdown code fence if present (e.g., ```json ... ```)
	cleanedResponse := stripMarkdownCodeFence(response)

	var parsed ParsedExpenseData
	if err := json.Unmarshal([]byte(cleanedResponse), &parsed); err != nil {
		logger.Error("Failed to parse LLM response", logger.Fields{
			"error":    err.Error(),
			"response": response,
			"merchant": transaction.TransactionDesc(),
		})
		return nil, fmt.Errorf("failed to parse LLM response: %w", err)
	}

	// 3.5. Store CSV row data for frontend display
	parsed.CardNumber = transaction.CardNumber()
	parsed.DocumentDate = transaction.DocumentDate().Format("2006-01-02")
	parsed.BookingDate = transaction.BookingDate().Format("2006-01-02")
	parsed.OriginalAmount = transaction.OriginalAmount()
	parsed.OriginalCurrency = transaction.OriginalCurrency()
	parsed.ExchangeRate = transaction.ExchangeRate()
	parsed.BookingAmount = transaction.BookingAmount()
	parsed.BookingCurrency = transaction.BookingCurrency()
	parsed.TransactionDesc = transaction.TransactionDesc()
	parsed.Location = transaction.TransactionDescExtra()
	parsed.BookingReference = transaction.BookingReference()

	// 4. Validate parsed data
	if err := m.validateBankParsedData(&parsed, transaction); err != nil {
		logger.Error("Bank transaction validation failed", logger.Fields{
			"error":    err.Error(),
			"merchant": transaction.TransactionDesc(),
		})
		return nil, err
	}

	// 5. Resolve vendor and take the category from it
	m.expenseParser.resolveVendor(&parsed, catalog)

	// 6. Payment method is always bank credit card for bank imports
	parsed.PaymentMethod = "b_haspa_credit"

	logger.Info("Bank transaction mapping completed successfully", logger.Fields{
		"amount":           parsed.Amount,
		"category":         parsed.Category,
		"vendor_name":      parsed.VendorName,
		"matched_vendor":   parsed.MatchedVendorName,
		"confidence_score": parsed.ConfidenceScore,
	})

	return &parsed, nil
}

// buildPrompt creates the LLM prompt for bank transaction mapping from the embedded template
func (m *BankTransactionMapper) buildPrompt(transaction *entities.BankTransaction, catalog *vendorCatalog) (string, error) {
	// Determine transaction type
	transactionType := "expense"
	if transaction.IsIncome() {
		transactionType = "income"
	}

	type PromptData struct {
		TransactionDesc      string
		TransactionDescExtra string
		TransactionDate      string
		AbsoluteAmount       float64
		Currency             string
		TransactionType      string
		OriginalAmount       float64
		OriginalCurrency     string
		ExchangeRate         float64
		BookingAmount        float64
		TodayDate            string
		Vendors              []promptVendor
		Categories           []string
	}

	return renderPrompt("bank_transaction", llm.BankTransactionPrompt, PromptData{
		TransactionDesc:      transaction.TransactionDesc(),
		TransactionDescExtra: transaction.TransactionDescExtra(),
		TransactionDate:      transaction.DocumentDate().Format("2006-01-02"),
		AbsoluteAmount:       transaction.AbsoluteAmount(),
		Currency:             transaction.BookingCurrency(),
		TransactionType:      transactionType,
		OriginalAmount:       transaction.OriginalAmount(),
		OriginalCurrency:     transaction.OriginalCurrency(),
		ExchangeRate:         transaction.ExchangeRate(),
		BookingAmount:        transaction.BookingAmount(),
		TodayDate:            time.Now().Format("2006-01-02"),
		Vendors:              catalog.Vendors,
		Categories:           catalog.Categories,
	})
}

// validateBankParsedData validates and normalizes parsed expense data from bank transaction
func (m *BankTransactionMapper) validateBankParsedData(data *ParsedExpenseData, transaction *entities.BankTransaction) error {
	// Ensure amount matches transaction amount
	if data.Amount != transaction.AbsoluteAmount() {
		logger.Warn("Amount mismatch, correcting to transaction amount", logger.Fields{
			"parsed_amount":      data.Amount,
			"transaction_amount": transaction.AbsoluteAmount(),
		})
		data.Amount = transaction.AbsoluteAmount()
	}

	// Validate amount is positive
	if data.Amount <= 0 {
		return fmt.Errorf("amount must be positive and non-zero")
	}

	// Ensure currency matches
	if data.Currency == "" || data.Currency != transaction.BookingCurrency() {
		data.Currency = transaction.BookingCurrency()
	}

	// Validate/correct date - use Document Date (Belegdatum) instead of Booking Date
	transactionDateStr := transaction.DocumentDate().Format("2006-01-02")
	if data.Date != transactionDateStr {
		logger.Warn("Date mismatch, correcting to transaction document date", logger.Fields{
			"parsed_date":   data.Date,
			"document_date": transactionDateStr,
		})
		data.Date = transactionDateStr
	}

	if _, err := time.Parse("2006-01-02", data.Date); err != nil {
		data.Date = transactionDateStr
	}

	// Extract vendor name from transaction if LLM didn't provide it
	if data.VendorName == "" && transaction.TransactionDesc() != "" {
		data.VendorName = transaction.TransactionDesc()
	}

	// If confidence score is not set or invalid, set a reasonable default
	if data.ConfidenceScore < 0 || data.ConfidenceScore > 1 {
		data.ConfidenceScore = 0.6 // Default medium confidence
	}

	return nil
}
