import { fail, getCaller, ok } from "@/lib/server/context"

// Everything the Admin / Director console lists: all accounts, all supervision links,
// and open items per candidate.
export async function GET() {
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)
  if (!caller.isAdmin) return fail("Admin access required", 403)
  const db = caller.db

  const [{ data: users }, { data: rels }, { data: pendingReviews }, { data: pendingUnlocks }] = await Promise.all([
    db.from("profiles").select("id, email, first_name, last_name, role, admin_level, created_at").order("last_name"),
    db.from("supervisor_relationships").select("id, trainee_id, supervisor_id, is_primary, status, start_date"),
    db.from("weekly_reviews").select("trainee_id").eq("status", "submitted"),
    db.from("unlock_requests").select("trainee_id").eq("status", "pending"),
  ])

  const countBy = (rows: { trainee_id: string }[] | null) =>
    (rows ?? []).reduce<Record<string, number>>((acc, r) => { acc[r.trainee_id] = (acc[r.trainee_id] ?? 0) + 1; return acc }, {})

  return ok({
    me: { id: caller.id, adminLevel: caller.adminLevel },
    users: users ?? [],
    relationships: rels ?? [],
    pendingReviews: countBy(pendingReviews),
    pendingUnlocks: countBy(pendingUnlocks),
  })
}
