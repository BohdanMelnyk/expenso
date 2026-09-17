package repositories

import "expenso-backend/domain/entities"

type SessionRepository interface {
	Save(session *entities.Session) error
	FindByTokenHash(tokenHash string) (*entities.Session, error)
	Update(session *entities.Session) error
	DeleteByTokenHash(tokenHash string) error
}
