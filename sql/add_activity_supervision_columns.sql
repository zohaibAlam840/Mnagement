-- Adds the supervision/observation tracking columns the app writes to when
-- logging an activity or importing from Google Calendar.
--
-- Fixes: "Could not find the 'observation_type' column of 'activities' in the
-- schema cache" on both Log Activity and Calendar Import.
--
-- Run once in the Supabase SQL Editor. Safe to re-run (IF NOT EXISTS).

alter table public.activities
  add column if not exists session_type text
    check (session_type in ('individual','group')),
  add column if not exists observation_with_client boolean not null default false,
  add column if not exists observation_type text
    check (observation_type in ('direct','remote','indirect')),
  add column if not exists observation_duration_minutes integer not null default 0,
  add column if not exists supervision_present boolean not null default false,
  add column if not exists template_id uuid,
  add column if not exists supervisor_id uuid;

-- Refresh PostgREST's schema cache so the new columns are visible immediately.
notify pgrst, 'reload schema';
