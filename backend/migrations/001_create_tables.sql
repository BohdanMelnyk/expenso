-- Create categories table
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    color VARCHAR(7) NOT NULL, -- Hex color code
    icon VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create expenses table
CREATE TABLE expenses (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'income' or 'expense'
    category VARCHAR(255) NOT NULL,
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (category) REFERENCES categories(name) ON UPDATE CASCADE
);

-- Create indexes
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_type ON expenses(type);

-- Insert default categories
INSERT INTO categories (name, color, icon) VALUES
('Food & Dining', '#FF6B6B', '🍽️'),
('Transportation', '#4ECDC4', '🚗'),
('Shopping', '#45B7D1', '🛍️'),
('Entertainment', '#FFA07A', '🎬'),
('Bills & Utilities', '#98D8C8', '💡'),
('Health & Fitness', '#F9E79F', '🏥'),
('Travel', '#DDA0DD', '✈️'),
('Education', '#87CEEB', '📚'),
('Gifts & Donations', '#F0E68C', '🎁'),
('Other', '#D3D3D3', '📋'),
('Salary', '#90EE90', '💰'),
('Freelance', '#FFB347', '💼'),
('Investment', '#DDA0DD', '📈'),
('Bonus', '#98FB98', '🎯');