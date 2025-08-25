package repositories

import "expenso-backend/domain/entities"

type CategoryRepository interface {
	Save(category *entities.CategoryEntity) error
	FindByID(id entities.CategoryID) (*entities.CategoryEntity, error)
	FindByName(name string) (*entities.CategoryEntity, error)
	FindAll() ([]*entities.CategoryEntity, error)
	Update(category *entities.CategoryEntity) error
	Delete(id entities.CategoryID) error
}
