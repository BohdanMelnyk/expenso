package models

import "time"

type Category struct {
	ID        int       `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	Color     string    `json:"color" db:"color"`
	Icon      string    `json:"icon" db:"icon"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type CreateCategoryRequest struct {
	Name  string `json:"name" validate:"required"`
	Color string `json:"color" validate:"required"`
	Icon  string `json:"icon"`
}