-- Coffee: cafés, coffee to go, patisseries, ice cream and sweets, in Dining (even with friends).
-- Bakeries (bread) and coffee beans for home stay groceries. Expense IDs reviewed with the user.

INSERT INTO vendors (name, type, category_id)
SELECT 'Coffee', 'dining'::vendor_type, id FROM categories WHERE name = 'Dining';

UPDATE expenses e
SET vendor_id = v.id, category = c.name
FROM vendors v JOIN categories c ON c.id = v.category_id
WHERE v.name = 'Coffee' AND c.name = 'Dining'
  AND e.id IN (
    -- cafés, patisseries, ice cream, sweets
    4777, 4661, 4662, 4660, 4616, 4434, 4241, 4222, 4130, 4010, 4022, 4020, 3316, 3334, 3236, 3265, 3828,
    -- Tchibo
    4693, 4572, 4388, 4032, 4058, 4071, 4072, 3600, 3601, 3357, 3347, 3314, 3292,
    -- coffee on trips
    3492, 3768
  );
