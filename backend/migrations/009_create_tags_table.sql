-- Create tags table
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) NOT NULL CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial tags
INSERT INTO tags (name, color) VALUES
    ('tax_declaration', '#FF6B35'),
    ('family_expense', '#4ECDC4'),
    ('subscription', '#45B7D1'),
    ('sport', '#96CEB4'),
    ('health', '#FFEAA7'),
    ('car', '#DDA0DD'),
    ('insurance', '#98D8C8');