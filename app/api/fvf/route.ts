import type { NextRequest } from "next/server"
import { accessTo, callerName, fail, fullName, getCaller, notify, ok } from "@/lib/server/context"
import { fvfCoverage, generateFvf } from "@/lib/server/fvf"
import { MvfError } from "@/lib/server/mvf"

// GET ?traineeId=… → the candidate's final form (if any), which months it can draw on, and caller permissions
export async function GET(req: NextRequest) {
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)
  const traineeId = req.nextUrl.searchParams.get("traineeId") ?? caller.id
  const access = await accessTo(caller, traineeId)
  if (!access) return fail("Not allowed", 403)

  const db = caller.db
  const [{ data: fvf }, coverage] = await Promise.all([
    db.from("final_verifications").select("*").eq("trainee_id", traineeId).maybeSingle(),
    fvfCoverage(db, traineeId),
  ])
  let supervisorName = ""
  if (fvf) {
    const { data: sup } = await db.from("profiles").select("first_name, last_name").eq("id", fvf.supervisor_id).maybeSingle()
    supervisorName = fullName(sup)
  }
  return ok({ fvf: fvf ?? null, coverage, access, supervisorName, canSign: !!fvf && fvf.supervisor_id === caller.id })
}

// POST { traineeId, startMonth: "YYYY-MM", endMonth: "YYYY-MM", formType? } → (re)generate from signed monthly forms
export async function POST(req: NextRequest) {
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)
  const { traineeId = caller.id, startMonth, endMonth, formType } = await req.json().catch(() => ({}))
  const ym = /^\d{4}-\d{2}$/
  if (typeof startMonth !== "string" || !ym.test(startMonth) || typeof endMonth !== "string" || !ym.test(endMonth)) {
    return fail("Choose a start and end month")
  }
  if (formType !== undefined && formType !== "organization" && formType !== "individual") return fail("Invalid form type")
  if (!(await accessTo(caller, traineeId))) return fail("Not allowed", 403)

  try {
    const fvf = await generateFvf(caller.db, { traineeId, startMonth, endMonth, formType, byId: caller.id })
    if (caller.id !== fvf.supervisor_id) {
      await notify(caller.db, [fvf.supervisor_id], {
        type: "fvf_ready",
        title: "Final verification form ready to sign",
        body: `${callerName(caller)} generated the Final Fieldwork Verification Form. As the responsible supervisor, please review and sign it.`,
        related_id: fvf.id,
      })
    }
    return ok({ fvf })
  } catch (e) {
    if (e instanceof MvfError) return fail(e.message, e.status)
    return fail(e instanceof Error ? e.message : "Could not generate the form", 500)
  }
}
