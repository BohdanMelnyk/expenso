package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"

	"expenso-backend/usecases/interfaces/services"
)

const tokenByteLength = 32

type RandomSessionTokenGenerator struct{}

func NewRandomSessionTokenGenerator() services.SessionTokenGenerator {
	return &RandomSessionTokenGenerator{}
}

func (g *RandomSessionTokenGenerator) Generate() (string, string, error) {
	raw := make([]byte, tokenByteLength)
	if _, err := rand.Read(raw); err != nil {
		return "", "", err
	}
	rawToken := hex.EncodeToString(raw)
	return rawToken, g.Hash(rawToken), nil
}

func (g *RandomSessionTokenGenerator) Hash(rawToken string) string {
	sum := sha256.Sum256([]byte(rawToken))
	return hex.EncodeToString(sum[:])
}
