package migration

import (
	"database/sql"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
)

type Migration struct {
	Version      string
	Filename     string
	Content      string
	Applied      bool
	Success      bool
	ErrorMessage string
}

type Migrator struct {
	db           *sql.DB
	migrationDir string
}

func NewMigrator(db *sql.DB, migrationDir string) *Migrator {
	return &Migrator{
		db:           db,
		migrationDir: migrationDir,
	}
}

// Initialize creates the schema_migrations table if it doesn't exist
func (m *Migrator) Initialize() error {
	query := `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(255) PRIMARY KEY,
			success BOOLEAN NOT NULL DEFAULT false,
			applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
			error_message TEXT
		);
		
		CREATE INDEX IF NOT EXISTS idx_schema_migrations_version ON schema_migrations(version);
		CREATE INDEX IF NOT EXISTS idx_schema_migrations_success ON schema_migrations(success);
	`

	_, err := m.db.Exec(query)
	if err != nil {
		return fmt.Errorf("failed to initialize schema_migrations table: %w", err)
	}

	log.Println("Schema migrations table initialized")
	return nil
}

// CheckLastFailedMigration checks if there are any failed migrations and stops the app
func (m *Migrator) CheckLastFailedMigration() error {
	query := `
		SELECT version, error_message 
		FROM schema_migrations 
		WHERE success = false 
		ORDER BY version DESC 
		LIMIT 1
	`

	var version, errorMessage string
	err := m.db.QueryRow(query).Scan(&version, &errorMessage)

	if err == sql.ErrNoRows {
		return nil // No failed migrations
	}

	if err != nil {
		return fmt.Errorf("failed to check for failed migrations: %w", err)
	}

	// Found a failed migration - log and stop the app
	log.Printf("ERROR: Found failed migration %s", version)
	log.Printf("Error message: %s", errorMessage)
	log.Println("Database migration failed. Please clean the database manually and retry.")
	log.Println("To clean the database, you can:")
	log.Println("1. Drop and recreate the database")
	log.Println("2. Or fix the migration issue and delete the failed entry from schema_migrations table")

	return fmt.Errorf("migration %s failed previously, stopping application", version)
}

// GetAppliedMigrations returns a list of successfully applied migrations
func (m *Migrator) GetAppliedMigrations() (map[string]bool, error) {
	query := `SELECT version FROM schema_migrations WHERE success = true`

	rows, err := m.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to get applied migrations: %w", err)
	}
	defer rows.Close()

	applied := make(map[string]bool)
	for rows.Next() {
		var version string
		if err := rows.Scan(&version); err != nil {
			return nil, fmt.Errorf("failed to scan migration version: %w", err)
		}
		applied[version] = true
	}

	return applied, nil
}

// GetAvailableMigrations scans the migration directory for .sql files
func (m *Migrator) GetAvailableMigrations() ([]Migration, error) {
	var migrations []Migration

	err := filepath.WalkDir(m.migrationDir, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if d.IsDir() || !strings.HasSuffix(d.Name(), ".sql") {
			return nil
		}

		// Extract version from filename (e.g., "001_create_tables.sql" -> "001_create_tables")
		filename := d.Name()
		version := strings.TrimSuffix(filename, ".sql")

		migrations = append(migrations, Migration{
			Version:  version,
			Filename: path,
		})

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to scan migration directory: %w", err)
	}

	// Sort migrations by version number
	sort.Slice(migrations, func(i, j int) bool {
		return compareMigrationVersions(migrations[i].Version, migrations[j].Version)
	})

	return migrations, nil
}

// RunMigrations executes pending migrations
func (m *Migrator) RunMigrations() error {
	// Check for failed migrations first
	if err := m.CheckLastFailedMigration(); err != nil {
		return err
	}

	applied, err := m.GetAppliedMigrations()
	if err != nil {
		return fmt.Errorf("failed to get applied migrations: %w", err)
	}

	available, err := m.GetAvailableMigrations()
	if err != nil {
		return fmt.Errorf("failed to get available migrations: %w", err)
	}

	var pendingMigrations []Migration
	for _, migration := range available {
		if !applied[migration.Version] {
			pendingMigrations = append(pendingMigrations, migration)
		}
	}

	if len(pendingMigrations) == 0 {
		log.Println("No pending migrations to run")
		return nil
	}

	log.Printf("Found %d pending migrations", len(pendingMigrations))

	for _, migration := range pendingMigrations {
		if err := m.runSingleMigration(migration); err != nil {
			return fmt.Errorf("migration %s failed: %w", migration.Version, err)
		}
	}

	log.Println("All migrations completed successfully")
	return nil
}

// runSingleMigration executes a single migration file
func (m *Migrator) runSingleMigration(migration Migration) error {
	log.Printf("Running migration: %s", migration.Version)

	// Record migration start (with success = false)
	insertQuery := `
		INSERT INTO schema_migrations (version, success, error_message) 
		VALUES ($1, false, '') 
		ON CONFLICT (version) 
		DO UPDATE SET success = false, applied_at = NOW(), error_message = ''
	`

	if _, err := m.db.Exec(insertQuery, migration.Version); err != nil {
		return fmt.Errorf("failed to record migration start: %w", err)
	}

	// Read migration file content
	content, err := os.ReadFile(migration.Filename)
	if err != nil {
		errorMsg := fmt.Sprintf("failed to read migration file: %v", err)
		m.recordMigrationFailure(migration.Version, errorMsg)
		return fmt.Errorf(errorMsg)
	}

	// Execute migration in a transaction
	tx, err := m.db.Begin()
	if err != nil {
		errorMsg := fmt.Sprintf("failed to start transaction: %v", err)
		m.recordMigrationFailure(migration.Version, errorMsg)
		return fmt.Errorf(errorMsg)
	}
	defer tx.Rollback()

	// Execute the migration SQL
	if _, err := tx.Exec(string(content)); err != nil {
		errorMsg := fmt.Sprintf("failed to execute migration SQL: %v", err)
		m.recordMigrationFailure(migration.Version, errorMsg)
		return fmt.Errorf(errorMsg)
	}

	// Update migration status to successful
	updateQuery := `
		UPDATE schema_migrations 
		SET success = true, applied_at = NOW(), error_message = '' 
		WHERE version = $1
	`

	if _, err := tx.Exec(updateQuery, migration.Version); err != nil {
		errorMsg := fmt.Sprintf("failed to update migration status: %v", err)
		m.recordMigrationFailure(migration.Version, errorMsg)
		return fmt.Errorf(errorMsg)
	}

	// Commit the transaction
	if err := tx.Commit(); err != nil {
		errorMsg := fmt.Sprintf("failed to commit migration transaction: %v", err)
		m.recordMigrationFailure(migration.Version, errorMsg)
		return fmt.Errorf(errorMsg)
	}

	log.Printf("Migration %s completed successfully", migration.Version)
	return nil
}

// recordMigrationFailure updates the schema_migrations table with failure information
func (m *Migrator) recordMigrationFailure(version, errorMessage string) {
	updateQuery := `
		UPDATE schema_migrations 
		SET success = false, applied_at = NOW(), error_message = $2 
		WHERE version = $1
	`

	if _, err := m.db.Exec(updateQuery, version, errorMessage); err != nil {
		log.Printf("Failed to record migration failure for %s: %v", version, err)
	}
}

// compareMigrationVersions compares two migration versions
// Returns true if a should come before b
func compareMigrationVersions(a, b string) bool {
	// Extract numeric prefix from version string
	aNum := extractVersionNumber(a)
	bNum := extractVersionNumber(b)

	if aNum != bNum {
		return aNum < bNum
	}

	// If numeric parts are equal, compare lexically
	return a < b
}

// extractVersionNumber extracts the leading numeric part from a version string
func extractVersionNumber(version string) int {
	// Find the first non-digit character
	i := 0
	for i < len(version) && (version[i] >= '0' && version[i] <= '9') {
		i++
	}

	if i == 0 {
		return 0 // No leading digits
	}

	num, err := strconv.Atoi(version[:i])
	if err != nil {
		return 0
	}

	return num
}
