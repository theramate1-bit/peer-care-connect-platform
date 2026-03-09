-- Practitioner qualification documents: uploadable files (PDF, images, DOC/DOCX) for marketplace profile
-- Apply via Supabase Dashboard SQL editor or: supabase db push (if using Supabase CLI)
--
-- Storage: Ensure a bucket named 'qualifications' exists (Storage in Dashboard) and is set to Public
-- so that getPublicUrl() works for profile and marketplace document links.

-- Table: one row per uploaded document
create table if not exists public.practitioner_qualification_documents (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.users(id) on delete cascade,
  file_url text not null,
  file_name text not null,
  file_type text not null,
  file_size_bytes integer not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_practitioner_qualification_documents_practitioner_id
  on public.practitioner_qualification_documents(practitioner_id);

comment on table public.practitioner_qualification_documents is 'Uploaded qualification documents (certificates, licenses) shown on practitioner profile and marketplace.';

-- RLS
alter table public.practitioner_qualification_documents enable row level security;

-- Practitioners can manage their own documents
create policy "Practitioners can insert own qualification documents"
  on public.practitioner_qualification_documents for insert
  with check (auth.uid() = practitioner_id);

create policy "Practitioners can update own qualification documents"
  on public.practitioner_qualification_documents for update
  using (auth.uid() = practitioner_id);

create policy "Practitioners can delete own qualification documents"
  on public.practitioner_qualification_documents for delete
  using (auth.uid() = practitioner_id);

-- Public read: anyone can view qualification documents (marketplace visitors)
create policy "Anyone can view qualification documents"
  on public.practitioner_qualification_documents for select
  using (true);
