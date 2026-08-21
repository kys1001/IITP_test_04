-- Run this once in Supabase SQL Editor before using remote report storage.
create table if not exists public.saved_reports (
  id uuid primary key,
  title text not null,
  query text not null,
  report_type text not null,
  period text not null,
  created_at timestamptz not null default now(),
  outputs jsonb not null default '[]'::jsonb
);

alter table public.saved_reports enable row level security;

-- Temporary anonymous policies for this pre-authentication version.
-- Replace these with authenticated user policies when Supabase Auth is added.
drop policy if exists "saved reports anon select" on public.saved_reports;
drop policy if exists "saved reports anon insert" on public.saved_reports;
drop policy if exists "saved reports anon update" on public.saved_reports;
drop policy if exists "saved reports anon delete" on public.saved_reports;
create policy "saved reports anon select" on public.saved_reports for select to anon using (true);
create policy "saved reports anon insert" on public.saved_reports for insert to anon with check (true);
create policy "saved reports anon update" on public.saved_reports for update to anon using (true) with check (true);
create policy "saved reports anon delete" on public.saved_reports for delete to anon using (true);
