// backend/infrastructure/http/handlers/auth_handler_test.go
package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/http/dto"
	"expenso-backend/infrastructure/http/handlers"
	"expenso-backend/infrastructure/http/middleware"
	authinteractor "expenso-backend/usecases/interactors/auth"
)

type fakeUserRepo struct {
	usersByUsername map[string]*entities.User
	usersByID       map[entities.UserID]*entities.User
}

func (r *fakeUserRepo) Save(user *entities.User) error { return nil }
func (r *fakeUserRepo) FindByUsername(username string) (*entities.User, error) {
	u, ok := r.usersByUsername[username]
	if !ok {
		return nil, entities.ErrUserNotFound
	}
	return u, nil
}
func (r *fakeUserRepo) FindByID(id entities.UserID) (*entities.User, error) {
	u, ok := r.usersByID[id]
	if !ok {
		return nil, entities.ErrUserNotFound
	}
	return u, nil
}

type fakeSessionRepo struct {
	byHash map[string]*entities.Session
}

func (r *fakeSessionRepo) Save(session *entities.Session) error {
	session.SetID(entities.SessionID(len(r.byHash) + 1))
	r.byHash[session.TokenHash()] = session
	return nil
}
func (r *fakeSessionRepo) FindByTokenHash(tokenHash string) (*entities.Session, error) {
	s, ok := r.byHash[tokenHash]
	if !ok {
		return nil, entities.ErrSessionNotFound
	}
	return s, nil
}
func (r *fakeSessionRepo) Update(session *entities.Session) error { return nil }
func (r *fakeSessionRepo) DeleteByTokenHash(tokenHash string) error {
	delete(r.byHash, tokenHash)
	return nil
}

type fakePasswordHasher struct{}

func (fakePasswordHasher) Hash(password string) (string, error) { return "hashed:" + password, nil }
func (fakePasswordHasher) Verify(hash, password string) bool    { return hash == "hashed:"+password }

type fakeTOTPService struct{ validCode string }

func (f fakeTOTPService) GenerateSecret(accountLabel string) (string, string, error) {
	return "encrypted", "otpauth://mock", nil
}
func (f fakeTOTPService) VerifyCode(encryptedSecret, code string) (bool, error) {
	return code == f.validCode, nil
}

type fakeTokenGenerator struct{}

func (f *fakeTokenGenerator) Generate() (string, string, error) {
	return "raw-token", f.Hash("raw-token"), nil
}
func (f *fakeTokenGenerator) Hash(rawToken string) string { return "hash-" + rawToken }

func newTestRouter(userRepo *fakeUserRepo, sessionRepo *fakeSessionRepo) *gin.Engine {
	gin.SetMode(gin.TestMode)
	tokenGen := &fakeTokenGenerator{}
	loginInteractor := authinteractor.NewLoginInteractor(userRepo, sessionRepo, fakePasswordHasher{}, fakeTOTPService{validCode: "123456"}, tokenGen)
	logoutInteractor := authinteractor.NewLogoutInteractor(sessionRepo, tokenGen)
	rateLimiter := middleware.NewLoginRateLimiter()
	authHandler := handlers.NewAuthHandler(loginInteractor, logoutInteractor, userRepo, rateLimiter)

	router := gin.New()
	router.POST("/api/v1/auth/login", authHandler.Login)

	protected := router.Group("/api/v1")
	protected.Use(middleware.RequireAuth(sessionRepo, tokenGen, time.Now))
	protected.GET("/auth/me", authHandler.Me)
	protected.POST("/auth/logout", authHandler.Logout)

	return router
}

func TestLogin_Succeeds(t *testing.T) {
	user := entities.ReconstructUser(entities.UserID(1), "alice", "hashed:secret", "encrypted", time.Now())
	userRepo := &fakeUserRepo{usersByUsername: map[string]*entities.User{"alice": user}, usersByID: map[entities.UserID]*entities.User{1: user}}
	sessionRepo := &fakeSessionRepo{byHash: map[string]*entities.Session{}}
	router := newTestRouter(userRepo, sessionRepo)

	body, _ := json.Marshal(dto.LoginRequestDTO{Username: "alice", Password: "secret", TOTPCode: "123456"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var resp dto.LoginResponseDTO
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Token == "" {
		t.Error("expected non-empty token")
	}
}

func TestLogin_WrongCredentials_Returns401(t *testing.T) {
	user := entities.ReconstructUser(entities.UserID(1), "alice", "hashed:secret", "encrypted", time.Now())
	userRepo := &fakeUserRepo{usersByUsername: map[string]*entities.User{"alice": user}}
	sessionRepo := &fakeSessionRepo{byHash: map[string]*entities.Session{}}
	router := newTestRouter(userRepo, sessionRepo)

	body, _ := json.Marshal(dto.LoginRequestDTO{Username: "alice", Password: "wrong", TOTPCode: "123456"})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestMe_RequiresAuth(t *testing.T) {
	userRepo := &fakeUserRepo{}
	sessionRepo := &fakeSessionRepo{byHash: map[string]*entities.Session{}}
	router := newTestRouter(userRepo, sessionRepo)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

func TestMe_ReturnsCurrentUser_WhenAuthenticated(t *testing.T) {
	user := entities.ReconstructUser(entities.UserID(1), "alice", "hashed:secret", "encrypted", time.Now())
	userRepo := &fakeUserRepo{usersByUsername: map[string]*entities.User{"alice": user}, usersByID: map[entities.UserID]*entities.User{1: user}}
	sessionRepo := &fakeSessionRepo{byHash: map[string]*entities.Session{}}
	router := newTestRouter(userRepo, sessionRepo)

	body, _ := json.Marshal(dto.LoginRequestDTO{Username: "alice", Password: "secret", TOTPCode: "123456"})
	loginReq := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
	loginReq.Header.Set("Content-Type", "application/json")
	loginRec := httptest.NewRecorder()
	router.ServeHTTP(loginRec, loginReq)

	var loginResp dto.LoginResponseDTO
	json.Unmarshal(loginRec.Body.Bytes(), &loginResp)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+loginResp.Token)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	var meResp dto.MeResponseDTO
	json.Unmarshal(rec.Body.Bytes(), &meResp)
	if meResp.Username != "alice" {
		t.Errorf("expected username 'alice', got %q", meResp.Username)
	}
}
