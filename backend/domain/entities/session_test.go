package entities_test

import (
	"testing"
	"time"

	"expenso-backend/domain/entities"
)

func TestNewSession_SetsSlidingExpiry(t *testing.T) {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	s, err := entities.NewSession(entities.UserID(1), "somehash", now)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := now.Add(entities.SessionInactivityWindow)
	if !s.ExpiresAt().Equal(want) {
		t.Errorf("expected expiry %v, got %v", want, s.ExpiresAt())
	}
}

func TestNewSession_EmptyTokenHash(t *testing.T) {
	_, err := entities.NewSession(entities.UserID(1), "", time.Now())
	if err == nil {
		t.Fatal("expected error for empty token hash, got nil")
	}
}

func TestSession_IsExpired(t *testing.T) {
	now := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	s, _ := entities.NewSession(entities.UserID(1), "somehash", now)

	if s.IsExpired(now.Add(time.Hour)) {
		t.Error("session should not be expired 1 hour after creation")
	}
	if !s.IsExpired(now.Add(31 * 24 * time.Hour)) {
		t.Error("session should be expired after 31 days of inactivity")
	}
}

func TestSession_Touch_SlidesExpiryButCapsAtAbsoluteMax(t *testing.T) {
	created := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	s, _ := entities.NewSession(entities.UserID(1), "somehash", created)

	// Touch just before the absolute max - expiry should be capped, not slid further.
	touchAt := created.Add(85 * 24 * time.Hour)
	s.Touch(touchAt)

	wantCap := created.Add(entities.SessionAbsoluteMax)
	if !s.ExpiresAt().Equal(wantCap) {
		t.Errorf("expected expiry capped at %v, got %v", wantCap, s.ExpiresAt())
	}
	if !s.LastSeenAt().Equal(touchAt) {
		t.Errorf("expected last seen %v, got %v", touchAt, s.LastSeenAt())
	}
}
