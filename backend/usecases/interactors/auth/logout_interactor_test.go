package auth_test

import (
	"testing"

	"expenso-backend/domain/entities"
	interactor "expenso-backend/usecases/interactors/auth"
)

type mockLogoutSessionRepo struct {
	deletedHashes []string
}

func (m *mockLogoutSessionRepo) Save(session *entities.Session) error { return nil }
func (m *mockLogoutSessionRepo) FindByTokenHash(tokenHash string) (*entities.Session, error) {
	return nil, entities.ErrSessionNotFound
}
func (m *mockLogoutSessionRepo) Update(session *entities.Session) error { return nil }
func (m *mockLogoutSessionRepo) DeleteByTokenHash(tokenHash string) error {
	m.deletedHashes = append(m.deletedHashes, tokenHash)
	return nil
}

type mockLogoutTokenGenerator struct{}

func (mockLogoutTokenGenerator) Generate() (string, string, error) { return "", "", nil }
func (mockLogoutTokenGenerator) Hash(rawToken string) string       { return "hash-of-" + rawToken }

func TestLogout_DeletesSessionByHashedToken(t *testing.T) {
	repo := &mockLogoutSessionRepo{}
	svc := interactor.NewLogoutInteractor(repo, mockLogoutTokenGenerator{})

	if err := svc.Logout("raw-token"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(repo.deletedHashes) != 1 || repo.deletedHashes[0] != "hash-of-raw-token" {
		t.Errorf("expected session deleted by hash 'hash-of-raw-token', got %v", repo.deletedHashes)
	}
}
