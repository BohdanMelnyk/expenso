-- Create vendor_type enum
CREATE TYPE vendor_type AS ENUM ('food_store', 'shop', 'eating_out', 'subscriptions', 'else');

-- Create vendors table
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type vendor_type NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, type)
);

-- Create indexes for vendors
CREATE INDEX idx_vendors_type ON vendors(type);
CREATE INDEX idx_vendors_name ON vendors(name);

-- Update expenses table to reference vendors
ALTER TABLE expenses ADD COLUMN vendor_id INTEGER REFERENCES vendors(id) ON DELETE SET NULL;
CREATE INDEX idx_expenses_vendor_id ON expenses(vendor_id);

-- Insert default vendors for each type
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