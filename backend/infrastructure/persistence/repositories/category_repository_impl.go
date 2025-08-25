package repositories

import (
	"database/sql"
	"fmt"
	"time"

	"expenso-backend/domain/entities"
	"expenso-backend/usecases/interfaces/repositories"
)

type CategoryRepositoryImpl struct {
	db *sql.DB
}

func NewCategoryRepository(db *sql.DB) repositories.CategoryRepository {
	return &CategoryRepositoryImpl{db: db}
}

func (r *CategoryRepositoryImpl) Save(category *entities.CategoryEntity) error {
	query := `
		INSERT INTO categories (name, color, icon, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`

	var id int
	err := r.db.QueryRow(
		query,
		category.Name(),
		category.Color(),
		category.Icon(),
		category.CreatedAt(),
		category.UpdatedAt(),
	).Scan(&id)

	if err != nil {
		return fmt.Errorf("failed to save category: %w", err)
	}

	category.SetID(entities.CategoryID(id))
	return nil
}

func (r *CategoryRepositoryImpl) FindByID(id entities.CategoryID) (*entities.CategoryEntity, error) {
	query := `
		SELECT id, name, color, icon, created_at, updated_at
		FROM categories
		WHERE id = $1
	`

	var categoryID int
	var name, color, icon string
	var createdAt, updatedAt string

	row := r.db.QueryRow(query, int(id))
	err := row.Scan(&categoryID, &name, &color, &icon, &createdAt, &updatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, entities.ErrCategoryNotFound
		}
		return nil, fmt.Errorf("failed to find category: %w", err)
	}

	// Parse timestamps
	createdAtTime, err := parseTimestamp(createdAt)
	if err != nil {
		return nil, fmt.Errorf("failed to parse created_at: %w", err)
	}

	updatedAtTime, err := parseTimestamp(updatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to parse updated_at: %w", err)
	}

	return entities.ReconstructCategory(
		entities.CategoryID(categoryID),
		name,
		color,
		icon,
		createdAtTime,
		updatedAtTime,
	), nil
}

func (r *CategoryRepositoryImpl) FindByName(name string) (*entities.CategoryEntity, error) {
	query := `
		SELECT id, name, color, icon, created_at, updated_at
		FROM categories
		WHERE name = $1
	`

	var categoryID int
	var categoryName, color, icon string
	var createdAt, updatedAt string

	row := r.db.QueryRow(query, name)
	err := row.Scan(&categoryID, &categoryName, &color, &icon, &createdAt, &updatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, entities.ErrCategoryNotFound
		}
		return nil, fmt.Errorf("failed to find category: %w", err)
	}

	// Parse timestamps
	createdAtTime, err := parseTimestamp(createdAt)
	if err != nil {
		return nil, fmt.Errorf("failed to parse created_at: %w", err)
	}

	updatedAtTime, err := parseTimestamp(updatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to parse updated_at: %w", err)
	}

	return entities.ReconstructCategory(
		entities.CategoryID(categoryID),
		categoryName,
		color,
		icon,
		createdAtTime,
		updatedAtTime,
	), nil
}

func (r *CategoryRepositoryImpl) FindAll() ([]*entities.CategoryEntity, error) {
	query := `
		SELECT id, name, color, icon, created_at, updated_at
		FROM categories
		ORDER BY name ASC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to find categories: %w", err)
	}
	defer rows.Close()

	var categories []*entities.CategoryEntity
	for rows.Next() {
		var categoryID int
		var name, color, icon string
		var createdAt, updatedAt string

		err := rows.Scan(&categoryID, &name, &color, &icon, &createdAt, &updatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan category: %w", err)
		}

		// Parse timestamps
		createdAtTime, err := parseTimestamp(createdAt)
		if err != nil {
			return nil, fmt.Errorf("failed to parse created_at: %w", err)
		}

		updatedAtTime, err := parseTimestamp(updatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to parse updated_at: %w", err)
		}

		category := entities.ReconstructCategory(
			entities.CategoryID(categoryID),
			name,
			color,
			icon,
			createdAtTime,
			updatedAtTime,
		)

		categories = append(categories, category)
	}

	return categories, nil
}

func (r *CategoryRepositoryImpl) Update(category *entities.CategoryEntity) error {
	query := `
		UPDATE categories 
		SET name = $2, color = $3, icon = $4, updated_at = $5
		WHERE id = $1
	`

	result, err := r.db.Exec(
		query,
		int(category.ID()),
		category.Name(),
		category.Color(),
		category.Icon(),
		category.UpdatedAt(),
	)

	if err != nil {
		return fmt.Errorf("failed to update category: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check update result: %w", err)
	}

	if rowsAffected == 0 {
		return entities.ErrCategoryNotFound
	}

	return nil
}

func (r *CategoryRepositoryImpl) Delete(id entities.CategoryID) error {
	query := `DELETE FROM categories WHERE id = $1`

	result, err := r.db.Exec(query, int(id))
	if err != nil {
		return fmt.Errorf("failed to delete category: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check delete result: %w", err)
	}

	if rowsAffected == 0 {
		return entities.ErrCategoryNotFound
	}

	return nil
}

// Helper function to parse timestamps
func parseTimestamp(timestamp string) (time.Time, error) {
	return time.Parse("2006-01-02T15:04:05Z07:00", timestamp)
}
