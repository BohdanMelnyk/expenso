// backend/usecases/interfaces/services/password_hasher.go
package services

type PasswordHasher interface {
	Hash(password string) (string, error)
	Verify(hash, password string) bool
}
