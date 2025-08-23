#!/bin/bash
set -e

echo "Running database migrations..."

# Default database connection parameters
DB_HOST=${DB_HOST:-postgres}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-expenso}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-password}

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is ready!"

# Create migrations tracking table if it doesn't exist
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);"

echo "Applying migrations..."

# Function to apply migration if not already applied
apply_migration() {
    local migration_file=$1
    local version=$(basename "$migration_file" .sql)
    
    # Check if migration was already applied
    local applied=$(PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';" | xargs)
    
    if [ "$applied" = "0" ]; then
        echo "Applying migration: $version"
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$migration_file"
        PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "INSERT INTO schema_migrations (version) VALUES ('$version');"
        echo "Migration $version applied successfully"
    else
        echo "Migration $version already applied, skipping"
    fi
}

# Apply migrations in order
for migration_file in ./migrations/*.sql; do
    if [ -f "$migration_file" ]; then
        apply_migration "$migration_file"
    fi
done

echo "All migrations completed successfully!"