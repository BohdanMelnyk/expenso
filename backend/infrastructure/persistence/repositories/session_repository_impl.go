package repositories

import (
	"database/sql"
	"fmt"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/persistence/models"
	irepositories "expenso-backend/usecases/interfaces/repositories"
)

type SessionRepositoryImpl struct {
	db *sql.DB
}

func NewSessionRepository(db *sql.DB) irepositories.SessionRepository {
	return &SessionRepositoryImpl{db: db}
}

func (r *SessionRepositoryImpl) Save(session *entities.Session) error {
	query := `
		INSERT INTO sessions (user_id, token_hash, expires_at, last_seen_at, created_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`
	var id int
	err := r.db.QueryRow(
		query,
		int(session.UserID()),
		session.TokenHash(),
		session.ExpiresAt(),
		session.LastSeenAt(),
		session.CreatedAt(),
	).Scan(&id)
	if err != nil {
		return fmt.Errorf("failed to save session: %w", err)
	}
	session.SetID(entities.SessionID(id))
	return nil
}

func (r *SessionRepositoryImpl) FindByTokenHash(tokenHash string) (*entities.Session, error) {
	query := `
		SELECT id, user_id, token_hash, expires_at, last_seen_at, created_at
		FROM sessions
		WHERE token_hash = $1
	`
	var dbo models.SessionDBO
	err := r.db.QueryRow(query, tokenHash).Scan(
		&dbo.ID, &dbo.UserID, &dbo.TokenHash, &dbo.ExpiresAt, &dbo.LastSeenAt, &dbo.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, entities.ErrSessionNotFound
		}
		return nil, fmt.Errorf("failed to find session: %w", err)
	}
	return dbo.ToDomainEntity(), nil
}

func (r *SessionRepositoryImpl) Update(session *entities.Session) error {
	query := `
		UPDATE sessions
		SET expires_at = $2, last_seen_at = $3
		WHERE id = $1
	`
	result, err := r.db.Exec(query, int(session.ID()), session.ExpiresAt(), session.LastSeenAt())
	if err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check update result: %w", err)
	}
	if rowsAffected == 0 {
		return entities.ErrSessionNotFound
	}
	return nil
}

func (r *SessionRepositoryImpl) DeleteByTokenHash(tokenHash string) error {
	query := `DELETE FROM sessions WHERE token_hash = $1`
	result, err := r.db.Exec(query, tokenHash)
	if err != nil {
		return fmt.Errorf("failed to delete session: %w", err)
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check delete result: %w", err)
	}
	if rowsAffected == 0 {
		return entities.ErrSessionNotFound
	}
	return nil
}
