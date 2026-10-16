// Approval locks and unlocks.
//
// Lock rules (also enforced by database triggers):
//   - an approved week locks every day in it
//   - a month whose MVF is signed by both parties locks every day in that month
// A week that straddles two months can be unlocked to fix the new month while
// days belonging to an already-signed month stay locked.

import type { Db } from "./context"
import { addDays, monthOf, monthRange, weekEndOf, weeksOverlappingMonth } from "@/lib/period"

export const MVF_BUCKET = "mvf-forms"

export async function signedMonths(db: Db, traineeId: string, months: string[]): Promise<Set<string>> {
  if (months.length === 0) return new Set()
  const { data } = await db
    .from("monthly_summaries")
    .select("month, supervisor_signed_at, trainee_signed_at")
    .eq("trainee_id", traineeId)
    .in("month", months.map(m => `${m}-01`))
  return new Set(
    (data ?? [])
      .filter(s => s.supervisor_signed_at && s.trainee_signed_at)
      .map(s => String(s.month).slice(0, 7)),
  )
}

// Hours in this month may change, so any generated form needs re-signing.
async function invalidateMonthForm(db: Db, traineeId: string, yearMonth: string) {
  const { data: rows } = await db
    .from("monthly_summaries")
    .select("id, pdf_path")
    .eq("trainee_id", traineeId)
    .eq("month", `${yearMonth}-01`)
  for (const row of rows ?? []) {
    if (row.pdf_path) await db.storage.from(MVF_BUCKET).remove([row.pdf_path])
    await db.from("monthly_summaries").update({
      supervisor_signed_at: null,
      trainee_signed_at: null,
      supervisor_signature: null,
      trainee_signature: null,
      pdf_path: null,
      pdf_generated_at: null,
      status: "unlocked",
      unlocked_at: new Date().toISOString(),
    }).eq("id", row.id)
  }

  // A final form built from this month's hours must be regenerated and re-signed
  const { data: finals } = await db
    .from("final_verifications")
    .select("id, pdf_path")
    .eq("trainee_id", traineeId)
    .contains("months_included", [yearMonth])
  for (const f of finals ?? []) {
    if (f.pdf_path) await db.storage.from(MVF_BUCKET).remove([f.pdf_path])
    await db.from("final_verifications").update({
      supervisor_signature: null,
      supervisor_signed_at: null,
      pdf_path: null,
      pdf_generated_at: null,
      status: "unlocked",
    }).eq("id", f.id)
  }
}

export async function unlockWeek(
  db: Db,
  opts: { traineeId: string; weekStart: string; byId: string; note?: string | null },
): Promise<{ keptLockedMonths: string[] }> {
  const { traineeId, weekStart } = opts
  const weekEnd = weekEndOf(weekStart)
  const months = [...new Set([monthOf(weekStart), monthOf(weekEnd)])]
  const signed = await signedMonths(db, traineeId, months)

  for (const m of months) {
    if (signed.has(m)) continue
    const { start, next } = monthRange(m)
    const from = weekStart > start ? weekStart : start
    const to = weekEnd < addDays(next, -1) ? weekEnd : addDays(next, -1)
    const { error } = await db
      .from("activities")
      .update({ status: "submitted" })
      .eq("trainee_id", traineeId)
      .eq("status", "approved")
      .gte("date", from)
      .lte("date", to)
    if (error) throw new Error(error.message)
    await invalidateMonthForm(db, traineeId, m)
  }

  const { error } = await db
    .from("weekly_reviews")
    .update({
      status: "draft",
      reviewed_at: null,
      unlocked_at: new Date().toISOString(),
      unlocked_by: opts.byId,
      unlock_note: opts.note || null,
    })
    .eq("trainee_id", traineeId)
    .eq("week_start_date", weekStart)
  if (error) throw new Error(error.message)

  return { keptLockedMonths: [...signed] }
}

export async function unlockMonth(
  db: Db,
  opts: { traineeId: string; yearMonth: string; byId: string; note?: string | null },
): Promise<{ weeksUnlocked: number }> {
  const { traineeId, yearMonth } = opts

  // Clear both signatures first so this month's days are no longer month-locked
  await invalidateMonthForm(db, traineeId, yearMonth)

  const weeks = weeksOverlappingMonth(yearMonth)
  const { data: reviews } = await db
    .from("weekly_reviews")
    .select("week_start_date, status")
    .eq("trainee_id", traineeId)
    .in("week_start_date", weeks)

  let weeksUnlocked = 0
  for (const r of reviews ?? []) {
    if (r.status !== "approved") continue
    await unlockWeek(db, { traineeId, weekStart: r.week_start_date, byId: opts.byId, note: opts.note })
    weeksUnlocked++
  }

  // Approved activities in this month without an approved week (legacy data)
  const { start, next } = monthRange(yearMonth)
  await db
    .from("activities")
    .update({ status: "submitted" })
    .eq("trainee_id", traineeId)
    .eq("status", "approved")
    .gte("date", start)
    .lt("date", next)

  return { weeksUnlocked }
}
