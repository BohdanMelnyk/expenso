package repositories

import "expenso-backend/domain/entities"

type SnapshotRepository interface {
	Save(snapshot *entities.Snapshot) error
	FindAll() ([]*entities.Snapshot, error)
	// FindByID returns nil, nil when no snapshot has the id.
	FindByID(id entities.SnapshotID) (*entities.Snapshot, error)
	Update(snapshot *entities.Snapshot) error
}
