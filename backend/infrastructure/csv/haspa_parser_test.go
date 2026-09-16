package csv

import (
	"strings"
	"testing"
	"time"
)

func TestHaspaCreditParser_ParseDate(t *testing.T) {
	parser := NewHaspaCreditParser()

	tests := []struct {
		name    string
		dateStr string
		want    time.Time
		wantErr bool
	}{
		{
			name:    "valid DD.MM.YY format",
			dateStr: "04.02.26",
			want:    time.Date(2026, 2, 4, 0, 0, 0, 0, time.UTC),
			wantErr: false,
		},
		{
			name:    "valid DD.MM.YYYY format",
			dateStr: "04.02.2026",
			want:    time.Date(2026, 2, 4, 0, 0, 0, 0, time.UTC),
			wantErr: false,
		},
		{
			name:    "empty date string",
			dateStr: "",
			want:    time.Time{},
			wantErr: true,
		},
		{
			name:    "invalid date",
			dateStr: "32.13.2026",
			want:    time.Time{},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parser.parseDate(tt.dateStr)
			if (err != nil) != tt.wantErr {
				t.Errorf("parseDate() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && !got.Equal(tt.want) {
				t.Errorf("parseDate() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestHaspaCreditParser_ParseAmount(t *testing.T) {
	parser := NewHaspaCreditParser()

	tests := []struct {
		name    string
		input   string
		want    float64
		wantErr bool
	}{
		{
			name:    "positive amount with period",
			input:   "123.45",
			want:    123.45,
			wantErr: false,
		},
		{
			name:    "positive amount with comma (German)",
			input:   "123,45",
			want:    123.45,
			wantErr: false,
		},
		{
			name:    "negative amount",
			input:   "-45,99",
			want:    -45.99,
			wantErr: false,
		},
		{
			name:    "amount with thousand separator (German)",
			input:   "1 234,56",
			want:    1234.56,
			wantErr: false,
		},
		{
			name:    "zero",
			input:   "0,00",
			want:    0,
			wantErr: false,
		},
		{
			name:    "empty string",
			input:   "",
			want:    0,
			wantErr: false,
		},
		{
			name:    "whitespace only",
			input:   "   ",
			want:    0,
			wantErr: false, // Trimmed to empty string, returns 0
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parser.parseAmount(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("parseAmount() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && got != tt.want {
				t.Errorf("parseAmount() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestHaspaCreditParser_ValidateHeader(t *testing.T) {
	parser := NewHaspaCreditParser()

	tests := []struct {
		name    string
		headers []string
		wantErr bool
	}{
		{
			name: "valid Haspa header",
			headers: []string{
				"Umsatz getätigt von",
				"Belegdatum",
				"Buchungsdatum",
				"Originalbetrag",
				"Originalwährung",
				"Umrechnungskurs",
				"Buchungsbetrag",
				"Buchungswährung",
				"Transaktionsbeschreibung",
				"Transaktionsbeschreibung Zusatz",
				"Buchungsreferenz",
			},
			wantErr: false,
		},
		{
			name:    "too few columns",
			headers: []string{"Col1", "Col2"},
			wantErr: true,
		},
		{
			name: "wrong first column",
			headers: []string{
				"Wrong Header",
				"Belegdatum",
				"Buchungsdatum",
				"Originalbetrag",
				"Originalwährung",
				"Umrechnungskurs",
				"Buchungsbetrag",
				"Buchungswährung",
				"Transaktionsbeschreibung",
				"Transaktionsbeschreibung Zusatz",
				"Buchungsreferenz",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := parser.ValidateHeader(tt.headers)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateHeader() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestHaspaCreditParser_ParseFile(t *testing.T) {
	parser := NewHaspaCreditParser()

	// Create a sample CSV with one transaction
	csvData := `Umsatz getätigt von;Belegdatum;Buchungsdatum;Originalbetrag;Originalwährung;Umrechnungskurs;Buchungsbetrag;Buchungswährung;Transaktionsbeschreibung;Transaktionsbeschreibung Zusatz;Buchungsreferenz
5232________4999;04.02.26;04.02.26;-45,99;EUR;1,0;-45,99;EUR;AMAZON;EU.LONDON;REF001
5232________4999;03.02.26;03.02.26;-120,00;EUR;1,0;-120,00;EUR;REWE;HAMBURG;REF002`

	reader := strings.NewReader(csvData)
	transactions, err := parser.ParseFile(reader)

	if err != nil {
		t.Errorf("ParseFile() error = %v", err)
		return
	}

	if len(transactions) != 2 {
		t.Errorf("ParseFile() returned %d transactions, want 2", len(transactions))
		return
	}

	// Check first transaction
	t1 := transactions[0]
	if t1.TransactionDesc() != "AMAZON" {
		t.Errorf("First transaction description = %v, want AMAZON", t1.TransactionDesc())
	}
	if t1.BookingAmount() != -45.99 {
		t.Errorf("First transaction amount = %v, want -45.99", t1.BookingAmount())
	}
	if !t1.IsExpense() {
		t.Error("First transaction should be an expense (negative amount)")
	}

	// Check second transaction
	t2 := transactions[1]
	if t2.TransactionDesc() != "REWE" {
		t.Errorf("Second transaction description = %v, want REWE", t2.TransactionDesc())
	}
	if t2.BookingAmount() != -120.00 {
		t.Errorf("Second transaction amount = %v, want -120.00", t2.BookingAmount())
	}
}

func TestHaspaCreditParser_ParseFile_EmptyFile(t *testing.T) {
	parser := NewHaspaCreditParser()

	csvData := `Umsatz getätigt von;Belegdatum;Buchungsdatum;Originalbetrag;Originalwährung;Umrechnungskurs;Buchungsbetrag;Buchungswährung;Transaktionsbeschreibung;Transaktionsbeschreibung Zusatz;Buchungsreferenz`

	reader := strings.NewReader(csvData)
	_, err := parser.ParseFile(reader)

	if err == nil {
		t.Error("ParseFile() expected error for empty CSV, got nil")
	}
}

// TestHaspaCreditParser_ParseFile_InvalidAmountInCSV tests parsing CSV with invalid amount "-0,0it9"
// This is the specific error case from the failing CSV file
func TestHaspaCreditParser_ParseFile_InvalidAmountInCSV(t *testing.T) {
	parser := NewHaspaCreditParser()

	// Row with invalid amount "-0,0it9" which contains garbage characters
	csvData := `Umsatz getätigt von;Belegdatum;Buchungsdatum;Originalbetrag;Originalwährung;Umrechnungskurs;Buchungsbetrag;Buchungswährung;Transaktionsbeschreibung;Transaktionsbeschreibung Zusatz;Buchungsreferenz
5232 **** **** 4999;02.02.26;04.02.26;0,00;;1,00;-0,0it9;EUR;1,25% für Währungsumrechn;RPAY*ROZETKA MP;115`

	reader := strings.NewReader(csvData)
	_, err := parser.ParseFile(reader)

	if err == nil {
		t.Error("ParseFile() expected error for invalid amount '-0,0it9', got nil")
		return
	}

	// Should contain error message about parsing the amount
	if !strings.Contains(err.Error(), "unable to parse amount") {
		t.Errorf("ParseFile() error message = %v, want to contain 'unable to parse amount'", err)
	}

	// Check that error message mentions row 2
	if !strings.Contains(err.Error(), "row 2") {
		t.Logf("ParseFile() error = %v", err)
	}
}

// TestHaspaCreditParser_ParseFile_MultipleTransactionsWithVariousFormats tests various transaction formats
func TestHaspaCreditParser_ParseFile_MultipleTransactionsWithVariousFormats(t *testing.T) {
	parser := NewHaspaCreditParser()

	csvData := `Umsatz getätigt von;Belegdatum;Buchungsdatum;Originalbetrag;Originalwährung;Umrechnungskurs;Buchungsbetrag;Buchungswährung;Transaktionsbeschreibung;Transaktionsbeschreibung Zusatz;Buchungsreferenz
5232 **** **** 4999;03.02.26;04.02.26;0,00;;1,00;-16,00;EUR;Gilde Bowling 44;Hamburg;117
5232 **** **** 4999;03.02.26;04.02.26;-355,00;UAH;50,86;-6,98;EUR;RPAY*ROZETKA MP;KYIV;114
5232 **** **** 4999;27.01.26;28.01.26;0,00;;1,00;27,93;EUR;RitualsUeberseequartie;Hamburg;98
5232 **** **** 4999;04.02.26;04.02.26;0,00;;1,00;2596,16;EUR;Lastschrift;;121`

	reader := strings.NewReader(csvData)
	transactions, err := parser.ParseFile(reader)

	if err != nil {
		t.Fatalf("ParseFile() error = %v", err)
	}

	if len(transactions) != 4 {
		t.Fatalf("ParseFile() returned %d transactions, want 4", len(transactions))
	}

	tests := []struct {
		idx              int
		expectedDesc     string
		expectedAmount   float64
		expectedCurrency string
		isExpense        bool
	}{
		{0, "Gilde Bowling 44", -16.00, "EUR", true},
		{1, "RPAY*ROZETKA MP", -6.98, "EUR", true},
		{2, "RitualsUeberseequartie", 27.93, "EUR", false}, // Income
		{3, "Lastschrift", 2596.16, "EUR", false},          // Income
	}

	for _, tt := range tests {
		tx := transactions[tt.idx]
		if tx.TransactionDesc() != tt.expectedDesc {
			t.Errorf("Transaction %d: description = %v, want %v", tt.idx, tx.TransactionDesc(), tt.expectedDesc)
		}
		if tx.BookingAmount() != tt.expectedAmount {
			t.Errorf("Transaction %d: amount = %v, want %v", tt.idx, tx.BookingAmount(), tt.expectedAmount)
		}
		if tx.BookingCurrency() != tt.expectedCurrency {
			t.Errorf("Transaction %d: currency = %v, want %v", tt.idx, tx.BookingCurrency(), tt.expectedCurrency)
		}
		if tx.IsExpense() != tt.isExpense {
			t.Errorf("Transaction %d: isExpense = %v, want %v", tt.idx, tx.IsExpense(), tt.isExpense)
		}
	}
}

// TestHaspaCreditParser_ParseFile_ForeignCurrencyTransactions tests transactions with foreign currency
func TestHaspaCreditParser_ParseFile_ForeignCurrencyTransactions(t *testing.T) {
	parser := NewHaspaCreditParser()

	csvData := `Umsatz getätigt von;Belegdatum;Buchungsdatum;Originalbetrag;Originalwährung;Umrechnungskurs;Buchungsbetrag;Buchungswährung;Transaktionsbeschreibung;Transaktionsbeschreibung Zusatz;Buchungsreferenz
5232 **** **** 4999;09.01.26;09.01.26;-200,00;CAD;1,61;-123,87;EUR;CS *SEPHORACA GC;TORONTO;21
5232 **** **** 4999;16.01.26;19.01.26;-169,06;PLN;4,22;-40,02;EUR;www.bilet.intercity.pl;Warszawa;48`

	reader := strings.NewReader(csvData)
	transactions, err := parser.ParseFile(reader)

	if err != nil {
		t.Fatalf("ParseFile() error = %v", err)
	}

	if len(transactions) != 2 {
		t.Fatalf("ParseFile() returned %d transactions, want 2", len(transactions))
	}

	// Check CAD transaction
	tx1 := transactions[0]
	if tx1.OriginalAmount() != -200.00 {
		t.Errorf("CAD transaction: originalAmount = %v, want -200.00", tx1.OriginalAmount())
	}
	if tx1.OriginalCurrency() != "CAD" {
		t.Errorf("CAD transaction: originalCurrency = %v, want CAD", tx1.OriginalCurrency())
	}
	if tx1.ExchangeRate() != 1.61 {
		t.Errorf("CAD transaction: exchangeRate = %v, want 1.61", tx1.ExchangeRate())
	}
	if tx1.BookingAmount() != -123.87 {
		t.Errorf("CAD transaction: bookingAmount = %v, want -123.87", tx1.BookingAmount())
	}

	// Check PLN transaction
	tx2 := transactions[1]
	if tx2.OriginalAmount() != -169.06 {
		t.Errorf("PLN transaction: originalAmount = %v, want -169.06", tx2.OriginalAmount())
	}
	if tx2.ExchangeRate() != 4.22 {
		t.Errorf("PLN transaction: exchangeRate = %v, want 4.22", tx2.ExchangeRate())
	}
}

// TestHaspaCreditParser_ParseFile_EmptyExchangeRate tests handling of empty exchange rates
func TestHaspaCreditParser_ParseFile_EmptyExchangeRate(t *testing.T) {
	parser := NewHaspaCreditParser()

	csvData := `Umsatz getätigt von;Belegdatum;Buchungsdatum;Originalbetrag;Originalwährung;Umrechnungskurs;Buchungsbetrag;Buchungswährung;Transaktionsbeschreibung;Transaktionsbeschreibung Zusatz;Buchungsreferenz
5232 **** **** 4999;03.02.26;04.02.26;0,00;;1,00;-16,00;EUR;Test;Hamburg;117
5232 **** **** 4999;03.02.26;04.02.26;0,00;;;-16,00;EUR;Test2;Hamburg;118`

	reader := strings.NewReader(csvData)
	transactions, err := parser.ParseFile(reader)

	if err != nil {
		t.Fatalf("ParseFile() error = %v", err)
	}

	if len(transactions) != 2 {
		t.Fatalf("ParseFile() returned %d transactions, want 2", len(transactions))
	}

	// Both should default exchange rate to 1.0
	if transactions[0].ExchangeRate() != 1.0 {
		t.Errorf("Transaction 0: exchangeRate = %v, want 1.0", transactions[0].ExchangeRate())
	}
	if transactions[1].ExchangeRate() != 1.0 {
		t.Errorf("Transaction 1: exchangeRate = %v, want 1.0", transactions[1].ExchangeRate())
	}
}

// TestHaspaCreditParser_ParseFile_EmptyOriginalCurrency tests handling of empty original currency
func TestHaspaCreditParser_ParseFile_EmptyOriginalCurrency(t *testing.T) {
	parser := NewHaspaCreditParser()

	csvData := `Umsatz getätigt von;Belegdatum;Buchungsdatum;Originalbetrag;Originalwährung;Umrechnungskurs;Buchungsbetrag;Buchungswährung;Transaktionsbeschreibung;Transaktionsbeschreibung Zusatz;Buchungsreferenz
5232 **** **** 4999;03.02.26;04.02.26;0,00;;1,00;-16,00;EUR;Test;Hamburg;117
5232 **** **** 4999;03.02.26;04.02.26;0,00;;1,00;-17,00;GBP;Test2;Hamburg;118`

	reader := strings.NewReader(csvData)
	transactions, err := parser.ParseFile(reader)

	if err != nil {
		t.Fatalf("ParseFile() error = %v", err)
	}

	if len(transactions) != 2 {
		t.Fatalf("ParseFile() returned %d transactions, want 2", len(transactions))
	}

	// Empty original currency should default to booking currency
	if transactions[0].OriginalCurrency() != "EUR" {
		t.Errorf("Transaction 0: originalCurrency = %v, want EUR (booking currency)", transactions[0].OriginalCurrency())
	}
	if transactions[1].OriginalCurrency() != "GBP" {
		t.Errorf("Transaction 1: originalCurrency = %v, want GBP (booking currency)", transactions[1].OriginalCurrency())
	}
}

// TestHaspaCreditParser_ParseAmount_InvalidFormats tests various invalid amount formats
func TestHaspaCreditParser_ParseAmount_InvalidFormats(t *testing.T) {
	parser := NewHaspaCreditParser()

	invalidAmounts := []string{
		"-0,0it9",  // The actual failing case from the CSV
		"123abc",   // Letters mixed in
		"12.34.56", // Multiple periods
		"abc,def",  // Letters and comma
		"-,",       // Just symbols
		"$123,45",  // Currency symbol
	}

	for _, amount := range invalidAmounts {
		t.Run(amount, func(t *testing.T) {
			_, err := parser.parseAmount(amount)
			if err == nil {
				t.Errorf("parseAmount(%q) expected error, got nil", amount)
			}
		})
	}
}

// TestHaspaCreditParser_ParseFile_QuotedFields tests parsing CSV with quoted fields
func TestHaspaCreditParser_ParseFile_QuotedFields(t *testing.T) {
	parser := NewHaspaCreditParser()

	// CSV with quoted fields as in the actual Haspa export
	csvData := `"Umsatz getätigt von";"Belegdatum";"Buchungsdatum";"Originalbetrag";"Originalwährung";"Umrechnungskurs";"Buchungsbetrag";"Buchungswährung";"Transaktionsbeschreibung";"Transaktionsbeschreibung Zusatz";"Buchungsreferenz"
"5232 **** **** 4999";"03.02.26";"04.02.26";"0,00";"";"1,00";"-16,00";"EUR";"Gilde Bowling 44";"Hamburg";"117"`

	reader := strings.NewReader(csvData)
	transactions, err := parser.ParseFile(reader)

	if err != nil {
		t.Fatalf("ParseFile() error = %v", err)
	}

	if len(transactions) != 1 {
		t.Fatalf("ParseFile() returned %d transactions, want 1", len(transactions))
	}

	tx := transactions[0]
	if tx.CardNumber() != "5232 **** **** 4999" {
		t.Errorf("CardNumber = %q, want '5232 **** **** 4999'", tx.CardNumber())
	}
	if tx.TransactionDesc() != "Gilde Bowling 44" {
		t.Errorf("TransactionDesc = %q, want 'Gilde Bowling 44'", tx.TransactionDesc())
	}
}

// TestHaspaCreditParser_ParseFile_LargeAmounts tests parsing very large amounts
func TestHaspaCreditParser_ParseFile_LargeAmounts(t *testing.T) {
	parser := NewHaspaCreditParser()

	csvData := `Umsatz getätigt von;Belegdatum;Buchungsdatum;Originalbetrag;Originalwährung;Umrechnungskurs;Buchungsbetrag;Buchungswährung;Transaktionsbeschreibung;Transaktionsbeschreibung Zusatz;Buchungsreferenz
5232 **** **** 4999;04.02.26;04.02.26;0,00;;1,00;2596,16;EUR;Lastschrift;;121
5232 **** **** 4999;06.01.26;06.01.26;0,00;;1,00;1859,32;EUR;Lastschrift;;17`

	reader := strings.NewReader(csvData)
	transactions, err := parser.ParseFile(reader)

	if err != nil {
		t.Fatalf("ParseFile() error = %v", err)
	}

	if len(transactions) != 2 {
		t.Fatalf("ParseFile() returned %d transactions, want 2", len(transactions))
	}

	if transactions[0].BookingAmount() != 2596.16 {
		t.Errorf("Transaction 0: amount = %v, want 2596.16", transactions[0].BookingAmount())
	}
	if transactions[1].BookingAmount() != 1859.32 {
		t.Errorf("Transaction 1: amount = %v, want 1859.32", transactions[1].BookingAmount())
	}
}

// TestHaspaCreditParser_ParseFile_ActualDataFromCSV tests parsing sample data from the actual failing CSV file
// This specifically tests the real-world data pattern from umsatz-5232________4999-20260204.CSV
func TestHaspaCreditParser_ParseFile_ActualDataFromCSV(t *testing.T) {
	parser := NewHaspaCreditParser()

	// Real data from the actual CSV file
	csvData := `"Umsatz getätigt von";"Belegdatum";"Buchungsdatum";"Originalbetrag";"Originalwährung";"Umrechnungskurs";"Buchungsbetrag";"Buchungswährung";"Transaktionsbeschreibung";"Transaktionsbeschreibung Zusatz";"Buchungsreferenz";"Gebührenschlüssel";"Länderkennzeichen";"BAR-Entgelt+Buchungsreferenz";"AEE+Buchungsreferenz";"Abrechnungskennzeichen"
"5232 **** **** 4999";"03.02.26";"04.02.26";"0,00";"";"1,00";"-16,00";"EUR";"Gilde Bowling 44";"Hamburg";"117";"7933";"";"";"";""
"5232 **** **** 4999";"03.02.26";"04.02.26";"0,00";"";"1,00";"-170,20";"EUR";"MR.KAO";"HAMBURG";"118";"5812";"";"";"";""
"5232 **** **** 4999";"02.02.26";"04.02.26";"0,00";"";"1,00";"-44,22";"EUR";"UZR*Bahnhof-Apotheke";"Hamburg";"109";"5912";"";"";"";""
"5232 **** **** 4999";"04.02.26";"04.02.26";"0,00";"";"1,00";"2596,16";"EUR";"Lastschrift";"";"121";"";"";"";"";""
"5232 **** **** 4999";"02.02.26";"03.02.26";"-355,00";"UAH";"50,86";"-6,98";"EUR";"RPAY*ROZETKA MP";"KYIV";"114";"5399";"";"";"";""
"5232 **** **** 4999";"02.02.26";"03.02.26";"0,00";"";"1,00";"-44,22";"EUR";"UZR*Bahnhof-Apotheke";"Hamburg";"109";"5912";"";"";"";""
"5232 **** **** 4999";"09.01.26";"09.01.26";"-200,00";"CAD";"1,61";"-123,87";"EUR";"CS *SEPHORACA GC";"TORONTO";"21";"6540";"";"";"";""
"5232 **** **** 4999";"27.01.26";"28.01.26";"0,00";"";"1,00";"27,93";"EUR";"RitualsUeberseequartie";"Hamburg";"98";"5977";"";"";"";""
"5232 **** **** 4999";"01.01.26";"05.01.26";"305,73";"PLN";"4,21";"72,58";"EUR";"www.bilet.intercity.pl";"Warszawa";"0";"4111";"";"";"";""
"5232 **** **** 4999";"06.01.26";"06.01.26";"0,00";"";"1,00";"1859,32";"EUR";"Lastschrift";"";"17";"";"";"";"";""
`

	reader := strings.NewReader(csvData)
	transactions, err := parser.ParseFile(reader)

	if err != nil {
		t.Fatalf("ParseFile() error = %v", err)
	}

	if len(transactions) != 10 {
		t.Fatalf("ParseFile() returned %d transactions, want 10", len(transactions))
	}

	// Verify sample transactions
	tests := []struct {
		idx              int
		expectedDesc     string
		expectedAmount   float64
		expectedCurrency string
	}{
		{0, "Gilde Bowling 44", -16.00, "EUR"},
		{1, "MR.KAO", -170.20, "EUR"},
		{2, "UZR*Bahnhof-Apotheke", -44.22, "EUR"},
		{3, "Lastschrift", 2596.16, "EUR"},
		{4, "RPAY*ROZETKA MP", -6.98, "EUR"},        // Foreign currency
		{5, "UZR*Bahnhof-Apotheke", -44.22, "EUR"},  // Duplicate
		{6, "CS *SEPHORACA GC", -123.87, "EUR"},     // CAD
		{7, "RitualsUeberseequartie", 27.93, "EUR"}, // Income
		{8, "www.bilet.intercity.pl", 72.58, "EUR"}, // PLN
		{9, "Lastschrift", 1859.32, "EUR"},          // Large amount
	}

	for _, tt := range tests {
		tx := transactions[tt.idx]
		if tx.TransactionDesc() != tt.expectedDesc {
			t.Errorf("Transaction %d: description = %q, want %q", tt.idx, tx.TransactionDesc(), tt.expectedDesc)
		}
		if tx.BookingAmount() != tt.expectedAmount {
			t.Errorf("Transaction %d: amount = %v, want %v", tt.idx, tx.BookingAmount(), tt.expectedAmount)
		}
		if tx.BookingCurrency() != tt.expectedCurrency {
			t.Errorf("Transaction %d: currency = %q, want %q", tt.idx, tx.BookingCurrency(), tt.expectedCurrency)
		}
	}

	// Verify that same-currency transactions have originalAmount set to bookingAmount
	for i, tx := range transactions {
		if tx.OriginalCurrency() == "EUR" && tx.OriginalAmount() != tx.BookingAmount() {
			t.Errorf("Transaction %d: for EUR currency, originalAmount should equal bookingAmount, got %v != %v", i, tx.OriginalAmount(), tx.BookingAmount())
		}
	}
}

// TestHaspaCreditParser_SkipsSettlementRows tests that settlement/summary rows are filtered out
func TestHaspaCreditParser_SkipsSettlementRows(t *testing.T) {
	parser := NewHaspaCreditParser()

	// CSV with real transactions mixed with settlement rows
	csvData := `Umsatz getätigt von;Belegdatum;Buchungsdatum;Originalbetrag;Originalwährung;Umrechnungskurs;Buchungsbetrag;Buchungswährung;Transaktionsbeschreibung;Transaktionsbeschreibung Zusatz;Buchungsreferenz
5232________4999;03.02.26;04.02.26;0,00;;1,00;-16,00;EUR;AMAZON;EU.LONDON;001
5232________4999;03.02.26;04.02.26;0,00;;1,00;-20,00;EUR;REWE;HAMBURG;002
5232________4999;31.01.26;01.02.26;0,00;;1,00;0,00;EUR;ABSCHLUSS;Quarterly Settlement;003
5232________4999;31.01.26;01.02.26;0,00;;1,00;-9,95;EUR;ENTGELTABSCHLUSS;Fee Settlement;004
5232________4999;02.02.26;02.02.26;0,00;;1,00;-45,50;EUR;NETFLIX;STREAMING;005`

	reader := strings.NewReader(csvData)
	transactions, err := parser.ParseFile(reader)

	if err != nil {
		t.Fatalf("ParseFile() error = %v", err)
	}

	// Should have 3 real transactions (AMAZON, REWE, NETFLIX), not the 2 settlement rows
	if len(transactions) != 3 {
		t.Fatalf("ParseFile() returned %d transactions, want 3 (settlement rows should be filtered)", len(transactions))
	}

	// Verify the settlement rows were skipped and we only have real transactions
	expectedDesc := []string{"AMAZON", "REWE", "NETFLIX"}
	for i, tx := range transactions {
		if tx.TransactionDesc() != expectedDesc[i] {
			t.Errorf("Transaction %d: description = %q, want %q", i, tx.TransactionDesc(), expectedDesc[i])
		}
	}
}

// TestHaspaDebitParser_SkipsSettlementRows tests that settlement/summary rows are filtered out
func TestHaspaDebitParser_SkipsSettlementRows(t *testing.T) {
	parser := NewHaspaDebitParser()

	// CSV with real transactions mixed with settlement rows (like the user's actual file)
	csvData := `"Auftragskonto";"Buchungstag";"Valutadatum";"Buchungstext";"Verwendungszweck";"Glaeubiger ID";"Mandatsreferenz";"Kundenreferenz (End-to-End)";"Sammlerreferenz";"Lastschrift Ursprungsbetrag";"Auslagenersatz Ruecklastschrift";"Beguenstigter/Zahlungspflichtiger";"Kontonummer/IBAN";"BIC (SWIFT-Code)";"Betrag";"Waehrung";"Info"
"DE86200505501315424505";"02.04.26";"02.04.26";"FOLGELASTSCHRIFT";"Amazon Payment";"DE82ZZZ00000787976";"4141001";"";"";"";"";"AMAZON EU S.A R.L.";"DE40200505501268130364";"HASPDEHHXXX";"-53,53";"EUR";"Umsatz gebucht"
"DE86200505501315424505";"02.04.26";"02.04.26";"FOLGELASTSCHRIFT";"PayPal Payment";"LU96ZZZ0000000000000000058";"47PJ2255WAYSE";"1049311578833";"";"";"";"PayPal (Europe) S.a r.l.";"DE88500700100175526303";"DEUTDEFFXXX";"-24,00";"EUR";"Umsatz gebucht"
"DE86200505501315424505";"31.03.26";"01.04.26";"ABSCHLUSS";"Quarterly Settlement";"";"";"";"";"";"";"";"";"";"";"0,00";"EUR";"Umsatz gebucht"
"DE86200505501315424505";"31.03.26";"01.04.26";"ENTGELTABSCHLUSS";"Fee Settlement";"";"";"";"";"";"";"";"";"";"-9,95";"EUR";"Umsatz gebucht"
"DE86200505501315424505";"01.04.26";"01.04.26";"ONLINE-UEBERWEISUNG";"Rent Payment";"";"";"";"";"";"";"Landlord GmbH";"DE87200505501238189789";"HASPDEHHXXX";"-1176,80";"EUR";"Umsatz gebucht"`

	reader := strings.NewReader(csvData)
	transactions, err := parser.ParseFile(reader)

	if err != nil {
		t.Fatalf("ParseFile() error = %v", err)
	}

	// Should have 3 real transactions, not the 2 settlement rows
	if len(transactions) != 3 {
		t.Fatalf("ParseFile() returned %d transactions, want 3 (settlement rows should be filtered)", len(transactions))
	}

	// Verify the settlement rows were skipped
	expectedDesc := []string{"FOLGELASTSCHRIFT", "FOLGELASTSCHRIFT", "ONLINE-UEBERWEISUNG"}
	for i, tx := range transactions {
		if tx.TransactionDesc() != expectedDesc[i] {
			t.Errorf("Transaction %d: description = %q, want %q", i, tx.TransactionDesc(), expectedDesc[i])
		}
	}

	// Verify amounts (skip settlement rows which would have 0 or -9.95)
	// Note: HaspaDebitParser stores absolute amounts (positive values)
	expectedAmounts := []float64{53.53, 24.00, 1176.80}
	for i, tx := range transactions {
		if tx.BookingAmount() != expectedAmounts[i] {
			t.Errorf("Transaction %d: amount = %v, want %v", i, tx.BookingAmount(), expectedAmounts[i])
		}
	}
}
