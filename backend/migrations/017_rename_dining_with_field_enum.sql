-- Rename vendor_type enum value from 'dining_with_field' to 'dining_with_friends'
-- Strategy: Create new enum with all values including the new one, then migrate data

-- Step 1: Create new enum type with all values including 'dining_with_friends'
CREATE TYPE vendor_type_new AS ENUM (
  'car',
  'care',
  'clothing',
  'dining',
  'dining_with_friends',
  'eating_out',
  'else',
  'food_store',
  'household',
  'living',
  'salary',
  'shop',
  'subscriptions',
  'tourism',
  'transport'
);

-- Step 2: Migrate existing column data from old type to new type
ALTER TABLE vendors ALTER COLUMN type TYPE vendor_type_new USING
  CASE WHEN type::text = 'dining_with_field' THEN 'dining_with_friends'::text ELSE type::text END::vendor_type_new;

-- Step 3: Drop the old type and rename the new one
DROP TYPE vendor_type;
ALTER TYPE vendor_type_new RENAME TO vendor_type;
