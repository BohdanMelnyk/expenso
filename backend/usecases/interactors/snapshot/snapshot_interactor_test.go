package snapshot_test

import (
	"errors"
	"fmt"
	"testing"
	"time"

	"expenso-backend/domain/entities"
	interactor "expenso-backend/usecases/interactors/snapshot"
	"expenso-backend/usecases/interfaces/repositories"
)

type mockSnapshotRepo struct {
	saved     []*entities.Snapshot
	findAll   []*entities.Snapshot
	updated   []*entities.Snapshot
	updateErr error
}

func (m *mockSnapshotRepo) FindByID(id entities.SnapshotID) (*entities.Snapshot, error) {
	for _, s := range m.findAll {
		if s.ID() == id {
			return s, nil
		}
	}
	return nil, nil
}

func (m *mockSnapshotRepo) Update(s *entities.Snapshot) error {
	if m.updateErr != nil {
		return m.updateErr
	}
	m.updated = append(m.updated, s)
	return nil
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
	svc := interactor.NewSnapshotInteractor(repo, 0.25)

	cmd := interactor.CreateSnapshotCommand{
		Date:            time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC),
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
	expectedTotal := 1000.0 + 500 + 300 + 200 + 800 + 600 + 400 + 350 + 100 + 150 + 100
	if s.Total() != expectedTotal {
		t.Errorf("expected total %v, got %v", expectedTotal, s.Total())
	}
	if len(repo.saved) != 1 {
		t.Errorf("expected 1 saved snapshot, got %d", len(repo.saved))
	}
}

func TestGetSnapshots(t *testing.T) {
	date := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	existing := entities.ReconstructSnapshot(1, date, 4000, 800, 400, 300, 200, 700, 500, 300, 250, 100, 150, 100, 0, 0, 0, time.Now())
	repo := &mockSnapshotRepo{findAll: []*entities.Snapshot{existing}}
	svc := interactor.NewSnapshotInteractor(repo, 0.25)

	results, err := svc.GetSnapshots()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 1 {
		t.Errorf("expected 1 snapshot, got %d", len(results))
	}
}

func TestCreateSnapshot_ConvertsENBDToEUR(t *testing.T) {
	repo := &mockSnapshotRepo{}
	svc := interactor.NewSnapshotInteractor(repo, 0.25)

	cmd := interactor.CreateSnapshotCommand{
		Date:    time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC),
		Haspa:   1000,
		ENBDAED: 4000,
	}

	s, err := svc.CreateSnapshot(cmd)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if s.ENBDAED() != 4000 {
		t.Errorf("expected ENBDAED 4000, got %v", s.ENBDAED())
	}
	if s.ENBDEUR() != 1000 {
		t.Errorf("expected ENBDEUR 1000, got %v", s.ENBDEUR())
	}
	expectedTotal := 1000.0 + 1000.0
	if s.Total() != expectedTotal {
		t.Errorf("expected total %v, got %v", expectedTotal, s.Total())
	}
}

func TestUpdateSnapshot(t *testing.T) {
	existing, err := entities.NewSnapshot(time.Date(2026, 10, 25, 0, 0, 0, 0, time.UTC), 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 400, 0.25)
	if err != nil {
		t.Fatal(err)
	}
	existing.SetID(1)
	repo := &mockSnapshotRepo{findAll: []*entities.Snapshot{existing}}
	svc := interactor.NewSnapshotInteractor(repo, 0.25)

	got, err := svc.UpdateSnapshot(1, interactor.CreateSnapshotCommand{
		Date:    time.Date(2026, 10, 26, 0, 0, 0, 0, time.UTC),
		Haspa:   200,
		ENBDAED: 400,
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(repo.updated) != 1 || got.ID() != 1 {
		t.Fatalf("expected snapshot 1 updated, got %d updates, id %d", len(repo.updated), got.ID())
	}
	if got.Haspa() != 200 {
		t.Errorf("haspa = %v, want 200", got.Haspa())
	}
	if got.ENBDEUR() != 100 {
		t.Errorf("enbd eur = %v, want 100 (400 AED * 0.25)", got.ENBDEUR())
	}
}

func TestUpdateSnapshot_NotFound(t *testing.T) {
	svc := interactor.NewSnapshotInteractor(&mockSnapshotRepo{}, 0.25)
	_, err := svc.UpdateSnapshot(42, interactor.CreateSnapshotCommand{Date: time.Now()})
	if !errors.Is(err, interactor.ErrSnapshotNotFound) {
		t.Fatalf("expected ErrSnapshotNotFound, got %v", err)
	}
}

func TestUpdateSnapshot_GoneDuringUpdate(t *testing.T) {
	existing, _ := entities.NewSnapshot(time.Date(2026, 10, 25, 0, 0, 0, 0, time.UTC), 100, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.25)
	existing.SetID(1)
	repo := &mockSnapshotRepo{findAll: []*entities.Snapshot{existing}, updateErr: fmt.Errorf("update: %w", repositories.ErrSnapshotNotFound)}
	_, err := interactor.NewSnapshotInteractor(repo, 0.25).UpdateSnapshot(1, interactor.CreateSnapshotCommand{Date: time.Date(2026, 10, 25, 0, 0, 0, 0, time.UTC)})
	if !errors.Is(err, interactor.ErrSnapshotNotFound) {
		t.Fatalf("expected ErrSnapshotNotFound, got %v", err)
	}
}
