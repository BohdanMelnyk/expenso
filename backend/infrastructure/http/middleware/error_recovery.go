package middleware

import (
	"fmt"
	"net/http"
	"runtime/debug"

	"expenso-backend/infrastructure/logger"

	"github.com/gin-gonic/gin"
)

// ErrorRecovery is a middleware that recovers from panics and logs them
func ErrorRecovery() gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if err := recover(); err != nil {
				// Get stack trace
				stack := string(debug.Stack())

				// Get request ID
				requestID := GetRequestID(c)

				// Log the panic with full details
				fields := logger.Fields{
					"request_id": requestID,
					"method":     c.Request.Method,
					"path":       c.Request.URL.Path,
					"panic":      fmt.Sprintf("%v", err),
					"stack":      stack,
					"ip":         c.ClientIP(),
				}

				logger.Error("PANIC recovered", fields)

				// Return error response
				c.JSON(http.StatusInternalServerError, gin.H{
					"error":      "Internal server error",
					"request_id": requestID,
					"message":    "An unexpected error occurred. Please contact support with this request ID.",
				})

				// Abort the request
				c.Abort()
			}
		}()

		c.Next()
	}
}

// ErrorResponse represents a standardized error response
type ErrorResponse struct {
	Error     string                 `json:"error"`
	RequestID string                 `json:"request_id,omitempty"`
	Details   map[string]interface{} `json:"details,omitempty"`
	Timestamp string                 `json:"timestamp,omitempty"`
}

// RespondWithError sends a standardized error response and logs it
func RespondWithError(c *gin.Context, statusCode int, message string, err error, details map[string]interface{}) {
	requestID := GetRequestID(c)

	// Build log fields
	logFields := logger.Fields{
		"request_id":  requestID,
		"status_code": statusCode,
		"method":      c.Request.Method,
		"path":        c.Request.URL.Path,
		"ip":          c.ClientIP(),
	}

	// Add error details
	if err != nil {
		logFields["error"] = err.Error()
	}

	// Add custom details
	for key, value := range details {
		logFields[key] = value
	}

	// Log based on status code
	logger.LogHTTPError(statusCode, message, err, logFields)

	// Build response
	response := ErrorResponse{
		Error:     message,
		RequestID: requestID,
	}

	// Include details in response for 4xx errors (but not internal errors)
	if statusCode >= 400 && statusCode < 500 && len(details) > 0 {
		response.Details = details
	}

	c.JSON(statusCode, response)
}

// RespondWithValidationError sends a validation error response
func RespondWithValidationError(c *gin.Context, message string, validationErrors map[string]string) {
	details := make(map[string]interface{})
	if len(validationErrors) > 0 {
		details["validation_errors"] = validationErrors
	}

	RespondWithError(c, http.StatusBadRequest, message, nil, details)
}

// RespondWithInternalError sends a 500 error response
func RespondWithInternalError(c *gin.Context, message string, err error) {
	RespondWithError(c, http.StatusInternalServerError, message, err, nil)
}

// RespondWithBadRequest sends a 400 error response
func RespondWithBadRequest(c *gin.Context, message string, err error) {
	RespondWithError(c, http.StatusBadRequest, message, err, nil)
}

// RespondWithNotFound sends a 404 error response
func RespondWithNotFound(c *gin.Context, message string) {
	RespondWithError(c, http.StatusNotFound, message, nil, nil)
}

// RespondWithUnauthorized sends a 401 error response
func RespondWithUnauthorized(c *gin.Context, message string) {
	RespondWithError(c, http.StatusUnauthorized, message, nil, nil)
}

// RespondWithForbidden sends a 403 error response
func RespondWithForbidden(c *gin.Context, message string) {
	RespondWithError(c, http.StatusForbidden, message, nil, nil)
}

// RespondWithConflict sends a 409 error response
func RespondWithConflict(c *gin.Context, message string, details map[string]interface{}) {
	RespondWithError(c, http.StatusConflict, message, nil, details)
}
