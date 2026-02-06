package csv

import (
	"bufio"
	"encoding/csv"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"expenso-backend/domain/entities"
)

// HaspaCreditParser parses Haspa credit card CSV statements
type HaspaCreditParser struct{}

// NewHaspaCreditParser creates a new Haspa credit card parser
func NewHaspaCreditParser() *HaspaCreditParser {
	return &HaspaCreditParser{}
}

// Expected Haspa CSV header columns (indices)
const (
	haspaCreditCardNumber     = 0
	haspaDocumentDate         = 1
	haspaBookingDate          = 2
	haspaOriginalAmount       = 3
	haspaOriginalCurrency     = 4
	haspaExchangeRate         = 5
	haspaBookingAmount        = 6
	haspaBookingCurrency      = 7
	haspaTransactionDesc      = 8
	haspaTransactionDescExtra = 9
	haspaBookingReference     = 10
)

// expectedHeaderCount is the minimum number of expected columns
const expectedHeaderCount = 11

// ParseFile reads and parses an entire Haspa CSV file
func (p *HaspaCreditParser) ParseFile(reader io.Reader) ([]*entities.BankTransaction, error) {
	// Wrap reader with bufio to handle BOM
	bufferedReader := bufio.NewReader(reader)

	// Read first 3 bytes to check for UTF-8 BOM
	firstBytes, err := bufferedReader.Peek(3)
	if err == nil && len(firstBytes) >= 3 && firstBytes[0] == 0xEF && firstBytes[1] == 0xBB && firstBytes[2] == 0xBF {
		// Skip BOM if present
		bufferedReader.Discard(3)
	}

	csvReader := csv.NewReader(bufferedReader)
	csvReader.Comma = ';'
	csvReader.FieldsPerRecord = -1 // Allow variable number of fields

	// Read and validate header
	headers, err := csvReader.Read()
	if err != nil {
		return nil, fmt.Errorf("failed to read CSV header: %w", err)
	}

	if err := p.ValidateHeader(headers); err != nil {
		return nil, err
	}

	var transactions []*entities.BankTransaction

	// Parse each row
	rowNum := 2 // Start at 2 (1-indexed, after header)
	for {
		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("failed to read CSV row %d: %w", rowNum, err)
		}

		// Skip empty rows
		if len(record) < expectedHeaderCount {
			continue
		}

		transaction, err := p.parseRow(record, rowNum)
		if err != nil {
			return nil, fmt.Errorf("failed to parse row %d: %w", rowNum, err)
		}

		if transaction != nil {
			transactions = append(transactions, transaction)
		}

		rowNum++
	}

	if len(transactions) == 0 {
		return nil, fmt.Errorf("no valid transactions found in CSV file")
	}

	return transactions, nil
}

// ValidateHeader checks if the CSV header matches Haspa format
func (p *HaspaCreditParser) ValidateHeader(headers []string) error {
	if len(headers) < expectedHeaderCount {
		return fmt.Errorf("CSV has %d columns, expected at least %d", len(headers), expectedHeaderCount)
	}

	// Validate key header values (German names)
	// Check for "Umsatz" and "Belegdatum" which are distinctive Haspa headers
	expectedPatterns := map[int][]string{
		haspaCreditCardNumber: {"umsatz"}, // First column contains "Umsatz"
		haspaDocumentDate:     {"belegdatum"},
		haspaBookingDate:      {"buchungsdatum"},
	}

	for idx, patterns := range expectedPatterns {
		if idx < len(headers) {
			headerLower := strings.ToLower(strings.TrimSpace(headers[idx]))
			found := false
			for _, pattern := range patterns {
				if strings.Contains(headerLower, pattern) {
					found = true
					break
				}
			}
			if !found {
				return fmt.Errorf("unexpected header at column %d: got %q, expected to contain %q (after BOM removal)", idx, headers[idx], patterns)
			}
		}
	}

	return nil
}

// parseRow parses a single CSV row into a BankTransaction
func (p *HaspaCreditParser) parseRow(record []string, rowNum int) (*entities.BankTransaction, error) {
	if len(record) < expectedHeaderCount {
		return nil, fmt.Errorf("row has insufficient columns: %d < %d", len(record), expectedHeaderCount)
	}

	// Trim all fields
	for i := range record {
		record[i] = strings.TrimSpace(record[i])
	}

	// Parse dates (DD.MM.YY format)
	documentDate, err := p.parseDate(record[haspaDocumentDate])
	if err != nil {
		return nil, fmt.Errorf("invalid document date %q: %w", record[haspaDocumentDate], err)
	}

	bookingDate, err := p.parseDate(record[haspaBookingDate])
	if err != nil {
		return nil, fmt.Errorf("invalid booking date %q: %w", record[haspaBookingDate], err)
	}

	// Parse amounts (handle comma as decimal separator)
	originalAmount, err := p.parseAmount(record[haspaOriginalAmount])
	if err != nil {
		return nil, fmt.Errorf("invalid original amount %q: %w", record[haspaOriginalAmount], err)
	}

	bookingAmount, err := p.parseAmount(record[haspaBookingAmount])
	if err != nil {
		return nil, fmt.Errorf("invalid booking amount %q: %w", record[haspaBookingAmount], err)
	}

	// Parse exchange rate
	exchangeRate, err := p.parseAmount(record[haspaExchangeRate])
	if err != nil {
		// Exchange rate might be empty for same currency, default to 1.0
		if record[haspaExchangeRate] == "" {
			exchangeRate = 1.0
		} else {
			return nil, fmt.Errorf("invalid exchange rate %q: %w", record[haspaExchangeRate], err)
		}
	}
	// Ensure exchange rate is positive
	if exchangeRate == 0 {
		exchangeRate = 1.0
	}

	// Handle original currency - if empty, use booking currency (for same-currency transactions)
	originalCurrency := strings.TrimSpace(record[haspaOriginalCurrency])
	if originalCurrency == "" {
		originalCurrency = strings.TrimSpace(record[haspaBookingCurrency])
		// For same-currency transactions, if originalAmount is 0, use bookingAmount
		if originalAmount == 0 {
			originalAmount = bookingAmount
		}
	}

	// Create BankTransaction
	transaction, err := entities.NewBankTransaction(
		record[haspaCreditCardNumber],     // Card number
		documentDate,                      // Document date
		bookingDate,                       // Booking date
		originalAmount,                    // Original amount
		originalCurrency,                  // Original currency (defaulted if empty)
		exchangeRate,                      // Exchange rate
		bookingAmount,                     // Booking amount
		record[haspaBookingCurrency],      // Booking currency
		record[haspaTransactionDesc],      // Transaction description
		record[haspaTransactionDescExtra], // Additional description
		record[haspaBookingReference],     // Booking reference
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create bank transaction: %w", err)
	}

	return transaction, nil
}

// parseDate parses German date format DD.MM.YY to time.Time
func (p *HaspaCreditParser) parseDate(dateStr string) (time.Time, error) {
	dateStr = strings.TrimSpace(dateStr)
	if dateStr == "" {
		return time.Time{}, fmt.Errorf("date string is empty")
	}

	// Try parsing DD.MM.YY format
	t, err := time.Parse("02.01.06", dateStr)
	if err != nil {
		// Try DD.MM.YYYY format as fallback
		t, err = time.Parse("02.01.2006", dateStr)
		if err != nil {
			return time.Time{}, fmt.Errorf("unable to parse date %q", dateStr)
		}
	}

	return t, nil
}

// parseAmount parses German decimal format (comma or period as separator)
// Handles signs (- for negative, + or empty for positive)
func (p *HaspaCreditParser) parseAmount(amountStr string) (float64, error) {
	amountStr = strings.TrimSpace(amountStr)
	if amountStr == "" {
		return 0, nil
	}

	// Replace German decimal comma with period
	amountStr = strings.ReplaceAll(amountStr, ",", ".")

	// Remove any thousand separators (spaces in German format)
	amountStr = strings.ReplaceAll(amountStr, " ", "")

	amount, err := strconv.ParseFloat(amountStr, 64)
	if err != nil {
		return 0, fmt.Errorf("unable to parse amount %q: %w", amountStr, err)
	}

	return amount, nil
}
