package repositories

import (
	"database/sql"
	"fmt"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/persistence/models"
	"expenso-backend/usecases/interfaces/repositories"
)

type VendorRepositoryImpl struct {
	db *sql.DB
}

func NewVendorRepository(db *sql.DB) repositories.VendorRepository {
	return &VendorRepositoryImpl{db: db}
}

func (r *VendorRepositoryImpl) Save(vendor *entities.Vendor) error {
	query := `
		INSERT INTO vendors (name, type, created_at, updated_at)
		VALUES ($1, $2, $3, $4)
		RETURNING id
	`

	var id int
	err := r.db.QueryRow(
		query,
		vendor.Name(),
		string(vendor.Type()),
		vendor.CreatedAt(),
		vendor.UpdatedAt(),
	).Scan(&id)

	if err != nil {
		return fmt.Errorf("failed to save vendor: %w", err)
	}

	vendor.SetID(entities.VendorID(id))
	return nil
}

func (r *VendorRepositoryImpl) FindByID(id entities.VendorID) (*entities.Vendor, error) {
	query := `SELECT id, name, type, created_at, updated_at FROM vendors WHERE id = $1`

	var dbo models.VendorDBO
	row := r.db.QueryRow(query, int(id))
	err := row.Scan(&dbo.ID, &dbo.Name, &dbo.Type, &dbo.CreatedAt, &dbo.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, entities.ErrVendorNotFound
		}
		return nil, fmt.Errorf("failed to find vendor: %w", err)
	}

	return dbo.ToDomainEntity(), nil
}

func (r *VendorRepositoryImpl) FindAll() ([]*entities.Vendor, error) {
	query := `SELECT id, name, type, created_at, updated_at FROM vendors ORDER BY name ASC`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to find vendors: %w", err)
	}
	defer rows.Close()

	var vendors []*entities.Vendor
	for rows.Next() {
		var dbo models.VendorDBO
		err := rows.Scan(&dbo.ID, &dbo.Name, &dbo.Type, &dbo.CreatedAt, &dbo.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan vendor: %w", err)
		}

		vendors = append(vendors, dbo.ToDomainEntity())
	}

	return vendors, nil
}

func (r *VendorRepositoryImpl) FindByType(vendorType entities.VendorType) ([]*entities.Vendor, error) {
	query := `SELECT id, name, type, created_at, updated_at FROM vendors WHERE type = $1 ORDER BY name ASC`

	rows, err := r.db.Query(query, string(vendorType))
	if err != nil {
		return nil, fmt.Errorf("failed to find vendors by type: %w", err)
	}
	defer rows.Close()

	var vendors []*entities.Vendor
	for rows.Next() {
		var dbo models.VendorDBO
		err := rows.Scan(&dbo.ID, &dbo.Name, &dbo.Type, &dbo.CreatedAt, &dbo.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("failed to scan vendor: %w", err)
		}

		vendors = append(vendors, dbo.ToDomainEntity())
	}

	return vendors, nil
}

func (r *VendorRepositoryImpl) Update(vendor *entities.Vendor) error {
	query := `
		UPDATE vendors 
		SET name = $2, type = $3, updated_at = $4
		WHERE id = $1
	`

	result, err := r.db.Exec(
		query,
		int(vendor.ID()),
		vendor.Name(),
		string(vendor.Type()),
		vendor.UpdatedAt(),
	)

	if err != nil {
		return fmt.Errorf("failed to update vendor: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check update result: %w", err)
	}

	if rowsAffected == 0 {
		return entities.ErrVendorNotFound
	}

	return nil
}

func (r *VendorRepositoryImpl) Delete(id entities.VendorID) error {
	query := `DELETE FROM vendors WHERE id = $1`

	result, err := r.db.Exec(query, int(id))
	if err != nil {
		return fmt.Errorf("failed to delete vendor: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check delete result: %w", err)
	}

	if rowsAffected == 0 {
		return entities.ErrVendorNotFound
	}

	return nil
}

func (r *VendorRepositoryImpl) FindByName(name string) (*entities.Vendor, error) {
	query := `SELECT id, name, type, created_at, updated_at FROM vendors WHERE name = $1 LIMIT 1`

	var dbo models.VendorDBO
	row := r.db.QueryRow(query, name)
	err := row.Scan(&dbo.ID, &dbo.Name, &dbo.Type, &dbo.CreatedAt, &dbo.UpdatedAt)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, entities.ErrVendorNotFound
		}
		return nil, fmt.Errorf("failed to find vendor by name: %w", err)
	}

	return dbo.ToDomainEntity(), nil
}