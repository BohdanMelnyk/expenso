package entities_test

import (
	"testing"
	"time"

	"expenso-backend/domain/entities"
)

func TestNewSnapshot_Valid(t *testing.T) {
	date := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	s, err := entities.NewSnapshot(date, 5000.00, 1000, 500, 300, 200, 800, 600, 400, 350, 100, 150, 100)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if s.Total() != 5000.00 {
		t.Errorf("expected total 5000.00, got %v", s.Total())
	}
	if s.Haspa() != 1000 {
		t.Errorf("expected haspa 1000, got %v", s.Haspa())
	}
}

func TestNewSnapshot_ZeroTotal_Fails(t *testing.T) {
	date := time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC)
	_, err := entities.NewSnapshot(date, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
	if err == nil {
		t.Fatal("expected error for zero total")
	}
}

func TestNewSnapshot_FutureDate_Fails(t *testing.T) {
	futureDate := time.Now().AddDate(0, 0, 1)
	_, err := entities.NewSnapshot(futureDate, 1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
	if err == nil {
		t.Fatal("expected error for future date")
	}
}
