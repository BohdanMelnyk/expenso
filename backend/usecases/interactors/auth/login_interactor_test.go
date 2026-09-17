package auth_test

import (
	"fmt"
	"testing"
	"time"

	"expenso-backend/domain/entities"
	interactor "expenso-backend/usecases/interactors/auth"
)

type mockUserRepo struct {
	usersByUsername map[string]*entities.User
}

func (m *mockUserRepo) Save(user *entities.User) error { return nil }

func (m *mockUserRepo) FindByUsername(username string) (*entities.User, error) {
	user, ok := m.usersByUsername[username]
	if !ok {
		return nil, entities.ErrUserNotFound
	}
	return user, nil
}

func (m *mockUserRepo) FindByID(id entities.UserID) (*entities.User, error) {
	for _, u := range m.usersByUsername {
		if u.ID() == id {
			return u, nil
		}
	}
	return nil, entities.ErrUserNotFound
}

func (m *mockUserRepo) FindAll() ([]*entities.User, error) {
	users := make([]*entities.User, 0, len(m.usersByUsername))
	for _, u := range m.usersByUsername {
		users = append(users, u)
	}
	return users, nil
}

type mockSessionRepo struct {
	saved []*entities.Session
}

func (m *mockSessionRepo) Save(session *entities.Session) error {
	session.SetID(entities.SessionID(len(m.saved) + 1))
	m.saved = append(m.saved, session)
	return nil
}
func (m *mockSessionRepo) FindByTokenHash(tokenHash string) (*entities.Session, error) {
	for _, s := range m.saved {
		if s.TokenHash() == tokenHash {
			return s, nil
		}
	}
	return nil, entities.ErrSessionNotFound
}
func (m *mockSessionRepo) Update(session *entities.Session) error   { return nil }
func (m *mockSessionRepo) DeleteByTokenHash(tokenHash string) error { return nil }

type mockPasswordHasher struct{}

func (mockPasswordHasher) Hash(password string) (string, error) { return "hashed:" + password, nil }
func (mockPasswordHasher) Verify(hash, password string) bool    { return hash == "hashed:"+password }

type mockTOTPService struct{ validCode string }

func (m mockTOTPService) GenerateSecret(accountLabel string) (string, string, error) {
	return "encrypted-secret", "otpauth://mock", nil
}
func (m mockTOTPService) VerifyCode(encryptedSecret, code string) (bool, error) {
	return code == m.validCode, nil
}

type mockTokenGenerator struct{ counter int }

func (m *mockTokenGenerator) Generate() (string, string, error) {
	m.counter++
	token := fmt.Sprintf("raw-token-%d", m.counter)
	return token, m.Hash(token), nil
}
func (m *mockTokenGenerator) Hash(rawToken string) string { return "hash-" + rawToken }

func newTestInteractor(userRepo *mockUserRepo, validTOTP string) *interactor.LoginInteractor {
	return interactor.NewLoginInteractor(
		userRepo,
		&mockSessionRepo{},
		mockPasswordHasher{},
		mockTOTPService{validCode: validTOTP},
		&mockTokenGenerator{},
	)
}

func TestLogin_Succeeds(t *testing.T) {
	user := entities.ReconstructUser(entities.UserID(1), "alice", "hashed:correct-password", "encrypted-secret", time.Now())
	repo := &mockUserRepo{usersByUsername: map[string]*entities.User{"alice": user}}
	svc := newTestInteractor(repo, "123456")

	result, err := svc.Login(interactor.LoginCommand{Username: "alice", Password: "correct-password", TOTPCode: "123456"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.Token == "" {
		t.Error("expected non-empty token")
	}
}

func TestLogin_WrongPassword(t *testing.T) {
	user := entities.ReconstructUser(entities.UserID(1), "alice", "hashed:correct-password", "encrypted-secret", time.Now())
	repo := &mockUserRepo{usersByUsername: map[string]*entities.User{"alice": user}}
	svc := newTestInteractor(repo, "123456")

	_, err := svc.Login(interactor.LoginCommand{Username: "alice", Password: "wrong-password", TOTPCode: "123456"})
	if err != entities.ErrInvalidCredentials {
		t.Errorf("expected ErrInvalidCredentials, got %v", err)
	}
}

func TestLogin_WrongTOTPCode(t *testing.T) {
	user := entities.ReconstructUser(entities.UserID(1), "alice", "hashed:correct-password", "encrypted-secret", time.Now())
	repo := &mockUserRepo{usersByUsername: map[string]*entities.User{"alice": user}}
	svc := newTestInteractor(repo, "123456")

	_, err := svc.Login(interactor.LoginCommand{Username: "alice", Password: "correct-password", TOTPCode: "000000"})
	if err != entities.ErrInvalidCredentials {
		t.Errorf("expected ErrInvalidCredentials, got %v", err)
	}
}

func TestLogin_UnknownUsername(t *testing.T) {
	repo := &mockUserRepo{usersByUsername: map[string]*entities.User{}}
	svc := newTestInteractor(repo, "123456")

	_, err := svc.Login(interactor.LoginCommand{Username: "bob", Password: "whatever", TOTPCode: "123456"})
	if err != entities.ErrInvalidCredentials {
		t.Errorf("expected ErrInvalidCredentials, got %v", err)
	}
}
