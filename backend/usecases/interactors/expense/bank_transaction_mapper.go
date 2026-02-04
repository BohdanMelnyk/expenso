package expense

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"text/template"
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
		"merchant":     transaction.TransactionDesc(),
		"amount":       transaction.BookingAmount(),
		"booking_date": transaction.BookingDate().Format("2006-01-02"),
	})

	// 1. Build LLM prompt
	prompt := m.buildPrompt(transaction)

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
	var parsed ParsedExpenseData
	if err := json.Unmarshal([]byte(response), &parsed); err != nil {
		logger.Error("Failed to parse LLM response", logger.Fields{
			"error":    err.Error(),
			"response": response,
			"merchant": transaction.TransactionDesc(),
		})
		return nil, fmt.Errorf("failed to parse LLM response: %w", err)
	}

	// 4. Validate parsed data
	if err := m.validateBankParsedData(&parsed, transaction); err != nil {
		logger.Error("Bank transaction validation failed", logger.Fields{
			"error":    err.Error(),
			"merchant": transaction.TransactionDesc(),
		})
		return nil, err
	}

	// 5. Match vendor name to existing vendors
	if parsed.VendorName != "" {
		if err := m.expenseParser.matchVendor(&parsed); err != nil {
			logger.Warn("Vendor matching warning", logger.Fields{
				"error":       err.Error(),
				"vendor_name": parsed.VendorName,
			})
		}
	}

	// 6. Map vendor type to category ID for UI dropdown
	parsed.VendorTypeID = m.expenseParser.mapVendorTypeToID(parsed.VendorType)

	// 7. Payment method is always bank credit card for bank imports
	parsed.PaymentMethod = "b_haspa_credit"

	logger.Info("Bank transaction mapping completed successfully", logger.Fields{
		"amount":           parsed.Amount,
		"category":         parsed.Category,
		"vendor_name":      parsed.VendorName,
		"confidence_score": parsed.ConfidenceScore,
	})

	return &parsed, nil
}

// buildPrompt creates the LLM prompt for bank transaction mapping
func (m *BankTransactionMapper) buildPrompt(transaction *entities.BankTransaction) string {
	today := time.Now().Format("2006-01-02")

	// Load template file
	templateContent, err := ioutil.ReadFile("infrastructure/llm/bank_transaction_prompt.txt")
	if err != nil {
		logger.Error("Failed to load bank transaction prompt template", logger.Fields{
			"error": err.Error(),
		})
		// Fallback to inline template if file not found
		return m.fallbackPrompt(transaction, today)
	}

	// Parse template
	tmpl, err := template.New("bank_transaction").Parse(string(templateContent))
	if err != nil {
		logger.Error("Failed to parse bank transaction prompt template", logger.Fields{
			"error": err.Error(),
		})
		return m.fallbackPrompt(transaction, today)
	}

	// Determine transaction type
	transactionType := "expense"
	if transaction.IsIncome() {
		transactionType = "income"
	}

	// Execute template
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
		TodayDate            string
	}

	var result bytes.Buffer
	err = tmpl.Execute(&result, PromptData{
		TransactionDesc:      transaction.TransactionDesc(),
		TransactionDescExtra: transaction.TransactionDescExtra(),
		TransactionDate:      transaction.BookingDate().Format("2006-01-02"),
		AbsoluteAmount:       transaction.AbsoluteAmount(),
		Currency:             transaction.BookingCurrency(),
		TransactionType:      transactionType,
		OriginalAmount:       transaction.OriginalAmount(),
		OriginalCurrency:     transaction.OriginalCurrency(),
		ExchangeRate:         transaction.ExchangeRate(),
		TodayDate:            today,
	})
	if err != nil {
		logger.Error("Failed to execute bank transaction prompt template", logger.Fields{
			"error": err.Error(),
		})
		return m.fallbackPrompt(transaction, today)
	}

	return result.String()
}

// fallbackPrompt provides a fallback prompt in case template file cannot be loaded
func (m *BankTransactionMapper) fallbackPrompt(transaction *entities.BankTransaction, today string) string {
	transactionType := "expense"
	if transaction.IsIncome() {
		transactionType = "income"
	}

	exchangeRateStr := ""
	if transaction.OriginalAmount() != transaction.BookingAmount() {
		exchangeRateStr = fmt.Sprintf("\n- Original Amount: %.2f %s (Exchange Rate: %.4f)",
			transaction.OriginalAmount(),
			transaction.OriginalCurrency(),
			transaction.ExchangeRate())
	}

	return fmt.Sprintf(`You are a bank transaction expense categorizer. Extract structured expense information from a bank transaction.

Bank Transaction Details:
- Merchant: %s
- Location: %s
- Transaction Date: %s
- Amount: %.2f %s
- Type: %s (expense or income)%s

Today's date: %s

IMPORTANT: You MUST return ONLY valid JSON (no markdown, no code blocks, no explanations). Return a single JSON object:

{
  "amount": <number, REQUIRED, positive number, equals %.2f>,
  "currency": <"%s" or other currency>,
  "category": <one of: "Food Store", "Dining", "Dining with Friends", "Shopping", "Transportation", "Car", "Living", "Household", "Bills & Utilities", "Health & Fitness", "Travel", "Entertainment", "Education", "Gifts & Donations", "Other">,
  "vendor_name": <string, name of the store/merchant extracted from transaction>,
  "vendor_type": <string, type of vendor for category mapping>,
  "date": <"%s" in YYYY-MM-DD format>,
  "payment_method": <for bank import, this is: "b_haspa_credit">,
  "added_by": <"he" or "she", default "he">,
  "description": <brief description of the transaction, max 100 chars>,
  "confidence_score": <0.0 to 1.0, your confidence in the categorization>
}

Category Mapping Guidelines:
- Groceries, supermarket, REWE, EDEKA, LIDL, ALDI, market, shopping for food → "Food Store"
- Restaurant, cafe, coffee, eating out, lunch, dinner, McDonalds, Subway → "Dining"
- Dining with friends, party, social dining → "Dining with Friends"
- Stores, clothes, electronics, shopping, mall, H&M, Zara, DM, Rossmann → "Shopping"
- Taxi, train, bus, Uber, tram, metro, transport, Deutsche Bahn, DB → "Transportation"
- Gas, fuel, car maintenance, repair, Shell, Aral, Esso → "Car"
- Rent, utilities, internet, phone, electricity, water → "Living"
- Household items, cleaning, supplies, household goods → "Household"
- Subscriptions, phone bills, insurance, streaming services → "Bills & Utilities"
- Gym, doctor, pharmacy, healthcare, Apotheke → "Health & Fitness"
- Vacation, travel, hotel, flight, booking, airbnb → "Travel"
- Movies, games, hobbies, entertainment, cinema, Steam, Netflix → "Entertainment"
- Books, courses, training, university, school → "Education"

German Merchant Name Examples:
- REWE, EDEKA, LIDL, ALDI → Food Store
- Restaurants with city suffix (e.g., "RESTAURANT HAMBURG") → Dining
- DM, Rossmann, Müller → Shopping
- Shell, Aral, Esso, JET → Car fuel/gas
- Deutsche Telekom, Vodafone → Bills & Utilities
- Netflix, Spotify, Amazon Prime Video → Bills & Utilities

Vendor Type Mapping:
- Map vendor_name and location to one of: food_store, dining, dining_with_friends, shop, clothing, transport, car, living, household, subscriptions, care, entertainment, education, travel, else

Important Rules:
1. Return ONLY the JSON object, no other text
2. amount field MUST equal %.2f
3. date field MUST be "%s" in YYYY-MM-DD format
4. payment_method MUST be "b_haspa_credit" for bank imports
5. description should be brief (max 100 characters)
6. confidence_score ranges from 0.0 (very uncertain) to 1.0 (very certain)
7. If you cannot determine a category with reasonable confidence, use "Other" and set confidence_score accordingly
8. Do NOT include markdown code blocks or explanations
9. Extract merchant name clearly from transaction description
10. Consider location when available to refine categorization`,
		transaction.TransactionDesc(),
		transaction.TransactionDescExtra(),
		transaction.BookingDate().Format("2006-01-02"),
		transaction.AbsoluteAmount(),
		transaction.BookingCurrency(),
		transactionType,
		exchangeRateStr,
		today,
		transaction.AbsoluteAmount(),
		transaction.BookingCurrency(),
		transaction.BookingDate().Format("2006-01-02"),
		transaction.AbsoluteAmount(),
		transaction.BookingDate().Format("2006-01-02"),
	)
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

	// Validate/correct date
	transactionDateStr := transaction.BookingDate().Format("2006-01-02")
	if data.Date != transactionDateStr {
		logger.Warn("Date mismatch, correcting to transaction date", logger.Fields{
			"parsed_date":      data.Date,
			"transaction_date": transactionDateStr,
		})
		data.Date = transactionDateStr
	}

	if _, err := time.Parse("2006-01-02", data.Date); err != nil {
		data.Date = transactionDateStr
	}

	// Default added_by to "he" if not specified
	if data.AddedBy == "" {
		data.AddedBy = "he"
	}

	// Validate added_by values
	if data.AddedBy != "he" && data.AddedBy != "she" {
		data.AddedBy = "he"
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
