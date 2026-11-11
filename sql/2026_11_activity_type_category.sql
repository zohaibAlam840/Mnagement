-- Activity type + Restricted/Unrestricted category (client request, Nov 2026)
--
-- Every entry now stores:
--   activity_type  FIELDWORK_TASK | INDIVIDUAL_SUPERVISION | GROUP_SUPERVISION | OBSERVATION
--   category       Restricted | Unrestricted   (null only on legacy supervision rows awaiting review)
--
-- What this does:
--   1. Adds activity_type to activities and activity_templates, makes category
--      nullable and limits it to Restricted/Unrestricted.
--   2. Migrates existing rows: Restricted/Unrestricted → FIELDWORK_TASK;
--      old "Supervision" rows get their type and an empty category (flagged in the app).
--   3. Normalises writes from older app versions (still cached on phones) that send
--      category = 'Supervision', so nothing breaks during the rollout.
--   4. Lets a candidate fill in ONLY the missing category on a locked/approved entry
--      (hours, approval and signed forms are unchanged).
--   5. Blocks submitting a week while any entry in it is missing a category.
--
-- Run once in the Supabase SQL Editor, BEFORE deploying the matching app version.
-- Safe to re-run.

-- 1a. Columns --------------------------------------------------------------------
alter table public.activities         add column if not exists activity_type text;
alter table public.activity_templates add column if not exists activity_type text;

-- 1b. category may be an enum or have a check constraint from the original schema:
--     convert to text and drop old category checks so the new rules can apply.
do $$
declare
  r record;
  t text;
begin
  foreach t in array array['activities', 'activity_templates'] loop
    for r in
      select c.conname
      from pg_constraint c
      join pg_class rel on rel.oid = c.conrelid
      join pg_namespace n on n.oid = rel.relnamespace
      where n.nspname = 'public' and rel.relname = t and c.contype = 'c'
        and pg_get_constraintdef(c.oid) ~* '\mcategory\M' -- not subcategory
    loop
      execute format('alter table public.%I drop constraint %I', t, r.conname);
    end loop;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'category' and data_type = 'USER-DEFINED'
    ) then
      execute format('alter table public.%I alter column category type text using category::text', t);
    end if;

    execute format('alter table public.%I alter column category drop not null', t);
  end loop;
end $$;

-- 2. Migrate existing rows (runs as the SQL editor, so lock triggers allow it) -----
-- Disable only our lock trigger for the data fix so approved weeks can be migrated.
alter table public.activities disable trigger fw_activity_lock;

update public.activities set activity_type = case
    when category = 'Supervision' and observation_with_client then 'OBSERVATION'
    when category = 'Supervision' and session_type = 'group' then 'GROUP_SUPERVISION'
    when category = 'Supervision' and session_type = 'individual' then 'INDIVIDUAL_SUPERVISION'
    when category = 'Supervision' and subcategory ilike 'group%' then 'GROUP_SUPERVISION'
    when category = 'Supervision' and subcategory ilike 'observation%' then 'OBSERVATION'
    when category = 'Supervision' then 'INDIVIDUAL_SUPERVISION'
    else 'FIELDWORK_TASK'
  end
where activity_type is null;

update public.activities set category = null
where category is not null and category not in ('Restricted', 'Unrestricted');

alter table public.activities enable trigger fw_activity_lock;

update public.activity_templates set activity_type = case
    when category = 'Supervision' and subcategory ilike 'group%' then 'GROUP_SUPERVISION'
    when category = 'Supervision' and subcategory ilike 'observation%' then 'OBSERVATION'
    when category = 'Supervision' then 'INDIVIDUAL_SUPERVISION'
    else 'FIELDWORK_TASK'
  end
where activity_type is null;

update public.activity_templates set category = null
where category is not null and category not in ('Restricted', 'Unrestricted');

-- 3. Normalise every write (also covers older cached app versions) ----------------
create or replace function public.fw_normalize_activity_kind()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.category = 'Supervision' then
    if new.activity_type is null or new.activity_type = 'FIELDWORK_TASK' then
      new.activity_type := case
        when new.observation_with_client then 'OBSERVATION'
        when new.session_type = 'group' then 'GROUP_SUPERVISION'
        when new.session_type = 'individual' then 'INDIVIDUAL_SUPERVISION'
        when new.subcategory ilike 'group%' then 'GROUP_SUPERVISION'
        when new.subcategory ilike 'observation%' then 'OBSERVATION'
        else 'INDIVIDUAL_SUPERVISION'
      end;
    end if;
    new.category := null;
  end if;

  if new.activity_type is null then
    new.activity_type := 'FIELDWORK_TASK';
  end if;

  -- A fieldwork task always has its category; supervision may be null only for legacy rows.
  if new.activity_type = 'FIELDWORK_TASK' and new.category is null then
    raise exception 'Choose Restricted or Unrestricted for this activity.';
  end if;

  return new;
end $$;

create or replace function public.fw_normalize_template_kind()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.category = 'Supervision' then
    if new.activity_type is null or new.activity_type = 'FIELDWORK_TASK' then
      new.activity_type := case
        when new.subcategory ilike 'group%' then 'GROUP_SUPERVISION'
        when new.subcategory ilike 'observation%' then 'OBSERVATION'
        else 'INDIVIDUAL_SUPERVISION'
      end;
    end if;
    new.category := null;
  end if;

  if new.activity_type is null then
    new.activity_type := 'FIELDWORK_TASK';
  end if;

  if new.activity_type = 'FIELDWORK_TASK' and new.category is null then
    raise exception 'Choose Restricted or Unrestricted for this template.';
  end if;

  return new;
end $$;

-- Named fw_0_* so it runs before the lock trigger (triggers fire in name order).
drop trigger if exists fw_0_normalize_kind on public.activities;
create trigger fw_0_normalize_kind
  before insert or update on public.activities
  for each row execute function public.fw_normalize_activity_kind();

drop trigger if exists fw_0_normalize_kind on public.activity_templates;
create trigger fw_0_normalize_kind
  before insert or update on public.activity_templates
  for each row execute function public.fw_normalize_template_kind();

-- New rules (after the data fix and with the normaliser in place)
alter table public.activities drop constraint if exists activities_activity_type_check;
alter table public.activities add constraint activities_activity_type_check
  check (activity_type in ('FIELDWORK_TASK', 'INDIVIDUAL_SUPERVISION', 'GROUP_SUPERVISION', 'OBSERVATION'));
alter table public.activities alter column activity_type set not null;
alter table public.activities alter column activity_type set default 'FIELDWORK_TASK';

alter table public.activities drop constraint if exists activities_category_check;
alter table public.activities add constraint activities_category_check
  check (category is null or category in ('Restricted', 'Unrestricted'));

alter table public.activity_templates drop constraint if exists activity_templates_activity_type_check;
alter table public.activity_templates add constraint activity_templates_activity_type_check
  check (activity_type in ('FIELDWORK_TASK', 'INDIVIDUAL_SUPERVISION', 'GROUP_SUPERVISION', 'OBSERVATION'));
alter table public.activity_templates alter column activity_type set not null;
alter table public.activity_templates alter column activity_type set default 'FIELDWORK_TASK';

alter table public.activity_templates drop constraint if exists activity_templates_category_check;
alter table public.activity_templates add constraint activity_templates_category_check
  check (category is null or category in ('Restricted', 'Unrestricted'));

create index if not exists activities_needs_category_idx
  on public.activities (trainee_id) where category is null;

-- 4. Lock trigger: same rules as before, plus "fill in a missing category only" ---
create or replace function public.fw_enforce_activity_lock()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return coalesce(new, old);
  end if;

  -- Review fix: the candidate adds the missing Restricted/Unrestricted to a legacy
  -- supervision entry and changes nothing else. Allowed even when locked.
  if tg_op = 'UPDATE' and old.trainee_id = uid
     and old.category is null and new.category in ('Restricted', 'Unrestricted')
     and (to_jsonb(new) - 'category' - 'updated_at') = (to_jsonb(old) - 'category' - 'updated_at') then
    return new;
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

-- 5. Review trigger: same rules as before, plus "no submit while entries need a category"
create or replace function public.fw_enforce_review_lock()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  missing int;
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

  if tg_op in ('INSERT', 'UPDATE') and new.trainee_id = uid and new.status = 'submitted'
     and (tg_op = 'INSERT' or old.status is distinct from 'submitted') then
    select count(*) into missing from public.activities a
    where a.trainee_id = new.trainee_id
      and a.date between new.week_start_date and new.week_start_date + 6
      and a.category is null;
    if missing > 0 then
      raise exception '% entr% this week still need Restricted or Unrestricted selected before you can submit.',
        missing, case when missing = 1 then 'y' else 'ies' end;
    end if;
  end if;

  if tg_op = 'DELETE' and old.trainee_id = uid and old.status = 'approved' then
    raise exception 'This week is approved and locked.';
  end if;

  return coalesce(new, old);
end $$;

notify pgrst, 'reload schema';

-- Check: how many entries are flagged for review
-- select count(*) from public.activities where category is null;
