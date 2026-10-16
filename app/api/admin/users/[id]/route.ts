import type { NextRequest } from "next/server"
import { fail, fullName, getCaller, ok } from "@/lib/server/context"
import { MVF_BUCKET } from "@/lib/server/locks"

// DELETE { confirmEmail } → permanently delete an account and its records.
// A supervisor's approval history on other candidates' weeks/forms is handed to
// that candidate's other active supervisor, so candidates never lose history.
export async function DELETE(req: NextRequest, ctx: RouteContext<"/api/admin/users/[id]">) {
  const { id } = await ctx.params
  const caller = await getCaller()
  if (!caller) return fail("Not signed in", 401)
  if (!caller.isAdmin) return fail("Admin access required", 403)
  if (id === caller.id) return fail("You can't delete your own account here.")
  const db = caller.db

  const { data: target } = await db.from("profiles").select("id, email, role, admin_level, first_name, last_name").eq("id", id).maybeSingle()
  if (!target) return fail("Account not found", 404)
  if (target.admin_level) return fail("Admin and Director accounts can't be deleted from the app.")

  const { confirmEmail } = await req.json().catch(() => ({}))
  if (typeof confirmEmail !== "string" || confirmEmail.trim().toLowerCase() !== target.email.toLowerCase()) {
    return fail("Type the account's email address to confirm.")
  }

  // Re-home approval history this person holds as a supervisor of others
  const [{ data: heldReviews }, { data: heldSummaries }, { data: heldFinals }] = await Promise.all([
    db.from("weekly_reviews").select("id, trainee_id").eq("supervisor_id", id).neq("trainee_id", id),
    db.from("monthly_summaries").select("id, trainee_id").eq("supervisor_id", id).neq("trainee_id", id),
    db.from("final_verifications").select("id, trainee_id").eq("supervisor_id", id).neq("trainee_id", id),
  ])
  const affected = [...new Set([...(heldReviews ?? []), ...(heldSummaries ?? []), ...(heldFinals ?? [])].map(r => r.trainee_id))]
  const replacement: Record<string, string> = {}
  const blocked: string[] = []
  for (const t of affected) {
    const { data: rels } = await db.from("supervisor_relationships").select("supervisor_id, is_primary")
      .eq("trainee_id", t).eq("status", "active").neq("supervisor_id", id)
    const pick = (rels ?? []).find(r => r.is_primary) ?? (rels ?? [])[0]
    if (pick) replacement[t] = pick.supervisor_id
    else blocked.push(t)
  }
  if (blocked.length > 0) {
    const { data: names } = await db.from("profiles").select("first_name, last_name").in("id", blocked)
    return fail(`Assign another supervisor to ${(names ?? []).map(fullName).join(", ")} first — their approval history is attached to this supervisor.`, 409)
  }
  for (const r of heldReviews ?? []) await db.from("weekly_reviews").update({ supervisor_id: replacement[r.trainee_id] }).eq("id", r.id)
  for (const s of heldSummaries ?? []) await db.from("monthly_summaries").update({ supervisor_id: replacement[s.trainee_id] }).eq("id", s.id)
  // A final form must be re-signed by its new responsible supervisor
  for (const f of heldFinals ?? []) {
    await db.from("final_verifications").update({ supervisor_id: replacement[f.trainee_id], supervisor_signature: null, supervisor_signed_at: null, pdf_path: null, status: "unlocked" }).eq("id", f.id)
  }

  // Promote a new primary supervisor for anyone who had this person as primary
  const { data: primaryOf } = await db.from("supervisor_relationships").select("trainee_id")
    .eq("supervisor_id", id).eq("is_primary", true).eq("status", "active")

  // The account's own records
  const { data: files } = await db.storage.from(MVF_BUCKET).list(id)
  if ((files ?? []).length > 0) await db.storage.from(MVF_BUCKET).remove(files!.map(f => `${id}/${f.name}`))

  const steps: [string, PromiseLike<{ error: { message: string } | null }>][] = [
    ["activities (supervisor link)", db.from("activities").update({ supervisor_id: null }).eq("supervisor_id", id)],
    ["supervision sessions", db.from("supervision_sessions").delete().or(`supervisor_id.eq.${id},trainee_id.eq.${id}`)],
    ["notifications", db.from("notifications").delete().eq("user_id", id)],
    ["unlock requests", db.from("unlock_requests").delete().eq("trainee_id", id)],
    ["activities", db.from("activities").delete().eq("trainee_id", id)],
    ["templates", db.from("activity_templates").delete().eq("trainee_id", id)],
    ["weekly reviews", db.from("weekly_reviews").delete().eq("trainee_id", id)],
    ["monthly forms", db.from("monthly_summaries").delete().eq("trainee_id", id)],
    ["final form", db.from("final_verifications").delete().eq("trainee_id", id)],
    ["supervision links", db.from("supervisor_relationships").delete().or(`supervisor_id.eq.${id},trainee_id.eq.${id}`)],
    ["candidate profile", db.from("trainee_profiles").delete().eq("id", id)],
    ["supervisor profile", db.from("supervisor_profiles").delete().eq("id", id)],
    ["profile", db.from("profiles").delete().eq("id", id)],
  ]
  for (const [label, step] of steps) {
    const { error } = await step
    if (error) return fail(`Could not delete ${label}: ${error.message}`, 500)
  }

  for (const r of primaryOf ?? []) {
    const { data: rels } = await db.from("supervisor_relationships").select("id")
      .eq("trainee_id", r.trainee_id).eq("status", "active").order("created_at").limit(1)
    if (rels?.[0]) await db.from("supervisor_relationships").update({ is_primary: true }).eq("id", rels[0].id)
  }

  const { error: authErr } = await db.auth.admin.deleteUser(id)
  if (authErr) return fail(`Records deleted, but the login could not be removed: ${authErr.message}`, 500)

  return ok()
}
