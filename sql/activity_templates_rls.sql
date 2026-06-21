-- Lets a trainee create and manage their own activity templates.
--
-- Run this only if creating a template fails with a row-level security error.
-- Safe to re-run. Permissive, so it won't disturb existing policies.

alter table public.activity_templates enable row level security;

drop policy if exists "tpl_all_own" on public.activity_templates;
create policy "tpl_all_own"
  on public.activity_templates
  for all to authenticated
  using (trainee_id = auth.uid())
  with check (trainee_id = auth.uid());
