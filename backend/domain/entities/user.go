package entities

import (
	"errors"
	"strings"
	"time"
)

type UserID int

var (
	ErrUserNotFound       = errors.New("user not found")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUsernameTaken      = errors.New("username already taken")
)

type User struct {
	id                  UserID
	username            string
	passwordHash        string
	totpSecretEncrypted string
	createdAt           time.Time
}

func NewUser(username, passwordHash, totpSecretEncrypted string) (*User, error) {
	trimmed := strings.TrimSpace(username)
	if trimmed == "" {
		return nil, errors.New("username cannot be empty")
	}
	if passwordHash == "" {
		return nil, errors.New("password hash cannot be empty")
	}
	if totpSecretEncrypted == "" {
		return nil, errors.New("totp secret cannot be empty")
	}

	return &User{
		username:            trimmed,
		passwordHash:        passwordHash,
		totpSecretEncrypted: totpSecretEncrypted,
		createdAt:           time.Now(),
	}, nil
}

func ReconstructUser(id UserID, username, passwordHash, totpSecretEncrypted string, createdAt time.Time) *User {
	return &User{
		id:                  id,
		username:            username,
		passwordHash:        passwordHash,
		totpSecretEncrypted: totpSecretEncrypted,
		createdAt:           createdAt,
	}
}

func (u *User) ID() UserID                  { return u.id }
func (u *User) Username() string            { return u.username }
func (u *User) PasswordHash() string        { return u.passwordHash }
func (u *User) TOTPSecretEncrypted() string { return u.totpSecretEncrypted }
func (u *User) CreatedAt() time.Time        { return u.createdAt }
func (u *User) SetID(id UserID)             { u.id = id }
