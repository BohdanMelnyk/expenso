package auth

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"io"

	"github.com/pquerna/otp/totp"

	"expenso-backend/usecases/interfaces/services"
)

type TOTPServiceImpl struct {
	encryptionKey []byte // 32 bytes for AES-256
	issuer        string
}

func NewTOTPService(encryptionKey []byte, issuer string) (services.TOTPService, error) {
	if len(encryptionKey) != 32 {
		return nil, errors.New("totp encryption key must be 32 bytes")
	}
	return &TOTPServiceImpl{encryptionKey: encryptionKey, issuer: issuer}, nil
}

func (s *TOTPServiceImpl) GenerateSecret(accountLabel string) (string, string, error) {
	key, err := totp.Generate(totp.GenerateOpts{
		Issuer:      s.issuer,
		AccountName: accountLabel,
	})
	if err != nil {
		return "", "", err
	}

	encrypted, err := s.encrypt(key.Secret())
	if err != nil {
		return "", "", err
	}

	return encrypted, key.URL(), nil
}

func (s *TOTPServiceImpl) VerifyCode(encryptedSecret, code string) (bool, error) {
	secret, err := s.decrypt(encryptedSecret)
	if err != nil {
		return false, err
	}
	return totp.Validate(code, secret), nil
}

func (s *TOTPServiceImpl) encrypt(plaintext string) (string, error) {
	block, err := aes.NewCipher(s.encryptionKey)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}
	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

func (s *TOTPServiceImpl) decrypt(encoded string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(s.encryptionKey)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}
	nonce, ciphertext := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", err
	}
	return string(plaintext), nil
}
