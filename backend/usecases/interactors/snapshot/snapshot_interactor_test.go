package snapshot_test

import (
	"testing"
	"time"

	"expenso-backend/domain/entities"
	interactor "expenso-backend/usecases/interactors/snapshot"
)

type mockSnapshotRepo struct {
	saved   []*entities.Snapshot
	findAll []*entities.Snapshot
}

func (m *mockSnapshotRepo) Save(s *entities.Snapshot) error {
	s.SetID(entities.SnapshotID(len(m.saved) + 1))
	m.saved = append(m.saved, s)
	return nil
}

func (m *mockSnapshotRepo) FindAll() ([]*entities.Snapshot, error) {
	return m.findAll, nil
}

func TestCreateSnapshot(t *testing.T) {
	repo := &mockSnapshotRepo{}
	svc := interactor.NewSnapshotInteractor(repo)

	cmd := interactor.CreateSnapshotCommand{
		Date:            time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC),
		Total:           5000,
		Haspa:           1000,
		N26B:            500,
		N26M:            300,
		Cash:            200,
		UberStocks:      800,
		ScalableCapital: 600,
		MonoB:           400,
		MonoM:           350,
		PaypalB:         100,
		PaypalM:         150,
		BackupCash:      100,
	}

	s, err := svc.CreateSnapshot(cmd)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s.Total() != 5000 {
		t.Errorf("expected total 5000, got %v", s.Total())
	}
	if len(repo.saved) != 1 {
		t.Errorf("expected 1 saved snapshot, got %d", len(repo.saved))
	}
}

func TestGetSnapshots(t *testing.T) {
	date := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	existing := entities.ReconstructSnapshot(1, date, 4000, 800, 400, 300, 200, 700, 500, 300, 250, 100, 150, 100, time.Now())
	repo := &mockSnapshotRepo{findAll: []*entities.Snapshot{existing}}
	svc := interactor.NewSnapshotInteractor(repo)

	results, err := svc.GetSnapshots()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 1 {
		t.Errorf("expected 1 snapshot, got %d", len(results))
	}
}
