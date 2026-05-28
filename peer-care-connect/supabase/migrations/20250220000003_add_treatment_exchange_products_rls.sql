-- Add RLS policy to allow practitioners to view other practitioners' active products for treatment exchange
-- This policy allows authenticated practitioners (sports_therapist, massage_therapist, osteopath) 
-- to view active products from other active practitioners for treatment exchange purposes

CREATE POLICY "Practitioners can view active products for treatment exchange" 
ON public.practitioner_products
FOR SELECT 
USING (
  -- Product must be active
  is_active = true 
  AND
  -- Practitioner who owns the product must be active
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = practitioner_products.practitioner_id 
    AND is_active = true
    AND user_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
  )
  AND
  -- Requester must be authenticated and a practitioner
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND is_active = true
    AND user_role IN ('sports_therapist', 'massage_therapist', 'osteopath')
  )
  AND
  -- Cannot view own products (they use the "manage own products" policy)
  practitioner_id != auth.uid()
);

COMMENT ON POLICY "Practitioners can view active products for treatment exchange" 
ON public.practitioner_products IS 
'Allows authenticated practitioners to view other practitioners active products for treatment exchange booking purposes';


