package middleware

import (
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"expenso-backend/domain/entities"
	"expenso-backend/usecases/interfaces/repositories"
	"expenso-backend/usecases/interfaces/services"
)

const UserIDContextKey = "user_id"

// RequireAuth validates the bearer session token on every request it wraps,
// slides the session's expiry on activity, and stores the authenticated
// user's ID in the Gin context under UserIDContextKey.
func RequireAuth(sessionRepo repositories.SessionRepository, tokenGenerator services.SessionTokenGenerator, now func() time.Time) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		const prefix = "Bearer "
		if !strings.HasPrefix(header, prefix) {
			RespondWithUnauthorized(c, "missing or invalid authorization header")
			c.Abort()
			return
		}
		rawToken := strings.TrimPrefix(header, prefix)

		session, err := sessionRepo.FindByTokenHash(tokenGenerator.Hash(rawToken))
		if err != nil {
			RespondWithUnauthorized(c, "invalid session")
			c.Abort()
			return
		}

		nowTime := now()
		if session.IsExpired(nowTime) {
			RespondWithUnauthorized(c, "session expired")
			c.Abort()
			return
		}

		session.Touch(nowTime)
		if err := sessionRepo.Update(session); err != nil {
			RespondWithInternalError(c, "failed to refresh session", err)
			c.Abort()
			return
		}

		c.Set(UserIDContextKey, session.UserID())
		c.Next()
	}
}

// UserIDFromContext extracts the authenticated user's ID set by RequireAuth.
func UserIDFromContext(c *gin.Context) (entities.UserID, bool) {
	value, exists := c.Get(UserIDContextKey)
	if !exists {
		return 0, false
	}
	userID, ok := value.(entities.UserID)
	return userID, ok
}
