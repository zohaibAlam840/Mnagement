import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { activeSupervisors, callerName, fail, getCaller, notify, ok } from "@/lib/server/context"

// POST { ids: string[], category: "Restricted" | "Unrestricted" }
// Candidate fills in the missing Restricted/Unrestricted on legacy supervision /
// observation entries. Runs as the candidate so the database lock rules apply:
// on approved/locked entries only the empty category may be set — hours,
// approvals and signed forms stay exactly as they are.
export async function POST(req: NextRequest) {
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)

  const body = await req.json().catch(() => null) as { ids?: unknown; category?: unknown } | null
  const ids = Array.isArray(body?.ids) ? body!.ids.filter((x): x is string => typeof x === "string").slice(0, 500) : []
  const category = body?.category
  if (ids.length === 0) return fail("Nothing to update")
  if (category !== "Restricted" && category !== "Unrestricted") return fail("Choose Restricted or Unrestricted")

  const { data: rows, error: readError } = await caller.db
    .from("activities")
    .select("id, trainee_id, category, status, date")
    .in("id", ids)
  if (readError) return fail(readError.message, 500)
  const mine = (rows ?? []).filter(r => r.trainee_id === caller.id && r.category == null)
  if (mine.length === 0) return fail("These entries already have a category, or are not yours.")

  const supabase = await createClient()
  const { data: updated, error } = await supabase
    .from("activities")
    .update({ category })
    .in("id", mine.map(r => r.id))
    .eq("trainee_id", caller.id)
    .is("category", null)
    .select("id")
  if (error) return fail(error.message, 400)

  const count = updated?.length ?? 0
  const lockedCount = mine.filter(r => r.status === "approved").length
  if (count > 0 && lockedCount > 0) {
    const sups = await activeSupervisors(caller.db, caller.id)
    await notify(caller.db, sups.map(s => s.supervisor_id), {
      type: "category_review",
      title: "Activity categories updated",
      body: `${callerName(caller)} marked ${count} approved supervision/observation entr${count === 1 ? "y" : "ies"} as ${category}. Hours and signed forms are unchanged.`,
    })
  }

  return ok({ updated: count })
}
