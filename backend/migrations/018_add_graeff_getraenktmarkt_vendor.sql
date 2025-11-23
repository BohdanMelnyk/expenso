-- Add Graeff Getraenktmarkt vendor (Food Store category)
INSERT INTO vendors (name, type, created_at, updated_at) VALUES
('Graeff Getraenktmarkt', 'food_store', NOW(), NOW())
ON CONFLICT (name, type) DO NOTHING;
