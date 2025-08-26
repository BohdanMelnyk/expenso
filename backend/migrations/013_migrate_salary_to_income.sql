-- Migration script to move salary expenses to income table
-- This script will:
-- 1. Insert all salary-related expenses into the income table
-- 2. Delete salary expenses from the expenses table

-- Insert salary expenses into income table
INSERT INTO incomes (amount, date, source, comment, vendor_id, added_by, created_at, updated_at)
SELECT 
    amount,
    date,
    COALESCE(category, 'Salary') as source,
    comment,
    vendor_id,
    added_by,
    created_at,
    updated_at
FROM expenses 
WHERE category = 'Salary' OR type = 'income' OR (
    vendor_id IN (
        SELECT id FROM vendors WHERE type = 'salary'
    )
);

-- Copy expense tags to income tags for migrated records
INSERT INTO income_tags (income_id, tag_id, created_at)
SELECT 
    (SELECT i.id FROM incomes i WHERE i.comment = e.comment AND i.amount = e.amount AND i.date = e.date AND i.created_at = e.created_at LIMIT 1) as income_id,
    et.tag_id,
    et.created_at
FROM expense_tags et
JOIN expenses e ON et.expense_id = e.id
WHERE e.category = 'Salary' OR e.type = 'income' OR (
    e.vendor_id IN (
        SELECT id FROM vendors WHERE type = 'salary'
    )
);

-- Delete expense tags for salary expenses first (foreign key constraint)
DELETE FROM expense_tags 
WHERE expense_id IN (
    SELECT id FROM expenses 
    WHERE category = 'Salary' OR type = 'income' OR (
        vendor_id IN (
            SELECT id FROM vendors WHERE type = 'salary'
        )
    )
);

-- Delete salary expenses from expenses table
DELETE FROM expenses 
WHERE category = 'Salary' OR type = 'income' OR (
    vendor_id IN (
        SELECT id FROM vendors WHERE type = 'salary'
    )
);