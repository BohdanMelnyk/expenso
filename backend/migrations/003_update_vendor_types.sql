-- Update vendor_type enum to match new requirements
-- First, add new enum values
ALTER TYPE vendor_type ADD VALUE IF NOT EXISTS 'food_store';
ALTER TYPE vendor_type ADD VALUE IF NOT EXISTS 'subscriptions'; 
ALTER TYPE vendor_type ADD VALUE IF NOT EXISTS 'else';

-- Update existing data to match new enum values
UPDATE vendors SET type = 'food_store' WHERE type = 'store';

-- Clear existing vendors and insert new default vendors with updated types
DELETE FROM vendors;

-- Insert default vendors for each new type
INSERT INTO vendors (name, type) VALUES
-- Food Stores
('Grocery Store', 'food_store'),
('Supermarket', 'food_store'),
('Farmers Market', 'food_store'),
('Costco', 'food_store'),
('Whole Foods', 'food_store'),

-- Shops
('Target', 'shop'),
('Amazon', 'shop'),
('Best Buy', 'shop'),
('Home Depot', 'shop'),
('Nike Store', 'shop'),

-- Eating Out
('McDonald''s', 'eating_out'),
('Starbucks', 'eating_out'),
('Pizza Hut', 'eating_out'),
('Local Restaurant', 'eating_out'),
('Food Truck', 'eating_out'),

-- Subscriptions
('Netflix', 'subscriptions'),
('Spotify', 'subscriptions'),
('Amazon Prime', 'subscriptions'),
('Adobe Creative', 'subscriptions'),
('GitHub Pro', 'subscriptions'),

-- Else (Other/Miscellaneous)
('ATM Withdrawal', 'else'),
('Cash Payment', 'else'),
('Other Vendor', 'else'),
('Unknown', 'else');

-- Remove old enum values (this requires dropping and recreating if they're not used)
-- Note: This is commented out as it requires careful handling in production
-- ALTER TYPE vendor_type DROP VALUE 'store';