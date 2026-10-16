import type { NextRequest } from "next/server"
import { activeSupervisors, callerName, fail, getCaller, notify, ok } from "@/lib/server/context"
import { formatMonthLabel, formatWeekRange, weekStartOf } from "@/lib/period"

// GET: unlock requests visible to the caller.
//   ?traineeId=…  limit to one candidate   ?status=pending (default) | all
export async function GET(req: NextRequest) {
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)
  const db = caller.db
  const traineeId = req.nextUrl.searchParams.get("traineeId")
  const status = req.nextUrl.searchParams.get("status") ?? "pending"

  let traineeIds: string[] | null
  if (caller.isAdmin && req.nextUrl.searchParams.get("scope") === "all") {
    traineeIds = null
  } else {
    const { data: rels } = await db
      .from("supervisor_relationships")
      .select("trainee_id")
      .eq("supervisor_id", caller.id)
      .eq("status", "active")
    traineeIds = [caller.id, ...(rels ?? []).map(r => r.trainee_id)]
  }
  if (traineeId) {
    if (traineeIds && !traineeIds.includes(traineeId) && !caller.isAdmin) return fail("Not allowed", 403)
    traineeIds = [traineeId]
  }

  let q = db.from("unlock_requests").select("*").order("created_at", { ascending: false }).limit(200)
  if (traineeIds) q = q.in("trainee_id", traineeIds)
  if (status !== "all") q = q.eq("status", status)
  const { data: requests, error } = await q
  if (error) return fail(error.message, 500)

  const ids = [...new Set((requests ?? []).map(r => r.trainee_id))]
  const { data: profiles } = ids.length
    ? await db.from("profiles").select("id, first_name, last_name, email").in("id", ids)
    : { data: [] }
  const byId = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))

  return ok({ requests: (requests ?? []).map(r => ({ ...r, trainee: byId[r.trainee_id] ?? null })) })
}

// POST: candidate asks their supervisors to unlock an approved week or a signed month.
// Body: { scope: "week" | "month", period: "YYYY-MM-DD" | "YYYY-MM", reason }
export async function POST(req: NextRequest) {
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)
  const db = caller.db

  const { scope, period, reason } = await req.json().catch(() => ({}))
  const cleanReason = typeof reason === "string" ? reason.trim().slice(0, 500) : ""
  if (!cleanReason) return fail("Please add a short reason for the unlock.")

  let periodStart: string
  let label: string
  if (scope === "week") {
    if (typeof period !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(period) || weekStartOf(period) !== period) return fail("Invalid week")
    const { data: review } = await db.from("weekly_reviews").select("status")
      .eq("trainee_id", caller.id).eq("week_start_date", period).maybeSingle()
    if (review?.status !== "approved") return fail("This week isn't approved, so it doesn't need unlocking.")
    periodStart = period
    label = `week of ${formatWeekRange(period)}`
  } else if (scope === "month") {
    if (typeof period !== "string" || !/^\d{4}-\d{2}$/.test(period)) return fail("Invalid month")
    periodStart = `${period}-01`
    label = formatMonthLabel(period)
  } else {
    return fail("Invalid scope")
  }

  const { data: existing } = await db.from("unlock_requests").select("id")
    .eq("trainee_id", caller.id).eq("scope", scope).eq("period_start", periodStart).eq("status", "pending")
  if ((existing ?? []).length > 0) return fail("You already have a pending unlock request for this period.")

  const sups = await activeSupervisors(db, caller.id)
  if (sups.length === 0) return fail("You don't have an active supervisor to send this to.")

  const { data: created, error } = await db.from("unlock_requests").insert({
    trainee_id: caller.id,
    scope,
    period_start: periodStart,
    reason: cleanReason,
    status: "pending",
  }).select("*").single()
  if (error) return fail(error.message, 500)

  await notify(db, sups.map(s => s.supervisor_id), {
    type: "unlock_request",
    title: "Unlock requested",
    body: `${callerName(caller)} asked to unlock their ${label}. Reason: ${cleanReason}`,
    related_id: created.id,
  })

  return ok({ request: created })
}
