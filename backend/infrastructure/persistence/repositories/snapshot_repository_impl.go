package repositories

import (
	"database/sql"
	"fmt"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/persistence/models"
	irepositories "expenso-backend/usecases/interfaces/repositories"
)

type SnapshotRepositoryImpl struct {
	db       *sql.DB
	aedToEUR float64
}

func NewSnapshotRepository(db *sql.DB, aedToEUR float64) irepositories.SnapshotRepository {
	return &SnapshotRepositoryImpl{db: db, aedToEUR: aedToEUR}
}

func (r *SnapshotRepositoryImpl) Save(s *entities.Snapshot) error {
	query := `
		INSERT INTO snapshots
			(date, total, haspa, n26_b, n26_m, cash, uber_stocks, scalable_capital, mono_b, mono_m, paypal_b, paypal_m, backup_cash, careem_rsu_shares, enbd_aed, created_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
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
		s.ENBDAED(),
		s.CreatedAt(),
	).Scan(&id)
	if err != nil {
		return fmt.Errorf("failed to save snapshot: %w", err)
	}
	s.SetID(entities.SnapshotID(id))
	return nil
}

func (r *SnapshotRepositoryImpl) FindByID(id entities.SnapshotID) (*entities.Snapshot, error) {
	query := `
		SELECT id, date, total, haspa, n26_b, n26_m, cash, uber_stocks, scalable_capital, mono_b, mono_m, paypal_b, paypal_m, backup_cash, careem_rsu_shares, enbd_aed, created_at
		FROM snapshots WHERE id = $1
	`
	var dbo models.SnapshotDBO
	err := r.db.QueryRow(query, int(id)).Scan(
		&dbo.ID, &dbo.Date, &dbo.Total,
		&dbo.Haspa, &dbo.N26B, &dbo.N26M, &dbo.Cash,
		&dbo.UberStocks, &dbo.ScalableCapital,
		&dbo.MonoB, &dbo.MonoM,
		&dbo.PaypalB, &dbo.PaypalM, &dbo.BackupCash,
		&dbo.CareemRSUShares,
		&dbo.ENBDAED,
		&dbo.CreatedAt,
	)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("failed to find snapshot %d: %w", id, err)
	}
	return dbo.ToDomainEntity(r.aedToEUR), nil
}

func (r *SnapshotRepositoryImpl) Update(s *entities.Snapshot) error {
	query := `
		UPDATE snapshots SET
			date = $2, total = $3, haspa = $4, n26_b = $5, n26_m = $6, cash = $7, uber_stocks = $8, scalable_capital = $9,
			mono_b = $10, mono_m = $11, paypal_b = $12, paypal_m = $13, backup_cash = $14, careem_rsu_shares = $15, enbd_aed = $16
		WHERE id = $1
	`
	result, err := r.db.Exec(query, int(s.ID()),
		s.Date(), s.Total(),
		s.Haspa(), s.N26B(), s.N26M(), s.Cash(),
		s.UberStocks(), s.ScalableCapital(),
		s.MonoB(), s.MonoM(),
		s.PaypalB(), s.PaypalM(), s.BackupCash(),
		s.CareemRSUShares(),
		s.ENBDAED(),
	)
	if err != nil {
		return fmt.Errorf("failed to update snapshot: %w", err)
	}
	if n, err := result.RowsAffected(); err == nil && n == 0 {
		return fmt.Errorf("update snapshot %d: %w", s.ID(), irepositories.ErrSnapshotNotFound)
	}
	return nil
}

func (r *SnapshotRepositoryImpl) FindAll() ([]*entities.Snapshot, error) {
	query := `
		SELECT id, date, total, haspa, n26_b, n26_m, cash, uber_stocks, scalable_capital, mono_b, mono_m, paypal_b, paypal_m, backup_cash, careem_rsu_shares, enbd_aed, created_at
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
			&dbo.ENBDAED,
			&dbo.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan snapshot row: %w", err)
		}
		snapshots = append(snapshots, dbo.ToDomainEntity(r.aedToEUR))
	}
	return snapshots, nil
}
