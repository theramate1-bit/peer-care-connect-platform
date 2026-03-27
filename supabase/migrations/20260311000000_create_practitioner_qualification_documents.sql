-- Fix 404 on POST /rest/v1/practitioner_qualification_documents: create table and RLS.
-- Practitioners upload qualification files to storage, then insert a row here with file_url.

create table public.practitioner_qualification_documents (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references public.users(id) on delete cascade,
  file_url text not null,
  file_name text,
  file_type text,
  file_size_bytes integer,
  created_at timestamptz default now()
);

create index idx_practitioner_qualification_documents_practitioner_id
  on public.practitioner_qualification_documents(practitioner_id);

alter table public.practitioner_qualification_documents enable row level security;

create policy "Practitioners can manage their qualification documents"
  on public.practitioner_qualification_documents
  for all
  using (auth.uid() = practitioner_id)
  with check (auth.uid() = practitioner_id);

grant select, insert, update, delete on public.practitioner_qualification_documents to authenticated;
grant all on public.practitioner_qualification_documents to service_role;
