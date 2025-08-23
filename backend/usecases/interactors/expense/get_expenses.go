package expense

import (
	"expenso-backend/domain/entities"
	"expenso-backend/usecases/interfaces/repositories"
)

type GetExpensesInteractor struct {
	expenseRepo repositories.ExpenseRepository
}

func NewGetExpensesInteractor(expenseRepo repositories.ExpenseRepository) *GetExpensesInteractor {
	return &GetExpensesInteractor{
		expenseRepo: expenseRepo,
	}
}

func (i *GetExpensesInteractor) Execute() ([]*entities.Expense, error) {
	return i.expenseRepo.FindAll()
}

type GetExpenseInteractor struct {
	expenseRepo repositories.ExpenseRepository
}

func NewGetExpenseInteractor(expenseRepo repositories.ExpenseRepository) *GetExpenseInteractor {
	return &GetExpenseInteractor{
		expenseRepo: expenseRepo,
	}
}

func (i *GetExpenseInteractor) Execute(id entities.ExpenseID) (*entities.Expense, error) {
	return i.expenseRepo.FindByID(id)
}