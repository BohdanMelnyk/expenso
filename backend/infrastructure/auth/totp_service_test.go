package auth_test

import (
	"net/url"
	"testing"
	"time"

	"github.com/pquerna/otp/totp"

	"expenso-backend/infrastructure/auth"
)

func testEncryptionKey() []byte {
	return []byte("01234567890123456789012345678901") // 32 bytes for AES-256
}

func secretFromOTPAuthURL(t *testing.T, otpauthURL string) string {
	t.Helper()
	parsed, err := url.Parse(otpauthURL)
	if err != nil {
		t.Fatalf("failed to parse otpauth URL: %v", err)
	}
	secret := parsed.Query().Get("secret")
	if secret == "" {
		t.Fatal("otpauth URL missing secret query param")
	}
	return secret
}

func TestTOTPService_GenerateAndVerify(t *testing.T) {
	svc, err := auth.NewTOTPService(testEncryptionKey(), "Expenso")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	encrypted, otpauthURL, err := svc.GenerateSecret("alice")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if otpauthURL == "" {
		t.Fatal("expected non-empty otpauth URL")
	}

	secret := secretFromOTPAuthURL(t, otpauthURL)
	code, err := totp.GenerateCode(secret, time.Now())
	if err != nil {
		t.Fatalf("failed to generate test code: %v", err)
	}

	valid, err := svc.VerifyCode(encrypted, code)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !valid {
		t.Error("expected valid code to verify successfully")
	}
}

func TestTOTPService_RejectsWrongCode(t *testing.T) {
	svc, _ := auth.NewTOTPService(testEncryptionKey(), "Expenso")
	encrypted, _, _ := svc.GenerateSecret("alice")

	valid, err := svc.VerifyCode(encrypted, "000000")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if valid {
		t.Error("expected wrong code to reject")
	}
}

func TestNewTOTPService_RejectsWrongKeyLength(t *testing.T) {
	_, err := auth.NewTOTPService([]byte("too-short"), "Expenso")
	if err == nil {
		t.Fatal("expected error for a non-32-byte encryption key")
	}
}
