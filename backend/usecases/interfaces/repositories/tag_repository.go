package repositories

import "expenso-backend/domain/entities"

type TagRepository interface {
	Create(tag *entities.Tag) error
	GetByID(id entities.TagID) (*entities.Tag, error)
	GetAll() ([]*entities.Tag, error)
	Update(tag *entities.Tag) error
	Delete(id entities.TagID) error
	GetTagsByExpenseID(expenseID entities.ExpenseID) ([]*entities.Tag, error)
	AddTagToExpense(expenseID entities.ExpenseID, tagID entities.TagID) error
	RemoveTagFromExpense(expenseID entities.ExpenseID, tagID entities.TagID) error
	ClearExpenseTags(expenseID entities.ExpenseID) error
	GetTagsByIncomeID(incomeID entities.IncomeID) ([]*entities.Tag, error)
	AddTagToIncome(incomeID entities.IncomeID, tagID entities.TagID) error
	RemoveTagFromIncome(incomeID entities.IncomeID, tagID entities.TagID) error
	ClearIncomeTags(incomeID entities.IncomeID) error
}