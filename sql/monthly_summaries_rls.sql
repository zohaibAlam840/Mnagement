-- Lets the supervisor generate/sign a Monthly Supervisory Period report and the
-- trainee read + counter-sign it.
--
-- Run this if "Generate" on the Sign-Off page still errors after adding the
-- activity columns. Safe to re-run. Permissive.

alter table public.monthly_summaries enable row level security;

-- SELECT: either party can read the summary
drop policy if exists "ms_select_either_party" on public.monthly_summaries;
create policy "ms_select_either_party"
  on public.monthly_summaries
  for select to authenticated
  using (trainee_id = auth.uid() or supervisor_id = auth.uid());

-- INSERT: the supervisor generates the report
drop policy if exists "ms_insert_supervisor" on public.monthly_summaries;
create policy "ms_insert_supervisor"
  on public.monthly_summaries
  for insert to authenticated
  with check (supervisor_id = auth.uid());

-- UPDATE: supervisor regenerates/signs, trainee counter-signs
drop policy if exists "ms_update_either_party" on public.monthly_summaries;
create policy "ms_update_either_party"
  on public.monthly_summaries
  for update to authenticated
  using (trainee_id = auth.uid() or supervisor_id = auth.uid())
  with check (trainee_id = auth.uid() or supervisor_id = auth.uid());
