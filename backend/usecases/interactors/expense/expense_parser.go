package expense

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io/ioutil"
	"strings"
	"text/template"
	"time"

	"expenso-backend/infrastructure/llm"
	"expenso-backend/infrastructure/logger"
	"expenso-backend/usecases/interfaces/repositories"
)

// ParsedExpenseData represents structured expense data extracted from natural language
type ParsedExpenseData struct {
	Amount            float64 `json:"amount"`
	Currency          string  `json:"currency"`
	Category          string  `json:"category"`
	VendorName        string  `json:"vendor_name"`
	VendorType        string  `json:"vendor_type"` // e.g., "food_store", "dining", "shop"
	VendorTypeID      *int    `json:"-"`           // ID of the vendor type category for UI dropdown (computed, not from LLM)
	Date              string  `json:"date"`
	PaymentMethod     string  `json:"payment_method"`
	AddedBy           string  `json:"added_by"`
	Description       string  `json:"description"`
	ConfidenceScore   float64 `json:"confidence_score"`
	MatchedVendorID   *int    `json:"-"` // Computed after LLM parsing
	MatchedVendorName string  `json:"-"` // Computed after LLM parsing
	// CSV row data for raw display
	CardNumber       string  `json:"-"`
	DocumentDate     string  `json:"-"`
	BookingDate      string  `json:"-"`
	OriginalAmount   float64 `json:"-"`
	OriginalCurrency string  `json:"-"`
	ExchangeRate     float64 `json:"-"`
	BookingAmount    float64 `json:"-"`
	BookingCurrency  string  `json:"-"`
	TransactionDesc  string  `json:"-"`
	Location         string  `json:"-"`
	BookingReference string  `json:"-"`
}

// ExpenseParser handles parsing natural language input into structured expense data
type ExpenseParser struct {
	llmClient  *llm.AnthropicClient
	vendorRepo repositories.VendorRepository
}

// NewExpenseParser creates a new expense parser
func NewExpenseParser(llmClient *llm.AnthropicClient, vendorRepo repositories.VendorRepository) *ExpenseParser {
	return &ExpenseParser{
		llmClient:  llmClient,
		vendorRepo: vendorRepo,
	}
}

// ParseExpense parses natural language input into structured expense data
func (p *ExpenseParser) ParseExpense(userInput string) (*ParsedExpenseData, error) {
	logger.Info("Starting expense parsing", logger.Fields{
		"input_length": len(userInput),
	})

	// 1. Build LLM prompt
	prompt := p.buildPrompt(userInput)

	// 2. Call LLM API
	response, err := p.llmClient.SendMessage(prompt)
	if err != nil {
		logger.Error("LLM API call failed", logger.Fields{
			"error": err.Error(),
		})
		return nil, fmt.Errorf("LLM API call failed: %w", err)
	}

	// 3. Parse JSON response
	var parsed ParsedExpenseData
	if err := json.Unmarshal([]byte(response), &parsed); err != nil {
		logger.Error("Failed to parse LLM response", logger.Fields{
			"error":    err.Error(),
			"response": response,
		})
		return nil, fmt.Errorf("failed to parse LLM response: %w", err)
	}

	// 4. Validate and normalize parsed data
	if err := p.validateParsedData(&parsed); err != nil {
		logger.Error("Validation failed", logger.Fields{
			"error": err.Error(),
		})
		return nil, err
	}

	// 5. Match vendor name to existing vendors
	if parsed.VendorName != "" {
		if err := p.matchVendor(&parsed); err != nil {
			logger.Warn("Vendor matching warning", logger.Fields{
				"error":       err.Error(),
				"vendor_name": parsed.VendorName,
			})
		}
	}

	// 6. Map payment method
	parsed.PaymentMethod = p.mapPaymentMethod(parsed.PaymentMethod)

	// 7. Map vendor type to category ID for UI dropdown
	parsed.VendorTypeID = p.mapVendorTypeToID(parsed.VendorType)

	logger.Info("Expense parsing completed successfully", logger.Fields{
		"amount":            parsed.Amount,
		"category":          parsed.Category,
		"vendor_type":       parsed.VendorType,
		"vendor_type_id":    parsed.VendorTypeID,
		"confidence_score":  parsed.ConfidenceScore,
		"matched_vendor_id": parsed.MatchedVendorID,
	})

	return &parsed, nil
}

// buildPrompt creates the LLM prompt for expense parsing from external template
func (p *ExpenseParser) buildPrompt(userInput string) string {
	today := time.Now().Format("2006-01-02")
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")

	// Load template file
	templateContent, err := ioutil.ReadFile("infrastructure/llm/expense_parser_prompt.txt")
	if err != nil {
		logger.Error("Failed to load prompt template", logger.Fields{
			"error": err.Error(),
		})
		// Fallback to inline template if file not found
		return p.fallbackPrompt(userInput)
	}

	// Parse template
	tmpl, err := template.New("expense_parser").Parse(string(templateContent))
	if err != nil {
		logger.Error("Failed to parse prompt template", logger.Fields{
			"error": err.Error(),
		})
		return p.fallbackPrompt(userInput)
	}

	// Execute template
	type PromptData struct {
		UserInput     string
		TodayDate     string
		YesterdayDate string
	}

	var result bytes.Buffer
	err = tmpl.Execute(&result, PromptData{
		UserInput:     userInput,
		TodayDate:     today,
		YesterdayDate: yesterday,
	})
	if err != nil {
		logger.Error("Failed to execute prompt template", logger.Fields{
			"error": err.Error(),
		})
		return p.fallbackPrompt(userInput)
	}

	return result.String()
}

// fallbackPrompt provides a fallback prompt in case template file cannot be loaded
func (p *ExpenseParser) fallbackPrompt(userInput string) string {
	today := time.Now().Format("2006-01-02")
	yesterday := time.Now().AddDate(0, 0, -1).Format("2006-01-02")

	return fmt.Sprintf(`You are an expense parser. Extract structured expense information from the user's natural language input.

User input: "%s"

Today's date: %s

Extract the following fields and return ONLY valid JSON (no markdown, no code blocks, no explanations). Return a single JSON object:

{
  "amount": <number, REQUIRED, positive number>,
  "currency": <"EUR" or "USD", default "EUR">,
  "category": <one of: "Food Store", "Dining", "Dining with Friends", "Shopping", "Transportation", "Car", "Living", "Household", "Bills & Utilities", "Health & Fitness", "Travel", "Entertainment", "Education", "Gifts & Donations", "Other">,
  "vendor_name": <string, name of the store/merchant, can be empty>,
  "vendor_type": <string, type of vendor for category mapping>,
  "date": <YYYY-MM-DD format, REQUIRED>,
  "payment_method": <one of: "credit_card", "debit_card", "cash", "paypal", "n26", "revolut", "wise", "monobank">,
  "added_by": <"he" or "she", default "he">,
  "description": <brief description of the expense, max 100 chars>,
  "confidence_score": <0.0 to 1.0, your confidence in the extraction>
}

Category mapping guidelines:
- Groceries, supermarket, market, shopping for food → "Food Store"
- Restaurant, cafe, coffee, eating out, lunch, dinner → "Dining"
- Dining with friends, party, social dining → "Dining with Friends"
- Stores, clothes, electronics, shopping, mall → "Shopping"
- Taxi, train, bus, Uber, tram, metro, transport → "Transportation"
- Gas, fuel, car maintenance, repair → "Car"
- Rent, utilities, internet, phone → "Living"
- Household items, cleaning, supplies → "Household"
- Subscriptions, phone bills, insurance → "Bills & Utilities"
- Gym, doctor, pharmacy, healthcare → "Health & Fitness"
- Vacation, travel, hotel, flight → "Travel"
- Movies, games, hobbies → "Entertainment"

Payment method mapping rules:
- "credit card", "kreditkarte", "visa", "mastercard" → "credit_card"
- "debit card", "ec karte", "girokarte" → "debit_card"
- "bar", "bargeld", "cash" → "cash"
- "paypal" → "paypal"
- "n26" → "n26"
- "revolut" → "revolut"
- "wise", "transferwise" → "wise"
- "monobank" → "monobank"
- Default if unclear: "credit_card"

Date parsing rules:
- "today" → %s
- "yesterday" → %s
- "last week" → 7 days ago
- Parse specific dates like "January 15" or "15.01" (assume current year if not specified)
- If no date specified, use today

AddedBy rules:
- If context suggests female (she, woman, girlfriend) → "she"
- Otherwise default → "he"

IMPORTANT:
1. Return ONLY the JSON object, no other text
2. All currency values should be positive numbers
3. Description should be brief (max 100 characters)
4. If amount is missing or cannot be determined, return confidence_score of 0 and amount of 0
5. Do not include markdown code blocks or explanations
6. Include vendor_type if you can identify it to help with category mapping`,
		userInput,
		today,
		today,
		yesterday)
}

// validateParsedData validates and normalizes parsed expense data
func (p *ExpenseParser) validateParsedData(data *ParsedExpenseData) error {
	// Validate amount
	if data.Amount <= 0 {
		return errors.New("amount must be positive and non-zero")
	}

	// Default currency to EUR if not specified
	if data.Currency == "" {
		data.Currency = "EUR"
	}

	// Validate date format
	if data.Date != "" {
		if _, err := time.Parse("2006-01-02", data.Date); err != nil {
			return fmt.Errorf("invalid date format: %w", err)
		}
	} else {
		data.Date = time.Now().Format("2006-01-02")
	}

	// Default added_by to "he" if not specified
	if data.AddedBy == "" {
		data.AddedBy = "he"
	}

	// Validate added_by values
	if data.AddedBy != "he" && data.AddedBy != "she" {
		data.AddedBy = "he"
	}

	return nil
}

// matchVendor attempts to match vendor name to existing vendors in database
func (p *ExpenseParser) matchVendor(data *ParsedExpenseData) error {
	// Fetch all vendors
	vendors, err := p.vendorRepo.FindAll()
	if err != nil {
		return fmt.Errorf("failed to fetch vendors: %w", err)
	}

	normalizedInput := strings.ToLower(strings.TrimSpace(data.VendorName))

	// Strategy 1: Exact match (case-insensitive)
	for _, vendor := range vendors {
		if strings.ToLower(vendor.Name()) == normalizedInput {
			vendorID := int(vendor.ID())
			data.MatchedVendorID = &vendorID
			data.MatchedVendorName = vendor.Name()
			logger.Info("Vendor exact match found", logger.Fields{
				"vendor_name": vendor.Name(),
				"vendor_id":   vendorID,
			})
			return nil
		}
	}

	// Strategy 2: Partial match (vendor name contains input or vice versa)
	for _, vendor := range vendors {
		vendorNameLower := strings.ToLower(vendor.Name())
		if strings.Contains(vendorNameLower, normalizedInput) || strings.Contains(normalizedInput, vendorNameLower) {
			vendorID := int(vendor.ID())
			data.MatchedVendorID = &vendorID
			data.MatchedVendorName = vendor.Name()
			logger.Info("Vendor partial match found", logger.Fields{
				"input":     data.VendorName,
				"matched":   vendor.Name(),
				"vendor_id": vendorID,
			})
			return nil
		}
	}

	// No match found - this is not an error, just means no vendor matched
	logger.Info("No vendor match found", logger.Fields{
		"vendor_name": data.VendorName,
	})
	return nil
}

// mapPaymentMethod validates and normalizes LLM output payment method to backend enums
func (p *ExpenseParser) mapPaymentMethod(llmMethod string) string {
	// Valid backend payment method enums
	validMethods := map[string]bool{
		"cash":           true,
		"b_haspa_credit": true,
		"b_n26":          true,
		"m_n26":          true,
		"m_haspa_credit": true,
		"paypal":         true,
		"debit":          true,
		"m_monobank":     true,
		"b_monobank":     true,
	}

	normalized := strings.ToLower(strings.TrimSpace(llmMethod))

	// If LLM already returned a valid backend enum, use it directly
	if validMethods[normalized] {
		return normalized
	}

	// Fallback mapping for common intermediate terms (backward compatibility)
	mapping := map[string]string{
		"credit_card": "b_haspa_credit",
		"debit_card":  "debit",
		"n26":         "b_n26",
		"monobank":    "b_monobank",
	}

	if mapped, exists := mapping[normalized]; exists {
		return mapped
	}

	// Default to credit card if not found
	return "b_haspa_credit"
}

// mapVendorTypeToID maps vendor type string to category ID for UI dropdown selection
func (p *ExpenseParser) mapVendorTypeToID(vendorType string) *int {
	// Mapping from vendor type to category ID
	vendorTypeToID := map[string]int{
		"food_store":          1,  // Food Store
		"transport":           2,  // Transportation
		"shop":                3,  // Shopping
		"clothing":            3,  // Shopping
		"entertainment":       4,  // Entertainment
		"subscriptions":       5,  // Bills & Utilities
		"care":                6,  // Health & Fitness
		"tourism":             7,  // Travel
		"education":           8,  // Education
		"else":                10, // Other
		"salary":              11, // Salary
		"investment":          13, // Investment
		"car":                 15, // Car
		"living":              16, // Living
		"dining":              17, // Dining
		"eating_out":          17, // Dining
		"household":           18, // Household
		"dining_with_friends": 21, // Dining with Friends
	}

	normalized := strings.ToLower(strings.TrimSpace(vendorType))
	if id, exists := vendorTypeToID[normalized]; exists {
		return &id
	}

	// Return nil if vendor type not found (no category mapping)
	return nil
}
