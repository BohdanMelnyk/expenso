-- Clear existing vendors first
DELETE FROM vendors;

-- Reset the sequence
ALTER SEQUENCE vendors_id_seq RESTART WITH 1;

-- Insert new vendors sorted alphabetically within each category

-- Care
INSERT INTO vendors (name, type, created_at, updated_at) VALUES
('Else', 'care', NOW(), NOW()),
('Epilation', 'care', NOW(), NOW()),
('Haircut', 'care', NOW(), NOW()),
('Health', 'care', NOW(), NOW()),
('Nail', 'care', NOW(), NOW());

-- Clothing  
INSERT INTO vendors (name, type, created_at, updated_at) VALUES
('Bohdan', 'clothing', NOW(), NOW()),
('Both', 'clothing', NOW(), NOW()),
('Mariia', 'clothing', NOW(), NOW());

-- Eating Out
INSERT INTO vendors (name, type, created_at, updated_at) VALUES
('Gyros', 'eating_out', NOW(), NOW()),
('Restaurant', 'eating_out', NOW(), NOW());

-- Else
INSERT INTO vendors (name, type, created_at, updated_at) VALUES
('Else', 'else', NOW(), NOW()),
('Flowers', 'else', NOW(), NOW()),
('Gift', 'else', NOW(), NOW()),
('Vabali', 'else', NOW(), NOW());

-- Food Store
INSERT INTO vendors (name, type, created_at, updated_at) VALUES
('Aldi', 'food_store', NOW(), NOW()),
('Else', 'food_store', NOW(), NOW()),
('Kaufland', 'food_store', NOW(), NOW()),
('Lidl', 'food_store', NOW(), NOW()),
('MixMarkt', 'food_store', NOW(), NOW());

-- Household
INSERT INTO vendors (name, type, created_at, updated_at) VALUES
('Amazon', 'household', NOW(), NOW()),
('Budni', 'household', NOW(), NOW()),
('DM', 'household', NOW(), NOW()),
('Else', 'household', NOW(), NOW());

-- Living
INSERT INTO vendors (name, type, created_at, updated_at) VALUES
('Flat Rent', 'living', NOW(), NOW()),
('Internet', 'living', NOW(), NOW()),
('ParkSpot', 'living', NOW(), NOW()),
('Parking', 'living', NOW(), NOW()),
('Rundfunkbeitrag', 'living', NOW(), NOW());

-- Salary
INSERT INTO vendors (name, type, created_at, updated_at) VALUES
('Careem', 'salary', NOW(), NOW()),
('Else', 'salary', NOW(), NOW()),
('Moka', 'salary', NOW(), NOW());

-- Subscriptions
INSERT INTO vendors (name, type, created_at, updated_at) VALUES
('Apple', 'subscriptions', NOW(), NOW()),
('Claude', 'subscriptions', NOW(), NOW()),
('Fitness Studio', 'subscriptions', NOW(), NOW()),
('Haspa', 'subscriptions', NOW(), NOW()),
('Netflix', 'subscriptions', NOW(), NOW()),
('Patreon', 'subscriptions', NOW(), NOW()),
('Telekom', 'subscriptions', NOW(), NOW()),
('Teutonia', 'subscriptions', NOW(), NOW()),
('Urban Sport', 'subscriptions', NOW(), NOW());

-- Transport
INSERT INTO vendors (name, type, created_at, updated_at) VALUES
('DB', 'transport', NOW(), NOW()),
('Else', 'transport', NOW(), NOW()),
('Flixbus', 'transport', NOW(), NOW()),
('HVV', 'transport', NOW(), NOW());

-- Tourism  
INSERT INTO vendors (name, type, created_at, updated_at) VALUES
('Tourism', 'tourism', NOW(), NOW());