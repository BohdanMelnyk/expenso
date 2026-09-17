package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/http/dto"
	"expenso-backend/infrastructure/http/middleware"
	"expenso-backend/infrastructure/logger"
	authinteractor "expenso-backend/usecases/interactors/auth"
	"expenso-backend/usecases/interfaces/repositories"
)

type AuthHandler struct {
	loginInteractor  *authinteractor.LoginInteractor
	logoutInteractor *authinteractor.LogoutInteractor
	userRepo         repositories.UserRepository
	rateLimiter      *middleware.LoginRateLimiter
}

func NewAuthHandler(
	loginInteractor *authinteractor.LoginInteractor,
	logoutInteractor *authinteractor.LogoutInteractor,
	userRepo repositories.UserRepository,
	rateLimiter *middleware.LoginRateLimiter,
) *AuthHandler {
	return &AuthHandler{
		loginInteractor:  loginInteractor,
		logoutInteractor: logoutInteractor,
		userRepo:         userRepo,
		rateLimiter:      rateLimiter,
	}
}

// Login godoc
// @Summary Log in with username, password, and TOTP code
// @Description Authenticates and returns a bearer session token
// @Tags auth
// @Accept json
// @Produce json
// @Param credentials body dto.LoginRequestDTO true "Login credentials"
// @Success 200 {object} dto.LoginResponseDTO
// @Failure 400 {object} map[string]string
// @Failure 401 {object} map[string]string
// @Failure 429 {object} map[string]string
// @Router /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var requestDTO dto.LoginRequestDTO
	if err := c.ShouldBindJSON(&requestDTO); err != nil {
		middleware.RespondWithBadRequest(c, "invalid request body", err)
		return
	}

	ipKey := "ip:" + c.ClientIP()
	userKey := "user:" + requestDTO.Username

	if !h.rateLimiter.Allow(ipKey) || !h.rateLimiter.Allow(userKey) {
		c.Header("Retry-After", "900")
		middleware.RespondWithError(c, http.StatusTooManyRequests, "too many login attempts, please try again later", nil, nil)
		return
	}

	result, err := h.loginInteractor.Login(authinteractor.LoginCommand{
		Username: requestDTO.Username,
		Password: requestDTO.Password,
		TOTPCode: requestDTO.TOTPCode,
	})
	if err != nil {
		h.rateLimiter.RecordFailure(ipKey)
		h.rateLimiter.RecordFailure(userKey)
		logger.Error("login failed", logger.Fields{"error": err.Error(), "username": requestDTO.Username})
		middleware.RespondWithUnauthorized(c, "invalid credentials")
		return
	}

	h.rateLimiter.RecordSuccess(ipKey)
	h.rateLimiter.RecordSuccess(userKey)

	c.JSON(http.StatusOK, dto.LoginResponseDTO{Token: result.Token, ExpiresAt: result.ExpiresAt})
}

// Logout godoc
// @Summary Log out the current session
// @Tags auth
// @Produce json
// @Success 204
// @Failure 401 {object} map[string]string
// @Router /auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	rawToken := strings.TrimPrefix(c.GetHeader("Authorization"), "Bearer ")
	if err := h.logoutInteractor.Logout(rawToken); err != nil {
		middleware.RespondWithInternalError(c, "failed to log out", err)
		return
	}
	c.Status(http.StatusNoContent)
}

// Me godoc
// @Summary Get the current authenticated user
// @Tags auth
// @Produce json
// @Success 200 {object} dto.MeResponseDTO
// @Failure 401 {object} map[string]string
// @Router /auth/me [get]
func (h *AuthHandler) Me(c *gin.Context) {
	userID, ok := middleware.UserIDFromContext(c)
	if !ok {
		middleware.RespondWithUnauthorized(c, "not authenticated")
		return
	}

	user, err := h.userRepo.FindByID(userID)
	if err != nil {
		if err == entities.ErrUserNotFound {
			middleware.RespondWithUnauthorized(c, "not authenticated")
			return
		}
		middleware.RespondWithInternalError(c, "failed to fetch user", err)
		return
	}

	c.JSON(http.StatusOK, dto.MeResponseDTO{ID: int(user.ID()), Username: user.Username()})
}

// ListUsers godoc
// @Summary Get all users (for directory lookup)
// @Tags users
// @Produce json
// @Success 200 {array} dto.UserDTO
// @Failure 401 {object} map[string]string
// @Router /users [get]
func (h *AuthHandler) ListUsers(c *gin.Context) {
	users, err := h.userRepo.FindAll()
	if err != nil {
		middleware.RespondWithInternalError(c, "failed to fetch users", err)
		return
	}

	userDTOs := make([]dto.UserDTO, len(users))
	for i, user := range users {
		userDTOs[i] = dto.UserDTO{
			ID:       int(user.ID()),
			Username: user.Username(),
		}
	}

	c.JSON(http.StatusOK, userDTOs)
}
