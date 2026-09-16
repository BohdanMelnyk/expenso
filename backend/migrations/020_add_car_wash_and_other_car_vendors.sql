-- Add Car Wash and Other vendors under Car category
INSERT INTO vendors (name, type, created_at, updated_at) VALUES
('Car Wash', 'car', NOW(), NOW()),
('Other', 'car', NOW(), NOW())
ON CONFLICT (name, type) DO NOTHING;
