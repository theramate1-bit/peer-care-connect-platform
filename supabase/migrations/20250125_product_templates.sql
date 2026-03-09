-- Create product_templates table for customizable product templates
CREATE TABLE product_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  practitioner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  -- If practitioner_id is NULL, it's a platform-wide template
  -- If practitioner_id is set, it's a custom template for that practitioner
  service_category TEXT NOT NULL, -- Links to services_offered values
  template_name TEXT NOT NULL, -- User-friendly name for the template
  name_template TEXT NOT NULL, -- Template for product name (can include variables like {duration})
  description_template TEXT, -- Template for product description
  default_duration_minutes INTEGER NOT NULL,
  suggested_price_per_hour INTEGER, -- In pence, for calculating price based on duration
  pricing_type TEXT DEFAULT 'hourly', -- 'hourly', 'fixed', 'range'
  min_duration_minutes INTEGER,
  max_duration_minutes INTEGER,
  is_platform_template BOOLEAN DEFAULT false, -- True for platform-wide templates
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_product_templates_service_category ON product_templates(service_category);
CREATE INDEX idx_product_templates_practitioner_id ON product_templates(practitioner_id);
CREATE INDEX idx_product_templates_is_platform ON product_templates(is_platform_template) WHERE is_platform_template = true;
CREATE INDEX idx_product_templates_is_active ON product_templates(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE product_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Platform templates are visible to all practitioners
CREATE POLICY "Platform templates are visible to all practitioners" ON product_templates
  FOR SELECT USING (
    is_platform_template = true AND is_active = true
  );

-- Practitioners can view their own custom templates
CREATE POLICY "Practitioners can view their own templates" ON product_templates
  FOR SELECT USING (
    practitioner_id = auth.uid() OR is_platform_template = true
  );

-- Practitioners can create custom templates
CREATE POLICY "Practitioners can create custom templates" ON product_templates
  FOR INSERT WITH CHECK (
    practitioner_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_role IN ('osteopath', 'sports_therapist', 'massage_therapist')
    )
  );

-- Practitioners can update their own custom templates
CREATE POLICY "Practitioners can update their own templates" ON product_templates
  FOR UPDATE USING (
    practitioner_id = auth.uid() AND is_platform_template = false
  );

-- Practitioners can delete their own custom templates
CREATE POLICY "Practitioners can delete their own templates" ON product_templates
  FOR DELETE USING (
    practitioner_id = auth.uid() AND is_platform_template = false
  );

-- Only admins can manage platform templates
CREATE POLICY "Admins can manage platform templates" ON product_templates
  FOR ALL USING (
    is_platform_template = true AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND user_role = 'admin'
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_product_templates_updated_at
  BEFORE UPDATE ON product_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

