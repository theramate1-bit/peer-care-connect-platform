-- Fix practitioner_products RLS schema cache issue
-- This migration splits the FOR ALL policy into explicit operation-specific policies
-- Error: "Could not find the 'action' column of 'practitioner_products' in the schema cache"
-- Root Cause: PostgREST schema cache incorrectly interprets FOR ALL policies

-- Drop the existing FOR ALL policy
DROP POLICY IF EXISTS "Practitioners can manage their own products" ON public.practitioner_products;

-- Create separate policies for each operation (best practice and fixes cache issues)
-- This prevents PostgREST from misinterpreting the policy and looking for non-existent columns

CREATE POLICY "Practitioners can select their own products" ON public.practitioner_products
  FOR SELECT 
  USING (
    practitioner_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_role IN ('osteopath', 'sports_therapist', 'massage_therapist')
    )
  );

CREATE POLICY "Practitioners can insert their own products" ON public.practitioner_products
  FOR INSERT 
  WITH CHECK (
    practitioner_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_role IN ('osteopath', 'sports_therapist', 'massage_therapist')
    )
  );

CREATE POLICY "Practitioners can update their own products" ON public.practitioner_products
  FOR UPDATE 
  USING (
    practitioner_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_role IN ('osteopath', 'sports_therapist', 'massage_therapist')
    )
  )
  WITH CHECK (
    practitioner_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_role IN ('osteopath', 'sports_therapist', 'massage_therapist')
    )
  );

CREATE POLICY "Practitioners can delete their own products" ON public.practitioner_products
  FOR DELETE 
  USING (
    practitioner_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_role IN ('osteopath', 'sports_therapist', 'massage_therapist')
    )
  );

-- Add comments for documentation
COMMENT ON POLICY "Practitioners can select their own products" ON public.practitioner_products IS 
'Allows practitioners to view their own products. Split from FOR ALL policy to fix schema cache issues.';

COMMENT ON POLICY "Practitioners can insert their own products" ON public.practitioner_products IS 
'Allows practitioners to create their own products. Split from FOR ALL policy to fix schema cache issues.';

COMMENT ON POLICY "Practitioners can update their own products" ON public.practitioner_products IS 
'Allows practitioners to update their own products. Split from FOR ALL policy to fix schema cache issues.';

COMMENT ON POLICY "Practitioners can delete their own products" ON public.practitioner_products IS 
'Allows practitioners to delete their own products. Split from FOR ALL policy to fix schema cache issues.';
