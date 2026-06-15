-- Lookup a profile by email, bypassing RLS, so a supervisor/trainee can find
-- an account they are not yet linked to when sending an invitation.
--
-- Run this once in the Supabase SQL Editor.
--
-- Returns only minimal, non-sensitive fields. SECURITY DEFINER lets it read the
-- profiles table regardless of row-level security, but it only ever exposes the
-- columns selected below for an exact email match.

create or replace function public.lookup_profile_by_email(p_email text)
returns table (id uuid, role text, first_name text, last_name text)
language sql
security definer
set search_path = public
as $$
  select id, role, first_name, last_name
  from public.profiles
  where lower(email) = lower(trim(p_email))
  limit 1;
$$;

grant execute on function public.lookup_profile_by_email(text) to authenticated;
