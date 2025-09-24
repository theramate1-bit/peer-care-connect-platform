-- Clinical Files System Migration
-- This migration creates the clinical files table and storage bucket for practitioner file management

-- Create clinical_files table
CREATE TABLE IF NOT EXISTS clinical_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES client_sessions(id),
  practitioner_id UUID REFERENCES auth.users(id),
  client_id UUID REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'document', 'audio', 'other')),
  file_size BIGINT NOT NULL,
  file_url TEXT NOT NULL,
  description TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE clinical_files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clinical_files
CREATE POLICY "Practitioners can view their own clinical files" ON clinical_files
  FOR SELECT USING (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can insert their own clinical files" ON clinical_files
  FOR INSERT WITH CHECK (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can update their own clinical files" ON clinical_files
  FOR UPDATE USING (auth.uid() = practitioner_id);

CREATE POLICY "Practitioners can delete their own clinical files" ON clinical_files
  FOR DELETE USING (auth.uid() = practitioner_id);

-- Clients can view files related to their sessions
CREATE POLICY "Clients can view their clinical files" ON clinical_files
  FOR SELECT USING (auth.uid() = client_id);

-- Create storage bucket for clinical files (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('clinical-files', 'clinical-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for clinical-files bucket
CREATE POLICY "Practitioners can upload clinical files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'clinical-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Practitioners can view their clinical files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'clinical-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Practitioners can update their clinical files" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'clinical-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Practitioners can delete their clinical files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'clinical-files' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Clients can view files related to their sessions
CREATE POLICY "Clients can view their clinical files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'clinical-files' AND 
    auth.uid()::text = (storage.foldername(name))[2]
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clinical_files_session_id ON clinical_files(session_id);
CREATE INDEX IF NOT EXISTS idx_clinical_files_practitioner_id ON clinical_files(practitioner_id);
CREATE INDEX IF NOT EXISTS idx_clinical_files_client_id ON clinical_files(client_id);
CREATE INDEX IF NOT EXISTS idx_clinical_files_uploaded_at ON clinical_files(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_clinical_files_file_type ON clinical_files(file_type);
