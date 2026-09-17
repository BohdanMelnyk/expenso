package auth

import (
	"time"

	"expenso-backend/domain/entities"
	"expenso-backend/usecases/interfaces/repositories"
	"expenso-backend/usecases/interfaces/services"
)

type LoginCommand struct {
	Username string
	Password string
	TOTPCode string
}

type LoginResult struct {
	Token     string
	ExpiresAt time.Time
}

type LoginInteractor struct {
	userRepo       repositories.UserRepository
	sessionRepo    repositories.SessionRepository
	passwordHasher services.PasswordHasher
	totpService    services.TOTPService
	tokenGenerator services.SessionTokenGenerator
	now            func() time.Time
}

func NewLoginInteractor(
	userRepo repositories.UserRepository,
	sessionRepo repositories.SessionRepository,
	passwordHasher services.PasswordHasher,
	totpService services.TOTPService,
	tokenGenerator services.SessionTokenGenerator,
) *LoginInteractor {
	return &LoginInteractor{
		userRepo:       userRepo,
		sessionRepo:    sessionRepo,
		passwordHasher: passwordHasher,
		totpService:    totpService,
		tokenGenerator: tokenGenerator,
		now:            time.Now,
	}
}

// Login validates username, password, and TOTP code together in one call and
// returns a new session token. Any failure (unknown username, wrong
// password, wrong code) returns the same ErrInvalidCredentials, so callers
// never learn which factor was wrong or whether the username exists.
func (i *LoginInteractor) Login(cmd LoginCommand) (*LoginResult, error) {
	user, err := i.userRepo.FindByUsername(cmd.Username)
	if err != nil {
		return nil, entities.ErrInvalidCredentials
	}

	if !i.passwordHasher.Verify(user.PasswordHash(), cmd.Password) {
		return nil, entities.ErrInvalidCredentials
	}

	valid, err := i.totpService.VerifyCode(user.TOTPSecretEncrypted(), cmd.TOTPCode)
	if err != nil || !valid {
		return nil, entities.ErrInvalidCredentials
	}

	rawToken, tokenHash, err := i.tokenGenerator.Generate()
	if err != nil {
		return nil, err
	}

	session, err := entities.NewSession(user.ID(), tokenHash, i.now())
	if err != nil {
		return nil, err
	}

	if err := i.sessionRepo.Save(session); err != nil {
		return nil, err
	}

	return &LoginResult{Token: rawToken, ExpiresAt: session.ExpiresAt()}, nil
}
