package dto

import (
	"time"

	"expenso-backend/domain/entities"
)

type CreateSnapshotRequestDTO struct {
	Date            string  `json:"date" validate:"required"`
	Haspa           float64 `json:"haspa"`
	N26B            float64 `json:"n26_b"`
	N26M            float64 `json:"n26_m"`
	Cash            float64 `json:"cash"`
	UberStocks      float64 `json:"uber_stocks"`
	ScalableCapital float64 `json:"scalable_capital"`
	MonoB           float64 `json:"mono_b"`
	MonoM           float64 `json:"mono_m"`
	PaypalB         float64 `json:"paypal_b"`
	PaypalM         float64 `json:"paypal_m"`
	BackupCash      float64 `json:"backup_cash"`
}

type SnapshotResponseDTO struct {
	ID              int       `json:"id"`
	Date            string    `json:"date"`
	Total           float64   `json:"total"`
	Haspa           float64   `json:"haspa"`
	N26B            float64   `json:"n26_b"`
	N26M            float64   `json:"n26_m"`
	Cash            float64   `json:"cash"`
	UberStocks      float64   `json:"uber_stocks"`
	ScalableCapital float64   `json:"scalable_capital"`
	MonoB           float64   `json:"mono_b"`
	MonoM           float64   `json:"mono_m"`
	PaypalB         float64   `json:"paypal_b"`
	PaypalM         float64   `json:"paypal_m"`
	BackupCash      float64   `json:"backup_cash"`
	CreatedAt       time.Time `json:"created_at"`
}

func ToSnapshotResponseDTO(s *entities.Snapshot) SnapshotResponseDTO {
	return SnapshotResponseDTO{
		ID:              int(s.ID()),
		Date:            s.Date().Format("2006-01-02"),
		Total:           s.Total(),
		Haspa:           s.Haspa(),
		N26B:            s.N26B(),
		N26M:            s.N26M(),
		Cash:            s.Cash(),
		UberStocks:      s.UberStocks(),
		ScalableCapital: s.ScalableCapital(),
		MonoB:           s.MonoB(),
		MonoM:           s.MonoM(),
		PaypalB:         s.PaypalB(),
		PaypalM:         s.PaypalM(),
		BackupCash:      s.BackupCash(),
		CreatedAt:       s.CreatedAt(),
	}
}
