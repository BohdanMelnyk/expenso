-- Clarify category borders: new categories for what was hiding in catch-alls,
-- consistent catch-all vendor names, and expense moves reviewed one by one.
-- Expense and vendor IDs refer to the production database this was reviewed against.

-- Vendors are now identified by name within a category (several categories have an "Else")
ALTER TABLE vendors DROP CONSTRAINT vendors_name_type_key;
ALTER TABLE vendors ADD CONSTRAINT vendors_name_category_key UNIQUE (name, category_id);

-- Categories
UPDATE categories SET name = 'Subscriptions & Fees', updated_at = NOW() WHERE name = 'Bills & Utilities';

INSERT INTO categories (name, color, icon) VALUES
    ('Electronics',    '#6C8EBF', '💻'),
    ('Beauty & Care',  '#E8A0BF', '💅'),
    ('Insurance',      '#7FB3D5', '🛡️'),
    ('Taxes & Admin',  '#A9A9A9', '🏛️'),
    ('Family Support', '#F5B041', '👪');

-- Vendor renames
UPDATE vendors SET name = 'Restaurant with Friends' WHERE id = 67;
UPDATE vendors SET name = 'Else' WHERE id IN (76, 45);   -- Car "Other", Travel "Tourism"
UPDATE vendors SET name = 'Doctor' WHERE id = 4;          -- Health & Fitness "Health"
UPDATE vendors SET name = 'Parking Spot Rent' WHERE id = 48;
UPDATE vendors SET name = 'Regional Market' WHERE id = 61;
UPDATE vendors SET name = 'Graeff Getränkemarkt' WHERE id = 70;

-- Vendor moves
UPDATE vendors SET category_id = (SELECT id FROM categories WHERE name = 'Dining') WHERE id = 80;  -- Kiosk
UPDATE vendors SET category_id = (SELECT id FROM categories WHERE name = 'Beauty & Care')
WHERE id IN (2, 3, 5, 14);  -- Epilation, Haircut, Nail, Vabali
UPDATE vendors SET name = 'Car Insurance', category_id = (SELECT id FROM categories WHERE name = 'Insurance')
WHERE id = 50;

-- New vendors
INSERT INTO vendors (name, type, category_id)
SELECT v.name, v.type::vendor_type, c.id
FROM (VALUES
    ('Else',           'shop', 'Electronics'),
    ('Else',           'care', 'Beauty & Care'),
    ('Else',           'else', 'Insurance'),
    ('ADAC',           'car',  'Insurance'),
    ('Else',           'else', 'Taxes & Admin'),
    ('Finanzamt',      'else', 'Taxes & Admin'),
    ('Else',           'else', 'Family Support'),
    ('Else',           'else', 'Education'),
    ('Driving School', 'else', 'Education')
) AS v(name, type, category)
JOIN categories c ON c.name = v.category;

-- Expenses of moved vendors follow the vendor's category
UPDATE expenses e SET category = c.name
FROM vendors v JOIN categories c ON c.id = v.category_id
WHERE e.vendor_id = v.id AND v.id IN (2, 3, 5, 14, 50, 80) AND e.category <> c.name;

-- Reviewed expense moves: set vendor, then category from that vendor
CREATE TEMP TABLE expense_moves (expense_id INT, vendor_name TEXT, category TEXT) ON COMMIT DROP;
INSERT INTO expense_moves VALUES
    -- Electronics
    (3410, 'Else', 'Electronics'), (3632, 'Else', 'Electronics'), (3449, 'Else', 'Electronics'),
    (2714, 'Else', 'Electronics'), (3608, 'Else', 'Electronics'),
    -- Beauty & Care
    (2720, 'Else', 'Beauty & Care'), (2748, 'Else', 'Beauty & Care'), (2747, 'Else', 'Beauty & Care'),
    (4656, 'Else', 'Beauty & Care'), (65,   'Else', 'Beauty & Care'), (2896, 'Else', 'Beauty & Care'),
    (4696, 'Else', 'Beauty & Care'), (67,   'Else', 'Beauty & Care'), (64,   'Else', 'Beauty & Care'),
    (3931, 'Else', 'Beauty & Care'), (4225, 'Else', 'Beauty & Care'), (58,   'Else', 'Beauty & Care'),
    (3377, 'Else', 'Beauty & Care'), (4546, 'Else', 'Beauty & Care'), (4495, 'Else', 'Beauty & Care'),
    (3749, 'Else', 'Beauty & Care'), (4695, 'Else', 'Beauty & Care'),
    -- Gym payments out of Doctor
    (3723, 'Else', 'Health & Fitness'), (4308, 'Else', 'Health & Fitness'),
    (4142, 'Else', 'Health & Fitness'), (4209, 'Else', 'Health & Fitness'),
    -- Insurance
    (79,   'Car Insurance', 'Insurance'),
    (2817, 'ADAC', 'Insurance'), (4145, 'ADAC', 'Insurance'), (4146, 'ADAC', 'Insurance'),
    (59,   'Else', 'Insurance'), (3805, 'Else', 'Insurance'), (3804, 'Else', 'Insurance'),
    -- Taxes & Admin
    (3294, 'Finanzamt', 'Taxes & Admin'), (4171, 'Finanzamt', 'Taxes & Admin'),
    (4435, 'Finanzamt', 'Taxes & Admin'), (52,   'Finanzamt', 'Taxes & Admin'),
    (3041, 'Else', 'Taxes & Admin'), (3046, 'Else', 'Taxes & Admin'),
    -- Family Support
    (4078, 'Else', 'Family Support'), (2806, 'Else', 'Family Support'),
    -- Education
    (4259, 'Driving School', 'Education'), (4025, 'Driving School', 'Education'),
    (4026, 'Driving School', 'Education'),
    -- Gifts
    (3242, 'Gift', 'Gifts & Donations'), (3243, 'Gift', 'Gifts & Donations'),
    (3470, 'Gift', 'Gifts & Donations'), (4375, 'Gift', 'Gifts & Donations'),
    (4391, 'Gift', 'Gifts & Donations'), (3157, 'Gift', 'Gifts & Donations'),
    (3609, 'Gift', 'Gifts & Donations'),
    -- Travel
    (4219, 'Flight', 'Travel'), (4256, 'Flight', 'Travel'),
    (4331, 'Else', 'Travel');

UPDATE expenses e
SET vendor_id = v.id, category = c.name
FROM expense_moves m
JOIN categories c ON c.name = m.category
JOIN vendors v ON v.name = m.vendor_name AND v.category_id = c.id
WHERE e.id = m.expense_id;

-- Unused vendors
DELETE FROM vendors WHERE id IN (30, 72)  -- Salary "Else", Car Rental
  AND NOT EXISTS (SELECT 1 FROM expenses WHERE vendor_id IN (30, 72))
  AND NOT EXISTS (SELECT 1 FROM incomes WHERE vendor_id IN (30, 72));
