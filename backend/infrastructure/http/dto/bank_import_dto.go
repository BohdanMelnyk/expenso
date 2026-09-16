package dto

// Bank Transaction DTOs for CSV import flow

// BankTransactionDTO represents a parsed bank transaction ready for user review
type BankTransactionDTO struct {
	RawData          map[string]string        `json:"raw_data"`
	ParsedExpense    ParsedExpenseResponseDTO `json:"parsed_expense"`
	OriginalAmount   float64                  `json:"original_amount"`
	OriginalCurrency string                   `json:"original_currency"`
	BookingAmount    float64                  `json:"booking_amount"`
	BookingCurrency  string                   `json:"booking_currency"`
	TransactionDate  string                   `json:"transaction_date"`
	Merchant         string                   `json:"merchant"`
	Location         string                   `json:"location"`
	ConfidenceScore  float64                  `json:"confidence_score"`
	BookingReference string                   `json:"booking_reference"`
}

// BankImportPreviewResponse contains the preview of parsed transactions
type BankImportPreviewResponse struct {
	Transactions []BankTransactionDTO `json:"transactions"`
	TotalCount   int                  `json:"total_count"`
	Format       string               `json:"format"`
}

// CreateExpenseFromBankRequest is used to confirm a bank transaction and create an expense
type CreateExpenseFromBankRequest struct {
	TransactionData BankTransactionDTO      `json:"transaction_data" validate:"required"`
	ExpenseData     CreateExpenseRequestDTO `json:"expense_data" validate:"required"`
}
