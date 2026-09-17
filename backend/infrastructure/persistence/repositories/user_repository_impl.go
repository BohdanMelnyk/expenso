package repositories

import (
	"database/sql"
	"fmt"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/persistence/models"
	irepositories "expenso-backend/usecases/interfaces/repositories"
)

type UserRepositoryImpl struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) irepositories.UserRepository {
	return &UserRepositoryImpl{db: db}
}

func (r *UserRepositoryImpl) Save(user *entities.User) error {
	query := `
		INSERT INTO users (username, password_hash, totp_secret_encrypted, created_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`
	var id int
	err := r.db.QueryRow(
		query,
		user.Username(),
		user.PasswordHash(),
		user.TOTPSecretEncrypted(),
		user.CreatedAt(),
	).Scan(&id)
	if err != nil {
		return fmt.Errorf("failed to save user: %w", err)
	}
	user.SetID(entities.UserID(id))
	return nil
}

func (r *UserRepositoryImpl) FindByUsername(username string) (*entities.User, error) {
	query := `
		SELECT id, username, password_hash, totp_secret_encrypted, created_at
		FROM users
		WHERE username = $1
	`
	var dbo models.UserDBO
	err := r.db.QueryRow(query, username).Scan(
		&dbo.ID, &dbo.Username, &dbo.PasswordHash, &dbo.TOTPSecretEncrypted, &dbo.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, entities.ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to find user: %w", err)
	}
	return dbo.ToDomainEntity(), nil
}

func (r *UserRepositoryImpl) FindByID(id entities.UserID) (*entities.User, error) {
	query := `
		SELECT id, username, password_hash, totp_secret_encrypted, created_at
		FROM users
		WHERE id = $1
	`
	var dbo models.UserDBO
	err := r.db.QueryRow(query, int(id)).Scan(
		&dbo.ID, &dbo.Username, &dbo.PasswordHash, &dbo.TOTPSecretEncrypted, &dbo.CreatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, entities.ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to find user: %w", err)
	}
	return dbo.ToDomainEntity(), nil
}

func (r *UserRepositoryImpl) FindAll() ([]*entities.User, error) {
	query := `
		SELECT id, username, password_hash, totp_secret_encrypted, created_at
		FROM users
		ORDER BY id
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query users: %w", err)
	}
	defer rows.Close()

	var users []*entities.User
	for rows.Next() {
		var dbo models.UserDBO
		err := rows.Scan(
			&dbo.ID, &dbo.Username, &dbo.PasswordHash, &dbo.TOTPSecretEncrypted, &dbo.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan user: %w", err)
		}
		users = append(users, dbo.ToDomainEntity())
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating users: %w", err)
	}

	return users, nil
}
