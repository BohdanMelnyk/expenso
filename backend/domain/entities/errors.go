package entities

import "errors"

var (
	ErrInvalidVendorType   = errors.New("invalid vendor type")
	ErrVendorAlreadyExists = errors.New("vendor with this name and type already exists")
	ErrVendorNotFound      = errors.New("vendor not found")
	ErrExpenseNotFound     = errors.New("expense not found")
	ErrIncomeNotFound      = errors.New("income not found")
)
