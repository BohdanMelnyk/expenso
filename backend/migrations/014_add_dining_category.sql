-- Add new Dining category
-- Note: The 'dining' vendor_type enum value was added manually outside of this migration
-- because ALTER TYPE ADD VALUE cannot run inside a transaction
INSERT INTO categories (name, color, icon, created_at, updated_at) VALUES
('Dining', '#FF6347', '🍴', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Add dedicated vendors for Dining
INSERT INTO vendors (name, type, created_at, updated_at) VALUES
('Restaurant', 'dining', NOW(), NOW()),
('Bar', 'dining', NOW(), NOW()),
('Birthday', 'dining', NOW(), NOW())
ON CONFLICT (name, type) DO NOTHING;
