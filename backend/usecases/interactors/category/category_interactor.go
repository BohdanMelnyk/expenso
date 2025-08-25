package category

import (
	"errors"

	"expenso-backend/domain/entities"
	"expenso-backend/usecases/interfaces/repositories"
)

type CreateCategoryCommand struct {
	Name  string
	Color string
	Icon  string
}

type UpdateCategoryCommand struct {
	ID    entities.CategoryID
	Name  *string
	Color *string
	Icon  *string
}

type CategoryInteractor struct {
	categoryRepo repositories.CategoryRepository
}

func NewCategoryInteractor(categoryRepo repositories.CategoryRepository) *CategoryInteractor {
	return &CategoryInteractor{
		categoryRepo: categoryRepo,
	}
}

func (i *CategoryInteractor) CreateCategory(cmd CreateCategoryCommand) (*entities.CategoryEntity, error) {
	// Check if category with same name already exists
	existingCategory, err := i.categoryRepo.FindByName(cmd.Name)
	if err != nil && err != entities.ErrCategoryNotFound {
		return nil, err
	}
	if existingCategory != nil {
		return nil, errors.New("category with this name already exists")
	}

	// Create category entity
	category, err := entities.NewCategoryEntity(cmd.Name, cmd.Color, cmd.Icon)
	if err != nil {
		return nil, err
	}

	// Save category
	if err := i.categoryRepo.Save(category); err != nil {
		return nil, err
	}

	return category, nil
}

func (i *CategoryInteractor) GetCategories() ([]*entities.CategoryEntity, error) {
	return i.categoryRepo.FindAll()
}

func (i *CategoryInteractor) GetCategory(id entities.CategoryID) (*entities.CategoryEntity, error) {
	return i.categoryRepo.FindByID(id)
}

func (i *CategoryInteractor) GetCategoryByName(name string) (*entities.CategoryEntity, error) {
	return i.categoryRepo.FindByName(name)
}

func (i *CategoryInteractor) UpdateCategory(cmd UpdateCategoryCommand) (*entities.CategoryEntity, error) {
	// Find existing category
	category, err := i.categoryRepo.FindByID(cmd.ID)
	if err != nil {
		return nil, err
	}

	// Update name if provided
	if cmd.Name != nil {
		if err := category.UpdateName(*cmd.Name); err != nil {
			return nil, err
		}
	}

	// Update color if provided
	if cmd.Color != nil {
		if err := category.UpdateColor(*cmd.Color); err != nil {
			return nil, err
		}
	}

	// Update icon if provided
	if cmd.Icon != nil {
		category.UpdateIcon(*cmd.Icon)
	}

	// Save updated category
	if err := i.categoryRepo.Update(category); err != nil {
		return nil, err
	}

	return category, nil
}

func (i *CategoryInteractor) DeleteCategory(id entities.CategoryID) error {
	// Check if category exists
	_, err := i.categoryRepo.FindByID(id)
	if err != nil {
		return err
	}

	// Delete category
	return i.categoryRepo.Delete(id)
}
