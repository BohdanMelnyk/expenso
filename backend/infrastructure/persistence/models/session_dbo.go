package models

import (
	"time"

	"expenso-backend/domain/entities"
)

type SessionDBO struct {
	ID         int       `db:"id"`
	UserID     int       `db:"user_id"`
	TokenHash  string    `db:"token_hash"`
	ExpiresAt  time.Time `db:"expires_at"`
	LastSeenAt time.Time `db:"last_seen_at"`
	CreatedAt  time.Time `db:"created_at"`
}

func (dbo *SessionDBO) ToDomainEntity() *entities.Session {
	return entities.ReconstructSession(
		entities.SessionID(dbo.ID),
		entities.UserID(dbo.UserID),
		dbo.TokenHash,
		dbo.ExpiresAt,
		dbo.LastSeenAt,
		dbo.CreatedAt,
	)
}
