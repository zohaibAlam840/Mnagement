import type { NextRequest } from "next/server"
import { accessTo, callerName, fail, getCaller, notify, ok } from "@/lib/server/context"
import { unlockMonth, unlockWeek } from "@/lib/server/locks"
import { formatMonthLabel, formatWeekRange, weekStartOf } from "@/lib/period"

// Supervisor (or admin) unlocks an approved week, or a whole month incl. its signed MVF.
// Body: { scope: "week" | "month", traineeId, period: "YYYY-MM-DD" (week) | "YYYY-MM" (month), note?, requestId? }
export async function POST(req: NextRequest) {
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)

  const { scope, traineeId, period, note, requestId } = await req.json().catch(() => ({}))
  if (typeof traineeId !== "string") return fail("Missing candidate")

  const access = await accessTo(caller, traineeId)
  if (access !== "supervisor" && access !== "admin") return fail("Only a supervisor or admin can unlock approvals.", 403)

  const cleanNote = typeof note === "string" ? note.trim().slice(0, 500) : null
  const db = caller.db
  let label: string

  try {
    if (scope === "week") {
      if (typeof period !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(period) || weekStartOf(period) !== period) {
        return fail("Invalid week")
      }
      await unlockWeek(db, { traineeId, weekStart: period, byId: caller.id, note: cleanNote })
      label = `week of ${formatWeekRange(period)}`
    } else if (scope === "month") {
      if (typeof period !== "string" || !/^\d{4}-\d{2}$/.test(period)) return fail("Invalid month")
      await unlockMonth(db, { traineeId, yearMonth: period, byId: caller.id, note: cleanNote })
      label = formatMonthLabel(period)
    } else {
      return fail("Invalid scope")
    }
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Unlock failed", 500)
  }

  if (typeof requestId === "string") {
    await db.from("unlock_requests").update({
      status: "approved",
      response_note: cleanNote,
      resolved_by: caller.id,
      resolved_at: new Date().toISOString(),
    }).eq("id", requestId).eq("trainee_id", traineeId).eq("status", "pending")
  }

  await notify(db, [traineeId], {
    type: "unlocked",
    title: scope === "week" ? "Week unlocked for edits" : "Month unlocked for edits",
    body: `${callerName(caller)} unlocked your ${label}.${scope === "month" ? " The verification form signatures were cleared — regenerate and re-sign after your hours are re-approved." : " Make your changes and resubmit the week."}${cleanNote ? ` Note: ${cleanNote}` : ""}`,
  })

  return ok()
}
