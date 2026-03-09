-- Add category column to practitioner_products
ALTER TABLE practitioner_products 
ADD COLUMN IF NOT EXISTS category TEXT CHECK (category IN ('massage', 'osteopathy', 'sports_therapy', 'general'));

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_practitioner_products_category ON practitioner_products(category);

-- Update existing products with default category based on practitioner role
UPDATE practitioner_products pp
SET category = CASE 
  WHEN u.user_role = 'massage_therapist' THEN 'massage'
  WHEN u.user_role = 'osteopath' THEN 'osteopathy'
  WHEN u.user_role = 'sports_therapist' THEN 'sports_therapy'
  ELSE 'general'
END
FROM users u
WHERE pp.practitioner_id = u.id AND pp.category IS NULL;
