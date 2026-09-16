package entities_test

import (
	"testing"
	"time"

	"expenso-backend/domain/entities"
)

func TestNewSnapshot_Valid(t *testing.T) {
	date := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	s, err := entities.NewSnapshot(date, 1000, 500, 300, 200, 800, 600, 400, 350, 100, 150, 100, 0, 0, 0)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	expectedTotal := 1000.0 + 500 + 300 + 200 + 800 + 600 + 400 + 350 + 100 + 150 + 100
	if s.Total() != expectedTotal {
		t.Errorf("expected total %v, got %v", expectedTotal, s.Total())
	}
	if s.Haspa() != 1000 {
		t.Errorf("expected haspa 1000, got %v", s.Haspa())
	}
}

func TestNewSnapshot_FutureDate_Fails(t *testing.T) {
	futureDate := time.Now().AddDate(0, 0, 1)
	_, err := entities.NewSnapshot(futureDate, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
	if err == nil {
		t.Fatal("expected error for future date")
	}
}

func TestNewSnapshot_ENBDConvertedToEURAndIncludedInTotal(t *testing.T) {
	date := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	s, err := entities.NewSnapshot(date, 1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 4000, 0.25)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if s.ENBDAED() != 4000 {
		t.Errorf("expected ENBDAED 4000, got %v", s.ENBDAED())
	}
	expectedENBDEUR := 4000.0 * 0.25
	if s.ENBDEUR() != expectedENBDEUR {
		t.Errorf("expected ENBDEUR %v, got %v", expectedENBDEUR, s.ENBDEUR())
	}
	expectedTotal := 1000.0 + expectedENBDEUR
	if s.Total() != expectedTotal {
		t.Errorf("expected total %v, got %v", expectedTotal, s.Total())
	}
}
