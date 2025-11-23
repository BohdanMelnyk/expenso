-- Create payment_method enum type
CREATE TYPE payment_method AS ENUM (
  'cash',
  'b_haspa_credit',
  'b_n26',
  'm_n26',
  'm_haspa_credit',
  'paypal',
  'debit',
  'm_monobank',
  'b_monobank'
);

-- Add payment_method column to expenses table
ALTER TABLE expenses ADD COLUMN payment_method payment_method DEFAULT 'b_haspa_credit';

-- Migrate data from paid_by_card to payment_method
UPDATE expenses
SET payment_method = CASE
  WHEN paid_by_card = true THEN 'b_haspa_credit'::payment_method
  WHEN paid_by_card = false THEN 'cash'::payment_method
  ELSE 'b_haspa_credit'::payment_method
END;

-- Make payment_method NOT NULL after migration
ALTER TABLE expenses ALTER COLUMN payment_method SET NOT NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_payment_method ON expenses(payment_method);

-- Add comment to document the field
COMMENT ON COLUMN expenses.payment_method IS 'Payment method used for the expense: cash, b_haspa_credit (B Haspa Credit), b_n26 (B N26), m_n26 (M N26), m_haspa_credit (M Haspa Credit), paypal (PayPal), debit (Debit), m_monobank (M Monobank), or b_monobank (B Monobank).';
COMMENT ON TYPE payment_method IS 'Enum type for expense payment methods.';
