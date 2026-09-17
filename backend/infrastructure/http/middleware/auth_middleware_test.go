package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/http/middleware"
)

type mockSessionRepo struct {
	sessions map[string]*entities.Session
	updated  []*entities.Session
}

func (m *mockSessionRepo) Save(session *entities.Session) error { return nil }
func (m *mockSessionRepo) FindByTokenHash(tokenHash string) (*entities.Session, error) {
	s, ok := m.sessions[tokenHash]
	if !ok {
		return nil, entities.ErrSessionNotFound
	}
	return s, nil
}
func (m *mockSessionRepo) Update(session *entities.Session) error {
	m.updated = append(m.updated, session)
	return nil
}
func (m *mockSessionRepo) DeleteByTokenHash(tokenHash string) error { return nil }

type mockTokenGenerator struct{}

func (mockTokenGenerator) Generate() (string, string, error) { return "", "", nil }
func (mockTokenGenerator) Hash(rawToken string) string       { return "hash-" + rawToken }

func newTestRouter(sessionRepo *mockSessionRepo, now func() time.Time) *gin.Engine {
	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.Use(middleware.RequireAuth(sessionRepo, mockTokenGenerator{}, now))
	router.GET("/protected", func(c *gin.Context) {
		userID, _ := middleware.UserIDFromContext(c)
		c.JSON(http.StatusOK, gin.H{"user_id": int(userID)})
	})
	return router
}

func TestRequireAuth_MissingHeader(t *testing.T) {
	router := newTestRouter(&mockSessionRepo{sessions: map[string]*entities.Session{}}, time.Now)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestRequireAuth_InvalidToken(t *testing.T) {
	router := newTestRouter(&mockSessionRepo{sessions: map[string]*entities.Session{}}, time.Now)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer nonexistent-token")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestRequireAuth_ExpiredSession(t *testing.T) {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	session := entities.ReconstructSession(1, entities.UserID(5), "hash-valid-token", now.Add(-time.Hour), now.Add(-2*time.Hour), now.Add(-3*time.Hour))
	repo := &mockSessionRepo{sessions: map[string]*entities.Session{"hash-valid-token": session}}
	router := newTestRouter(repo, func() time.Time { return now })

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer valid-token")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for expired session, got %d", rec.Code)
	}
}

func TestRequireAuth_ValidSession_SetsUserIDAndSlidesExpiry(t *testing.T) {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	session := entities.ReconstructSession(1, entities.UserID(5), "hash-valid-token", now.Add(time.Hour), now.Add(-time.Hour), now.Add(-time.Hour))
	repo := &mockSessionRepo{sessions: map[string]*entities.Session{"hash-valid-token": session}}
	router := newTestRouter(repo, func() time.Time { return now })

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	req.Header.Set("Authorization", "Bearer valid-token")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if len(repo.updated) != 1 {
		t.Errorf("expected session to be touched/updated once, got %d", len(repo.updated))
	}
}
