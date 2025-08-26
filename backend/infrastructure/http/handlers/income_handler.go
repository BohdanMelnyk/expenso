package handlers

import (
	"net/http"
	"strconv"
	"time"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/http/dto"
	"expenso-backend/usecases/interactors/income"

	"github.com/gin-gonic/gin"
)

type IncomeHandler struct {
	incomeInteractor *income.IncomeInteractor
}

func NewIncomeHandler(incomeInteractor *income.IncomeInteractor) *IncomeHandler {
	return &IncomeHandler{
		incomeInteractor: incomeInteractor,
	}
}

// GetIncomes godoc
// @Summary Get all incomes
// @Description Get a list of all incomes with optional date range filtering
// @Tags incomes
// @Accept json
// @Produce json
// @Param start_date query string false "Start date (YYYY-MM-DD)"
// @Param end_date query string false "End date (YYYY-MM-DD)"
// @Success 200 {array} dto.IncomeResponseDTO
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /incomes [get]
func (h *IncomeHandler) GetIncomes(c *gin.Context) {
	// Parse optional date range parameters
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	var startDate, endDate *time.Time

	// Parse start date if provided
	if startDateStr != "" {
		parsed, err := time.Parse("2006-01-02", startDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format (use YYYY-MM-DD)"})
			return
		}
		startDate = &parsed
	}

	// Parse end date if provided
	if endDateStr != "" {
		parsed, err := time.Parse("2006-01-02", endDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format (use YYYY-MM-DD)"})
			return
		}
		endDate = &parsed
	}

	var incomes []*entities.Income
	var err error

	// Execute appropriate use case based on parameters
	if startDate != nil || endDate != nil {
		incomes, err = h.incomeInteractor.GetIncomesByDateRange(startDate, endDate)
	} else {
		incomes, err = h.incomeInteractor.GetAllIncomes()
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch incomes"})
		return
	}

	// Convert to DTOs
	var incomeDTOs []dto.IncomeResponseDTO
	for _, income := range incomes {
		incomeDTO := dto.ToIncomeResponseDTO(income)
		incomeDTOs = append(incomeDTOs, incomeDTO)
	}

	c.JSON(http.StatusOK, incomeDTOs)
}

// CreateIncome godoc
// @Summary Create a new income
// @Description Create a new income record
// @Tags incomes
// @Accept json
// @Produce json
// @Param income body dto.CreateIncomeRequestDTO true "Income data"
// @Success 201 {object} dto.IncomeResponseDTO
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /incomes [post]
func (h *IncomeHandler) CreateIncome(c *gin.Context) {
	var req dto.CreateIncomeRequestDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse date
	date, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format (use YYYY-MM-DD)"})
		return
	}

	// Create command
	cmd := income.CreateIncomeCommand{
		Amount:   req.Amount,
		Date:     date,
		Source:   req.Source,
		Comment:  req.Comment,
		AddedBy:  req.AddedBy,
	}

	// Set vendor ID if provided
	if req.VendorID != nil {
		vendorID := entities.VendorID(*req.VendorID)
		cmd.VendorID = &vendorID
	}

	// Set tag IDs if provided
	if req.TagIDs != nil {
		for _, tagID := range *req.TagIDs {
			cmd.TagIDs = append(cmd.TagIDs, entities.TagID(tagID))
		}
	}

	// Execute use case
	createdIncome, err := h.incomeInteractor.CreateIncome(cmd)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert to DTO and return
	incomeDTO := dto.ToIncomeResponseDTO(createdIncome)
	c.JSON(http.StatusCreated, incomeDTO)
}

// GetIncomeByID godoc
// @Summary Get income by ID
// @Description Get a specific income by its ID
// @Tags incomes
// @Accept json
// @Produce json
// @Param id path int true "Income ID"
// @Success 200 {object} dto.IncomeResponseDTO
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /incomes/{id} [get]
func (h *IncomeHandler) GetIncomeByID(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid income ID"})
		return
	}

	income, err := h.incomeInteractor.GetIncomeByID(entities.IncomeID(id))
	if err != nil {
		if err == entities.ErrIncomeNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Income not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch income"})
		return
	}

	incomeDTO := dto.ToIncomeResponseDTO(income)
	c.JSON(http.StatusOK, incomeDTO)
}

// UpdateIncome godoc
// @Summary Update an income
// @Description Update an existing income record
// @Tags incomes
// @Accept json
// @Produce json
// @Param id path int true "Income ID"
// @Param income body dto.UpdateIncomeRequestDTO true "Updated income data"
// @Success 200 {object} dto.IncomeResponseDTO
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /incomes/{id} [put]
func (h *IncomeHandler) UpdateIncome(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid income ID"})
		return
	}

	var req dto.UpdateIncomeRequestDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Create update command
	cmd := income.UpdateIncomeCommand{
		ID:      entities.IncomeID(id),
		Amount:  req.Amount,
		Source:  req.Source,
		Comment: req.Comment,
		AddedBy: req.AddedBy,
	}

	// Parse date if provided
	if req.Date != nil {
		parsed, err := time.Parse("2006-01-02", *req.Date)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format (use YYYY-MM-DD)"})
			return
		}
		cmd.Date = &parsed
	}

	// Set vendor ID if provided
	if req.VendorID != nil {
		vendorID := entities.VendorID(*req.VendorID)
		cmd.VendorID = &vendorID
	}

	// Set tag IDs if provided
	if req.TagIDs != nil {
		tagIDs := make([]entities.TagID, 0)
		for _, tagID := range *req.TagIDs {
			tagIDs = append(tagIDs, entities.TagID(tagID))
		}
		cmd.TagIDs = &tagIDs
	}

	// Execute use case
	updatedIncome, err := h.incomeInteractor.UpdateIncome(cmd)
	if err != nil {
		if err == entities.ErrIncomeNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Income not found"})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert to DTO and return
	incomeDTO := dto.ToIncomeResponseDTO(updatedIncome)
	c.JSON(http.StatusOK, incomeDTO)
}

// DeleteIncome godoc
// @Summary Delete an income
// @Description Delete an income record by ID
// @Tags incomes
// @Accept json
// @Produce json
// @Param id path int true "Income ID"
// @Success 204 "No Content"
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /incomes/{id} [delete]
func (h *IncomeHandler) DeleteIncome(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid income ID"})
		return
	}

	err = h.incomeInteractor.DeleteIncome(entities.IncomeID(id))
	if err != nil {
		if err == entities.ErrIncomeNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Income not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete income"})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

// GetIncomesBySource godoc
// @Summary Get incomes by source
// @Description Get incomes filtered by source
// @Tags incomes
// @Accept json
// @Produce json
// @Param source path string true "Income source"
// @Success 200 {array} dto.IncomeResponseDTO
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /incomes/source/{source} [get]
func (h *IncomeHandler) GetIncomesBySource(c *gin.Context) {
	source := c.Param("source")
	if source == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Source parameter is required"})
		return
	}

	incomes, err := h.incomeInteractor.GetIncomesBySource(source)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch incomes"})
		return
	}

	// Convert to DTOs
	var incomeDTOs []dto.IncomeResponseDTO
	for _, income := range incomes {
		incomeDTO := dto.ToIncomeResponseDTO(income)
		incomeDTOs = append(incomeDTOs, incomeDTO)
	}

	c.JSON(http.StatusOK, incomeDTOs)
}

// GetIncomesSummary godoc
// @Summary Get income summary
// @Description Get total income amount and count for a date range
// @Tags incomes
// @Accept json
// @Produce json
// @Param start_date query string false "Start date (YYYY-MM-DD)"
// @Param end_date query string false "End date (YYYY-MM-DD)"
// @Success 200 {object} dto.IncomeSummaryDTO
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /incomes/summary [get]
func (h *IncomeHandler) GetIncomesSummary(c *gin.Context) {
	// Parse optional date range parameters
	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")

	var startDate, endDate *time.Time

	// Parse start date if provided
	if startDateStr != "" {
		parsed, err := time.Parse("2006-01-02", startDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format (use YYYY-MM-DD)"})
			return
		}
		startDate = &parsed
	}

	// Parse end date if provided
	if endDateStr != "" {
		parsed, err := time.Parse("2006-01-02", endDateStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format (use YYYY-MM-DD)"})
			return
		}
		endDate = &parsed
	}

	// Get total income
	totalIncome, err := h.incomeInteractor.GetTotalIncomeByDateRange(startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to calculate total income"})
		return
	}

	// Get income count
	incomeCount, err := h.incomeInteractor.GetIncomeCountByDateRange(startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count incomes"})
		return
	}

	summary := dto.IncomeSummaryDTO{
		TotalIncome: totalIncome,
		IncomeCount: incomeCount,
	}

	c.JSON(http.StatusOK, summary)
}