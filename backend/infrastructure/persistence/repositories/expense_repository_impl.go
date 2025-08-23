package repositories

import (
	"database/sql"
	"fmt"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/persistence/models"
	"expenso-backend/usecases/interfaces/repositories"
)

type ExpenseRepositoryImpl struct {
	db *sql.DB
}

func NewExpenseRepository(db *sql.DB) repositories.ExpenseRepository {
	return &ExpenseRepositoryImpl{db: db}
}

func (r *ExpenseRepositoryImpl) Save(expense *entities.Expense) error {
	query := `
		INSERT INTO expenses (amount, date, type, category, comment, vendor_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id
	`

	var vendorID *int
	if expense.Vendor() != nil {
		id := int(expense.Vendor().ID())
		vendorID = &id
	}

	var id int
	err := r.db.QueryRow(
		query,
		expense.Amount().Amount(),
		expense.Date(),
		string(expense.Type()),
		expense.Category().String(),
		expense.Comment(),
		vendorID,
		expense.CreatedAt(),
		expense.UpdatedAt(),
	).Scan(&id)

	if err != nil {
		return fmt.Errorf("failed to save expense: %w", err)
	}

	expense.SetID(entities.ExpenseID(id))
	return nil
}

func (r *ExpenseRepositoryImpl) FindByID(id entities.ExpenseID) (*entities.Expense, error) {
	query := `
		SELECT e.id, e.amount, e.date, e.type, e.category, e.comment, e.vendor_id, e.created_at, e.updated_at,
		       v.id, v.name, v.type, v.created_at, v.updated_at
		FROM expenses e
		LEFT JOIN vendors v ON e.vendor_id = v.id
		WHERE e.id = $1
	`

	var dbo models.ExpenseDBO
	var vendorDBO *models.VendorDBO
	var vID *int
	var vName, vType *string
	var vCreatedAt, vUpdatedAt *string

	row := r.db.QueryRow(query, int(id))
	err := row.Scan(
		&dbo.ID, &dbo.Amount, &dbo.Date, &dbo.Type, &dbo.Category, &dbo.Comment, &dbo.VendorID, &dbo.CreatedAt, &dbo.UpdatedAt,
		&vID, &vName, &vType, &vCreatedAt, &vUpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, entities.ErrExpenseNotFound
		}
		return nil, fmt.Errorf("failed to find expense: %w", err)
	}

	// Convert DBO to domain entity
	expense, err := dbo.ToDomainEntity()
	if err != nil {
		return nil, err
	}

	// Add vendor if present
	if vID != nil && vName != nil && vType != nil {
		vendorDBO = &models.VendorDBO{
			ID:   *vID,
			Name: *vName,
			Type: *vType,
		}
		vendor := vendorDBO.ToDomainEntity()
		expense.AssignVendor(vendor)
	}

	return expense, nil
}

func (r *ExpenseRepositoryImpl) FindAll() ([]*entities.Expense, error) {
	query := `
		SELECT e.id, e.amount, e.date, e.type, e.category, e.comment, e.vendor_id, e.created_at, e.updated_at,
		       v.id, v.name, v.type, v.created_at, v.updated_at
		FROM expenses e
		LEFT JOIN vendors v ON e.vendor_id = v.id
		ORDER BY e.date DESC
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to find expenses: %w", err)
	}
	defer rows.Close()

	var expenses []*entities.Expense
	for rows.Next() {
		var dbo models.ExpenseDBO
		var vID *int
		var vName, vType *string
		var vCreatedAt, vUpdatedAt *string

		err := rows.Scan(
			&dbo.ID, &dbo.Amount, &dbo.Date, &dbo.Type, &dbo.Category, &dbo.Comment, &dbo.VendorID, &dbo.CreatedAt, &dbo.UpdatedAt,
			&vID, &vName, &vType, &vCreatedAt, &vUpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan expense: %w", err)
		}

		// Convert DBO to domain entity
		expense, err := dbo.ToDomainEntity()
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
			expense.AssignVendor(vendor)
		}

		expenses = append(expenses, expense)
	}

	return expenses, nil
}

func (r *ExpenseRepositoryImpl) Update(expense *entities.Expense) error {
	query := `
		UPDATE expenses 
		SET amount = $2, date = $3, type = $4, category = $5, comment = $6, vendor_id = $7, updated_at = $8
		WHERE id = $1
	`

	var vendorID *int
	if expense.Vendor() != nil {
		id := int(expense.Vendor().ID())
		vendorID = &id
	}

	result, err := r.db.Exec(
		query,
		int(expense.ID()),
		expense.Amount().Amount(),
		expense.Date(),
		string(expense.Type()),
		expense.Category().String(),
		expense.Comment(),
		vendorID,
		expense.UpdatedAt(),
	)

	if err != nil {
		return fmt.Errorf("failed to update expense: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check update result: %w", err)
	}

	if rowsAffected == 0 {
		return entities.ErrExpenseNotFound
	}

	return nil
}

func (r *ExpenseRepositoryImpl) Delete(id entities.ExpenseID) error {
	query := `DELETE FROM expenses WHERE id = $1`

	result, err := r.db.Exec(query, int(id))
	if err != nil {
		return fmt.Errorf("failed to delete expense: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to check delete result: %w", err)
	}

	if rowsAffected == 0 {
		return entities.ErrExpenseNotFound
	}

	return nil
}

func (r *ExpenseRepositoryImpl) FindByCategory(category entities.Category) ([]*entities.Expense, error) {
	// Implementation similar to FindAll but with WHERE clause for category
	// Left as exercise - not needed for basic CRUD
	return nil, fmt.Errorf("not implemented")
}

func (r *ExpenseRepositoryImpl) FindByVendor(vendorID entities.VendorID) ([]*entities.Expense, error) {
	// Implementation similar to FindAll but with WHERE clause for vendor_id
	// Left as exercise - not needed for basic CRUD
	return nil, fmt.Errorf("not implemented")
}