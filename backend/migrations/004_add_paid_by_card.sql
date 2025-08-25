-- Add paid_by_card column to expenses table
ALTER TABLE expenses ADD COLUMN paid_by_card BOOLEAN NOT NULL DEFAULT true;

-- Add index for better query performance on payment method
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by_card ON expenses(paid_by_card);

-- Add a comment to document the field
COMMENT ON COLUMN expenses.paid_by_card IS 'Indicates whether the expense was paid by card (true) or cash (false). Default is true (card payment).';