package entities

import (
	"errors"
	"time"
)

type SessionID int

const (
	SessionInactivityWindow = 30 * 24 * time.Hour
	SessionAbsoluteMax      = 90 * 24 * time.Hour
)

var (
	ErrSessionNotFound = errors.New("session not found")
	ErrSessionExpired  = errors.New("session expired")
)

type Session struct {
	id         SessionID
	userID     UserID
	tokenHash  string
	expiresAt  time.Time
	lastSeenAt time.Time
	createdAt  time.Time
}

func NewSession(userID UserID, tokenHash string, now time.Time) (*Session, error) {
	if tokenHash == "" {
		return nil, errors.New("token hash cannot be empty")
	}
	return &Session{
		userID:     userID,
		tokenHash:  tokenHash,
		expiresAt:  now.Add(SessionInactivityWindow),
		lastSeenAt: now,
		createdAt:  now,
	}, nil
}

func ReconstructSession(id SessionID, userID UserID, tokenHash string, expiresAt, lastSeenAt, createdAt time.Time) *Session {
	return &Session{
		id:         id,
		userID:     userID,
		tokenHash:  tokenHash,
		expiresAt:  expiresAt,
		lastSeenAt: lastSeenAt,
		createdAt:  createdAt,
	}
}

func (s *Session) ID() SessionID         { return s.id }
func (s *Session) UserID() UserID        { return s.userID }
func (s *Session) TokenHash() string     { return s.tokenHash }
func (s *Session) ExpiresAt() time.Time  { return s.expiresAt }
func (s *Session) LastSeenAt() time.Time { return s.lastSeenAt }
func (s *Session) CreatedAt() time.Time  { return s.createdAt }
func (s *Session) SetID(id SessionID)    { s.id = id }

func (s *Session) IsExpired(now time.Time) bool {
	return now.After(s.expiresAt)
}

// Touch slides the expiry forward on activity, capped at SessionAbsoluteMax
// from creation so a stolen-but-unused token can't live forever.
func (s *Session) Touch(now time.Time) {
	newExpiry := now.Add(SessionInactivityWindow)
	absoluteCap := s.createdAt.Add(SessionAbsoluteMax)
	if newExpiry.After(absoluteCap) {
		newExpiry = absoluteCap
	}
	s.expiresAt = newExpiry
	s.lastSeenAt = now
}
