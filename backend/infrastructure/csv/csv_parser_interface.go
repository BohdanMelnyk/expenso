package csv

import (
	"io"

	"expenso-backend/domain/entities"
)

// CSVParser defines the interface for parsing bank statement CSV files
// This allows for multiple bank format implementations (Haspa, N26, etc.)
type CSVParser interface {
	// ParseFile reads and parses an entire CSV file
	// Returns a slice of BankTransaction objects
	ParseFile(reader io.Reader) ([]*entities.BankTransaction, error)

	// ValidateHeader checks if the CSV header matches expected format
	// Returns an error if header is invalid
	ValidateHeader(headers []string) error
}
