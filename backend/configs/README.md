# Configuration Files

This directory contains environment-specific configuration files for the Expenso backend application.

## Files

- `local.yaml` - Configuration for local development
- `prod.yaml` - Configuration for production environment

## Environment Selection

The application automatically selects the configuration file based on the `APP_ENV` environment variable:

```bash
# Use local configuration (default)
APP_ENV=local go run cmd/server/main.go

# Use production configuration
APP_ENV=prod go run cmd/server/main.go
```

## Configuration Structure

```yaml
environment: local|production

server:
  host: "localhost"     # Server bind address
  port: 8080           # Server port

database:
  host: localhost      # Database host
  port: 5432          # Database port
  username: username   # Database username
  password: password   # Database password
  database: expenso    # Database name
  sslmode: disable     # SSL mode (disable/require)
```

## Override with Environment Variables

You can override the entire database configuration by setting the `DATABASE_URL` environment variable:

```bash
DATABASE_URL="postgres://user:pass@host:port/db?sslmode=disable" go run cmd/server/main.go
```

## Security Note

- Never commit sensitive production credentials to version control
- Use environment variables or secure secret management in production
- The `prod.yaml` file contains placeholder values and should be updated with actual production credentials