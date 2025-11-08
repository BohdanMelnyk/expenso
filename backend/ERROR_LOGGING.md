# Backend Error Logging and Tracing

## Overview

The Expenso backend now includes comprehensive error logging with request tracing, stack traces, and structured logging for better debugging and monitoring.

## Features

### 1. **Structured Logging**
- Color-coded log levels (DEBUG, INFO, WARN, ERROR, FATAL)
- Timestamp for each log entry
- Caller information (file and line number)
- Structured fields for additional context
- Stack traces for errors

### 2. **Request Tracing**
- Unique request ID for each HTTP request
- Correlation ID tracking across the entire request lifecycle
- Request/response logging with duration
- Automatic client IP and user agent capture
- Request body logging (with sensitive field masking)

### 3. **Error Recovery**
- Panic recovery with full stack traces
- Automatic error response formatting
- Status code-based logging (4xx = WARN, 5xx = ERROR)
- Request context preservation during errors

### 4. **Sensitive Data Protection**
- Automatic masking of passwords, tokens, API keys
- Configurable sensitive field patterns
- Recursive masking in nested objects

## Architecture

### Core Components

#### 1. **Logger Package** (`infrastructure/logger/logger.go`)

Provides structured logging with multiple severity levels:

```go
// Log levels
DEBUG  // Detailed debugging information
INFO   // General informational messages
WARN   // Warning messages (4xx errors)
ERROR  // Error messages (5xx errors, exceptions)
FATAL  // Critical errors that cause application exit
```

**Key Functions:**
```go
logger.Info("message", logger.Fields{"key": "value"})
logger.Error("message", logger.Fields{"error": err.Error()})
logger.ErrorWithStack("message", err, logger.Fields{...})
logger.LogHTTPError(statusCode, "message", err, fields)
```

#### 2. **Request Logger Middleware** (`infrastructure/http/middleware/request_logger.go`)

Logs all incoming HTTP requests and outgoing responses:

**Features:**
- Generates or uses existing X-Request-ID header
- Logs request method, path, query parameters
- Captures client IP and user agent
- Logs request body for POST/PUT/PATCH (max 10KB)
- Measures request duration
- Logs response status code and size

**Example Log Output:**
```
[2024-11-02 17:30:45.123] [INFO] Incoming request | request_id=a1b2c3d4-e5f6-7890 method=POST path=/api/v1/expenses ip=127.0.0.1 user_agent=Mozilla/5.0
[2024-11-02 17:30:45.234] [INFO] Request completed successfully | request_id=a1b2c3d4-e5f6-7890 method=POST path=/api/v1/expenses status_code=201 duration_ms=111 response_size=256
```

#### 3. **Error Recovery Middleware** (`infrastructure/http/middleware/error_recovery.go`)

Recovers from panics and provides standardized error responses:

**Helper Functions:**
```go
middleware.RespondWithError(c, statusCode, message, err, details)
middleware.RespondWithBadRequest(c, message, err)
middleware.RespondWithNotFound(c, message)
middleware.RespondWithInternalError(c, message, err)
middleware.RespondWithUnauthorized(c, message)
middleware.RespondWithForbidden(c, message)
middleware.RespondWithConflict(c, message, details)
middleware.RespondWithValidationError(c, message, validationErrors)
```

**Error Response Format:**
```json
{
  "error": "Human-readable error message",
  "request_id": "a1b2c3d4-e5f6-7890",
  "details": {
    "field": "Additional context"
  }
}
```

## Implementation Guide

### Setting Up Error Logging in main.go

```go
import (
    "expenso-backend/infrastructure/logger"
    "expenso-backend/infrastructure/http/middleware"
)

func main() {
    // Initialize logger
    logger.SetLevel(logger.INFO)
    logger.Info("Starting server...")

    // Setup Gin router
    gin.SetMode(gin.ReleaseMode)
    router := gin.New()

    // Add middleware (order matters!)
    router.Use(middleware.ErrorRecovery())  // First: catch panics
    router.Use(middleware.RequestLogger()) // Second: log requests

    // ... rest of setup
}
```

### Using Error Logging in Handlers

**Before (old way):**
```go
func (h *ExpenseHandler) GetExpense(c *gin.Context) {
    id, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
        return
    }

    expense, err := h.interactor.GetExpense(id)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed"})
        return
    }

    c.JSON(http.StatusOK, expense)
}
```

**After (new way with logging):**
```go
func (h *ExpenseHandler) GetExpense(c *gin.Context) {
    id, err := strconv.Atoi(c.Param("id"))
    if err != nil {
        middleware.RespondWithBadRequest(c, "Invalid expense ID", err)
        return
    }

    expense, err := h.interactor.GetExpense(id)
    if err != nil {
        if err == entities.ErrExpenseNotFound {
            middleware.RespondWithNotFound(c, "Expense not found")
        } else {
            middleware.RespondWithInternalError(c, "Failed to fetch expense", err)
        }
        return
    }

    c.JSON(http.StatusOK, expense)
}
```

### Custom Logging in Business Logic

```go
import "expenso-backend/infrastructure/logger"

func (s *ExpenseService) ProcessExpense(exp *Expense) error {
    logger.Info("Processing expense", logger.Fields{
        "expense_id": exp.ID,
        "amount": exp.Amount,
    })

    if err := s.validateExpense(exp); err != nil {
        logger.Error("Expense validation failed", logger.Fields{
            "expense_id": exp.ID,
            "error": err.Error(),
        })
        return err
    }

    // Log with stack trace for unexpected errors
    if err := s.repository.Save(exp); err != nil {
        logger.ErrorWithStack("Failed to save expense", err, logger.Fields{
            "expense_id": exp.ID,
        })
        return err
    }

    logger.Info("Expense processed successfully", logger.Fields{
        "expense_id": exp.ID,
    })

    return nil
}
```

## Log Output Examples

### Successful Request
```
[2024-11-02 17:30:45.123] [INFO] Incoming request | request_id=550e8400-e29b-41d4-a716 method=GET path=/api/v1/expenses/123 ip=127.0.0.1
[2024-11-02 17:30:45.234] [INFO] Request completed successfully | request_id=550e8400-e29b-41d4-a716 status_code=200 duration_ms=111
```

### Client Error (4xx)
```
[2024-11-02 17:31:12.456] [INFO] Incoming request | request_id=abc123 method=POST path=/api/v1/expenses ip=127.0.0.1 body={"amount": "invalid"}
[2024-11-02 17:31:12.467] [WARN] Invalid request body | request_id=abc123 status_code=400 error=json: cannot unmarshal string into Go value of type float64 caller=expense_handler.go:142
[2024-11-02 17:31:12.468] [WARN] Request failed with client error | request_id=abc123 status_code=400 duration_ms=12
```

### Server Error (5xx)
```
[2024-11-02 17:32:00.789] [INFO] Incoming request | request_id=def456 method=GET path=/api/v1/expenses/999 ip=127.0.0.1
[2024-11-02 17:32:00.802] [ERROR] Failed to fetch expense | request_id=def456 status_code=500 error=database connection failed stack=expense_handler.go:118(GetExpense) -> expense_interactor.go:45(GetExpense) -> expense_repository.go:78(FindByID) caller=expense_handler.go:118
[2024-11-02 17:32:00.803] [ERROR] Request failed with server error | request_id=def456 status_code=500 duration_ms=14
```

### Panic Recovery
```
[2024-11-02 17:33:15.234] [INFO] Incoming request | request_id=ghi789 method=DELETE path=/api/v1/expenses/456 ip=127.0.0.1
[2024-11-02 17:33:15.245] [ERROR] PANIC recovered | request_id=ghi789 method=DELETE path=/api/v1/expenses/456 panic=runtime error: index out of range [5] with length 3 stack=goroutine 42 [running]:
runtime/debug.Stack()
	/usr/local/go/src/runtime/debug/stack.go:24 +0x5e
...
[2024-11-02 17:33:15.246] [ERROR] Request failed with server error | request_id=ghi789 status_code=500 duration_ms=12
```

## Request Tracing Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Request arrives                                          │
│    - Generate or extract X-Request-ID                       │
│    - Store in context                                       │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Log incoming request                                     │
│    - Method, path, query, IP, user agent                    │
│    - Request body (if applicable)                           │
│    - Request ID                                             │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Process request through handlers                         │
│    - All logs include request_id                            │
│    - Errors logged with context                             │
│    - Stack traces for 5xx errors                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Log response                                             │
│    - Status code                                            │
│    - Duration                                               │
│    - Response size                                          │
│    - Request ID                                             │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### Log Levels

Set the minimum log level in `main.go`:

```go
// Show all logs (development)
logger.SetLevel(logger.DEBUG)

// Production (default)
logger.SetLevel(logger.INFO)

// Only errors
logger.SetLevel(logger.ERROR)
```

### Color Output

Enable/disable colored output:

```go
// Enable colors (default for development)
logger.SetColors(true)

// Disable colors (for production/log files)
logger.SetColors(false)
```

### Sensitive Data Masking

Add custom sensitive field patterns in `request_logger.go`:

```go
sensitiveKeys := []string{
    "password", "token", "secret", "api_key",
    "credit_card", "ssn", "authorization",
    // Add custom patterns here
}
```

## Best Practices

### 1. Always Use Request Context

```go
// Get request ID from context
requestID := middleware.GetRequestID(c)

// Include in logs
logger.Info("Processing...", logger.Fields{
    "request_id": requestID,
    "user_id": userID,
})
```

### 2. Log at Appropriate Levels

- **DEBUG**: Detailed debugging (disabled in production)
- **INFO**: Normal operations, successful requests
- **WARN**: Client errors (4xx), recoverable issues
- **ERROR**: Server errors (5xx), exceptions
- **FATAL**: Critical errors that stop the application

### 3. Include Context in Errors

```go
// Good: Includes context
middleware.RespondWithInternalError(c, "Failed to process payment", err)

// Better: Includes additional details
details := logger.Fields{
    "payment_id": paymentID,
    "amount": amount,
}
middleware.RespondWithError(c, 500, "Payment processing failed", err, details)
```

### 4. Use Structured Fields

```go
// Good
logger.Info("User logged in", logger.Fields{
    "user_id": userID,
    "ip": clientIP,
    "timestamp": time.Now(),
})

// Avoid
logger.Info(fmt.Sprintf("User %s logged in from %s", userID, clientIP))
```

### 5. Don't Log Sensitive Data

```go
// BAD - Logs password
logger.Info("Login attempt", logger.Fields{
    "username": username,
    "password": password,  // ❌ NEVER LOG PASSWORDS
})

// GOOD - Only logs safe data
logger.Info("Login attempt", logger.Fields{
    "username": username,
    "success": true,
})
```

## Monitoring and Debugging

### Finding Requests by ID

All logs for a single request share the same `request_id`:

```bash
# Grep all logs for a specific request
grep "request_id=550e8400-e29b-41d4-a716" app.log

# View timeline of a single request
grep "550e8400-e29b-41d4-a716" app.log | sort
```

### Common Debug Scenarios

#### Slow Requests
```bash
# Find requests taking > 1000ms
grep "duration_ms" app.log | awk '$NF > 1000'
```

#### Error Patterns
```bash
# Count errors by status code
grep "status_code=5" app.log | cut -d' ' -f4 | sort | uniq -c

# Find most common errors
grep "\[ERROR\]" app.log | cut -d'|' -f2 | sort | uniq -c | sort -rn
```

#### Panic Investigation
```bash
# Find all panics
grep "PANIC recovered" app.log

# Get full stack trace
grep -A 50 "PANIC recovered" app.log
```

## Future Enhancements

Potential improvements:

1. **Log Aggregation**: Send logs to ELK, Splunk, or Datadog
2. **Metrics**: Add Prometheus metrics for error rates
3. **Distributed Tracing**: OpenTelemetry integration
4. **Log Rotation**: Automatic log file rotation
5. **Performance Metrics**: Track slow queries and bottlenecks
6. **Audit Logging**: Separate audit trail for compliance
7. **Alert Integration**: Trigger alerts on critical errors
8. **Log Sampling**: Sample high-volume logs in production
9. **Structured JSON**: JSON output for log parsers
10. **Context Propagation**: Pass request context to background jobs

## Related Files

- `backend/infrastructure/logger/logger.go` - Core logger implementation
- `backend/infrastructure/http/middleware/request_logger.go` - Request logging middleware
- `backend/infrastructure/http/middleware/error_recovery.go` - Error handling and recovery
- `backend/cmd/server/main.go` - Logger initialization and middleware setup
- `backend/infrastructure/http/handlers/expense_handler.go` - Example usage in handlers

## Dependencies

- `github.com/google/uuid` - UUID generation for request IDs
- `github.com/gin-gonic/gin` - HTTP framework
