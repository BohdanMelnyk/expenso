-- Add Bäderland vendor under Health & Fitness category (vendor_type=care)
INSERT INTO vendors (name, type, created_at, updated_at) VALUES
('Bäderland', 'care', NOW(), NOW())
ON CONFLICT (name, type) DO NOTHING;
