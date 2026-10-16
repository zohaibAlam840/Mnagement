// Final Fieldwork Verification Form (FVF): generation from signed monthly forms,
// rendering and storage (server only).

import type { Db } from "./context"
import { MVF_BUCKET } from "./locks"
import { MvfError } from "./mvf"
import { fillBacbTemplate, localDate } from "./pdf"
import { buildFvfHours, FVF_TEMPLATE_FILE, fvfFieldKeys, fvfPdfFieldName, mmYYYY, mvfFormMinutes, type FvfValues } from "@/lib/fvf"
import { monthOf } from "@/lib/period"
import type { MvfFormType } from "@/lib/supabase/types"

export type FinalRow = {
  id: string
  trainee_id: string
  supervisor_id: string
  form_type: MvfFormType
  start_month: string
  end_month: string
  form_fields: Record<string, string>
  months_included: string[]
  status: string
  supervisor_signature: string | null
  supervisor_signed_at: string | null
  pdf_path: string | null
}

const name = (p: { first_name?: string | null; last_name?: string | null } | null | undefined) =>
  p ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : ""

export type FvfCoverage = {
  signedMonths: string[]       // "YYYY-MM" with a monthly form signed by both
  unsignedMonths: string[]     // months with logged hours but no fully signed monthly form
}

export async function fvfCoverage(db: Db, traineeId: string): Promise<FvfCoverage> {
  const [{ data: sums }, { data: acts }] = await Promise.all([
    db.from("monthly_summaries").select("month, supervisor_signed_at, trainee_signed_at").eq("trainee_id", traineeId),
    db.from("activities").select("date").eq("trainee_id", traineeId).neq("status", "draft"),
  ])
  const signed = new Set((sums ?? []).filter(s => s.supervisor_signed_at && s.trainee_signed_at).map(s => String(s.month).slice(0, 7)))
  const logged = new Set((acts ?? []).map(a => monthOf(a.date)))
  return {
    signedMonths: [...signed].sort(),
    unsignedMonths: [...logged].filter(m => !signed.has(m)).sort(),
  }
}

const KEEP_ON_REGENERATE = ["traineeName", "traineeBacbId", "state", "country", "sup1Name", "sup1Id", "sup2Name", "sup2Id", "sup3Name", "sup3Id", "sup4Name", "sup4Id", "respId"]

export async function generateFvf(
  db: Db,
  opts: { traineeId: string; startMonth: string; endMonth: string; formType?: MvfFormType; byId: string },
): Promise<FinalRow> {
  const { traineeId, startMonth, endMonth } = opts
  if (startMonth > endMonth) throw new MvfError("The start month must be before the end month.")

  const { data: existing } = await db.from("final_verifications").select("*").eq("trainee_id", traineeId).maybeSingle()
  if (existing?.supervisor_signed_at) {
    throw new MvfError("The final form is signed. The supervisor must withdraw the signature before it can be regenerated.", 409)
  }

  const { data: sums } = await db.from("monthly_summaries")
    .select("month, supervisor_id, fieldwork_type, form_fields, supervisor_signed_at, trainee_signed_at")
    .eq("trainee_id", traineeId)
    .gte("month", `${startMonth}-01`)
    .lte("month", `${endMonth}-01`)
    .order("month")
  const signed = (sums ?? []).filter(s => s.supervisor_signed_at && s.trainee_signed_at)
  if (signed.length === 0) {
    throw new MvfError("There are no monthly forms signed by both parties in this date range. The final form totals your signed monthly forms.")
  }

  const totals = { supervised: { independent: 0, supervised: 0 }, concentrated: { independent: 0, supervised: 0 } }
  for (const s of signed) {
    const m = mvfFormMinutes(s.form_fields ?? {})
    const bucket = s.fieldwork_type === "concentrated" ? totals.concentrated : totals.supervised
    bucket.independent += m.independent
    bucket.supervised += m.supervised
  }

  // Responsible = current primary supervisor; list everyone who supervised (primary first)
  const { data: rels } = await db.from("supervisor_relationships")
    .select("supervisor_id, is_primary, status").eq("trainee_id", traineeId).in("status", ["active", "ended"])
  const primary = (rels ?? []).find(r => r.is_primary && r.status === "active") ?? (rels ?? []).find(r => r.status === "active")
  if (!primary) throw new MvfError("This candidate has no active supervisor. Link a primary supervisor first.")

  const supIds = [...new Set([
    primary.supervisor_id,
    ...signed.map(s => s.supervisor_id),
    ...(rels ?? []).map(r => r.supervisor_id),
  ])].slice(0, 4)

  const [{ data: profiles }, { data: supProfiles }, { data: trainee }, { data: tp }] = await Promise.all([
    db.from("profiles").select("id, first_name, last_name").in("id", supIds),
    db.from("supervisor_profiles").select("id, bacb_id").in("id", supIds),
    db.from("profiles").select("first_name, last_name").eq("id", traineeId).single(),
    db.from("trainee_profiles").select("bacb_id, fieldwork_state, fieldwork_country").eq("id", traineeId).maybeSingle(),
  ])
  const pName = Object.fromEntries((profiles ?? []).map(p => [p.id, name(p)]))
  const pId = Object.fromEntries((supProfiles ?? []).map(p => [p.id, p.bacb_id ?? ""]))

  // Trainee details as attested on the latest signed monthly form
  const latest = (signed[signed.length - 1].form_fields ?? {}) as Record<string, string>
  const formType = opts.formType ?? (existing?.form_type as MvfFormType | undefined) ?? "organization"

  const computed: FvfValues = {
    traineeName: latest.traineeName || name(trainee),
    traineeBacbId: latest.traineeBacbId || tp?.bacb_id || "",
    startDate: mmYYYY(startMonth),
    endDate: mmYYYY(endMonth),
    state: latest.state || tp?.fieldwork_state || "",
    country: latest.country || tp?.fieldwork_country || "United States",
    sup1Name: "", sup1Id: "", sup2Name: "", sup2Id: "", sup3Name: "", sup3Id: "", sup4Name: "", sup4Id: "",
    ...buildFvfHours(totals),
    respName: pName[primary.supervisor_id] ?? "",
    respId: pId[primary.supervisor_id] ?? "",
  }
  supIds.forEach((id, i) => {
    computed[`sup${i + 1}Name` as keyof FvfValues] = pName[id] ?? ""
    computed[`sup${i + 1}Id` as keyof FvfValues] = pId[id] ?? ""
  })

  const fields: Record<string, string> = { ...computed }
  const sameResponsible = existing?.supervisor_id === primary.supervisor_id
  for (const k of KEEP_ON_REGENERATE) {
    if (k === "respId" && !sameResponsible) continue
    const prev = existing?.form_fields?.[k]
    if (prev) fields[k] = prev
  }

  const payload = {
    trainee_id: traineeId,
    supervisor_id: primary.supervisor_id,
    form_type: formType,
    start_month: `${startMonth}-01`,
    end_month: `${endMonth}-01`,
    form_fields: fields,
    months_included: signed.map(s => String(s.month).slice(0, 7)),
    status: "pending",
    supervisor_signature: null,
    supervisor_signed_at: null,
    generated_by: opts.byId,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = existing
    ? await db.from("final_verifications").update(payload).eq("id", existing.id).select("*").single()
    : await db.from("final_verifications").insert(payload).select("*").single()
  if (error) throw new MvfError(error.message, 500)
  return await renderAndStoreFvf(db, data as FinalRow)
}

export async function renderFvfPdf(row: FinalRow, supervisorTz: string | null | undefined): Promise<Uint8Array> {
  const text: Record<string, string> = {
    SUPERVISOR_SIGNATURE_DATE: localDate(row.supervisor_signed_at, supervisorTz, "us"),
  }
  for (const key of fvfFieldKeys(row.form_type)) text[fvfPdfFieldName(key, row.form_type)] = row.form_fields?.[key] ?? ""
  const signatures = row.supervisor_signature && row.supervisor_signed_at
    ? [{ field: "SUPERVISOR_SIGNATURE", png: row.supervisor_signature }]
    : []
  return fillBacbTemplate(FVF_TEMPLATE_FILE[row.form_type] ?? FVF_TEMPLATE_FILE.organization, text, signatures)
}

export async function renderAndStoreFvf(db: Db, row: FinalRow): Promise<FinalRow> {
  const { data: sup } = await db.from("profiles").select("timezone").eq("id", row.supervisor_id).maybeSingle()
  const bytes = await renderFvfPdf(row, sup?.timezone)
  const filePath = `${row.trainee_id}/final.pdf`
  const { error: upErr } = await db.storage.from(MVF_BUCKET).upload(filePath, bytes, { contentType: "application/pdf", upsert: true })
  if (upErr) throw new MvfError(`Could not store the PDF: ${upErr.message}`, 500)

  const { data, error } = await db.from("final_verifications")
    .update({ pdf_path: filePath, pdf_generated_at: new Date().toISOString() })
    .eq("id", row.id).select("*").single()
  if (error) throw new MvfError(error.message, 500)
  return data as FinalRow
}

export async function loadFinal(db: Db, id: string): Promise<FinalRow | null> {
  const { data } = await db.from("final_verifications").select("*").eq("id", id).maybeSingle()
  return (data as FinalRow) ?? null
}
