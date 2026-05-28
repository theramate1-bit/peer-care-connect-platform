-- Add SOAP note specific fields to session_recordings table
ALTER TABLE public.session_recordings 
ADD COLUMN soap_subjective TEXT,
ADD COLUMN soap_objective TEXT,
ADD COLUMN soap_assessment TEXT,
ADD COLUMN soap_plan TEXT,
ADD COLUMN chief_complaint TEXT,
ADD COLUMN session_goals TEXT[];

-- Create a separate table for structured SOAP templates
CREATE TABLE public.soap_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  subjective_prompts TEXT[],
  objective_prompts TEXT[],
  assessment_prompts TEXT[],
  plan_prompts TEXT[],
  is_default BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on soap_templates
ALTER TABLE public.soap_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for SOAP templates
CREATE POLICY "Users can view all templates" 
ON public.soap_templates 
FOR SELECT 
USING (true);

CREATE POLICY "Users can manage their own templates" 
ON public.soap_templates 
FOR ALL 
USING (auth.uid() = created_by);

-- Insert default SOAP templates
INSERT INTO public.soap_templates (name, description, subjective_prompts, objective_prompts, assessment_prompts, plan_prompts, is_default) VALUES 
('Sports Therapy SOAP', 'Standard SOAP template for sports therapy sessions', 
 ARRAY['Chief complaint and onset', 'Pain scale (1-10)', 'Previous treatments tried', 'Current symptoms', 'Functional limitations'],
 ARRAY['Range of motion measurements', 'Strength testing results', 'Palpation findings', 'Posture analysis', 'Special tests performed'],
 ARRAY['Primary diagnosis', 'Contributing factors', 'Functional impact', 'Prognosis', 'Risk factors'],
 ARRAY['Treatment techniques used', 'Home exercises prescribed', 'Activity modifications', 'Return visit recommendations', 'Goals for next session']
),
('Massage Therapy SOAP', 'SOAP template for massage therapy sessions',
 ARRAY['Areas of tension/pain reported', 'Stress levels', 'Sleep quality', 'Activity level changes', 'Previous massage response'],
 ARRAY['Muscle tension assessment', 'Trigger point locations', 'Tissue quality', 'Client positioning', 'Pressure tolerance'],
 ARRAY['Primary areas addressed', 'Tissue response to treatment', 'Client tolerance', 'Progress from previous session'],
 ARRAY['Massage techniques used', 'Self-care recommendations', 'Frequency recommendations', 'Follow-up plan']
),
('Osteopathy SOAP', 'SOAP template for osteopathic treatment sessions',
 ARRAY['Chief complaint history', 'Pain pattern description', 'Aggravating/relieving factors', 'Previous treatments', 'General health status'],
 ARRAY['Postural assessment', 'Palpatory findings', 'Range of motion testing', 'Orthopedic tests', 'Neurological screening'],
 ARRAY['Primary somatic dysfunction', 'Secondary findings', 'Treatment response', 'Functional improvement', 'Overall progress'],
 ARRAY['Osteopathic techniques applied', 'Patient education provided', 'Activity recommendations', 'Treatment frequency', 'Reassessment timeline']
);

-- Create trigger for SOAP templates
CREATE TRIGGER update_soap_templates_updated_at
  BEFORE UPDATE ON public.soap_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();