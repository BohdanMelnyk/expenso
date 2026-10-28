package expense

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"text/template"
	"time"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/llm"
	"expenso-backend/infrastructure/logger"
	"expenso-backend/usecases/interfaces/repositories"
)

// ParsedExpenseData represents structured expense data extracted from natural language
type ParsedExpenseData struct {
	Amount            float64 `json:"amount"`
	Currency          string  `json:"currency"`
	Category          string  `json:"category"`
	VendorID          *int    `json:"vendor_id"` // ID from the vendor list in the prompt, verified after parsing
	VendorName        string  `json:"vendor_name"`
	Date              string  `json:"date"`
	PaymentMethod     string  `json:"payment_method"`
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

// catchAllVendorName is the per-category vendor used when a merchant is not a known vendor
const catchAllVendorName = "Else"

// promptVendor is a vendor as listed in the LLM prompt
type promptVendor struct {
	ID       int
	Name     string
	Category string
}

// vendorCatalog holds the current vendors and categories, used to build prompts and verify LLM output
type vendorCatalog struct {
	Vendors    []promptVendor
	Categories []string
	byID       map[int]*entities.Vendor
	all        []*entities.Vendor
}

// ExpenseParser handles parsing natural language input into structured expense data
type ExpenseParser struct {
	llmClient    *llm.AnthropicClient
	vendorRepo   repositories.VendorRepository
	categoryRepo repositories.CategoryRepository
}

// NewExpenseParser creates a new expense parser
func NewExpenseParser(llmClient *llm.AnthropicClient, vendorRepo repositories.VendorRepository, categoryRepo repositories.CategoryRepository) *ExpenseParser {
	return &ExpenseParser{
		llmClient:    llmClient,
		vendorRepo:   vendorRepo,
		categoryRepo: categoryRepo,
	}
}

// ParseExpense parses natural language input into structured expense data
func (p *ExpenseParser) ParseExpense(userInput string) (*ParsedExpenseData, error) {
	logger.Info("Starting expense parsing", logger.Fields{
		"input_length": len(userInput),
	})

	// 1. Load current vendors and categories
	catalog, err := p.loadCatalog()
	if err != nil {
		return nil, err
	}

	// 2. Build LLM prompt
	prompt, err := p.buildPrompt(userInput, catalog)
	if err != nil {
		return nil, err
	}

	// 3. Call LLM API
	response, err := p.llmClient.SendMessage(prompt)
	if err != nil {
		logger.Error("LLM API call failed", logger.Fields{
			"error": err.Error(),
		})
		return nil, fmt.Errorf("LLM API call failed: %w", err)
	}

	// 4. Parse JSON response
	var parsed ParsedExpenseData
	if err := json.Unmarshal([]byte(stripMarkdownCodeFence(response)), &parsed); err != nil {
		logger.Error("Failed to parse LLM response", logger.Fields{
			"error":    err.Error(),
			"response": response,
		})
		return nil, fmt.Errorf("failed to parse LLM response: %w", err)
	}

	// 5. Validate and normalize parsed data
	if err := p.validateParsedData(&parsed); err != nil {
		logger.Error("Validation failed", logger.Fields{
			"error": err.Error(),
		})
		return nil, err
	}

	// 6. Resolve vendor and take the category from it
	p.resolveVendor(&parsed, catalog)

	// 7. Map payment method
	parsed.PaymentMethod = p.mapPaymentMethod(parsed.PaymentMethod)

	logger.Info("Expense parsing completed successfully", logger.Fields{
		"amount":            parsed.Amount,
		"category":          parsed.Category,
		"confidence_score":  parsed.ConfidenceScore,
		"matched_vendor_id": parsed.MatchedVendorID,
	})

	return &parsed, nil
}

// loadCatalog fetches the current vendors and categories for the prompt
func (p *ExpenseParser) loadCatalog() (*vendorCatalog, error) {
	vendors, err := p.vendorRepo.FindAll()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch vendors: %w", err)
	}
	categories, err := p.categoryRepo.FindAll()
	if err != nil {
		return nil, fmt.Errorf("failed to fetch categories: %w", err)
	}

	catalog := &vendorCatalog{byID: make(map[int]*entities.Vendor, len(vendors)), all: vendors}
	for _, v := range vendors {
		catalog.Vendors = append(catalog.Vendors, promptVendor{ID: int(v.ID()), Name: v.Name(), Category: v.CategoryName()})
		catalog.byID[int(v.ID())] = v
	}
	for _, c := range categories {
		catalog.Categories = append(catalog.Categories, c.Name())
	}
	return catalog, nil
}

// buildPrompt creates the LLM prompt for expense parsing from the embedded template
func (p *ExpenseParser) buildPrompt(userInput string, catalog *vendorCatalog) (string, error) {
	type PromptData struct {
		UserInput     string
		TodayDate     string
		YesterdayDate string
		Vendors       []promptVendor
		Categories    []string
	}

	return renderPrompt("expense_parser", llm.ExpenseParserPrompt, PromptData{
		UserInput:     userInput,
		TodayDate:     time.Now().Format("2006-01-02"),
		YesterdayDate: time.Now().AddDate(0, 0, -1).Format("2006-01-02"),
		Vendors:       catalog.Vendors,
		Categories:    catalog.Categories,
	})
}

// renderPrompt executes a prompt template with the given data
func renderPrompt(name, text string, data any) (string, error) {
	tmpl, err := template.New(name).Parse(text)
	if err != nil {
		return "", fmt.Errorf("failed to parse %s prompt template: %w", name, err)
	}

	var result bytes.Buffer
	if err := tmpl.Execute(&result, data); err != nil {
		return "", fmt.Errorf("failed to execute %s prompt template: %w", name, err)
	}
	return result.String(), nil
}

// stripMarkdownCodeFence removes markdown code fence from response if present
func stripMarkdownCodeFence(response string) string {
	response = strings.TrimSpace(response)

	// Check for ```json ... ``` pattern
	if strings.HasPrefix(response, "```json") {
		response = strings.TrimPrefix(response, "```json")
		response = strings.TrimSuffix(response, "```")
	} else if strings.HasPrefix(response, "```") {
		// Generic code fence
		response = strings.TrimPrefix(response, "```")
		response = strings.TrimSuffix(response, "```")
	}

	return strings.TrimSpace(response)
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

	return nil
}

// resolveVendor verifies the LLM's vendor choice and makes the category follow the vendor.
// Order: the returned vendor_id, then a unique exact name match, then the category's catch-all vendor.
func (p *ExpenseParser) resolveVendor(data *ParsedExpenseData, catalog *vendorCatalog) {
	if data.VendorID != nil {
		if vendor, ok := catalog.byID[*data.VendorID]; ok {
			assignVendor(data, vendor)
			return
		}
		logger.Warn("LLM returned unknown vendor_id", logger.Fields{
			"vendor_id": *data.VendorID,
		})
	}

	if vendor := uniqueVendorByName(catalog.all, data.VendorName); vendor != nil {
		assignVendor(data, vendor)
		return
	}

	if !containsString(catalog.Categories, data.Category) {
		logger.Warn("LLM returned unknown category, using Other", logger.Fields{
			"category": data.Category,
		})
		data.Category = "Other"
	}

	for _, vendor := range catalog.all {
		if vendor.Name() == catchAllVendorName && vendor.CategoryName() == data.Category {
			assignVendor(data, vendor)
			return
		}
	}

	logger.Info("No vendor match found", logger.Fields{
		"vendor_name": data.VendorName,
		"category":    data.Category,
	})
}

func assignVendor(data *ParsedExpenseData, vendor *entities.Vendor) {
	vendorID := int(vendor.ID())
	data.MatchedVendorID = &vendorID
	data.MatchedVendorName = vendor.Name()
	data.Category = vendor.CategoryName()
}

// uniqueVendorByName returns the vendor whose name equals name (case-insensitive) if exactly one does.
// Catch-all vendors are skipped because every category has one.
func uniqueVendorByName(vendors []*entities.Vendor, name string) *entities.Vendor {
	normalized := strings.ToLower(strings.TrimSpace(name))
	if normalized == "" || normalized == strings.ToLower(catchAllVendorName) {
		return nil
	}

	var match *entities.Vendor
	for _, vendor := range vendors {
		if strings.ToLower(vendor.Name()) == normalized {
			if match != nil {
				return nil
			}
			match = vendor
		}
	}
	return match
}

func containsString(values []string, value string) bool {
	for _, v := range values {
		if v == value {
			return true
		}
	}
	return false
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
