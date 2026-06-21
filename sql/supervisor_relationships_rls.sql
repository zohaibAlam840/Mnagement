-- Allows BOTH parties to create and manage a supervision relationship.
--
-- Fixes: "new row violates row-level security policy for table
-- supervisor_relationships" when a supervisor invites a trainee.
--
-- Before this, only the trainee could create a relationship row (trainee_id =
-- auth.uid()), so supervisor-initiated invites were blocked. These policies are
-- permissive (OR'd with any existing ones), so the trainee flow keeps working.
--
-- Run once in the Supabase SQL Editor. Safe to re-run.

alter table public.supervisor_relationships enable row level security;

-- SELECT: either party can read their relationships
drop policy if exists "rel_select_either_party" on public.supervisor_relationships;
create policy "rel_select_either_party"
  on public.supervisor_relationships
  for select to authenticated
  using (supervisor_id = auth.uid() or trainee_id = auth.uid());

-- INSERT: either party can create the relationship (the side that owns the row)
drop policy if exists "rel_insert_either_party" on public.supervisor_relationships;
create policy "rel_insert_either_party"
  on public.supervisor_relationships
  for insert to authenticated
  with check (supervisor_id = auth.uid() or trainee_id = auth.uid());

-- UPDATE: either party can update (accept, set primary, end)
drop policy if exists "rel_update_either_party" on public.supervisor_relationships;
create policy "rel_update_either_party"
  on public.supervisor_relationships
  for update to authenticated
  using (supervisor_id = auth.uid() or trainee_id = auth.uid())
  with check (supervisor_id = auth.uid() or trainee_id = auth.uid());

-- DELETE: either party can cancel/decline a pending relationship
drop policy if exists "rel_delete_either_party" on public.supervisor_relationships;
create policy "rel_delete_either_party"
  on public.supervisor_relationships
  for delete to authenticated
  using (supervisor_id = auth.uid() or trainee_id = auth.uid());
