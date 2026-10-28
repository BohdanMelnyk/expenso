package entities

import (
	"testing"
	"time"
)

// Snapshot dates are calendar days: "today" in Hamburg must be accepted even just after midnight,
// when UTC is still on the previous day.
func TestNewSnapshot_TodayAcceptedJustAfterLocalMidnight(t *testing.T) {
	berlin, err := time.LoadLocation("Europe/Berlin")
	if err != nil {
		t.Skip("no tz data")
	}
	restore := snapshotNow
	snapshotNow = func() time.Time { return time.Date(2026, 10, 28, 0, 30, 0, 0, berlin) }
	defer func() { snapshotNow = restore }()

	if _, err := NewSnapshot(time.Date(2026, 10, 28, 0, 0, 0, 0, time.UTC), 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.25); err != nil {
		t.Fatalf("today should be accepted, got %v", err)
	}
	if _, err := NewSnapshot(time.Date(2026, 10, 29, 0, 0, 0, 0, time.UTC), 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.25); err == nil {
		t.Fatal("tomorrow should be rejected")
	}
}
