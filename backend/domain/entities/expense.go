package entities

import (
	"errors"
	"strings"
	"time"

	"expenso-backend/domain/valueobjects"
)

type ExpenseType string

const (
	ExpenseTypeIncome  ExpenseType = "income"
	ExpenseTypeExpense ExpenseType = "expense"
)

func (et ExpenseType) IsValid() bool {
	return et == ExpenseTypeIncome || et == ExpenseTypeExpense
}

type AddedBy string

const (
	AddedByHe  AddedBy = "he"
	AddedByShe AddedBy = "she"
)

func (ab AddedBy) IsValid() bool {
	return ab == AddedByHe || ab == AddedByShe
}

func (ab AddedBy) String() string {
	return string(ab)
}

type Category string

func NewCategory(value string) (Category, error) {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return "", errors.New("category cannot be empty")
	}
	return Category(trimmed), nil
}

func (c Category) String() string {
	return string(c)
}

type ExpenseID int

type Expense struct {
	id          ExpenseID
	amount      valueobjects.Money
	date        time.Time
	expenseType ExpenseType
	category    Category
	comment     string
	vendor      *Vendor
	paidByCard  bool
	addedBy     AddedBy
	createdAt   time.Time
	updatedAt   time.Time
}

func NewExpense(amount valueobjects.Money, date time.Time, expenseType ExpenseType, category Category, comment string) (*Expense, error) {
	// Semantic validations - business rules
	if amount.IsZero() {
		return nil, errors.New("expense amount must be greater than zero")
	}

	if amount.IsNegative() {
		return nil, errors.New("expense amount cannot be negative")
	}

	if date.After(time.Now()) {
		return nil, errors.New("expense date cannot be in the future")
	}

	// Check if date is too far in the past (business rule)
	if date.Before(time.Now().AddDate(-10, 0, 0)) {
		return nil, errors.New("expense date cannot be more than 10 years ago")
	}

	if !expenseType.IsValid() {
		return nil, errors.New("invalid expense type")
	}

	now := time.Now()
	return &Expense{
		amount:      amount,
		date:        date,
		expenseType: expenseType,
		category:    category,
		comment:     strings.TrimSpace(comment),
		paidByCard:  true,      // Default value is true (paid by card)
		addedBy:     AddedByHe, // Default value is "he"
		createdAt:   now,
		updatedAt:   now,
	}, nil
}

func ReconstructExpense(id ExpenseID, amount valueobjects.Money, date time.Time, expenseType ExpenseType,
	category Category, comment string, vendor *Vendor, paidByCard bool, addedBy AddedBy, createdAt, updatedAt time.Time) *Expense {
	return &Expense{
		id:          id,
		amount:      amount,
		date:        date,
		expenseType: expenseType,
		category:    category,
		comment:     comment,
		vendor:      vendor,
		paidByCard:  paidByCard,
		addedBy:     addedBy,
		createdAt:   createdAt,
		updatedAt:   updatedAt,
	}
}

func (e *Expense) ID() ExpenseID {
	return e.id
}

func (e *Expense) Amount() valueobjects.Money {
	return e.amount
}

func (e *Expense) Date() time.Time {
	return e.date
}

func (e *Expense) Type() ExpenseType {
	return e.expenseType
}

func (e *Expense) Category() Category {
	return e.category
}

func (e *Expense) Comment() string {
	return e.comment
}

func (e *Expense) Vendor() *Vendor {
	return e.vendor
}

func (e *Expense) CreatedAt() time.Time {
	return e.createdAt
}

func (e *Expense) UpdatedAt() time.Time {
	return e.updatedAt
}

func (e *Expense) PaidByCard() bool {
	return e.paidByCard
}

func (e *Expense) AddedBy() AddedBy {
	return e.addedBy
}

func (e *Expense) UpdateAmount(amount valueobjects.Money) error {
	if amount.IsZero() {
		return errors.New("expense amount must be greater than zero")
	}
	if amount.IsNegative() {
		return errors.New("expense amount cannot be negative")
	}
	e.amount = amount
	e.updatedAt = time.Now()
	return nil
}

func (e *Expense) UpdateDate(date time.Time) error {
	if date.After(time.Now()) {
		return errors.New("expense date cannot be in the future")
	}
	if date.Before(time.Now().AddDate(-10, 0, 0)) {
		return errors.New("expense date cannot be more than 10 years ago")
	}
	e.date = date
	e.updatedAt = time.Now()
	return nil
}

func (e *Expense) UpdateCategory(category Category) error {
	e.category = category
	e.updatedAt = time.Now()
	return nil
}

func (e *Expense) UpdateComment(comment string) {
	e.comment = strings.TrimSpace(comment)
	e.updatedAt = time.Now()
}

func (e *Expense) UpdatePaidByCard(paidByCard bool) {
	e.paidByCard = paidByCard
	e.updatedAt = time.Now()
}

func (e *Expense) UpdateAddedBy(addedBy AddedBy) error {
	if !addedBy.IsValid() {
		return errors.New("invalid addedBy value, must be 'he' or 'she'")
	}
	e.addedBy = addedBy
	e.updatedAt = time.Now()
	return nil
}

func (e *Expense) AssignVendor(vendor *Vendor) {
	e.vendor = vendor
	e.updatedAt = time.Now()
}

func (e *Expense) RemoveVendor() {
	e.vendor = nil
	e.updatedAt = time.Now()
}

func (e *Expense) SetID(id ExpenseID) {
	e.id = id
}

// Business logic: Check if expense is a large expense (over $100)
func (e *Expense) IsLargeExpense() bool {
	return e.amount.Amount() > 100.0
}

// Business logic: Check if expense is recent (within last 7 days)
func (e *Expense) IsRecent() bool {
	return e.date.After(time.Now().AddDate(0, 0, -7))
}
