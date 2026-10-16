import type { NextRequest } from "next/server"
import { callerName, fail, getCaller, notify, ok } from "@/lib/server/context"
import { loadSummary, MvfError, renderAndStore } from "@/lib/server/mvf"
import { formatMonthLabel } from "@/lib/period"
import { normalizeSignature } from "@/lib/server/pdf"

// POST { signature: "data:image/png;base64,…" } → sign as the candidate or the responsible supervisor
export async function POST(req: NextRequest, ctx: RouteContext<"/api/mvf/[id]/sign">) {
  const { id } = await ctx.params
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)
  const db = caller.db

  const summary = await loadSummary(db, id)
  if (!summary) return fail("Form not found", 404)
  const as = caller.id === summary.trainee_id ? "trainee" : caller.id === summary.supervisor_id ? "supervisor" : null
  if (!as) return fail("Only the candidate and the responsible supervisor can sign this form.", 403)
  if (!summary.pdf_path) return fail("Regenerate this form after the hours are re-approved, then sign.", 409)

  const { signature } = await req.json().catch(() => ({}))
  const clean = await normalizeSignature(signature)
  if (!clean) return fail("Please draw or type your signature.")

  const now = new Date().toISOString()
  const update = as === "trainee"
    ? { trainee_signature: clean, trainee_signed_at: now }
    : { supervisor_signature: clean, supervisor_signed_at: now }
  const bothSigned = as === "trainee" ? !!summary.supervisor_signed_at : !!summary.trainee_signed_at

  const { data, error } = await db.from("monthly_summaries")
    .update({ ...update, status: bothSigned ? "signed" : "pending" })
    .eq("id", id).select("*").single()
  if (error) return fail(error.message, 500)

  let stored
  try {
    stored = await renderAndStore(db, data)
  } catch (e) {
    return fail(e instanceof MvfError ? e.message : "Could not update the PDF", 500)
  }

  const month = formatMonthLabel(String(summary.month).slice(0, 7))
  await notify(db, [as === "trainee" ? summary.supervisor_id : summary.trainee_id], {
    type: bothSigned ? "mvf_signed" : "mvf_sign_needed",
    title: bothSigned ? "Monthly verification form completed" : "Your signature is needed",
    body: bothSigned
      ? `The ${month} Monthly Fieldwork Verification Form is signed by both parties. Download it from the app for your records.`
      : `${callerName(caller)} signed the ${month} Monthly Fieldwork Verification Form. Please review and sign.`,
    related_id: id,
  })

  return ok({ summary: stored })
}

// DELETE → withdraw your own signature (only while the other party hasn't signed)
export async function DELETE(_req: NextRequest, ctx: RouteContext<"/api/mvf/[id]/sign">) {
  const { id } = await ctx.params
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)
  const db = caller.db

  const summary = await loadSummary(db, id)
  if (!summary) return fail("Form not found", 404)
  if (summary.supervisor_signed_at && summary.trainee_signed_at) {
    return fail("Both parties have signed, so the form is locked. Unlock the month to change it.", 409)
  }
  const update = caller.id === summary.trainee_id
    ? { trainee_signature: null, trainee_signed_at: null }
    : caller.id === summary.supervisor_id
      ? { supervisor_signature: null, supervisor_signed_at: null }
      : null
  if (!update) return fail("Not allowed", 403)

  const { data, error } = await db.from("monthly_summaries").update({ ...update, status: "pending" }).eq("id", id).select("*").single()
  if (error) return fail(error.message, 500)
  try {
    return ok({ summary: await renderAndStore(db, data) })
  } catch (e) {
    return fail(e instanceof MvfError ? e.message : "Could not update the PDF", 500)
  }
}
