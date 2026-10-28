//go:build llmeval

// Live evaluation of the parsing prompts against the real LLM and the local database.
// Costs a few cents per run. Run from backend/:
//
//	go test -tags=llmeval -run TestLLMEval -v ./usecases/interactors/expense/
package expense

import (
	"database/sql"
	"os"
	"testing"
	"time"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/config"
	"expenso-backend/infrastructure/llm"
	"expenso-backend/infrastructure/persistence/repositories"

	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

type evalCase struct {
	input        string
	wantVendor   string // "" means no vendor expected; "*" means any vendor is fine
	wantCategory string
}

func newEvalParser(t *testing.T) *ExpenseParser {
	t.Helper()
	if err := os.Chdir("../../.."); err != nil {
		t.Fatal(err)
	}
	_ = godotenv.Load()
	cfg, err := config.LoadConfigForEnvironment()
	if err != nil {
		t.Fatal(err)
	}
	db, err := sql.Open("postgres", cfg.GetDatabaseURL())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	return NewExpenseParser(llm.NewAnthropicClient(cfg.LLM), repositories.NewVendorRepository(db), repositories.NewCategoryRepository(db))
}

func checkEval(t *testing.T, c evalCase, parsed *ParsedExpenseData, err error) {
	t.Helper()
	if err != nil {
		t.Errorf("%-40q error: %v", c.input, err)
		return
	}
	gotVendor := parsed.MatchedVendorName
	vendorOK := c.wantVendor == "*" || gotVendor == c.wantVendor
	if !vendorOK || parsed.Category != c.wantCategory {
		t.Errorf("%-40q got %q / %q, want %q / %q", c.input, gotVendor, parsed.Category, c.wantVendor, c.wantCategory)
		return
	}
	t.Logf("ok %-40q -> %q / %q (%.2f)", c.input, gotVendor, parsed.Category, parsed.ConfidenceScore)
}

func TestLLMEval(t *testing.T) {
	parser := newEvalParser(t)
	mapper := NewBankTransactionMapper(parser.llmClient, parser.vendorRepo, parser)

	t.Run("text", func(t *testing.T) {
		for _, c := range []evalCase{
			{"50 euro gift for Anna's birthday yesterday", "Gift", "Gifts & Donations"},
			{"donated 20 to the red cross", "Donation", "Gifts & Donations"},
			{"dinner with friends at a restaurant 80 eur", "Restaurant", "Dining with Friends"},
			{"lunch at a restaurant 14.50", "Restaurant", "Dining"},
			{"fitness studio membership 35", "Fitness Studio", "Health & Fitness"},
			{"telekom bill 40", "Telekom", "Living"},
			{"groceries at a new turkish market 23", "Else", "Food Store"},
			{"concert tickets 120 cash", "Concert", "Entertainment"},
			{"vabali spa day 45", "Vabali", "Health & Fitness"},
			{"bread at junge 6.40", "Junge", "Food Store"},
		} {
			parsed, err := parser.ParseExpense(c.input)
			checkEval(t, c, parsed, err)
		}
	})

	t.Run("bank", func(t *testing.T) {
		for _, c := range []evalCase{
			{"REWE MARKT GMBH-ZW//HAMBURG/DE", "Rewe", "Food Store"},
			{"HamburgHochbahn LogPay", "HVV", "Transportation"},
			{"DM-DROGERIE MARKT//HAMBURG/DE", "DM", "Household"},
			{"ROSSMANN 1234//HAMBURG/DE", "Else", "Household"},
			{"SPOTIFY AB", "", "Bills & Utilities"},
			{"NETFLIX.COM", "Netflix", "Bills & Utilities"},
			{"VODAFONE GMBH", "", "Living"},
			{"O2 GERMANY GMBH", "", "Living"},
			{"Deutsche Telekom AG", "Telekom", "Living"},
			{"Willy.tel GmbH", "Internet", "Living"},
			{"Abasto GmbH", "Electricity", "Living"},
			{"UNICEF SPENDE", "Donation", "Gifts & Donations"},
			{"VABALI SPA HAMBURG", "Vabali", "Health & Fitness"},
			{"URBAN SPORTS GMBH", "Urban Sport", "Health & Fitness"},
			{"ELBPHILHARMONIE TICKETS", "*", "Entertainment"},
			{"SHELL 1234//HAMBURG/DE", "Benzin", "Car"},
			{"DB VERTRIEB GMBH", "DB", "Transportation"},
			{"APOTHEKE AM MARKT", "Apotheke", "Health & Fitness"},
			{"KIOSK AM BAHNHOF//GELSENKIRCHEN/DE", "Kiosk", "Dining with Friends"},
			{"BAEDERLAND HAMBURG", "Bäderland", "Health & Fitness"},
			{"Behrendt Immobilien Verwaltung GmbH Co KG", "Parking Spot", "Car"},
		} {
			tx, err := entities.NewBankTransaction("1234", time.Now(), time.Now(), -20, "EUR", 1, -20, "EUR", c.input, "", "")
			if err != nil {
				t.Fatal(err)
			}
			parsed, err := mapper.MapToExpenseData(tx)
			checkEval(t, c, parsed, err)
		}
	})
}
