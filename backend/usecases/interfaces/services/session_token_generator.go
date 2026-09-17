package services

type SessionTokenGenerator interface {
	// Generate returns a new random raw token (to hand to the client) and its
	// hash (to persist — the raw token itself is never stored).
	Generate() (rawToken string, tokenHash string, err error)
	// Hash hashes a raw bearer token the same way Generate hashes a newly
	// created one, so callers can look up a session from an incoming token.
	Hash(rawToken string) string
}
