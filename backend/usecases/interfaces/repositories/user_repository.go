package repositories

import "expenso-backend/domain/entities"

type UserRepository interface {
	Save(user *entities.User) error
	FindByUsername(username string) (*entities.User, error)
	FindByID(id entities.UserID) (*entities.User, error)
	FindAll() ([]*entities.User, error)
}
