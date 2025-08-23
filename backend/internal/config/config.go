package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port         string
	DatabaseURL  string
	Environment  string
}

func Load() *Config {
	return &Config{
		Port:         getEnv("PORT", "8080"),
		DatabaseURL:  getEnv("DATABASE_URL", "postgres://localhost:5432/expenso?sslmode=disable"),
		Environment:  getEnv("ENVIRONMENT", "development"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}