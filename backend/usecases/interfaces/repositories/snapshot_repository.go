package repositories

import (
	"errors"

	"expenso-backend/domain/entities"
)

// ErrSnapshotNotFound: no snapshot with that id (for example deleted meanwhile).
var ErrSnapshotNotFound = errors.New("snapshot not found")

type SnapshotRepository interface {
	Save(snapshot *entities.Snapshot) error
	FindAll() ([]*entities.Snapshot, error)
	// FindByID returns nil, nil when no snapshot has the id.
	FindByID(id entities.SnapshotID) (*entities.Snapshot, error)
	Update(snapshot *entities.Snapshot) error
}
