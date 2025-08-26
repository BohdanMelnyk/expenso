package repositories

import (
	"database/sql"
	"time"

	"expenso-backend/domain/entities"
)

type TagRepository struct {
	db *sql.DB
}

func NewTagRepository(db *sql.DB) *TagRepository {
	return &TagRepository{db: db}
}

func (r *TagRepository) Create(tag *entities.Tag) error {
	query := `INSERT INTO tags (name, color, created_at, updated_at) 
			  VALUES ($1, $2, $3, $4) RETURNING id`

	var id int
	err := r.db.QueryRow(query, tag.Name(), tag.Color(), tag.CreatedAt(), tag.UpdatedAt()).Scan(&id)
	if err != nil {
		return err
	}

	tag.SetID(entities.TagID(id))
	return nil
}

func (r *TagRepository) GetByID(id entities.TagID) (*entities.Tag, error) {
	query := `SELECT id, name, color, created_at, updated_at FROM tags WHERE id = $1`

	var name, color string
	var createdAt, updatedAt time.Time

	err := r.db.QueryRow(query, id).Scan(&id, &name, &color, &createdAt, &updatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}

	return entities.ReconstructTag(id, name, color, createdAt, updatedAt), nil
}

func (r *TagRepository) GetAll() ([]*entities.Tag, error) {
	query := `SELECT id, name, color, created_at, updated_at FROM tags ORDER BY name`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []*entities.Tag
	for rows.Next() {
		var id entities.TagID
		var name, color string
		var createdAt, updatedAt time.Time

		if err := rows.Scan(&id, &name, &color, &createdAt, &updatedAt); err != nil {
			return nil, err
		}

		tag := entities.ReconstructTag(id, name, color, createdAt, updatedAt)
		tags = append(tags, tag)
	}

	return tags, rows.Err()
}

func (r *TagRepository) Update(tag *entities.Tag) error {
	query := `UPDATE tags SET name = $2, color = $3, updated_at = $4 WHERE id = $1`

	_, err := r.db.Exec(query, tag.ID(), tag.Name(), tag.Color(), tag.UpdatedAt())
	return err
}

func (r *TagRepository) Delete(id entities.TagID) error {
	query := `DELETE FROM tags WHERE id = $1`

	_, err := r.db.Exec(query, id)
	return err
}

func (r *TagRepository) GetTagsByExpenseID(expenseID entities.ExpenseID) ([]*entities.Tag, error) {
	query := `SELECT t.id, t.name, t.color, t.created_at, t.updated_at 
			  FROM tags t
			  INNER JOIN expense_tags et ON t.id = et.tag_id
			  WHERE et.expense_id = $1
			  ORDER BY t.name`

	rows, err := r.db.Query(query, expenseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tags []*entities.Tag
	for rows.Next() {
		var id entities.TagID
		var name, color string
		var createdAt, updatedAt time.Time

		if err := rows.Scan(&id, &name, &color, &createdAt, &updatedAt); err != nil {
			return nil, err
		}

		tag := entities.ReconstructTag(id, name, color, createdAt, updatedAt)
		tags = append(tags, tag)
	}

	return tags, rows.Err()
}

func (r *TagRepository) AddTagToExpense(expenseID entities.ExpenseID, tagID entities.TagID) error {
	query := `INSERT INTO expense_tags (expense_id, tag_id, created_at) VALUES ($1, $2, $3)`

	_, err := r.db.Exec(query, expenseID, tagID, time.Now())
	return err
}

func (r *TagRepository) RemoveTagFromExpense(expenseID entities.ExpenseID, tagID entities.TagID) error {
	query := `DELETE FROM expense_tags WHERE expense_id = $1 AND tag_id = $2`

	_, err := r.db.Exec(query, expenseID, tagID)
	return err
}

func (r *TagRepository) ClearExpenseTags(expenseID entities.ExpenseID) error {
	query := `DELETE FROM expense_tags WHERE expense_id = $1`

	_, err := r.db.Exec(query, expenseID)
	return err
}
