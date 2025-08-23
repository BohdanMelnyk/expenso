package handlers

import (
	"net/http"
	"strconv"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/http/dto"
	"expenso-backend/usecases/interactors/vendor"

	"github.com/gin-gonic/gin"
)

type VendorHandler struct {
	vendorInteractor *vendor.VendorInteractor
}

func NewVendorHandler(vendorInteractor *vendor.VendorInteractor) *VendorHandler {
	return &VendorHandler{
		vendorInteractor: vendorInteractor,
	}
}

func (h *VendorHandler) GetVendors(c *gin.Context) {
	// Execute use case
	vendors, err := h.vendorInteractor.GetVendors()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch vendors"})
		return
	}

	// Convert domain entities to DTOs
	responseDTO := make([]dto.VendorResponseDTO, len(vendors))
	for i, v := range vendors {
		responseDTO[i] = h.vendorToDTO(v)
	}

	c.JSON(http.StatusOK, responseDTO)
}

func (h *VendorHandler) GetVendor(c *gin.Context) {
	// Parse path parameter
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vendor ID"})
		return
	}

	// Execute use case
	v, err := h.vendorInteractor.GetVendor(entities.VendorID(id))
	if err != nil {
		if err == entities.ErrVendorNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Vendor not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch vendor"})
		}
		return
	}

	// Convert domain entity to DTO
	responseDTO := h.vendorToDTO(v)

	c.JSON(http.StatusOK, responseDTO)
}

func (h *VendorHandler) GetVendorsByType(c *gin.Context) {
	// Parse path parameter
	vendorType := c.Param("type")

	// Execute use case
	vendors, err := h.vendorInteractor.GetVendorsByType(entities.VendorType(vendorType))
	if err != nil {
		if err == entities.ErrInvalidVendorType {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vendor type"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch vendors"})
		}
		return
	}

	// Convert domain entities to DTOs
	responseDTO := make([]dto.VendorResponseDTO, len(vendors))
	for i, v := range vendors {
		responseDTO[i] = h.vendorToDTO(v)
	}

	c.JSON(http.StatusOK, responseDTO)
}

func (h *VendorHandler) CreateVendor(c *gin.Context) {
	// Syntactic validation - decode JSON
	var requestDTO dto.CreateVendorRequestDTO
	if err := c.ShouldBindJSON(&requestDTO); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Convert DTO to use case command
	cmd := vendor.CreateVendorCommand{
		Name: requestDTO.Name,
		Type: requestDTO.Type,
	}

	// Execute use case
	v, err := h.vendorInteractor.CreateVendor(cmd)
	if err != nil {
		if err == entities.ErrInvalidVendorType {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid vendor type"})
		} else if err == entities.ErrVendorAlreadyExists {
			c.JSON(http.StatusConflict, gin.H{"error": "Vendor with this name and type already exists"})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	// Convert domain entity to DTO
	responseDTO := h.vendorToDTO(v)

	c.JSON(http.StatusCreated, responseDTO)
}

// Helper method to convert domain entity to DTO
func (h *VendorHandler) vendorToDTO(v *entities.Vendor) dto.VendorResponseDTO {
	return dto.VendorResponseDTO{
		ID:        int(v.ID()),
		Name:      v.Name(),
		Type:      string(v.Type()),
		CreatedAt: v.CreatedAt(),
		UpdatedAt: v.UpdatedAt(),
	}
}