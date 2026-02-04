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
