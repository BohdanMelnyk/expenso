package repositories

import "expenso-backend/domain/entities"

type SnapshotRepository interface {
	Save(snapshot *entities.Snapshot) error
	FindAll() ([]*entities.Snapshot, error)
}
