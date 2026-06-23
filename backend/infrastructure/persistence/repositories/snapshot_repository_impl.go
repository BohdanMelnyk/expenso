package repositories

import (
	"database/sql"
	"fmt"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/persistence/models"
	irepositories "expenso-backend/usecases/interfaces/repositories"
)

type SnapshotRepositoryImpl struct {
	db *sql.DB
}

func NewSnapshotRepository(db *sql.DB) irepositories.SnapshotRepository {
	return &SnapshotRepositoryImpl{db: db}
}

func (r *SnapshotRepositoryImpl) Save(s *entities.Snapshot) error {
	query := `
		INSERT INTO snapshots
			(date, total, haspa, n26_b, n26_m, cash, uber_stocks, scalable_capital, mono_b, mono_m, paypal_b, paypal_m, backup_cash, careem_rsu_shares, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
		RETURNING id
	`
	var id int
	err := r.db.QueryRow(query,
		s.Date(), s.Total(),
		s.Haspa(), s.N26B(), s.N26M(), s.Cash(),
		s.UberStocks(), s.ScalableCapital(),
		s.MonoB(), s.MonoM(),
		s.PaypalB(), s.PaypalM(), s.BackupCash(),
		s.CareemRSUShares(),
		s.CreatedAt(),
	).Scan(&id)
	if err != nil {
		return fmt.Errorf("failed to save snapshot: %w", err)
	}
	s.SetID(entities.SnapshotID(id))
	return nil
}

func (r *SnapshotRepositoryImpl) FindAll() ([]*entities.Snapshot, error) {
	query := `
		SELECT id, date, total, haspa, n26_b, n26_m, cash, uber_stocks, scalable_capital, mono_b, mono_m, paypal_b, paypal_m, backup_cash, careem_rsu_shares, created_at
		FROM snapshots
		ORDER BY date DESC, created_at DESC
	`
	rows, err := r.db.Query(query)
	if err != nil {
		return nil, fmt.Errorf("failed to query snapshots: %w", err)
	}
	defer rows.Close()

	var snapshots []*entities.Snapshot
	for rows.Next() {
		var dbo models.SnapshotDBO
		err := rows.Scan(
			&dbo.ID, &dbo.Date, &dbo.Total,
			&dbo.Haspa, &dbo.N26B, &dbo.N26M, &dbo.Cash,
			&dbo.UberStocks, &dbo.ScalableCapital,
			&dbo.MonoB, &dbo.MonoM,
			&dbo.PaypalB, &dbo.PaypalM, &dbo.BackupCash,
			&dbo.CareemRSUShares,
			&dbo.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan snapshot row: %w", err)
		}
		snapshots = append(snapshots, dbo.ToDomainEntity())
	}
	return snapshots, nil
}
