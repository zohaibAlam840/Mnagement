import type { NextRequest } from "next/server"
import { accessTo, callerName, fail, fullName, getCaller, notify, ok } from "@/lib/server/context"
import { generateMvf, monthReadiness, MvfError } from "@/lib/server/mvf"
import { formatMonthLabel } from "@/lib/period"

function signerRole(callerId: string, s: { trainee_id: string; supervisor_id: string }): "trainee" | "supervisor" | null {
  if (callerId === s.trainee_id) return "trainee"
  if (callerId === s.supervisor_id) return "supervisor"
  return null
}

// GET ?traineeId=…&month=YYYY-MM  → the month's form (if any), readiness, and what the caller may do
export async function GET(req: NextRequest) {
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)
  const traineeId = req.nextUrl.searchParams.get("traineeId") ?? caller.id
  const month = req.nextUrl.searchParams.get("month") ?? ""
  if (!/^\d{4}-\d{2}$/.test(month)) return fail("Invalid month")

  const access = await accessTo(caller, traineeId)
  if (!access) return fail("Not allowed", 403)

  const db = caller.db
  const [{ data: rows }, readiness] = await Promise.all([
    db.from("monthly_summaries").select("*").eq("trainee_id", traineeId).eq("month", `${month}-01`)
      .order("updated_at", { ascending: false }).limit(1),
    monthReadiness(db, traineeId, month),
  ])
  const summary = (rows ?? [])[0] ?? null

  let supervisorName = ""
  if (summary) {
    const { data: sup } = await db.from("profiles").select("first_name, last_name").eq("id", summary.supervisor_id).maybeSingle()
    supervisorName = fullName(sup)
  }

  return ok({
    summary,
    supervisorName,
    readiness,
    access,
    signAs: summary ? signerRole(caller.id, summary) : null,
  })
}

// POST { traineeId, month: "YYYY-MM", formType? } → (re)generate the form from approved hours
export async function POST(req: NextRequest) {
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)
  const { traineeId = caller.id, month, formType } = await req.json().catch(() => ({}))
  if (typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) return fail("Invalid month")
  if (formType !== undefined && formType !== "organization" && formType !== "individual") return fail("Invalid form type")

  const access = await accessTo(caller, traineeId)
  if (!access) return fail("Not allowed", 403)

  try {
    const summary = await generateMvf(caller.db, { traineeId, yearMonth: month, byId: caller.id, formType })
    const other = caller.id === summary.trainee_id ? summary.supervisor_id : summary.trainee_id
    await notify(caller.db, [other], {
      type: "mvf_ready",
      title: "Monthly verification form ready",
      body: `${callerName(caller)} generated the ${formatMonthLabel(month)} Monthly Fieldwork Verification Form. Review and sign it in the app.`,
      related_id: summary.id,
    })
    return ok({ summary })
  } catch (e) {
    if (e instanceof MvfError) return fail(e.message, e.status)
    return fail(e instanceof Error ? e.message : "Could not generate the form", 500)
  }
}
