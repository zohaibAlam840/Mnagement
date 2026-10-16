import type { NextRequest } from "next/server"
import { fail, getCaller, ok } from "@/lib/server/context"

// Details printed on the BACB verification form.
// Candidate: BACB ID, fieldwork state, country. Supervisor: BACB / certification ID.
export async function GET() {
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)
  const db = caller.db

  if (caller.role === "trainee") {
    const { data } = await db.from("trainee_profiles")
      .select("bacb_id, fieldwork_state, fieldwork_country").eq("id", caller.id).maybeSingle()
    return ok({
      role: caller.role,
      bacbId: data?.bacb_id ?? "",
      state: data?.fieldwork_state ?? "",
      country: data?.fieldwork_country ?? "United States",
    })
  }
  const { data } = await db.from("supervisor_profiles").select("bacb_id").eq("id", caller.id).maybeSingle()
  return ok({ role: caller.role, bacbId: data?.bacb_id ?? "" })
}

export async function PATCH(req: NextRequest) {
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)
  const db = caller.db
  const body = await req.json().catch(() => ({}))
  const clean = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 80) : "")

  if (caller.role === "trainee") {
    const { error } = await db.from("trainee_profiles").update({
      bacb_id: clean(body.bacbId) || null,
      fieldwork_state: clean(body.state) || null,
      fieldwork_country: clean(body.country) || null,
    }).eq("id", caller.id)
    if (error) return fail(error.message, 500)
  } else {
    const bacb_id = clean(body.bacbId) || null
    const { data: existing } = await db.from("supervisor_profiles").select("id").eq("id", caller.id).maybeSingle()
    const { error } = existing
      ? await db.from("supervisor_profiles").update({ bacb_id }).eq("id", caller.id)
      : await db.from("supervisor_profiles").insert({ id: caller.id, bacb_id, certification_level: "BCBA" })
    if (error) return fail(error.message, 500)
  }
  return ok()
}
