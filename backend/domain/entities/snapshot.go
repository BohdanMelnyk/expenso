package entities

import (
	"errors"
	"time"
)

type SnapshotID int

type Snapshot struct {
	id              SnapshotID
	date            time.Time
	total           float64
	haspa           float64
	n26B            float64
	n26M            float64
	cash            float64
	uberStocks      float64
	scalableCapital float64
	monoB           float64
	monoM           float64
	paypalB         float64
	paypalM         float64
	backupCash      float64
	createdAt       time.Time
}

func NewSnapshot(
	date time.Time,
	total, haspa, n26B, n26M, cash, uberStocks, scalableCapital, monoB, monoM, paypalB, paypalM, backupCash float64,
) (*Snapshot, error) {
	if total <= 0 {
		return nil, errors.New("snapshot total must be greater than zero")
	}
	if date.After(time.Now()) {
		return nil, errors.New("snapshot date cannot be in the future")
	}
	return &Snapshot{
		date:            date,
		total:           total,
		haspa:           haspa,
		n26B:            n26B,
		n26M:            n26M,
		cash:            cash,
		uberStocks:      uberStocks,
		scalableCapital: scalableCapital,
		monoB:           monoB,
		monoM:           monoM,
		paypalB:         paypalB,
		paypalM:         paypalM,
		backupCash:      backupCash,
		createdAt:       time.Now(),
	}, nil
}

func ReconstructSnapshot(
	id SnapshotID,
	date time.Time,
	total, haspa, n26B, n26M, cash, uberStocks, scalableCapital, monoB, monoM, paypalB, paypalM, backupCash float64,
	createdAt time.Time,
) *Snapshot {
	return &Snapshot{
		id:              id,
		date:            date,
		total:           total,
		haspa:           haspa,
		n26B:            n26B,
		n26M:            n26M,
		cash:            cash,
		uberStocks:      uberStocks,
		scalableCapital: scalableCapital,
		monoB:           monoB,
		monoM:           monoM,
		paypalB:         paypalB,
		paypalM:         paypalM,
		backupCash:      backupCash,
		createdAt:       createdAt,
	}
}

func (s *Snapshot) SetID(id SnapshotID)        { s.id = id }
func (s *Snapshot) ID() SnapshotID             { return s.id }
func (s *Snapshot) Date() time.Time            { return s.date }
func (s *Snapshot) Total() float64             { return s.total }
func (s *Snapshot) Haspa() float64             { return s.haspa }
func (s *Snapshot) N26B() float64              { return s.n26B }
func (s *Snapshot) N26M() float64              { return s.n26M }
func (s *Snapshot) Cash() float64              { return s.cash }
func (s *Snapshot) UberStocks() float64        { return s.uberStocks }
func (s *Snapshot) ScalableCapital() float64   { return s.scalableCapital }
func (s *Snapshot) MonoB() float64             { return s.monoB }
func (s *Snapshot) MonoM() float64             { return s.monoM }
func (s *Snapshot) PaypalB() float64           { return s.paypalB }
func (s *Snapshot) PaypalM() float64           { return s.paypalM }
func (s *Snapshot) BackupCash() float64        { return s.backupCash }
func (s *Snapshot) CreatedAt() time.Time       { return s.createdAt }
