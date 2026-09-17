package auth_test

import (
	"testing"

	"expenso-backend/infrastructure/auth"
)

func TestRandomSessionTokenGenerator_GeneratesUniqueTokens(t *testing.T) {
	g := auth.NewRandomSessionTokenGenerator()

	token1, hash1, err := g.Generate()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	token2, hash2, err := g.Generate()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if token1 == token2 {
		t.Error("expected two generated tokens to differ")
	}
	if hash1 == hash2 {
		t.Error("expected two generated token hashes to differ")
	}
}

func TestRandomSessionTokenGenerator_HashIsDeterministic(t *testing.T) {
	g := auth.NewRandomSessionTokenGenerator()

	if g.Hash("abc") != g.Hash("abc") {
		t.Error("expected Hash to be deterministic for the same input")
	}
	if g.Hash("abc") == g.Hash("xyz") {
		t.Error("expected different inputs to hash differently")
	}
}

func TestRandomSessionTokenGenerator_GenerateHashMatchesHash(t *testing.T) {
	g := auth.NewRandomSessionTokenGenerator()

	rawToken, tokenHash, err := g.Generate()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if g.Hash(rawToken) != tokenHash {
		t.Error("expected Generate's returned hash to match Hash(rawToken)")
	}
}
