package repositories

import (
	"database/sql"
	"fmt"
	"time"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/persistence/models"
	"expenso-backend/usecases/interfaces/repositories"
)

type IncomeRepositoryImpl struct {
	db      *sql.DB
	tagRepo *TagRepository
}

func NewIncomeRepository(db *sql.DB, tagRepo *TagRepository) repositories.IncomeRepository {
	return &IncomeRepositoryImpl{
		db:      db,
		tagRepo: tagRepo,
	}
}

func (r *IncomeRepositoryImpl) Save(income *entities.Income) error {
	query := `
		INSERT INTO incomes (amount, date, source, comment, vendor_id, added_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`

	var vendorID *int
	if income.Vendor() != nil {
		id := int(income.Vendor().ID())
		vendorID = &id
	}

	var id int
	err := r.db.QueryRow(
		query,
		income.Amount().Amount(),
		income.Date(),
		income.Source(),
		income.Comment(),
		vendorID,
		income.AddedBy().String(),
		income.CreatedAt(),
		income.UpdatedAt(),
	).Scan(&id)

	if err != nil {
		return fmt.Errorf("failed to save income: %w", err)
	}

	income.SetID(entities.IncomeID(id))
	return nil
}

func (r *IncomeRepositoryImpl) FindByID(id entities.IncomeID) (*entities.Income, error) {
	query := `
		SELECT i.id, i.amount, i.date, i.source, i.comment, i.vendor_id, i.added_by, i.created_at, i.updated_at,
		       v.id, v.name, v.type, v.created_at, v.updated_at
		FROM incomes i
		LEFT JOIN vendors v ON i.vendor_id = v.id
		WHERE i.id = $1
	`

	var dbo models.IncomeDBO
	var vID *int
	var vName, vType *string
	var vCreatedAt, vUpdatedAt *string

	row := r.db.QueryRow(query, int(id))
	err := row.Scan(
		&dbo.ID, &dbo.Amount, &dbo.Date, &dbo.Source, &dbo.Comment, &dbo.VendorID, &dbo.AddedBy, &dbo.CreatedAt, &dbo.UpdatedAt,
		&vID, &vName, &vType, &vCreatedAt, &vUpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, entities.ErrIncomeNotFound
		}
		return nil, fmt.Errorf("failed to find income: %w", err)
	}

	// Convert DBO to domain entity
	income, err := dbo.ToDomainEntity()
	if err != nil {
		return nil, err
	}

	// Add vendor if present
	if vID != nil && vName != nil && vType != nil {
		vendorDBO := &models.VendorDBO{
			ID:   *vID,
			Name: *vName,
			Type: *vType,
		}
		vendor := vendorDBO.ToDomainEntity()
		income.AssignVendor(vendor)
	}

	return income, nil
}

func (r *IncomeRepositoryImpl) FindAll() ([]*entities.Income, error) {
	query := `
		SELECT i.id, i.amount, i.date, i.source, i.comment, i.vendor_id, i.added_by, i.created_at, i.updated_at,
		       v.id, v.name, v.type, v.created_at, v.updated_at
		FROM incomes i
		LEFT JOIN vendors v ON i.vendor_id = v.id
		ORDER BY i.date DESC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to find incomes: %w", err)
	}
	defer rows.Close()

	var incomes []*entities.Income
	for rows.Next() {
		var dbo models.IncomeDBO
		var vID *int
		var vName, vType *string
		var vCreatedAt, vUpdatedAt *string

		err := rows.Scan(
			&dbo.ID, &dbo.Amount, &dbo.Date, &dbo.Source, &dbo.Comment, &dbo.VendorID, &dbo.AddedBy, &dbo.CreatedAt, &dbo.UpdatedAt,
			&vID, &vName, &vType, &vCreatedAt, &vUpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan income: %w", err)
		}

		// Convert DBO to domain entity
		income, err := dbo.ToDomainEntity()
		if err != nil {
			return nil, err
		}

		// Add vendor if present
		if vID != nil && vName != nil && vType != nil {
			vendorDBO := &models.VendorDBO{
				ID:   *vID,
				Name: *vName,
				Type: *vType,
			}
			vendor := vendorDBO.ToDomainEntity()
			income.AssignVendor(vendor)
		}

		// Load tags for this income
		if r.tagRepo != nil {
			tags, err := r.tagRepo.GetTagsByIncomeID(income.ID())
			if err == nil && len(tags) > 0 {
				income.SetTags(tags)
			}
		}

		incomes = append(incomes, income)
	}

	return incomes, nil
}

func (r *IncomeRepositoryImpl) Update(income *entities.Income) error {
	query := `
		UPDATE incomes 
		SET amount = $2, date = $3, source = $4, comment = $5, vendor_id = $6, updated_at = $7
		WHERE id = $1
	`

	var vendorID *int
	if income.Vendor() != nil {
		id := int(income.Vendor().ID())
		vendorID = &id
	}

	result, err := r.db.Exec(
		query,
		int(income.ID()),
		income.Amount().Amount(),
		income.Date(),
		income.Source(),
		income.Comment(),
		vendorID,
		income.UpdatedAt(),
	)

	if err != nil {
		return fmt.Errorf("failed to update income: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check update result: %w", err)
	}

	if rowsAffected == 0 {
		return entities.ErrIncomeNotFound
	}

	return nil
}

func (r *IncomeRepositoryImpl) Delete(id entities.IncomeID) error {
	query := `DELETE FROM incomes WHERE id = $1`

	result, err := r.db.Exec(query, int(id))
	if err != nil {
		return fmt.Errorf("failed to delete income: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check delete result: %w", err)
	}

	if rowsAffected == 0 {
		return entities.ErrIncomeNotFound
	}

	return nil
}

func (r *IncomeRepositoryImpl) FindBySource(source string) ([]*entities.Income, error) {
	query := `
		SELECT i.id, i.amount, i.date, i.source, i.comment, i.vendor_id, i.added_by, i.created_at, i.updated_at,
		       v.id, v.name, v.type, v.created_at, v.updated_at
		FROM incomes i
		LEFT JOIN vendors v ON i.vendor_id = v.id
		WHERE i.source = $1
		ORDER BY i.date DESC
	`

	rows, err := r.db.Query(query, source)
	if err != nil {
		return nil, fmt.Errorf("failed to find incomes by source: %w", err)
	}
	defer rows.Close()

	var incomes []*entities.Income
	for rows.Next() {
		var dbo models.IncomeDBO
		var vID *int
		var vName, vType *string
		var vCreatedAt, vUpdatedAt *string

		err := rows.Scan(
			&dbo.ID, &dbo.Amount, &dbo.Date, &dbo.Source, &dbo.Comment, &dbo.VendorID, &dbo.AddedBy, &dbo.CreatedAt, &dbo.UpdatedAt,
			&vID, &vName, &vType, &vCreatedAt, &vUpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan income: %w", err)
		}

		// Convert DBO to domain entity
		income, err := dbo.ToDomainEntity()
		if err != nil {
			return nil, err
		}

		// Add vendor if present
		if vID != nil && vName != nil && vType != nil {
			vendorDBO := &models.VendorDBO{
				ID:   *vID,
				Name: *vName,
				Type: *vType,
			}
			vendor := vendorDBO.ToDomainEntity()
			income.AssignVendor(vendor)
		}

		incomes = append(incomes, income)
	}

	return incomes, nil
}

func (r *IncomeRepositoryImpl) FindByVendor(vendorID entities.VendorID) ([]*entities.Income, error) {
	query := `
		SELECT i.id, i.amount, i.date, i.source, i.comment, i.vendor_id, i.added_by, i.created_at, i.updated_at,
		       v.id, v.name, v.type, v.created_at, v.updated_at
		FROM incomes i
		LEFT JOIN vendors v ON i.vendor_id = v.id
		WHERE i.vendor_id = $1
		ORDER BY i.date DESC
	`

	rows, err := r.db.Query(query, int(vendorID))
	if err != nil {
		return nil, fmt.Errorf("failed to find incomes by vendor: %w", err)
	}
	defer rows.Close()

	var incomes []*entities.Income
	for rows.Next() {
		var dbo models.IncomeDBO
		var vID *int
		var vName, vType *string
		var vCreatedAt, vUpdatedAt *string

		err := rows.Scan(
			&dbo.ID, &dbo.Amount, &dbo.Date, &dbo.Source, &dbo.Comment, &dbo.VendorID, &dbo.AddedBy, &dbo.CreatedAt, &dbo.UpdatedAt,
			&vID, &vName, &vType, &vCreatedAt, &vUpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan income: %w", err)
		}

		// Convert DBO to domain entity
		income, err := dbo.ToDomainEntity()
		if err != nil {
			return nil, err
		}

		// Add vendor if present
		if vID != nil && vName != nil && vType != nil {
			vendorDBO := &models.VendorDBO{
				ID:   *vID,
				Name: *vName,
				Type: *vType,
			}
			vendor := vendorDBO.ToDomainEntity()
			income.AssignVendor(vendor)
		}

		incomes = append(incomes, income)
	}

	return incomes, nil
}

func (r *IncomeRepositoryImpl) FindByDateRange(startDate, endDate *time.Time) ([]*entities.Income, error) {
	baseQuery := `
		SELECT i.id, i.amount, i.date, i.source, i.comment, i.vendor_id, i.added_by, i.created_at, i.updated_at,
		       v.id, v.name, v.type, v.created_at, v.updated_at
		FROM incomes i
		LEFT JOIN vendors v ON i.vendor_id = v.id
	`

	var query string
	var args []interface{}

	// Build WHERE clause based on provided date range
	if startDate != nil && endDate != nil {
		query = baseQuery + " WHERE i.date >= $1 AND i.date <= $2 ORDER BY i.date DESC"
		args = []interface{}{*startDate, *endDate}
	} else if startDate != nil {
		query = baseQuery + " WHERE i.date >= $1 ORDER BY i.date DESC"
		args = []interface{}{*startDate}
	} else if endDate != nil {
		query = baseQuery + " WHERE i.date <= $1 ORDER BY i.date DESC"
		args = []interface{}{*endDate}
	} else {
		// No date filter, return all incomes
		query = baseQuery + " ORDER BY i.date DESC"
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to find incomes by date range: %w", err)
	}
	defer rows.Close()

	var incomes []*entities.Income
	for rows.Next() {
		var dbo models.IncomeDBO
		var vID *int
		var vName, vType *string
		var vCreatedAt, vUpdatedAt *string

		err := rows.Scan(
			&dbo.ID, &dbo.Amount, &dbo.Date, &dbo.Source, &dbo.Comment, &dbo.VendorID, &dbo.AddedBy, &dbo.CreatedAt, &dbo.UpdatedAt,
			&vID, &vName, &vType, &vCreatedAt, &vUpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan income: %w", err)
		}

		// Convert DBO to domain entity
		income, err := dbo.ToDomainEntity()
		if err != nil {
			return nil, err
		}

		// Add vendor if present
		if vID != nil && vName != nil && vType != nil {
			vendorDBO := &models.VendorDBO{
				ID:   *vID,
				Name: *vName,
				Type: *vType,
			}
			vendor := vendorDBO.ToDomainEntity()
			income.AssignVendor(vendor)
		}

		// Load tags for this income
		if r.tagRepo != nil {
			tags, err := r.tagRepo.GetTagsByIncomeID(income.ID())
			if err == nil && len(tags) > 0 {
				income.SetTags(tags)
			}
		}

		incomes = append(incomes, income)
	}

	return incomes, nil
}