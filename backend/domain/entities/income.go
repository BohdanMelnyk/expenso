package entities

import (
	"errors"
	"strings"
	"time"

	"expenso-backend/domain/valueobjects"
)

type IncomeID int

type Income struct {
	id        IncomeID
	amount    valueobjects.Money
	date      time.Time
	source    string
	comment   string
	vendor    *Vendor
	addedBy   AddedBy
	tags      []*Tag
	createdAt time.Time
	updatedAt time.Time
}

func NewIncome(amount valueobjects.Money, date time.Time, source string, comment string) (*Income, error) {
	// Semantic validations - business rules
	if amount.IsZero() {
		return nil, errors.New("income amount must be greater than zero")
	}

	if amount.IsNegative() {
		return nil, errors.New("income amount cannot be negative")
	}

	if date.After(time.Now()) {
		return nil, errors.New("income date cannot be in the future")
	}

	// Check if date is too far in the past (business rule)
	if date.Before(time.Now().AddDate(-10, 0, 0)) {
		return nil, errors.New("income date cannot be more than 10 years ago")
	}

	if strings.TrimSpace(source) == "" {
		return nil, errors.New("income source cannot be empty")
	}

	now := time.Now()
	return &Income{
		amount:    amount,
		date:      date,
		source:    strings.TrimSpace(source),
		comment:   strings.TrimSpace(comment),
		addedBy:   AddedByHe, // Default value is "he"
		createdAt: now,
		updatedAt: now,
	}, nil
}

func ReconstructIncome(id IncomeID, amount valueobjects.Money, date time.Time, source string,
	comment string, vendor *Vendor, addedBy AddedBy, tags []*Tag, createdAt, updatedAt time.Time) *Income {
	return &Income{
		id:        id,
		amount:    amount,
		date:      date,
		source:    source,
		comment:   comment,
		vendor:    vendor,
		addedBy:   addedBy,
		tags:      tags,
		createdAt: createdAt,
		updatedAt: updatedAt,
	}
}

func (i *Income) ID() IncomeID {
	return i.id
}

func (i *Income) Amount() valueobjects.Money {
	return i.amount
}

func (i *Income) Date() time.Time {
	return i.date
}

func (i *Income) Source() string {
	return i.source
}

func (i *Income) Comment() string {
	return i.comment
}

func (i *Income) Vendor() *Vendor {
	return i.vendor
}

func (i *Income) CreatedAt() time.Time {
	return i.createdAt
}

func (i *Income) UpdatedAt() time.Time {
	return i.updatedAt
}

func (i *Income) AddedBy() AddedBy {
	return i.addedBy
}

func (i *Income) Tags() []*Tag {
	return i.tags
}

func (i *Income) UpdateAmount(amount valueobjects.Money) error {
	if amount.IsZero() {
		return errors.New("income amount must be greater than zero")
	}
	if amount.IsNegative() {
		return errors.New("income amount cannot be negative")
	}
	i.amount = amount
	i.updatedAt = time.Now()
	return nil
}

func (i *Income) UpdateDate(date time.Time) error {
	if date.After(time.Now()) {
		return errors.New("income date cannot be in the future")
	}
	if date.Before(time.Now().AddDate(-10, 0, 0)) {
		return errors.New("income date cannot be more than 10 years ago")
	}
	i.date = date
	i.updatedAt = time.Now()
	return nil
}

func (i *Income) UpdateSource(source string) error {
	trimmed := strings.TrimSpace(source)
	if trimmed == "" {
		return errors.New("income source cannot be empty")
	}
	i.source = trimmed
	i.updatedAt = time.Now()
	return nil
}

func (i *Income) UpdateComment(comment string) {
	i.comment = strings.TrimSpace(comment)
	i.updatedAt = time.Now()
}

func (i *Income) UpdateAddedBy(addedBy AddedBy) error {
	if !addedBy.IsValid() {
		return errors.New("invalid addedBy value, must be 'he' or 'she'")
	}
	i.addedBy = addedBy
	i.updatedAt = time.Now()
	return nil
}

func (i *Income) AssignVendor(vendor *Vendor) {
	i.vendor = vendor
	i.updatedAt = time.Now()
}

func (i *Income) RemoveVendor() {
	i.vendor = nil
	i.updatedAt = time.Now()
}

func (i *Income) SetID(id IncomeID) {
	i.id = id
}

// SetTimestamps allows setting custom created and updated timestamps (used for CSV imports)
func (i *Income) SetTimestamps(createdAt, updatedAt time.Time) {
	i.createdAt = createdAt
	i.updatedAt = updatedAt
}

// Business logic: Check if income is a large income (over $1000)
func (i *Income) IsLargeIncome() bool {
	return i.amount.Amount() > 1000.0
}

// Business logic: Check if income is recent (within last 7 days)
func (i *Income) IsRecent() bool {
	return i.date.After(time.Now().AddDate(0, 0, -7))
}

// Tag management methods
func (i *Income) AddTag(tag *Tag) error {
	if tag == nil {
		return errors.New("tag cannot be nil")
	}

	// Check if tag already exists
	for _, existingTag := range i.tags {
		if existingTag.ID() == tag.ID() {
			return errors.New("tag already exists on this income")
		}
	}

	i.tags = append(i.tags, tag)
	i.updatedAt = time.Now()
	return nil
}

func (i *Income) RemoveTag(tagID TagID) error {
	for idx, tag := range i.tags {
		if tag.ID() == tagID {
			i.tags = append(i.tags[:idx], i.tags[idx+1:]...)
			i.updatedAt = time.Now()
			return nil
		}
	}
	return errors.New("tag not found on this income")
}

func (i *Income) HasTag(tagID TagID) bool {
	for _, tag := range i.tags {
		if tag.ID() == tagID {
			return true
		}
	}
	return false
}

func (i *Income) ClearTags() {
	i.tags = []*Tag{}
	i.updatedAt = time.Now()
}

func (i *Income) SetTags(tags []*Tag) {
	i.tags = tags
	i.updatedAt = time.Now()
}