-- Add new "Dining with field" category
-- Note: The 'dining_with_field' vendor_type enum value must be added manually outside of this migration
-- because ALTER TYPE ADD VALUE cannot run inside a transaction

-- Add new Dining with field category
INSERT INTO categories (name, color, icon, created_at, updated_at) VALUES
('Dining with field', '#FF8C42', '🍽️', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Add dedicated vendors for Dining with field
INSERT INTO vendors (name, type, created_at, updated_at) VALUES
('Restaurant', 'dining_with_field', NOW(), NOW()),
('Bar', 'dining_with_field', NOW(), NOW()),
('Birthday', 'dining_with_field', NOW(), NOW())
ON CONFLICT (name, type) DO NOTHING;
