import type { NextRequest } from "next/server"
import { callerName, fail, fullName, getCaller, notify, ok, type Db } from "@/lib/server/context"
import { toDateStr } from "@/lib/period"

async function ensurePrimary(db: Db, traineeId: string) {
  const { data: rels } = await db.from("supervisor_relationships")
    .select("id, is_primary").eq("trainee_id", traineeId).eq("status", "active").order("created_at")
  if ((rels ?? []).length > 0 && !(rels ?? []).some(r => r.is_primary)) {
    await db.from("supervisor_relationships").update({ is_primary: true }).eq("id", rels![0].id)
  }
}

// POST { action: "assign" | "remove" | "primary", traineeId, supervisorId }
export async function POST(req: NextRequest) {
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)
  if (!caller.isAdmin) return fail("Admin access required", 403)
  const db = caller.db

  const { action, traineeId, supervisorId } = await req.json().catch(() => ({}))
  if (typeof traineeId !== "string" || typeof supervisorId !== "string") return fail("Pick a candidate and a supervisor")

  const { data: people } = await db.from("profiles").select("id, role, first_name, last_name").in("id", [traineeId, supervisorId])
  const trainee = people?.find(p => p.id === traineeId)
  const supervisor = people?.find(p => p.id === supervisorId)
  if (trainee?.role !== "trainee") return fail("That account is not a candidate")
  if (supervisor?.role !== "supervisor") return fail("That account is not a supervisor")

  const { data: existing } = await db.from("supervisor_relationships").select("*")
    .eq("trainee_id", traineeId).eq("supervisor_id", supervisorId).maybeSingle()
  const today = toDateStr(new Date())

  if (action === "assign") {
    const { data: active } = await db.from("supervisor_relationships").select("id")
      .eq("trainee_id", traineeId).eq("status", "active")
    const makePrimary = (active ?? []).filter(r => r.id !== existing?.id).length === 0
    const { error } = existing
      ? await db.from("supervisor_relationships").update({ status: "active", end_date: null, start_date: existing.start_date ?? today, is_primary: existing.is_primary || makePrimary }).eq("id", existing.id)
      : await db.from("supervisor_relationships").insert({ trainee_id: traineeId, supervisor_id: supervisorId, status: "active", is_primary: makePrimary, start_date: today, end_date: null })
    if (error) return fail(error.message, 500)
    await notify(db, [traineeId], { type: "admin_assigned", title: "Supervisor assigned", body: `${callerName(caller)} assigned ${fullName(supervisor)} as your supervisor.` })
    await notify(db, [supervisorId], { type: "admin_assigned", title: "Supervisee assigned", body: `${callerName(caller)} assigned ${fullName(trainee)} to you as a supervisee.` })
  } else if (action === "remove") {
    if (!existing) return fail("They aren't linked")
    const { error } = await db.from("supervisor_relationships")
      .update({ status: "ended", is_primary: false, end_date: today }).eq("id", existing.id)
    if (error) return fail(error.message, 500)
    await ensurePrimary(db, traineeId)
  } else if (action === "primary") {
    if (existing?.status !== "active") return fail("Assign the supervisor first")
    await db.from("supervisor_relationships").update({ is_primary: false }).eq("trainee_id", traineeId)
    const { error } = await db.from("supervisor_relationships").update({ is_primary: true }).eq("id", existing.id)
    if (error) return fail(error.message, 500)
  } else {
    return fail("Invalid action")
  }

  return ok()
}
