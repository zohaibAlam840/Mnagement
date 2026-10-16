import type { NextRequest } from "next/server"
import { callerName, fail, getCaller, notify, ok } from "@/lib/server/context"
import { loadFinal, renderAndStoreFvf } from "@/lib/server/fvf"
import { MvfError } from "@/lib/server/mvf"
import { normalizeSignature } from "@/lib/server/pdf"

// POST { signature } → the responsible supervisor signs the final form
export async function POST(req: NextRequest, ctx: RouteContext<"/api/fvf/[id]/sign">) {
  const { id } = await ctx.params
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)
  const db = caller.db

  const fvf = await loadFinal(db, id)
  if (!fvf) return fail("Form not found", 404)
  if (caller.id !== fvf.supervisor_id) return fail("Only the responsible supervisor signs the final form.", 403)
  if (!fvf.pdf_path) return fail("Regenerate this form, then sign.", 409)

  const { signature } = await req.json().catch(() => ({}))
  const clean = await normalizeSignature(signature)
  if (!clean) return fail("Please draw or type your signature.")

  const { data, error } = await db.from("final_verifications").update({
    supervisor_signature: clean,
    supervisor_signed_at: new Date().toISOString(),
    status: "signed",
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("*").single()
  if (error) return fail(error.message, 500)

  let stored
  try {
    stored = await renderAndStoreFvf(db, data)
  } catch (e) {
    return fail(e instanceof MvfError ? e.message : "Could not update the PDF", 500)
  }

  await notify(db, [fvf.trainee_id], {
    type: "fvf_signed",
    title: "Final verification form signed",
    body: `${callerName(caller)} signed your Final Fieldwork Verification Form. Download it from MSP Reports and keep a copy for at least 7 years.`,
    related_id: id,
  })
  return ok({ fvf: stored })
}

// DELETE → the supervisor withdraws their signature so the form can be corrected
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/fvf/[id]/sign">) {
  const { id } = await ctx.params
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)
  const db = caller.db

  const fvf = await loadFinal(db, id)
  if (!fvf) return fail("Form not found", 404)
  if (caller.id !== fvf.supervisor_id && !caller.isAdmin) return fail("Not allowed", 403)

  const { data, error } = await db.from("final_verifications").update({
    supervisor_signature: null,
    supervisor_signed_at: null,
    status: "pending",
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("*").single()
  if (error) return fail(error.message, 500)
  if (!data.pdf_path) return ok({ fvf: data })
  try {
    return ok({ fvf: await renderAndStoreFvf(db, data) })
  } catch (e) {
    return fail(e instanceof MvfError ? e.message : "Could not update the PDF", 500)
  }
}
