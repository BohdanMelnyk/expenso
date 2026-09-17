package models

import (
	"time"

	"expenso-backend/domain/entities"
)

type UserDBO struct {
	ID                  int       `db:"id"`
	Username            string    `db:"username"`
	PasswordHash        string    `db:"password_hash"`
	TOTPSecretEncrypted string    `db:"totp_secret_encrypted"`
	CreatedAt           time.Time `db:"created_at"`
}

func (dbo *UserDBO) ToDomainEntity() *entities.User {
	return entities.ReconstructUser(
		entities.UserID(dbo.ID),
		dbo.Username,
		dbo.PasswordHash,
		dbo.TOTPSecretEncrypted,
		dbo.CreatedAt,
	)
}
