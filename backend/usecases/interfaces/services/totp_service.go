package services

type TOTPService interface {
	// GenerateSecret creates a new TOTP secret for accountLabel, returning the
	// AES-GCM-encrypted secret (for storage) and the otpauth:// URL (to render
	// as a QR code for the authenticator app — it carries the secret in
	// plaintext, which is expected and required for enrollment).
	GenerateSecret(accountLabel string) (encryptedSecret string, otpauthURL string, err error)
	// VerifyCode checks a 6-digit TOTP code against an encrypted secret.
	VerifyCode(encryptedSecret string, code string) (bool, error)
}
