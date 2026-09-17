// backend/infrastructure/auth/bcrypt_password_hasher.go
package auth

import (
	"golang.org/x/crypto/bcrypt"

	"expenso-backend/usecases/interfaces/services"
)

const bcryptCost = 12

type BcryptPasswordHasher struct{}

func NewBcryptPasswordHasher() services.PasswordHasher {
	return &BcryptPasswordHasher{}
}

func (h *BcryptPasswordHasher) Hash(password string) (string, error) {
	hashed, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", err
	}
	return string(hashed), nil
}

func (h *BcryptPasswordHasher) Verify(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
