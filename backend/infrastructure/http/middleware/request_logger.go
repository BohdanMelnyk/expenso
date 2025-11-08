package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"time"

	"expenso-backend/infrastructure/logger"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	// RequestIDKey is the context key for request ID
	RequestIDKey = "request_id"
	// RequestIDHeader is the HTTP header for request ID
	RequestIDHeader = "X-Request-ID"
)

// RequestLogger is a middleware that logs all HTTP requests and responses
func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Generate or use existing request ID
		requestID := c.GetHeader(RequestIDHeader)
		if requestID == "" {
			requestID = uuid.New().String()
		}

		// Store request ID in context
		c.Set(RequestIDKey, requestID)
		c.Header(RequestIDHeader, requestID)

		// Record start time
		startTime := time.Now()

		// Log incoming request
		fields := logger.Fields{
			"request_id": requestID,
			"method":     c.Request.Method,
			"path":       c.Request.URL.Path,
			"query":      c.Request.URL.RawQuery,
			"ip":         c.ClientIP(),
			"user_agent": c.Request.UserAgent(),
		}

		// Log request body for POST/PUT requests (if not too large)
		if c.Request.Method == "POST" || c.Request.Method == "PUT" || c.Request.Method == "PATCH" {
			if c.Request.Body != nil && c.Request.ContentLength < 10240 { // Max 10KB
				bodyBytes, err := io.ReadAll(c.Request.Body)
				if err == nil {
					// Restore the body for handlers to read
					c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))

					// Try to parse as JSON for prettier logging
					var bodyJSON map[string]interface{}
					if json.Unmarshal(bodyBytes, &bodyJSON) == nil {
						// Mask sensitive fields
						maskSensitiveFields(bodyJSON)
						fields["body"] = bodyJSON
					} else {
						fields["body"] = string(bodyBytes)
					}
				}
			}
		}

		logger.Info("Incoming request", fields)

		// Process request
		c.Next()

		// Calculate duration
		duration := time.Since(startTime)

		// Log response
		statusCode := c.Writer.Status()
		responseFields := logger.Fields{
			"request_id":   requestID,
			"method":       c.Request.Method,
			"path":         c.Request.URL.Path,
			"status_code":  statusCode,
			"duration_ms":  duration.Milliseconds(),
			"response_size": c.Writer.Size(),
		}

		// Log based on status code
		if statusCode >= 500 {
			logger.Error("Request failed with server error", responseFields)
		} else if statusCode >= 400 {
			logger.Warn("Request failed with client error", responseFields)
		} else {
			logger.Info("Request completed successfully", responseFields)
		}
	}
}

// maskSensitiveFields masks sensitive data in log output
func maskSensitiveFields(data map[string]interface{}) {
	sensitiveKeys := []string{
		"password", "token", "secret", "api_key", "apikey",
		"authorization", "credit_card", "ssn", "social_security",
	}

	for _, key := range sensitiveKeys {
		if _, exists := data[key]; exists {
			data[key] = "***MASKED***"
		}
	}

	// Recursively mask nested objects
	for _, value := range data {
		if nested, ok := value.(map[string]interface{}); ok {
			maskSensitiveFields(nested)
		}
	}
}

// GetRequestID retrieves the request ID from the context
func GetRequestID(c *gin.Context) string {
	if requestID, exists := c.Get(RequestIDKey); exists {
		if id, ok := requestID.(string); ok {
			return id
		}
	}
	return ""
}
