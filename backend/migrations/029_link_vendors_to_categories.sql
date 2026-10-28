-- Link vendors directly to a category instead of deriving it from vendor_type,
-- and clean up vendors and expenses that were filed inconsistently.

ALTER TABLE vendors ADD COLUMN category_id INTEGER REFERENCES categories(id);

-- Backfill from the old hardcoded vendor_type -> category mapping
UPDATE vendors v
SET category_id = c.id
FROM categories c
WHERE c.name = CASE v.type::text
    WHEN 'care'                THEN 'Health & Fitness'
    WHEN 'clothing'            THEN 'Shopping'
    WHEN 'eating_out'          THEN 'Dining'
    WHEN 'else'                THEN 'Other'
    WHEN 'food_store'          THEN 'Food Store'
    WHEN 'household'           THEN 'Household'
    WHEN 'living'              THEN 'Living'
    WHEN 'salary'              THEN 'Salary'
    WHEN 'subscriptions'       THEN 'Bills & Utilities'
    WHEN 'transport'           THEN 'Transportation'
    WHEN 'tourism'             THEN 'Travel'
    WHEN 'car'                 THEN 'Car'
    WHEN 'shop'                THEN 'Shopping'
    WHEN 'dining'              THEN 'Dining'
    WHEN 'dining_with_friends' THEN 'Dining with Friends'
END;

-- Move vendors to the categories they actually belong to
UPDATE vendors SET category_id = (SELECT id FROM categories WHERE name = 'Gifts & Donations')
WHERE type = 'else' AND name IN ('Gift', 'Donation');

UPDATE vendors SET category_id = (SELECT id FROM categories WHERE name = 'Entertainment')
WHERE type = 'else' AND name = 'Concert';

UPDATE vendors SET category_id = (SELECT id FROM categories WHERE name = 'Health & Fitness')
WHERE (type = 'else' AND name = 'Vabali')
   OR (type = 'subscriptions' AND name IN ('Fitness Studio', 'Urban Sport', 'Teutonia'));

UPDATE vendors SET category_id = (SELECT id FROM categories WHERE name = 'Living')
WHERE type = 'subscriptions' AND name = 'Telekom';

-- Merge duplicate vendors: Pharmacy -> Apotheke, ParkSpot -> Parking Spot
UPDATE expenses SET vendor_id = (SELECT id FROM vendors WHERE type = 'care' AND name = 'Apotheke')
WHERE vendor_id = (SELECT id FROM vendors WHERE type = 'household' AND name = 'Pharmacy');
UPDATE incomes SET vendor_id = (SELECT id FROM vendors WHERE type = 'care' AND name = 'Apotheke')
WHERE vendor_id = (SELECT id FROM vendors WHERE type = 'household' AND name = 'Pharmacy');
DELETE FROM vendors WHERE type = 'household' AND name = 'Pharmacy';

UPDATE expenses SET vendor_id = (SELECT id FROM vendors WHERE type = 'car' AND name = 'Parking Spot')
WHERE vendor_id = (SELECT id FROM vendors WHERE type = 'car' AND name = 'ParkSpot');
UPDATE incomes SET vendor_id = (SELECT id FROM vendors WHERE type = 'car' AND name = 'Parking Spot')
WHERE vendor_id = (SELECT id FROM vendors WHERE type = 'car' AND name = 'ParkSpot');
DELETE FROM vendors WHERE type = 'car' AND name = 'ParkSpot';

-- Re-file past expenses of these vendors under the vendor's category.
-- Catch-all vendors ("Else"), Amazon, DB and HVV are deliberately left alone.
UPDATE expenses e
SET category = c.name
FROM vendors v
JOIN categories c ON c.id = v.category_id
WHERE e.vendor_id = v.id
  AND e.category <> c.name
  AND (v.type::text, v.name) IN (
      ('else', 'Gift'), ('else', 'Donation'), ('else', 'Concert'), ('else', 'Vabali'),
      ('subscriptions', 'Fitness Studio'), ('subscriptions', 'Urban Sport'), ('subscriptions', 'Teutonia'),
      ('subscriptions', 'Telekom'), ('living', 'Internet'),
      ('subscriptions', 'Apple'), ('subscriptions', 'Claude'),
      ('food_store', 'Junge'),
      ('household', 'Budni'), ('household', 'Ikea'),
      ('care', 'Haircut'), ('care', 'Nail'), ('care', 'Apotheke'), ('care', 'Health'),
      ('car', 'Insurance'), ('car', 'Parking Spot'),
      ('shop', 'Temu')
  );

-- Investment has no vendors or expenses
DELETE FROM categories WHERE name = 'Investment';

ALTER TABLE vendors ALTER COLUMN category_id SET NOT NULL;
CREATE INDEX idx_vendors_category_id ON vendors(category_id);
