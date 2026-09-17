package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	loginMaxAttempts = 5
	loginWindow      = 15 * time.Minute
)

// LoginRateLimiter tracks failed-login attempts per key (e.g. an IP or
// "user:"+username) in memory. This is appropriate at Expenso's scale (two
// known users, single server instance); a distributed store would be needed
// for a multi-instance deployment.
type LoginRateLimiter struct {
	mu       sync.Mutex
	attempts map[string][]time.Time
	now      func() time.Time
}

func NewLoginRateLimiter() *LoginRateLimiter {
	return &LoginRateLimiter{
		attempts: make(map[string][]time.Time),
		now:      time.Now,
	}
}

// Allow reports whether a new attempt for key is permitted, given failures
// already recorded via RecordFailure within the current window.
func (l *LoginRateLimiter) Allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.prune(key)
	return len(l.attempts[key]) < loginMaxAttempts
}

// RecordFailure records a failed attempt for key.
func (l *LoginRateLimiter) RecordFailure(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()

	l.prune(key)
	l.attempts[key] = append(l.attempts[key], l.now())
}

// RecordSuccess clears recorded failures for key.
func (l *LoginRateLimiter) RecordSuccess(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()

	delete(l.attempts, key)
}

func (l *LoginRateLimiter) prune(key string) {
	cutoff := l.now().Add(-loginWindow)
	var kept []time.Time
	for _, t := range l.attempts[key] {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	if len(kept) == 0 {
		delete(l.attempts, key)
	} else {
		l.attempts[key] = kept
	}
}

// RateLimitLogin blocks a request with 429 if the client IP has too many
// recent failed login attempts. The handler itself calls RecordFailure /
// RecordSuccess, since only it knows the outcome of the credential check
// (and it also gates by username, which isn't known at this layer).
func RateLimitLogin(limiter *LoginRateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		key := "ip:" + c.ClientIP()
		if !limiter.Allow(key) {
			c.Header("Retry-After", "900")
			RespondWithError(c, http.StatusTooManyRequests, "too many login attempts, please try again later", nil, nil)
			c.Abort()
			return
		}
		c.Next()
	}
}
