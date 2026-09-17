package middleware_test

import (
	"testing"

	"expenso-backend/infrastructure/http/middleware"
)

func TestLoginRateLimiter_AllowsUnderLimit(t *testing.T) {
	limiter := middleware.NewLoginRateLimiter()
	for i := 0; i < 4; i++ {
		if !limiter.Allow("1.2.3.4") {
			t.Fatalf("expected attempt %d to be allowed", i)
		}
		limiter.RecordFailure("1.2.3.4")
	}
}

func TestLoginRateLimiter_BlocksAfterFiveFailures(t *testing.T) {
	limiter := middleware.NewLoginRateLimiter()
	for i := 0; i < 5; i++ {
		limiter.RecordFailure("1.2.3.4")
	}
	if limiter.Allow("1.2.3.4") {
		t.Error("expected 6th attempt to be blocked")
	}
}

func TestLoginRateLimiter_SuccessClearsFailures(t *testing.T) {
	limiter := middleware.NewLoginRateLimiter()
	for i := 0; i < 5; i++ {
		limiter.RecordFailure("1.2.3.4")
	}
	limiter.RecordSuccess("1.2.3.4")
	if !limiter.Allow("1.2.3.4") {
		t.Error("expected attempt to be allowed after successful login clears failures")
	}
}

func TestLoginRateLimiter_DifferentKeysAreIndependent(t *testing.T) {
	limiter := middleware.NewLoginRateLimiter()
	for i := 0; i < 5; i++ {
		limiter.RecordFailure("1.2.3.4")
	}
	if !limiter.Allow("5.6.7.8") {
		t.Error("expected a different key to be unaffected")
	}
}
