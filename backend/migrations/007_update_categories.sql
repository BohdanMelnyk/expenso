-- Update categories: Add new categories and remove old ones

-- Remove categories: Bonus, Freelance
-- First, update any expenses that use these categories to use "Other" category
UPDATE expenses SET category = 'Other' WHERE category IN ('Bonus', 'Freelance');

-- Delete the categories
DELETE FROM categories WHERE name IN ('Bonus', 'Freelance');

-- Add new categories: car, Living
INSERT INTO categories (name, color, icon, created_at, updated_at) VALUES
('Car', '#FF4444', '🚗', NOW(), NOW()),
('Living', '#8FBC8F', '🏠', NOW(), NOW());