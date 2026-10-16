import type { NextRequest } from "next/server"
import { accessTo, callerName, fail, getCaller, notify, ok } from "@/lib/server/context"
import { formatPeriod } from "@/lib/period"

// PATCH { action: "deny" | "cancel", note? }
// Approving is done through POST /api/unlock with requestId, which performs the unlock.
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/unlock-requests/[id]">) {
  const { id } = await ctx.params
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)
  const db = caller.db

  const { action, note } = await req.json().catch(() => ({}))
  const { data: request } = await db.from("unlock_requests").select("*").eq("id", id).maybeSingle()
  if (!request) return fail("Request not found", 404)
  if (request.status !== "pending") return fail("This request was already handled.")

  const access = await accessTo(caller, request.trainee_id)
  const cleanNote = typeof note === "string" ? note.trim().slice(0, 500) : null

  if (action === "cancel") {
    if (access !== "self") return fail("Only the candidate can cancel their request.", 403)
  } else if (action === "deny") {
    if (access !== "supervisor" && access !== "admin") return fail("Only a supervisor can deny a request.", 403)
  } else {
    return fail("Invalid action")
  }

  await db.from("unlock_requests").update({
    status: action === "cancel" ? "cancelled" : "denied",
    response_note: cleanNote,
    resolved_by: caller.id,
    resolved_at: new Date().toISOString(),
  }).eq("id", id)

  if (action === "deny") {
    await notify(db, [request.trainee_id], {
      type: "unlock_denied",
      title: "Unlock request declined",
      body: `${callerName(caller)} declined your request to unlock the ${formatPeriod(request.scope, request.period_start)}.${cleanNote ? ` Note: ${cleanNote}` : ""}`,
      related_id: id,
    })
  }

  return ok()
}
