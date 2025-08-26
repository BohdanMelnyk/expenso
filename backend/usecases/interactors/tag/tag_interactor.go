package tag

import (
	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/persistence/repositories"
)

type TagInteractor struct {
	tagRepo *repositories.TagRepository
}

func NewTagInteractor(tagRepo *repositories.TagRepository) *TagInteractor {
	return &TagInteractor{
		tagRepo: tagRepo,
	}
}

func (i *TagInteractor) CreateTag(name, color string) (*entities.Tag, error) {
	tag, err := entities.NewTag(name, color)
	if err != nil {
		return nil, err
	}

	if err := i.tagRepo.Create(tag); err != nil {
		return nil, err
	}

	return tag, nil
}

func (i *TagInteractor) GetTag(id entities.TagID) (*entities.Tag, error) {
	return i.tagRepo.GetByID(id)
}

func (i *TagInteractor) GetAllTags() ([]*entities.Tag, error) {
	return i.tagRepo.GetAll()
}

func (i *TagInteractor) UpdateTag(id entities.TagID, name, color string) (*entities.Tag, error) {
	tag, err := i.tagRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	if tag == nil {
		return nil, nil
	}

	if name != "" {
		if err := tag.UpdateName(name); err != nil {
			return nil, err
		}
	}

	if color != "" {
		if err := tag.UpdateColor(color); err != nil {
			return nil, err
		}
	}

	if err := i.tagRepo.Update(tag); err != nil {
		return nil, err
	}

	return tag, nil
}

func (i *TagInteractor) DeleteTag(id entities.TagID) error {
	return i.tagRepo.Delete(id)
}

func (i *TagInteractor) GetTagsByExpense(expenseID entities.ExpenseID) ([]*entities.Tag, error) {
	return i.tagRepo.GetTagsByExpenseID(expenseID)
}

func (i *TagInteractor) AddTagToExpense(expenseID entities.ExpenseID, tagID entities.TagID) error {
	return i.tagRepo.AddTagToExpense(expenseID, tagID)
}

func (i *TagInteractor) RemoveTagFromExpense(expenseID entities.ExpenseID, tagID entities.TagID) error {
	return i.tagRepo.RemoveTagFromExpense(expenseID, tagID)
}
