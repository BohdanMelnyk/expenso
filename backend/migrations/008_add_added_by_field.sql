-- Add 'added_by' field to expenses table to track who added the expense

-- Add the new column with constraint
ALTER TABLE expenses ADD COLUMN added_by VARCHAR(10) CHECK (added_by IN ('he', 'she')) DEFAULT 'he';

-- Update existing expenses to have a default value
UPDATE expenses SET added_by = 'he' WHERE added_by IS NULL;