package expense

import (
	"expenso-backend/domain/entities"
	"expenso-backend/usecases/interfaces/repositories"
)

type DeleteExpenseInteractor struct {
	expenseRepo repositories.ExpenseRepository
}

func NewDeleteExpenseInteractor(expenseRepo repositories.ExpenseRepository) *DeleteExpenseInteractor {
	return &DeleteExpenseInteractor{
		expenseRepo: expenseRepo,
	}
}

func (i *DeleteExpenseInteractor) Execute(id entities.ExpenseID) error {
	// Check if expense exists
	_, err := i.expenseRepo.FindByID(id)
	if err != nil {
		return err
	}

	// Delete expense
	return i.expenseRepo.Delete(id)
}