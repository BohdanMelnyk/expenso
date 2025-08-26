package handlers

import (
	"net/http"
	"strconv"

	"expenso-backend/domain/entities"
	"expenso-backend/infrastructure/http/dto"
	"expenso-backend/usecases/interactors/tag"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
)

type TagHandler struct {
	tagInteractor *tag.TagInteractor
	validator     *validator.Validate
}

func NewTagHandler(tagInteractor *tag.TagInteractor) *TagHandler {
	return &TagHandler{
		tagInteractor: tagInteractor,
		validator:     validator.New(),
	}
}

// @Summary Create a new tag
// @Description Create a new tag for expense categorization
// @Tags tags
// @Accept json
// @Produce json
// @Param tag body dto.CreateTagRequestDTO true "Tag creation data"
// @Success 201 {object} dto.TagResponseDTO
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /tags [post]
func (h *TagHandler) CreateTag(c *gin.Context) {
	var req dto.CreateTagRequestDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	tag, err := h.tagInteractor.CreateTag(req.Name, req.Color)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := h.mapTagToResponse(tag)
	c.JSON(http.StatusCreated, response)
}

// @Summary Get all tags
// @Description Retrieve all available tags
// @Tags tags
// @Produce json
// @Success 200 {array} dto.TagResponseDTO
// @Failure 500 {object} map[string]interface{}
// @Router /tags [get]
func (h *TagHandler) GetTags(c *gin.Context) {
	tags, err := h.tagInteractor.GetAllTags()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var response []dto.TagResponseDTO
	for _, tag := range tags {
		response = append(response, h.mapTagToResponse(tag))
	}

	c.JSON(http.StatusOK, response)
}

// @Summary Get tag by ID
// @Description Retrieve a specific tag by its ID
// @Tags tags
// @Produce json
// @Param id path int true "Tag ID"
// @Success 200 {object} dto.TagResponseDTO
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /tags/{id} [get]
func (h *TagHandler) GetTag(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tag ID"})
		return
	}

	tag, err := h.tagInteractor.GetTag(entities.TagID(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if tag == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tag not found"})
		return
	}

	response := h.mapTagToResponse(tag)
	c.JSON(http.StatusOK, response)
}

// @Summary Update tag
// @Description Update an existing tag
// @Tags tags
// @Accept json
// @Produce json
// @Param id path int true "Tag ID"
// @Param tag body dto.UpdateTagRequestDTO true "Tag update data"
// @Success 200 {object} dto.TagResponseDTO
// @Failure 400 {object} map[string]interface{}
// @Failure 404 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /tags/{id} [put]
func (h *TagHandler) UpdateTag(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tag ID"})
		return
	}

	var req dto.UpdateTagRequestDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	if err := h.validator.Struct(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var name, color string
	if req.Name != nil {
		name = *req.Name
	}
	if req.Color != nil {
		color = *req.Color
	}

	tag, err := h.tagInteractor.UpdateTag(entities.TagID(id), name, color)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if tag == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tag not found"})
		return
	}

	response := h.mapTagToResponse(tag)
	c.JSON(http.StatusOK, response)
}

// @Summary Delete tag
// @Description Delete a tag by ID
// @Tags tags
// @Param id path int true "Tag ID"
// @Success 204
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /tags/{id} [delete]
func (h *TagHandler) DeleteTag(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tag ID"})
		return
	}

	err = h.tagInteractor.DeleteTag(entities.TagID(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

// @Summary Add tag to expense
// @Description Add a tag to an expense
// @Tags tags
// @Param expense_id path int true "Expense ID"
// @Param tag_id path int true "Tag ID"
// @Success 204
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /expenses/{expense_id}/tags/{tag_id} [post]
func (h *TagHandler) AddTagToExpense(c *gin.Context) {
	expenseIDParam := c.Param("id")
	expenseID, err := strconv.Atoi(expenseIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
		return
	}

	tagIDParam := c.Param("tag_id")
	tagID, err := strconv.Atoi(tagIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tag ID"})
		return
	}

	err = h.tagInteractor.AddTagToExpense(entities.ExpenseID(expenseID), entities.TagID(tagID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

// @Summary Remove tag from expense
// @Description Remove a tag from an expense
// @Tags tags
// @Param expense_id path int true "Expense ID"
// @Param tag_id path int true "Tag ID"
// @Success 204
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /expenses/{expense_id}/tags/{tag_id} [delete]
func (h *TagHandler) RemoveTagFromExpense(c *gin.Context) {
	expenseIDParam := c.Param("id")
	expenseID, err := strconv.Atoi(expenseIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
		return
	}

	tagIDParam := c.Param("tag_id")
	tagID, err := strconv.Atoi(tagIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid tag ID"})
		return
	}

	err = h.tagInteractor.RemoveTagFromExpense(entities.ExpenseID(expenseID), entities.TagID(tagID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusNoContent, nil)
}

// @Summary Get tags by expense
// @Description Get all tags for a specific expense
// @Tags tags
// @Produce json
// @Param expense_id path int true "Expense ID"
// @Success 200 {array} dto.TagResponseDTO
// @Failure 400 {object} map[string]interface{}
// @Failure 500 {object} map[string]interface{}
// @Router /expenses/{expense_id}/tags [get]
func (h *TagHandler) GetTagsByExpense(c *gin.Context) {
	expenseIDParam := c.Param("id")
	expenseID, err := strconv.Atoi(expenseIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
		return
	}

	tags, err := h.tagInteractor.GetTagsByExpense(entities.ExpenseID(expenseID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var response []dto.TagResponseDTO
	for _, tag := range tags {
		response = append(response, h.mapTagToResponse(tag))
	}

	c.JSON(http.StatusOK, response)
}

func (h *TagHandler) mapTagToResponse(tag *entities.Tag) dto.TagResponseDTO {
	return dto.TagResponseDTO{
		ID:        int(tag.ID()),
		Name:      tag.Name(),
		Color:     tag.Color(),
		CreatedAt: tag.CreatedAt(),
		UpdatedAt: tag.UpdatedAt(),
	}
}
