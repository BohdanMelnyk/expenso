package handlers

import (
	"net/http"
	"strconv"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/http/dto"
	"expenso-backend/usecases/interactors/category"

	"github.com/gin-gonic/gin"
)

type CategoryHandler struct {
	categoryInteractor *category.CategoryInteractor
}

func NewCategoryHandler(categoryInteractor *category.CategoryInteractor) *CategoryHandler {
	return &CategoryHandler{
		categoryInteractor: categoryInteractor,
	}
}

// GetCategories godoc
// @Summary Get all categories
// @Description Get a list of all categories
// @Tags categories
// @Accept json
// @Produce json
// @Success 200 {array} dto.CategoryResponseDTO
// @Failure 500 {object} map[string]string
// @Router /categories [get]
func (h *CategoryHandler) GetCategories(c *gin.Context) {
	// Execute use case
	categories, err := h.categoryInteractor.GetCategories()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch categories"})
		return
	}

	// Convert domain entities to DTOs
	responseDTO := make([]dto.CategoryResponseDTO, len(categories))
	for i, cat := range categories {
		responseDTO[i] = h.categoryToDTO(cat)
	}

	c.JSON(http.StatusOK, responseDTO)
}

// GetCategory godoc
// @Summary Get a category by ID
// @Description Get a single category by its ID
// @Tags categories
// @Accept json
// @Produce json
// @Param id path int true "Category ID"
// @Success 200 {object} dto.CategoryResponseDTO
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /categories/{id} [get]
func (h *CategoryHandler) GetCategory(c *gin.Context) {
	// Parse path parameter
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category ID"})
		return
	}

	// Execute use case
	cat, err := h.categoryInteractor.GetCategory(entities.CategoryID(id))
	if err != nil {
		if err == entities.ErrCategoryNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch category"})
		}
		return
	}

	// Convert domain entity to DTO
	responseDTO := h.categoryToDTO(cat)

	c.JSON(http.StatusOK, responseDTO)
}

// CreateCategory godoc
// @Summary Create a new category
// @Description Create a new category with the provided data
// @Tags categories
// @Accept json
// @Produce json
// @Param category body dto.CreateCategoryRequestDTO true "Category data"
// @Success 201 {object} dto.CategoryResponseDTO
// @Failure 400 {object} map[string]string
// @Router /categories [post]
func (h *CategoryHandler) CreateCategory(c *gin.Context) {
	// Syntactic validation - decode JSON
	var requestDTO dto.CreateCategoryRequestDTO
	if err := c.ShouldBindJSON(&requestDTO); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Convert DTO to use case command
	cmd := category.CreateCategoryCommand{
		Name:  requestDTO.Name,
		Color: requestDTO.Color,
		Icon:  requestDTO.Icon,
	}

	// Execute use case
	cat, err := h.categoryInteractor.CreateCategory(cmd)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert domain entity to DTO
	responseDTO := h.categoryToDTO(cat)

	c.JSON(http.StatusCreated, responseDTO)
}

// UpdateCategory godoc
// @Summary Update a category
// @Description Update an existing category by ID
// @Tags categories
// @Accept json
// @Produce json
// @Param id path int true "Category ID"
// @Param category body dto.UpdateCategoryRequestDTO true "Updated category data"
// @Success 200 {object} dto.CategoryResponseDTO
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Router /categories/{id} [put]
func (h *CategoryHandler) UpdateCategory(c *gin.Context) {
	// Parse path parameter
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category ID"})
		return
	}

	// Syntactic validation - decode JSON
	var requestDTO dto.UpdateCategoryRequestDTO
	if err := c.ShouldBindJSON(&requestDTO); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Convert DTO to use case command
	cmd := category.UpdateCategoryCommand{
		ID:    entities.CategoryID(id),
		Name:  requestDTO.Name,
		Color: requestDTO.Color,
		Icon:  requestDTO.Icon,
	}

	// Execute use case
	cat, err := h.categoryInteractor.UpdateCategory(cmd)
	if err != nil {
		if err == entities.ErrCategoryNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		}
		return
	}

	// Convert domain entity to DTO
	responseDTO := h.categoryToDTO(cat)

	c.JSON(http.StatusOK, responseDTO)
}

// DeleteCategory godoc
// @Summary Delete a category
// @Description Delete a category by ID
// @Tags categories
// @Accept json
// @Produce json
// @Param id path int true "Category ID"
// @Success 204
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /categories/{id} [delete]
func (h *CategoryHandler) DeleteCategory(c *gin.Context) {
	// Parse path parameter
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid category ID"})
		return
	}

	// Execute use case
	err = h.categoryInteractor.DeleteCategory(entities.CategoryID(id))
	if err != nil {
		if err == entities.ErrCategoryNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Category not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete category"})
		}
		return
	}

	c.Status(http.StatusNoContent)
}

// Helper method to convert domain entity to DTO
func (h *CategoryHandler) categoryToDTO(cat *entities.CategoryEntity) dto.CategoryResponseDTO {
	return dto.CategoryResponseDTO{
		ID:        int(cat.ID()),
		Name:      cat.Name(),
		Color:     cat.Color(),
		Icon:      cat.Icon(),
		CreatedAt: cat.CreatedAt(),
		UpdatedAt: cat.UpdatedAt(),
	}
}
