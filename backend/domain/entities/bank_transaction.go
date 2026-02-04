package entities

import (
	"fmt"
	"time"
)

// BankTransaction represents a raw transaction from a bank CSV statement
// It's a value object that captures the raw bank data before LLM processing
type BankTransaction struct {
	cardNumber           string
	documentDate         time.Time
	bookingDate          time.Time
	originalAmount       float64
	originalCurrency     string
	exchangeRate         float64
	bookingAmount        float64
	bookingCurrency      string
	transactionDesc      string // merchant name
	transactionDescExtra string // location/additional info
	bookingReference     string
}

// NewBankTransaction creates a new BankTransaction with validation
func NewBankTransaction(
	cardNumber string,
	documentDate time.Time,
	bookingDate time.Time,
	originalAmount float64,
	originalCurrency string,
	exchangeRate float64,
	bookingAmount float64,
	bookingCurrency string,
	transactionDesc string,
	transactionDescExtra string,
	bookingReference string,
) (*BankTransaction, error) {
	// Validate required fields
	if cardNumber == "" {
		return nil, fmt.Errorf("card number cannot be empty")
	}
	if transactionDesc == "" {
		return nil, fmt.Errorf("transaction description cannot be empty")
	}
	if bookingCurrency == "" {
		return nil, fmt.Errorf("booking currency cannot be empty")
	}
	if originalCurrency == "" {
		return nil, fmt.Errorf("original currency cannot be empty")
	}

	// Validate dates
	if documentDate.IsZero() {
		return nil, fmt.Errorf("document date cannot be zero")
	}
	if bookingDate.IsZero() {
		return nil, fmt.Errorf("booking date cannot be zero")
	}

	// Validate amounts
	if originalAmount == 0 {
		return nil, fmt.Errorf("original amount cannot be zero")
	}
	if bookingAmount == 0 {
		return nil, fmt.Errorf("booking amount cannot be zero")
	}

	// Validate exchange rate (should be positive)
	if exchangeRate <= 0 {
		return nil, fmt.Errorf("exchange rate must be positive")
	}

	return &BankTransaction{
		cardNumber:           cardNumber,
		documentDate:         documentDate,
		bookingDate:          bookingDate,
		originalAmount:       originalAmount,
		originalCurrency:     originalCurrency,
		exchangeRate:         exchangeRate,
		bookingAmount:        bookingAmount,
		bookingCurrency:      bookingCurrency,
		transactionDesc:      transactionDesc,
		transactionDescExtra: transactionDescExtra,
		bookingReference:     bookingReference,
	}, nil
}

// Getter methods (immutable)
func (bt *BankTransaction) CardNumber() string {
	return bt.cardNumber
}

func (bt *BankTransaction) DocumentDate() time.Time {
	return bt.documentDate
}

func (bt *BankTransaction) BookingDate() time.Time {
	return bt.bookingDate
}

func (bt *BankTransaction) OriginalAmount() float64 {
	return bt.originalAmount
}

func (bt *BankTransaction) OriginalCurrency() string {
	return bt.originalCurrency
}

func (bt *BankTransaction) ExchangeRate() float64 {
	return bt.exchangeRate
}

func (bt *BankTransaction) BookingAmount() float64 {
	return bt.bookingAmount
}

func (bt *BankTransaction) BookingCurrency() string {
	return bt.bookingCurrency
}

func (bt *BankTransaction) TransactionDesc() string {
	return bt.transactionDesc
}

func (bt *BankTransaction) TransactionDescExtra() string {
	return bt.transactionDescExtra
}

func (bt *BankTransaction) BookingReference() string {
	return bt.bookingReference
}

// IsExpense returns true if booking amount is negative (expense)
func (bt *BankTransaction) IsExpense() bool {
	return bt.bookingAmount < 0
}

// IsIncome returns true if booking amount is positive (income/refund)
func (bt *BankTransaction) IsIncome() bool {
	return bt.bookingAmount > 0
}

// AbsoluteAmount returns the absolute value of booking amount
func (bt *BankTransaction) AbsoluteAmount() float64 {
	if bt.bookingAmount < 0 {
		return -bt.bookingAmount
	}
	return bt.bookingAmount
}

// String returns a human-readable representation
func (bt *BankTransaction) String() string {
	return fmt.Sprintf(
		"BankTransaction{Date: %s, Desc: %s, Amount: %.2f %s}",
		bt.bookingDate.Format("2006-01-02"),
		bt.transactionDesc,
		bt.bookingAmount,
		bt.bookingCurrency,
	)
}
