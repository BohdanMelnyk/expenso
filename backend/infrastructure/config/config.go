package config

import (
	"fmt"
	"io/ioutil"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// DatabaseConfig holds database configuration
type DatabaseConfig struct {
	Host     string `yaml:"host"`
	Port     int    `yaml:"port"`
	Username string `yaml:"username"`
	Password string `yaml:"password"`
	Database string `yaml:"database"`
	SSLMode  string `yaml:"sslmode"`
}

// ServerConfig holds server configuration
type ServerConfig struct {
	Host string `yaml:"host"`
	Port int    `yaml:"port"`
}

// LLMConfig holds LLM/AI configuration
type LLMConfig struct {
	APIKey    string `yaml:"api_key"`
	Model     string `yaml:"model"`
	MaxTokens int    `yaml:"max_tokens"`
}

// Config holds all application configuration
type Config struct {
	Environment string         `yaml:"environment"`
	Server      ServerConfig   `yaml:"server"`
	Database    DatabaseConfig `yaml:"database"`
	LLM         LLMConfig      `yaml:"llm"`
}

// GetDatabaseURL constructs database URL from config
func (c *Config) GetDatabaseURL() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=%s",
		c.Database.Username,
		c.Database.Password,
		c.Database.Host,
		c.Database.Port,
		c.Database.Database,
		c.Database.SSLMode,
	)
}

// GetServerAddress constructs server address from config
func (c *Config) GetServerAddress() string {
	return fmt.Sprintf("%s:%d", c.Server.Host, c.Server.Port)
}

// LoadConfig loads configuration from YAML file
func LoadConfig(configPath string) (*Config, error) {
	// Check if config file exists
	if _, err := os.Stat(configPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("config file not found: %s", configPath)
	}

	// Read the config file
	data, err := ioutil.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %w", err)
	}

	// Parse YAML
	var config Config
	if err := yaml.Unmarshal(data, &config); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %w", err)
	}

	return &config, nil
}

// LoadConfigForEnvironment loads configuration based on environment
func LoadConfigForEnvironment() (*Config, error) {
	// Get environment from env var, default to "local"
	env := os.Getenv("APP_ENV")
	if env == "" {
		env = "local"
	}

	// Construct config file path
	configPath := filepath.Join("configs", fmt.Sprintf("%s.yaml", env))

	// Load config
	config, err := LoadConfig(configPath)
	if err != nil {
		return nil, err
	}

	// Override with environment variables if they exist
	if dbURL := os.Getenv("DATABASE_URL"); dbURL != "" {
		// Parse DATABASE_URL and override config
		// For now, we'll just return an error if DATABASE_URL is set
		// You can implement URL parsing if needed
		return config, nil
	}

	// Override LLM API key from environment variable if present
	if apiKey := os.Getenv("ANTHROPIC_API_KEY"); apiKey != "" {
		config.LLM.APIKey = apiKey
	}

	// Debug: Log what was loaded from YAML vs environment
	if config.LLM.APIKey == "" {
		// This is a warning - no API key was found
		fmt.Fprintf(os.Stderr, "WARNING: ANTHROPIC_API_KEY environment variable is not set!\n")
	}

	return config, nil
}
