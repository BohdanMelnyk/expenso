package handlers

import (
	"net/http"
	"time"

	"expenso-backend/infrastructure/http/dto"
	"expenso-backend/usecases/interactors/snapshot"

	"github.com/gin-gonic/gin"
)

type SnapshotHandler struct {
	snapshotInteractor *snapshot.SnapshotInteractor
}

func NewSnapshotHandler(snapshotInteractor *snapshot.SnapshotInteractor) *SnapshotHandler {
	return &SnapshotHandler{snapshotInteractor: snapshotInteractor}
}

// GetSnapshots godoc
// @Summary Get all snapshots
// @Description Returns all money snapshots ordered by date descending
// @Tags snapshots
// @Produce json
// @Success 200 {array} dto.SnapshotResponseDTO
// @Failure 500 {object} map[string]string
// @Router /snapshots [get]
func (h *SnapshotHandler) GetSnapshots(c *gin.Context) {
	snapshots, err := h.snapshotInteractor.GetSnapshots()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch snapshots"})
		return
	}

	response := make([]dto.SnapshotResponseDTO, 0, len(snapshots))
	for _, s := range snapshots {
		response = append(response, dto.ToSnapshotResponseDTO(s))
	}
	c.JSON(http.StatusOK, response)
}

// CreateSnapshot godoc
// @Summary Create a new snapshot
// @Description Records a point-in-time snapshot of money across all resources
// @Tags snapshots
// @Accept json
// @Produce json
// @Param snapshot body dto.CreateSnapshotRequestDTO true "Snapshot data"
// @Success 201 {object} dto.SnapshotResponseDTO
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /snapshots [post]
func (h *SnapshotHandler) CreateSnapshot(c *gin.Context) {
	var req dto.CreateSnapshotRequestDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format, use YYYY-MM-DD"})
		return
	}

	cmd := snapshot.CreateSnapshotCommand{
		Date:            date,
		Haspa:           req.Haspa,
		N26B:            req.N26B,
		N26M:            req.N26M,
		Cash:            req.Cash,
		UberStocks:      req.UberStocks,
		ScalableCapital: req.ScalableCapital,
		MonoB:           req.MonoB,
		MonoM:           req.MonoM,
		PaypalB:         req.PaypalB,
		PaypalM:         req.PaypalM,
		BackupCash:      req.BackupCash,
		CareemRSUShares: req.CareemRSUShares,
		ENBDAED:         req.ENBDAED,
	}

	s, err := h.snapshotInteractor.CreateSnapshot(cmd)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, dto.ToSnapshotResponseDTO(s))
}
