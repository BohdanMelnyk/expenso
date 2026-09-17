package auth

import (
	"expenso-backend/usecases/interfaces/repositories"
	"expenso-backend/usecases/interfaces/services"
)

type LogoutInteractor struct {
	sessionRepo    repositories.SessionRepository
	tokenGenerator services.SessionTokenGenerator
}

func NewLogoutInteractor(sessionRepo repositories.SessionRepository, tokenGenerator services.SessionTokenGenerator) *LogoutInteractor {
	return &LogoutInteractor{sessionRepo: sessionRepo, tokenGenerator: tokenGenerator}
}

func (i *LogoutInteractor) Logout(rawToken string) error {
	return i.sessionRepo.DeleteByTokenHash(i.tokenGenerator.Hash(rawToken))
}
