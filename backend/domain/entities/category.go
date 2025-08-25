package entities

import (
	"errors"
	"strings"
	"time"
)

type CategoryID int

type CategoryEntity struct {
	id        CategoryID
	name      string
	color     string
	icon      string
	createdAt time.Time
	updatedAt time.Time
}

func NewCategoryEntity(name, color, icon string) (*CategoryEntity, error) {
	// Validate name
	trimmedName := strings.TrimSpace(name)
	if trimmedName == "" {
		return nil, errors.New("category name cannot be empty")
	}

	// Validate color (should be a hex color code)
	trimmedColor := strings.TrimSpace(color)
	if trimmedColor == "" {
		return nil, errors.New("category color cannot be empty")
	}
	if !strings.HasPrefix(trimmedColor, "#") || len(trimmedColor) != 7 {
		return nil, errors.New("category color must be a valid hex color code (e.g., #FF0000)")
	}

	now := time.Now()
	return &CategoryEntity{
		name:      trimmedName,
		color:     trimmedColor,
		icon:      strings.TrimSpace(icon),
		createdAt: now,
		updatedAt: now,
	}, nil
}

func ReconstructCategory(id CategoryID, name, color, icon string, createdAt, updatedAt time.Time) *CategoryEntity {
	return &CategoryEntity{
		id:        id,
		name:      name,
		color:     color,
		icon:      icon,
		createdAt: createdAt,
		updatedAt: updatedAt,
	}
}

// Getters
func (c *CategoryEntity) ID() CategoryID {
	return c.id
}

func (c *CategoryEntity) Name() string {
	return c.name
}

func (c *CategoryEntity) Color() string {
	return c.color
}

func (c *CategoryEntity) Icon() string {
	return c.icon
}

func (c *CategoryEntity) CreatedAt() time.Time {
	return c.createdAt
}

func (c *CategoryEntity) UpdatedAt() time.Time {
	return c.updatedAt
}

// Setters
func (c *CategoryEntity) SetID(id CategoryID) {
	c.id = id
}

func (c *CategoryEntity) UpdateName(name string) error {
	trimmedName := strings.TrimSpace(name)
	if trimmedName == "" {
		return errors.New("category name cannot be empty")
	}
	c.name = trimmedName
	c.updatedAt = time.Now()
	return nil
}

func (c *CategoryEntity) UpdateColor(color string) error {
	trimmedColor := strings.TrimSpace(color)
	if trimmedColor == "" {
		return errors.New("category color cannot be empty")
	}
	if !strings.HasPrefix(trimmedColor, "#") || len(trimmedColor) != 7 {
		return errors.New("category color must be a valid hex color code (e.g., #FF0000)")
	}
	c.color = trimmedColor
	c.updatedAt = time.Now()
	return nil
}

func (c *CategoryEntity) UpdateIcon(icon string) {
	c.icon = strings.TrimSpace(icon)
	c.updatedAt = time.Now()
}

// Category errors
var (
	ErrCategoryNotFound = errors.New("category not found")
)
