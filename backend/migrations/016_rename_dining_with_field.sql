-- Rename "Dining with field" to "Dining with Friends"
UPDATE categories
SET name = 'Dining with Friends', updated_at = NOW()
WHERE name = 'Dining with field';
