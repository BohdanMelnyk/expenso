package entities

import (
	"errors"
	"strings"
	"time"
)

type TagID int

type Tag struct {
	id        TagID
	name      string
	color     string
	createdAt time.Time
	updatedAt time.Time
}

func NewTag(name, color string) (*Tag, error) {
	// Validate name
	trimmedName := strings.TrimSpace(name)
	if trimmedName == "" {
		return nil, errors.New("tag name cannot be empty")
	}

	// Validate color (hex color code)
	trimmedColor := strings.TrimSpace(color)
	if trimmedColor == "" {
		return nil, errors.New("tag color cannot be empty")
	}

	// Basic hex color validation
	if !strings.HasPrefix(trimmedColor, "#") || len(trimmedColor) != 7 {
		return nil, errors.New("tag color must be a valid hex color code (e.g., #FF0000)")
	}

	now := time.Now()
	return &Tag{
		name:      trimmedName,
		color:     trimmedColor,
		createdAt: now,
		updatedAt: now,
	}, nil
}

func ReconstructTag(id TagID, name, color string, createdAt, updatedAt time.Time) *Tag {
	return &Tag{
		id:        id,
		name:      name,
		color:     color,
		createdAt: createdAt,
		updatedAt: updatedAt,
	}
}

// Getters
func (t *Tag) ID() TagID {
	return t.id
}

func (t *Tag) Name() string {
	return t.name
}

func (t *Tag) Color() string {
	return t.color
}

func (t *Tag) CreatedAt() time.Time {
	return t.createdAt
}

func (t *Tag) UpdatedAt() time.Time {
	return t.updatedAt
}

// Setters
func (t *Tag) SetID(id TagID) {
	t.id = id
}

func (t *Tag) UpdateName(name string) error {
	trimmedName := strings.TrimSpace(name)
	if trimmedName == "" {
		return errors.New("tag name cannot be empty")
	}
	t.name = trimmedName
	t.updatedAt = time.Now()
	return nil
}

func (t *Tag) UpdateColor(color string) error {
	trimmedColor := strings.TrimSpace(color)
	if trimmedColor == "" {
		return errors.New("tag color cannot be empty")
	}

	// Basic hex color validation
	if !strings.HasPrefix(trimmedColor, "#") || len(trimmedColor) != 7 {
		return errors.New("tag color must be a valid hex color code (e.g., #FF0000)")
	}

	t.color = trimmedColor
	t.updatedAt = time.Now()
	return nil
}

// Business logic methods
func (t *Tag) String() string {
	return t.name
}

func (t *Tag) Equals(other *Tag) bool {
	if other == nil {
		return false
	}
	return t.id == other.id
}
