-- Replace added_by ('he'/'she') with a real user_id reference

ALTER TABLE expenses ADD COLUMN user_id INTEGER REFERENCES users(id);
ALTER TABLE incomes ADD COLUMN user_id INTEGER REFERENCES users(id);

UPDATE expenses SET user_id = (SELECT id FROM users WHERE username = 'system_user') WHERE user_id IS NULL;
UPDATE incomes SET user_id = (SELECT id FROM users WHERE username = 'system_user') WHERE user_id IS NULL;

ALTER TABLE expenses ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE incomes ALTER COLUMN user_id SET NOT NULL;

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_incomes_user_id ON incomes(user_id);

ALTER TABLE expenses DROP COLUMN added_by;
ALTER TABLE incomes DROP COLUMN added_by;
