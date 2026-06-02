package snapshot

import (
	"time"

	"expenso-backend/domain/entities"
	"expenso-backend/usecases/interfaces/repositories"
)

type CreateSnapshotCommand struct {
	Date            time.Time
	Total           float64
	Haspa           float64
	N26B            float64
	N26M            float64
	Cash            float64
	UberStocks      float64
	ScalableCapital float64
	MonoB           float64
	MonoM           float64
	PaypalB         float64
	PaypalM         float64
	BackupCash      float64
}

type SnapshotInteractor struct {
	snapshotRepo repositories.SnapshotRepository
}

func NewSnapshotInteractor(snapshotRepo repositories.SnapshotRepository) *SnapshotInteractor {
	return &SnapshotInteractor{snapshotRepo: snapshotRepo}
}

func (i *SnapshotInteractor) CreateSnapshot(cmd CreateSnapshotCommand) (*entities.Snapshot, error) {
	s, err := entities.NewSnapshot(
		cmd.Date, cmd.Total,
		cmd.Haspa, cmd.N26B, cmd.N26M, cmd.Cash,
		cmd.UberStocks, cmd.ScalableCapital,
		cmd.MonoB, cmd.MonoM,
		cmd.PaypalB, cmd.PaypalM, cmd.BackupCash,
	)
	if err != nil {
		return nil, err
	}
	if err := i.snapshotRepo.Save(s); err != nil {
		return nil, err
	}
	return s, nil
}

func (i *SnapshotInteractor) GetSnapshots() ([]*entities.Snapshot, error) {
	return i.snapshotRepo.FindAll()
}
