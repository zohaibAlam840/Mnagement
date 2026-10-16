// MVF generation, PDF rendering and storage (server only).

import { fillBacbTemplate, localDate, type PdfSignature } from "./pdf"
import type { Db } from "./context"
import { MVF_BUCKET } from "./locks"
import { computeMetrics, type FieldworkType, type RequirementsYear, minSupervisionPct, monthlyCapHours, requiredObservation } from "@/lib/bacb"
import { buildMvfValues, computeMvfMinutes, MVF_FIELD_KEYS, MVF_TEMPLATE_FILE, pdfFieldName, type MvfValues } from "@/lib/mvf"
import { formatMonthLabel, monthRange } from "@/lib/period"
import type { MvfFormType } from "@/lib/supabase/types"

export class MvfError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

function fullName(p: { first_name?: string | null; last_name?: string | null } | null | undefined): string {
  return p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : ""
}

type SummaryRow = {
  id: string
  trainee_id: string
  supervisor_id: string
  month: string
  form_type: MvfFormType
  form_fields: Record<string, string>
  supervisor_signature: string | null
  trainee_signature: string | null
  supervisor_signed_at: string | null
  trainee_signed_at: string | null
  pdf_path: string | null
}

export type MonthReadiness = {
  approved: number
  submitted: number
  rejected: number
  draft: number
  ready: boolean
  message: string
}

export async function monthReadiness(db: Db, traineeId: string, yearMonth: string): Promise<MonthReadiness> {
  const { start, next } = monthRange(yearMonth)
  const { data } = await db
    .from("activities")
    .select("status")
    .eq("trainee_id", traineeId)
    .gte("date", start)
    .lt("date", next)
  const count = (s: string) => (data ?? []).filter(a => a.status === s).length
  const approved = count("approved")
  const submitted = count("submitted")
  const rejected = count("rejected")
  const draft = count("draft")

  let message = ""
  if (approved === 0 && submitted + rejected + draft === 0) message = "No hours are logged for this month."
  else if (submitted + rejected + draft > 0) {
    const parts = [
      submitted && `${submitted} awaiting approval`,
      rejected && `${rejected} returned for edits`,
      draft && `${draft} not yet submitted`,
    ].filter(Boolean)
    message = `All hours in the month must be approved first (${parts.join(", ")}).`
  }
  return { approved, submitted, rejected, draft, ready: message === "", message }
}

const KEEP_ON_REGENERATE = ["traineeName", "traineeBacbId", "state", "country", "supervisorName", "supervisorBacbId"] as const

export async function generateMvf(
  db: Db,
  opts: { traineeId: string; yearMonth: string; byId: string; formType?: MvfFormType },
): Promise<SummaryRow> {
  const { traineeId, yearMonth } = opts
  const monthStart = `${yearMonth}-01`

  const readiness = await monthReadiness(db, traineeId, yearMonth)
  if (!readiness.ready) throw new MvfError(readiness.message)

  const { data: existingRows } = await db
    .from("monthly_summaries")
    .select("*")
    .eq("trainee_id", traineeId)
    .eq("month", monthStart)
    .order("updated_at", { ascending: false })
  const existing = (existingRows ?? [])[0] as SummaryRow | undefined
  if (existing?.supervisor_signed_at && existing?.trainee_signed_at) {
    throw new MvfError("This month's form is signed by both parties and locked. Unlock the month to make changes.", 409)
  }

  // Responsible supervisor = primary supervisor
  const { data: rels } = await db
    .from("supervisor_relationships")
    .select("supervisor_id, is_primary")
    .eq("trainee_id", traineeId)
    .eq("status", "active")
  const primary = (rels ?? []).find(r => r.is_primary) ?? (rels ?? [])[0]
  if (!primary) throw new MvfError("This candidate has no active supervisor. Link a primary supervisor first.")

  const { start, next } = monthRange(yearMonth)
  const [{ data: acts }, { data: trainee }, { data: tp }, { data: sup }, { data: sp }] = await Promise.all([
    db.from("activities")
      .select("duration_minutes, category, session_type, observation_with_client, observation_duration_minutes")
      .eq("trainee_id", traineeId).eq("status", "approved").gte("date", start).lt("date", next),
    db.from("profiles").select("first_name, last_name").eq("id", traineeId).single(),
    db.from("trainee_profiles").select("*").eq("id", traineeId).maybeSingle(),
    db.from("profiles").select("first_name, last_name").eq("id", primary.supervisor_id).single(),
    db.from("supervisor_profiles").select("bacb_id").eq("id", primary.supervisor_id).maybeSingle(),
  ])

  const activities = acts ?? []
  const minutes = computeMvfMinutes(activities)
  const computed = buildMvfValues({
    minutes,
    traineeName: fullName(trainee),
    traineeBacbId: tp?.bacb_id ?? "",
    monthLabel: formatMonthLabel(yearMonth),
    state: tp?.fieldwork_state ?? "",
    country: tp?.fieldwork_country ?? "United States",
    supervisorName: fullName(sup),
    supervisorBacbId: sp?.bacb_id ?? "",
  })

  // Hours are always recalculated; typed-in details (state, IDs…) carry over.
  const fields: Record<string, string> = { ...computed }
  const sameSupervisor = existing?.supervisor_id === primary.supervisor_id
  for (const k of KEEP_ON_REGENERATE) {
    if (!sameSupervisor && (k === "supervisorName" || k === "supervisorBacbId")) continue
    const prev = existing?.form_fields?.[k]
    if (prev) fields[k] = prev
  }

  const ft = (tp?.fieldwork_type ?? "supervised") as FieldworkType
  const ry = (tp?.requirements_year ?? "2027") as RequirementsYear
  const m = computeMetrics(activities)
  const obsReq = requiredObservation(ft, ry)

  const payload = {
    trainee_id: traineeId,
    supervisor_id: primary.supervisor_id,
    month: monthStart,
    fieldwork_type: ft,
    requirements_year: ry,
    total_hours: minutes.total / 60,
    restricted_hours: m.restrictedH,
    unrestricted_hours: m.unrestrictedH,
    supervision_hours_individual: m.individualSupH,
    supervision_hours_group: m.groupSupH,
    observations_count: m.obsCount,
    observations_duration_minutes: m.obsMinutes,
    within_monthly_cap: minutes.total / 60 <= monthlyCapHours(ry),
    supervision_pct_met: m.supervisionPct >= minSupervisionPct(ft, ry) && m.groupSupPct <= 50,
    observation_requirement_met: obsReq.kind === "count" ? m.obsCount >= obsReq.value : m.obsMinutes >= obsReq.value,
    status: "pending",
    form_type: opts.formType ?? existing?.form_type ?? "organization",
    form_fields: fields,
    supervisor_signed_at: null,
    trainee_signed_at: null,
    supervisor_signature: null,
    trainee_signature: null,
    generated_by: opts.byId,
    unlocked_at: null,
  }

  let row: SummaryRow
  if (existing) {
    const { data, error } = await db.from("monthly_summaries").update(payload).eq("id", existing.id).select("*").single()
    if (error) throw new MvfError(error.message, 500)
    row = data as SummaryRow
    // One form per candidate per month — drop older duplicates
    const dupIds = (existingRows ?? []).slice(1).map(r => r.id)
    if (dupIds.length > 0) await db.from("monthly_summaries").delete().in("id", dupIds)
  } else {
    const { data, error } = await db.from("monthly_summaries").insert(payload).select("*").single()
    if (error) throw new MvfError(error.message, 500)
    row = data as SummaryRow
  }

  return await renderAndStore(db, row)
}

export async function renderMvfPdf(row: SummaryRow, timezones: { supervisor?: string | null; trainee?: string | null }): Promise<Uint8Array> {
  const values = row.form_fields as Partial<MvfValues>
  const text: Record<string, string> = {
    SUPERVISOR_SIGNATURE_DATE: localDate(row.supervisor_signed_at, timezones.supervisor),
    TRAINEE_SIGNATURE_DATE: localDate(row.trainee_signed_at, timezones.trainee),
  }
  for (const key of MVF_FIELD_KEYS) text[pdfFieldName(key, row.form_type)] = values[key] ?? ""

  const signatures: PdfSignature[] = []
  if (row.supervisor_signature && row.supervisor_signed_at) signatures.push({ field: "SUPERVISOR_SIGNATURE", png: row.supervisor_signature })
  if (row.trainee_signature && row.trainee_signed_at) signatures.push({ field: "TRAINEE_SIGNATURE", png: row.trainee_signature })

  return fillBacbTemplate(MVF_TEMPLATE_FILE[row.form_type] ?? MVF_TEMPLATE_FILE.organization, text, signatures)
}

export function pdfStoragePath(row: { trainee_id: string; month: string }): string {
  return `${row.trainee_id}/${String(row.month).slice(0, 7)}.pdf`
}

export async function renderAndStore(db: Db, row: SummaryRow): Promise<SummaryRow> {
  const { data: tzRows } = await db.from("profiles").select("id, timezone").in("id", [row.supervisor_id, row.trainee_id])
  const tz = Object.fromEntries((tzRows ?? []).map(p => [p.id, p.timezone]))
  const bytes = await renderMvfPdf(row, { supervisor: tz[row.supervisor_id], trainee: tz[row.trainee_id] })

  const filePath = pdfStoragePath(row)
  const { error: upErr } = await db.storage.from(MVF_BUCKET).upload(filePath, bytes, {
    contentType: "application/pdf",
    upsert: true,
  })
  if (upErr) throw new MvfError(`Could not store the PDF: ${upErr.message}`, 500)

  const { data, error } = await db
    .from("monthly_summaries")
    .update({ pdf_path: filePath, pdf_generated_at: new Date().toISOString() })
    .eq("id", row.id)
    .select("*")
    .single()
  if (error) throw new MvfError(error.message, 500)
  return data as SummaryRow
}

export async function loadSummary(db: Db, id: string): Promise<SummaryRow | null> {
  const { data } = await db.from("monthly_summaries").select("*").eq("id", id).maybeSingle()
  return (data as SummaryRow) ?? null
}
