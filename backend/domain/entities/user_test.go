package entities_test

import (
	"testing"

	"expenso-backend/domain/entities"
)

func TestNewUser(t *testing.T) {
	u, err := entities.NewUser("alice", "hashed-password", "encrypted-secret")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if u.Username() != "alice" {
		t.Errorf("expected username 'alice', got %q", u.Username())
	}
}

func TestNewUser_EmptyUsername(t *testing.T) {
	_, err := entities.NewUser("  ", "hashed-password", "encrypted-secret")
	if err == nil {
		t.Fatal("expected error for empty username, got nil")
	}
}

func TestNewUser_EmptyPasswordHash(t *testing.T) {
	_, err := entities.NewUser("alice", "", "encrypted-secret")
	if err == nil {
		t.Fatal("expected error for empty password hash, got nil")
	}
}

func TestNewUser_EmptyTOTPSecret(t *testing.T) {
	_, err := entities.NewUser("alice", "hashed-password", "")
	if err == nil {
		t.Fatal("expected error for empty totp secret, got nil")
	}
}
