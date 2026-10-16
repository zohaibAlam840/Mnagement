import type { NextRequest } from "next/server"
import { accessTo, fail, getCaller, ok } from "@/lib/server/context"
import { loadFinal, renderAndStoreFvf } from "@/lib/server/fvf"
import { MvfError } from "@/lib/server/mvf"
import { sanitizeFvfValues } from "@/lib/fvf"

// PATCH { fields, formType? } → edit the final form's values (clears the supervisor signature)
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/fvf/[id]">) {
  const { id } = await ctx.params
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)
  const db = caller.db

  const fvf = await loadFinal(db, id)
  if (!fvf) return fail("Form not found", 404)
  if (!(await accessTo(caller, fvf.trainee_id))) return fail("Not allowed", 403)
  if (fvf.supervisor_signed_at) return fail("The form is signed. The supervisor must withdraw the signature before it can be edited.", 409)
  if (!fvf.pdf_path) return fail("Regenerate this form before editing it.", 409)

  const { fields, formType } = await req.json().catch(() => ({}))
  if (formType !== undefined && formType !== "organization" && formType !== "individual") return fail("Invalid form type")
  const type = formType ?? fvf.form_type

  const { data, error } = await db.from("final_verifications").update({
    form_fields: { ...fvf.form_fields, ...sanitizeFvfValues(fields, type) },
    form_type: type,
    status: "pending",
    updated_at: new Date().toISOString(),
  }).eq("id", id).select("*").single()
  if (error) return fail(error.message, 500)

  try {
    return ok({ fvf: await renderAndStoreFvf(db, data) })
  } catch (e) {
    return fail(e instanceof MvfError ? e.message : "Could not update the PDF", 500)
  }
}
