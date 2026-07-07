package models

import (
	"time"

	"expenso-backend/domain/entities"
)

type SnapshotDBO struct {
	ID              int       `db:"id"`
	Date            time.Time `db:"date"`
	Total           float64   `db:"total"`
	Haspa           float64   `db:"haspa"`
	N26B            float64   `db:"n26_b"`
	N26M            float64   `db:"n26_m"`
	Cash            float64   `db:"cash"`
	UberStocks      float64   `db:"uber_stocks"`
	ScalableCapital float64   `db:"scalable_capital"`
	MonoB           float64   `db:"mono_b"`
	MonoM           float64   `db:"mono_m"`
	PaypalB         float64   `db:"paypal_b"`
	PaypalM         float64   `db:"paypal_m"`
	BackupCash      float64   `db:"backup_cash"`
	CareemRSUShares float64   `db:"careem_rsu_shares"`
	ENBDAED         float64   `db:"enbd_aed"`
	CreatedAt       time.Time `db:"created_at"`
}

func (dbo *SnapshotDBO) ToDomainEntity(aedToEUR float64) *entities.Snapshot {
	return entities.ReconstructSnapshot(
		entities.SnapshotID(dbo.ID),
		dbo.Date,
		dbo.Total,
		dbo.Haspa, dbo.N26B, dbo.N26M, dbo.Cash,
		dbo.UberStocks, dbo.ScalableCapital,
		dbo.MonoB, dbo.MonoM,
		dbo.PaypalB, dbo.PaypalM, dbo.BackupCash,
		dbo.CareemRSUShares,
		dbo.ENBDAED, aedToEUR,
		dbo.CreatedAt,
	)
}
