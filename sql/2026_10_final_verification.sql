-- Fieldwork Pro — BACB Final Fieldwork Verification Form (FVF)
-- Run AFTER 2026_10_unlock_mvf_admin.sql, in the Supabase SQL Editor. Safe to re-run.
--
-- One final form per candidate. It totals the candidate's signed Monthly forms
-- in the chosen date range; only the responsible supervisor signs it.

create table if not exists public.final_verifications (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references public.profiles(id) on delete cascade,
  supervisor_id uuid not null references public.profiles(id),
  form_type text not null default 'organization' check (form_type in ('organization', 'individual')),
  start_month date not null,
  end_month date not null,
  form_fields jsonb not null default '{}'::jsonb,
  months_included text[] not null default '{}',
  status text not null default 'pending',
  supervisor_signature text,
  supervisor_signed_at timestamptz,
  pdf_path text,
  pdf_generated_at timestamptz,
  generated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists final_verifications_trainee_uniq on public.final_verifications (trainee_id);

alter table public.final_verifications enable row level security;

drop policy if exists "fv_select_parties" on public.final_verifications;
create policy "fv_select_parties"
  on public.final_verifications
  for select to authenticated
  using (
    trainee_id = auth.uid()
    or supervisor_id = auth.uid()
    or exists (
      select 1 from public.supervisor_relationships r
      where r.trainee_id = final_verifications.trainee_id
        and r.supervisor_id = auth.uid()
        and r.status = 'active'
    )
  );

-- Written only by the app server (same rule as monthly forms)
drop trigger if exists fw_final_server_only on public.final_verifications;
create trigger fw_final_server_only
  before insert or update or delete on public.final_verifications
  for each row execute function public.fw_enforce_summary_server_only();

notify pgrst, 'reload schema';
