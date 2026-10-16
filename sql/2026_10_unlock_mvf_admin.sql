-- Fieldwork Pro — client change set (Oct 2026)
--   1. Real approval locks + supervisor unlock + candidate unlock requests
--   2. In-app BACB Monthly Fieldwork Verification Form (MVF): fields, signatures, stored PDF
--   3. Admin / Director accounts
--
-- Run once in the Supabase SQL Editor. Safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------

-- Admin / Director accounts (null = normal account)
alter table public.profiles
  add column if not exists admin_level text
    check (admin_level in ('admin', 'director'));

-- Candidate details printed on the MVF (defaults; each form can override)
alter table public.trainee_profiles
  add column if not exists fieldwork_state text,
  add column if not exists fieldwork_country text default 'United States';

-- Week unlock audit trail
alter table public.weekly_reviews
  add column if not exists unlocked_at timestamptz,
  add column if not exists unlocked_by uuid references public.profiles(id) on delete set null,
  add column if not exists unlock_note text;

-- MVF data on the monthly summary
alter table public.monthly_summaries
  add column if not exists form_type text not null default 'organization'
    check (form_type in ('organization', 'individual')),
  add column if not exists form_fields jsonb not null default '{}'::jsonb,
  add column if not exists supervisor_signature text,
  add column if not exists trainee_signature text,
  add column if not exists pdf_path text,
  add column if not exists pdf_generated_at timestamptz,
  add column if not exists generated_by uuid references public.profiles(id) on delete set null,
  add column if not exists unlocked_at timestamptz;

-- One MVF per candidate per month ("new form overrides previous form").
-- Only created when there are no existing duplicates, so this never fails.
do $$
begin
  if not exists (
    select 1 from public.monthly_summaries
    group by trainee_id, month having count(*) > 1
  ) then
    create unique index if not exists monthly_summaries_trainee_month_uniq
      on public.monthly_summaries (trainee_id, month);
  else
    raise notice 'monthly_summaries has duplicate (trainee, month) rows — unique index skipped. The app still keeps one form per month going forward.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Unlock requests (candidate -> supervisor)
-- ---------------------------------------------------------------------------

create table if not exists public.unlock_requests (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null check (scope in ('week', 'month')),
  period_start date not null,           -- Monday of the week, or the 1st of the month
  reason text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'denied', 'cancelled')),
  response_note text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists unlock_requests_trainee_idx on public.unlock_requests (trainee_id, status);

alter table public.unlock_requests enable row level security;

-- Read: the candidate, or any of their active supervisors. Writes go through the app server.
drop policy if exists "ur_select_parties" on public.unlock_requests;
create policy "ur_select_parties"
  on public.unlock_requests
  for select to authenticated
  using (
    trainee_id = auth.uid()
    or exists (
      select 1 from public.supervisor_relationships r
      where r.trainee_id = unlock_requests.trainee_id
        and r.supervisor_id = auth.uid()
        and r.status = 'active'
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Lock enforcement (database-level, so the lock holds no matter which screen)
--    auth.uid() is null for the app server (service role) and the SQL editor,
--    which are allowed through.
-- ---------------------------------------------------------------------------

create or replace function public.fw_week_start(d date)
returns date language sql immutable as $$
  select d - (extract(isodow from d)::int - 1)
$$;

create or replace function public.fw_month_signed(p_trainee uuid, d date)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.monthly_summaries s
    where s.trainee_id = p_trainee
      and s.month = date_trunc('month', d)::date
      and s.supervisor_signed_at is not null
      and s.trainee_signed_at is not null
  )
$$;

create or replace function public.fw_week_approved(p_trainee uuid, d date)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.weekly_reviews w
    where w.trainee_id = p_trainee
      and w.week_start_date = public.fw_week_start(d)
      and w.status = 'approved'
  )
$$;

create or replace function public.fw_enforce_activity_lock()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return coalesce(new, old);
  end if;

  -- Existing row being changed/removed by the candidate
  if tg_op in ('UPDATE', 'DELETE') and old.trainee_id = uid then
    if old.status = 'approved' then
      raise exception 'This activity is approved and locked. Request an unlock from your supervisor to edit it.';
    end if;
    if public.fw_week_approved(old.trainee_id, old.date) then
      raise exception 'This week is approved and locked. Request an unlock from your supervisor to edit it.';
    end if;
    if public.fw_month_signed(old.trainee_id, old.date) then
      raise exception 'This month''s verification form is signed and locked. Request a month unlock to edit it.';
    end if;
  end if;

  -- New/changed row written by the candidate
  if tg_op in ('INSERT', 'UPDATE') and new.trainee_id = uid then
    if new.status = 'approved' and (tg_op = 'INSERT' or old.status is distinct from 'approved') then
      raise exception 'Only a supervisor can approve activities.';
    end if;
    if public.fw_week_approved(new.trainee_id, new.date) then
      raise exception 'That week is approved and locked. Request an unlock from your supervisor to add or change hours.';
    end if;
    if public.fw_month_signed(new.trainee_id, new.date) then
      raise exception 'That month''s verification form is signed and locked. Request a month unlock to add or change hours.';
    end if;
  end if;

  return coalesce(new, old);
end $$;

drop trigger if exists fw_activity_lock on public.activities;
create trigger fw_activity_lock
  before insert or update or delete on public.activities
  for each row execute function public.fw_enforce_activity_lock();

create or replace function public.fw_enforce_review_lock()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' and new.trainee_id = uid and new.status = 'approved' then
    raise exception 'Only a supervisor can approve a week.';
  end if;

  if tg_op = 'UPDATE' and old.trainee_id = uid and uid is distinct from old.supervisor_id then
    if old.status = 'approved' then
      raise exception 'This week is approved and locked. Request an unlock from your supervisor.';
    end if;
    if new.status = 'approved' then
      raise exception 'Only a supervisor can approve a week.';
    end if;
  end if;

  if tg_op = 'DELETE' and old.trainee_id = uid and old.status = 'approved' then
    raise exception 'This week is approved and locked.';
  end if;

  return coalesce(new, old);
end $$;

drop trigger if exists fw_review_lock on public.weekly_reviews;
create trigger fw_review_lock
  before insert or update or delete on public.weekly_reviews
  for each row execute function public.fw_enforce_review_lock();

-- Monthly forms (and their signatures) are written only by the app server now,
-- so a browser can never sign on someone else's behalf.
create or replace function public.fw_enforce_summary_server_only()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    raise exception 'Monthly verification forms are managed through the app.';
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists fw_summary_server_only on public.monthly_summaries;
create trigger fw_summary_server_only
  before insert or update or delete on public.monthly_summaries
  for each row execute function public.fw_enforce_summary_server_only();

-- ---------------------------------------------------------------------------
-- 4. Private storage for generated MVF PDFs
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('mvf-forms', 'mvf-forms', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Admin / Director accounts (the accounts must already be signed up)
-- ---------------------------------------------------------------------------

update public.profiles set admin_level = 'admin'
  where lower(email) = 'info@corbehavioral.com';
update public.profiles set admin_level = 'director'
  where lower(email) = 'amanda@corbehavioral.com';

notify pgrst, 'reload schema';
