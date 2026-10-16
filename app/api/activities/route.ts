import type { NextRequest } from "next/server"
import { accessTo, fail, getCaller, ok } from "@/lib/server/context"

// GET ?traineeId=…&from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive)
// Logged activities + week approval status for the period — for the candidate,
// their supervisors, and admins (read-only history after approval).
export async function GET(req: NextRequest) {
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)
  const p = req.nextUrl.searchParams
  const traineeId = p.get("traineeId") ?? caller.id
  const from = p.get("from") ?? ""
  const to = p.get("to") ?? ""
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return fail("Invalid period")

  if (!(await accessTo(caller, traineeId))) return fail("Not allowed", 403)
  const db = caller.db

  const [{ data: activities, error }, { data: reviews }] = await Promise.all([
    db.from("activities").select("*").eq("trainee_id", traineeId)
      .gte("date", from).lte("date", to)
      .order("date", { ascending: true }).order("start_time", { ascending: true }),
    db.from("weekly_reviews").select("id, week_start_date, status, reviewed_at, unlocked_at, unlock_note, supervisor_notes")
      .eq("trainee_id", traineeId)
      .lte("week_start_date", to),
  ])
  if (error) return fail(error.message, 500)

  return ok({ activities: activities ?? [], reviews: reviews ?? [] })
}
