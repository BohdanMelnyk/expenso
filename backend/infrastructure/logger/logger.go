package logger

import (
	"fmt"
	"log"
	"os"
	"runtime"
	"strings"
	"time"
)

// Level represents the severity of a log message
type Level int

const (
	DEBUG Level = iota
	INFO
	WARN
	ERROR
	FATAL
)

var levelStrings = map[Level]string{
	DEBUG: "DEBUG",
	INFO:  "INFO",
	WARN:  "WARN",
	ERROR: "ERROR",
	FATAL: "FATAL",
}

var levelColors = map[Level]string{
	DEBUG: "\033[36m", // Cyan
	INFO:  "\033[32m", // Green
	WARN:  "\033[33m", // Yellow
	ERROR: "\033[31m", // Red
	FATAL: "\033[35m", // Magenta
}

const colorReset = "\033[0m"

// Logger provides structured logging with multiple levels
type Logger struct {
	level      Level
	logger     *log.Logger
	withColors bool
}

// Fields represents structured log fields
type Fields map[string]interface{}

var defaultLogger *Logger

func init() {
	defaultLogger = NewLogger(INFO, true)
}

// NewLogger creates a new logger instance
func NewLogger(level Level, withColors bool) *Logger {
	return &Logger{
		level:      level,
		logger:     log.New(os.Stdout, "", 0),
		withColors: withColors,
	}
}

// SetLevel sets the minimum log level
func SetLevel(level Level) {
	defaultLogger.level = level
}

// SetColors enables or disables colored output
func SetColors(enabled bool) {
	defaultLogger.withColors = enabled
}

// log is the internal logging function
func (l *Logger) log(level Level, msg string, fields Fields) {
	if level < l.level {
		return
	}

	timestamp := time.Now().Format("2006-01-02 15:04:05.000")
	levelStr := levelStrings[level]

	// Add color if enabled
	if l.withColors {
		color := levelColors[level]
		levelStr = color + levelStr + colorReset
	}

	// Build the log message
	var sb strings.Builder
	sb.WriteString(fmt.Sprintf("[%s] [%s] %s", timestamp, levelStr, msg))

	// Add fields if present
	if len(fields) > 0 {
		sb.WriteString(" |")
		for key, value := range fields {
			sb.WriteString(fmt.Sprintf(" %s=%v", key, value))
		}
	}

	l.logger.Println(sb.String())
}

// logWithCaller logs with caller information (file and line number)
func (l *Logger) logWithCaller(level Level, msg string, fields Fields, skip int) {
	if level < l.level {
		return
	}

	// Get caller information
	_, file, line, ok := runtime.Caller(skip)
	if ok {
		// Extract just the filename from the full path
		parts := strings.Split(file, "/")
		file = parts[len(parts)-1]

		if fields == nil {
			fields = Fields{}
		}
		fields["caller"] = fmt.Sprintf("%s:%d", file, line)
	}

	l.log(level, msg, fields)
}

// Debug logs a debug message
func Debug(msg string, fields ...Fields) {
	f := mergeFields(fields)
	defaultLogger.logWithCaller(DEBUG, msg, f, 2)
}

// Info logs an info message
func Info(msg string, fields ...Fields) {
	f := mergeFields(fields)
	defaultLogger.logWithCaller(INFO, msg, f, 2)
}

// Warn logs a warning message
func Warn(msg string, fields ...Fields) {
	f := mergeFields(fields)
	defaultLogger.logWithCaller(WARN, msg, f, 2)
}

// Error logs an error message
func Error(msg string, fields ...Fields) {
	f := mergeFields(fields)
	defaultLogger.logWithCaller(ERROR, msg, f, 2)
}

// Fatal logs a fatal message and exits
func Fatal(msg string, fields ...Fields) {
	f := mergeFields(fields)
	defaultLogger.logWithCaller(FATAL, msg, f, 2)
	os.Exit(1)
}

// ErrorWithStack logs an error with stack trace
func ErrorWithStack(msg string, err error, fields ...Fields) {
	f := mergeFields(fields)
	if f == nil {
		f = Fields{}
	}

	if err != nil {
		f["error"] = err.Error()
	}

	// Capture stack trace
	stack := captureStackTrace(3, 10)
	if len(stack) > 0 {
		f["stack"] = strings.Join(stack, " -> ")
	}

	defaultLogger.logWithCaller(ERROR, msg, f, 2)
}

// LogHTTPError logs HTTP errors with request context
func LogHTTPError(statusCode int, msg string, err error, fields Fields) {
	if fields == nil {
		fields = Fields{}
	}

	fields["status_code"] = statusCode
	if err != nil {
		fields["error"] = err.Error()
	}

	// Add stack trace for 5xx errors
	if statusCode >= 500 {
		stack := captureStackTrace(2, 10)
		if len(stack) > 0 {
			fields["stack"] = strings.Join(stack, " -> ")
		}
		defaultLogger.logWithCaller(ERROR, msg, fields, 2)
	} else {
		// 4xx errors - log as warning
		defaultLogger.logWithCaller(WARN, msg, fields, 2)
	}
}

// captureStackTrace captures the call stack
func captureStackTrace(skip, maxDepth int) []string {
	var stack []string

	for i := skip; i < skip+maxDepth; i++ {
		pc, file, line, ok := runtime.Caller(i)
		if !ok {
			break
		}

		// Get function name
		fn := runtime.FuncForPC(pc)
		funcName := "unknown"
		if fn != nil {
			funcName = fn.Name()
			// Simplify function name (remove package path)
			parts := strings.Split(funcName, "/")
			funcName = parts[len(parts)-1]
		}

		// Extract filename
		fileParts := strings.Split(file, "/")
		fileName := fileParts[len(fileParts)-1]

		stack = append(stack, fmt.Sprintf("%s:%d(%s)", fileName, line, funcName))
	}

	return stack
}

// mergeFields merges multiple field maps into one
func mergeFields(fields []Fields) Fields {
	if len(fields) == 0 {
		return nil
	}

	merged := Fields{}
	for _, f := range fields {
		for k, v := range f {
			merged[k] = v
		}
	}
	return merged
}

// FormatError formats an error with additional context
func FormatError(err error, context string) string {
	if err == nil {
		return context
	}
	return fmt.Sprintf("%s: %v", context, err)
}
