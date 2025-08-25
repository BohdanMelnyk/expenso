-- Add new vendor_type enum values
ALTER TYPE vendor_type ADD VALUE IF NOT EXISTS 'care';
ALTER TYPE vendor_type ADD VALUE IF NOT EXISTS 'clothing';  
ALTER TYPE vendor_type ADD VALUE IF NOT EXISTS 'household';
ALTER TYPE vendor_type ADD VALUE IF NOT EXISTS 'living';
ALTER TYPE vendor_type ADD VALUE IF NOT EXISTS 'salary';
ALTER TYPE vendor_type ADD VALUE IF NOT EXISTS 'transport';
ALTER TYPE vendor_type ADD VALUE IF NOT EXISTS 'tourism';