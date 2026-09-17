// backend/infrastructure/auth/bcrypt_password_hasher_test.go
package auth_test

import (
	"testing"

	"expenso-backend/infrastructure/auth"
)

func TestBcryptPasswordHasher_HashAndVerify(t *testing.T) {
	h := auth.NewBcryptPasswordHasher()

	hash, err := h.Hash("correct horse battery staple")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if !h.Verify(hash, "correct horse battery staple") {
		t.Error("expected correct password to verify")
	}
}

func TestBcryptPasswordHasher_RejectsWrongPassword(t *testing.T) {
	h := auth.NewBcryptPasswordHasher()
	hash, _ := h.Hash("correct horse battery staple")

	if h.Verify(hash, "wrong password") {
		t.Error("expected wrong password to fail verification")
	}
}
