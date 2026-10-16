import type { NextRequest } from "next/server"
import { accessTo, fail, getCaller, ok } from "@/lib/server/context"
import { loadSummary, MvfError, renderAndStore } from "@/lib/server/mvf"
import { sanitizeMvfValues } from "@/lib/mvf"

// PATCH { fields: {...}, formType? } → edit form values. Any change clears signatures.
export async function PATCH(req: NextRequest, ctx: RouteContext<"/api/mvf/[id]">) {
  const { id } = await ctx.params
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)
  const db = caller.db

  const summary = await loadSummary(db, id)
  if (!summary) return fail("Form not found", 404)
  if (!(await accessTo(caller, summary.trainee_id))) return fail("Not allowed", 403)
  if (summary.supervisor_signed_at && summary.trainee_signed_at) {
    return fail("This form is signed by both parties and locked. Unlock the month to edit it.", 409)
  }
  if (!summary.pdf_path) {
    return fail("Regenerate this form before editing it.", 409)
  }

  const { fields, formType } = await req.json().catch(() => ({}))
  if (formType !== undefined && formType !== "organization" && formType !== "individual") return fail("Invalid form type")

  const { data, error } = await db.from("monthly_summaries").update({
    form_fields: { ...summary.form_fields, ...sanitizeMvfValues(fields) },
    form_type: formType ?? summary.form_type,
    supervisor_signed_at: null,
    trainee_signed_at: null,
    supervisor_signature: null,
    trainee_signature: null,
    status: "pending",
  }).eq("id", id).select("*").single()
  if (error) return fail(error.message, 500)

  try {
    return ok({ summary: await renderAndStore(db, data) })
  } catch (e) {
    return fail(e instanceof MvfError ? e.message : "Could not update the PDF", 500)
  }
}
