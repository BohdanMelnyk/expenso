package llm

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"expenso-backend/infrastructure/config"
	"expenso-backend/infrastructure/logger"
)

// AnthropicClient handles communication with Anthropic Claude API
type AnthropicClient struct {
	apiKey     string
	model      string
	maxTokens  int
	httpClient *http.Client
}

// AnthropicRequest represents the request to Anthropic API
type AnthropicRequest struct {
	Model     string    `json:"model"`
	MaxTokens int       `json:"max_tokens"`
	Messages  []Message `json:"messages"`
}

// Message represents a message in the request
type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// AnthropicResponse represents the response from Anthropic API
type AnthropicResponse struct {
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
	StopReason string `json:"stop_reason"`
}

// NewAnthropicClient creates a new Anthropic client
func NewAnthropicClient(cfg config.LLMConfig) *AnthropicClient {
	// Log API key status for debugging
	if cfg.APIKey == "" {
		logger.Error("Anthropic API key is empty!", logger.Fields{
			"api_key_empty": true,
		})
	} else {
		// Log first 10 chars and length to verify key format without exposing full key
		keyPreview := cfg.APIKey
		if len(cfg.APIKey) > 10 {
			keyPreview = cfg.APIKey[:10] + "..."
		}
		logger.Info("Anthropic client initialized", logger.Fields{
			"model":           cfg.Model,
			"max_tokens":      cfg.MaxTokens,
			"api_key_preview": keyPreview,
			"api_key_length":  len(cfg.APIKey),
			"has_sk_ant":      cfg.APIKey[:7] == "sk-ant-",
		})
	}

	return &AnthropicClient{
		apiKey:    cfg.APIKey,
		model:     cfg.Model,
		maxTokens: cfg.MaxTokens,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// SendMessage sends a message to Claude and returns the response
func (c *AnthropicClient) SendMessage(userPrompt string) (string, error) {
	startTime := time.Now()

	// Build request
	req := AnthropicRequest{
		Model:     c.model,
		MaxTokens: c.maxTokens,
		Messages: []Message{
			{
				Role:    "user",
				Content: userPrompt,
			},
		},
	}

	// Marshal to JSON
	requestBody, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	httpReq, err := http.NewRequest(
		"POST",
		"https://api.anthropic.com/v1/messages",
		bytes.NewReader(requestBody),
	)
	if err != nil {
		return "", fmt.Errorf("failed to create HTTP request: %w", err)
	}

	// Set headers
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", c.apiKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	logger.Info("Calling Anthropic API", logger.Fields{
		"model":         c.model,
		"prompt_length": len(userPrompt),
		"max_tokens":    c.maxTokens,
	})

	// Send request
	httpResp, err := c.httpClient.Do(httpReq)
	if err != nil {
		logger.Error("Anthropic API call failed", logger.Fields{
			"error":    err.Error(),
			"duration": time.Since(startTime).Milliseconds(),
		})
		return "", fmt.Errorf("failed to call Anthropic API: %w", err)
	}
	defer httpResp.Body.Close()

	// Read response body
	body, err := io.ReadAll(httpResp.Body)
	if err != nil {
		logger.Error("Failed to read response body", logger.Fields{
			"error":    err.Error(),
			"status":   httpResp.StatusCode,
			"duration": time.Since(startTime).Milliseconds(),
		})
		return "", fmt.Errorf("failed to read response body: %w", err)
	}

	// Check for API errors
	if httpResp.StatusCode != http.StatusOK {
		logger.Error("Anthropic API returned error", logger.Fields{
			"status":   httpResp.StatusCode,
			"response": string(body),
			"duration": time.Since(startTime).Milliseconds(),
		})
		return "", fmt.Errorf("anthropic API error: status %d, response: %s", httpResp.StatusCode, string(body))
	}

	// Parse response
	var resp AnthropicResponse
	if err := json.Unmarshal(body, &resp); err != nil {
		logger.Error("Failed to parse response JSON", logger.Fields{
			"error":    err.Error(),
			"duration": time.Since(startTime).Milliseconds(),
		})
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	// Extract text from response
	if len(resp.Content) == 0 {
		logger.Error("No content in response", logger.Fields{
			"duration": time.Since(startTime).Milliseconds(),
		})
		return "", fmt.Errorf("no content in API response")
	}

	responseText := resp.Content[0].Text

	logger.Info("Anthropic API call completed", logger.Fields{
		"model":           c.model,
		"response_length": len(responseText),
		"duration":        time.Since(startTime).Milliseconds(),
		"stop_reason":     resp.StopReason,
	})

	return responseText, nil
}
