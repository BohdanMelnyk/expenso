-- Create income table
CREATE TABLE incomes (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    date DATE NOT NULL,
    source VARCHAR(255) NOT NULL,
    comment TEXT,
    vendor_id INTEGER,
    added_by VARCHAR(10) NOT NULL DEFAULT 'he' CHECK (added_by IN ('he', 'she')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
);

-- Create income_tags junction table
CREATE TABLE income_tags (
    id SERIAL PRIMARY KEY,
    income_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (income_id) REFERENCES incomes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(income_id, tag_id)
);

-- Create indexes for better performance
CREATE INDEX idx_incomes_date ON incomes(date);
CREATE INDEX idx_incomes_source ON incomes(source);
CREATE INDEX idx_incomes_vendor_id ON incomes(vendor_id);
CREATE INDEX idx_incomes_added_by ON incomes(added_by);
CREATE INDEX idx_income_tags_income_id ON income_tags(income_id);
CREATE INDEX idx_income_tags_tag_id ON income_tags(tag_id);