# Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install dependencies for building
RUN apk add --no-cache git ca-certificates

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/server

# Final stage
FROM alpine:latest

# Install ca-certificates for HTTPS requests and postgresql-client for migrations
RUN apk --no-cache add ca-certificates postgresql-client

WORKDIR /root/

# Copy the binary from builder stage
COPY --from=builder /app/main .
COPY --from=builder /app/migrations ./migrations

# Copy migration script
COPY ./scripts/migrate.sh ./migrate.sh
RUN chmod +x ./migrate.sh

# Expose port
EXPOSE 8080

# Run migrations then start the application
CMD ["sh", "-c", "./migrate.sh && ./main"]