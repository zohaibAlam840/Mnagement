"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Award, CheckCircle2, Clock, AlertTriangle, Download, Eye, Loader2, Pencil, RefreshCw, Save, X, FileText, Lock,
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { FVF_FIELD_GROUPS, FVF_FORM_LABEL, type FvfValues } from "@/lib/fvf"
import { formatMonthLabel } from "@/lib/period"
import type { Database, MvfFormType } from "@/lib/supabase/types"
import { SignaturePad } from "./SignaturePad"

type Final = Database["public"]["Tables"]["final_verifications"]["Row"]
type FvfState = {
  fvf: Final | null
  coverage: { signedMonths: string[]; unsignedMonths: string[] }
  access: "self" | "supervisor" | "admin"
  supervisorName: string
  canSign: boolean
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

const select = "border border-zinc-200 rounded-lg px-2.5 py-2 text-xs font-semibold bg-white text-zinc-700 focus:outline-none"

// BACB Final Fieldwork Verification Form: totals of the candidate's signed monthly forms.
// Either party (or an admin) can generate/edit it; only the responsible supervisor signs.
export function FvfPanel({ traineeId }: { traineeId: string }) {
  const [state, setState] = useState<FvfState | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [formType, setFormType] = useState<MvfFormType>("organization")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<FvfValues>>({})
  const [signature, setSignature] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError("")
    try {
      const data = await api<FvfState>(`/api/fvf?traineeId=${traineeId}`)
      setState(data)
      const months = data.coverage.signedMonths
      setStart(data.fvf ? data.fvf.start_month.slice(0, 7) : months[0] ?? "")
      setEnd(data.fvf ? data.fvf.end_month.slice(0, 7) : months[months.length - 1] ?? "")
      if (data.fvf) setFormType(data.fvf.form_type)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [traineeId])

  useEffect(() => { load() }, [load])

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key)
    setError("")
    try {
      await fn()
      await load()
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(null)
  }

  if (!state) {
    return (
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-6 flex justify-center">
        {error ? <p className="text-sm text-red-600">{error}</p> : <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />}
      </div>
    )
  }

  const { fvf, coverage, canSign } = state
  const generated = !!fvf?.pdf_path
  const signed = !!fvf?.supervisor_signed_at
  const fields = (fvf?.form_fields ?? {}) as Partial<FvfValues>
  const type = fvf?.form_type ?? formType
  const allMonths = [...new Set([...coverage.signedMonths, ...coverage.unsignedMonths])].sort()
  const missingInRange = coverage.unsignedMonths.filter(m => start && end && m >= start && m <= end)

  const status = !fvf
    ? { label: "Not generated", cls: "bg-zinc-50 text-zinc-600 border-zinc-200", icon: FileText }
    : signed
      ? { label: "Signed", cls: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: Lock }
      : !generated
        ? { label: "Needs regenerating", cls: "bg-amber-50 text-amber-700 border-amber-100", icon: AlertTriangle }
        : { label: "Awaiting supervisor signature", cls: "bg-violet-50 text-violet-700 border-violet-100", icon: Clock }

  return (
    <div className="bg-white rounded-xl border border-[#E8E6F4] overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-zinc-100">
        <div className="flex items-start gap-3">
          <Award className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-zinc-900">Final Fieldwork Verification Form</p>
            <p className="text-xs text-zinc-500 mt-0.5">BACB 2027 · {FVF_FORM_LABEL[type]} · totals your signed monthly forms</p>
          </div>
        </div>
        <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border", status.cls)}>
          <status.icon className="w-3.5 h-3.5" /> {status.label}
        </span>
      </div>

      <div className="p-5 space-y-5">
        {error && (
          <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {error}
          </div>
        )}

        {coverage.signedMonths.length === 0 ? (
          <p className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">
            The final form is built from monthly verification forms signed by both parties. None are signed yet.
          </p>
        ) : !signed && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="block text-[11px] text-zinc-500 mb-1">Start month</span>
                <select value={start} onChange={(e) => setStart(e.target.value)} className={select}>
                  {allMonths.map(m => <option key={m} value={m}>{formatMonthLabel(m)}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-[11px] text-zinc-500 mb-1">End month</span>
                <select value={end} onChange={(e) => setEnd(e.target.value)} className={select}>
                  {allMonths.map(m => <option key={m} value={m}>{formatMonthLabel(m)}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="block text-[11px] text-zinc-500 mb-1">Form</span>
                <select value={formType} onChange={(e) => setFormType(e.target.value as MvfFormType)} className={select}>
                  <option value="organization">Multiple supervisors (organization)</option>
                  <option value="individual">Individual supervisor</option>
                </select>
              </label>
              <button
                onClick={() => run("generate", () => api("/api/fvf", { body: { traineeId, startMonth: start, endMonth: end, formType } }))}
                disabled={busy !== null || !start || !end}
                className="flex items-center gap-2 bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-violet-700 disabled:opacity-50"
              >
                {busy === "generate" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {generated ? "Regenerate" : "Generate final form"}
              </button>
            </div>
            {missingInRange.length > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Not included — these months have logged hours but no monthly form signed by both parties: {missingInRange.map(formatMonthLabel).join(", ")}.
              </p>
            )}
          </div>
        )}

        {fvf && fvf.months_included?.length > 0 && (
          <p className="text-[11px] text-zinc-500">
            Includes {fvf.months_included.length} signed monthly form{fvf.months_included.length === 1 ? "" : "s"}: {fvf.months_included.map(formatMonthLabel).join(", ")}
          </p>
        )}

        {generated && fvf && (
          <div className="space-y-4">
            {FVF_FIELD_GROUPS.map(group => {
              const groupFields = group.fields.filter(f => type === "organization" || !f.orgOnly)
              if (groupFields.length === 0) return null
              return (
                <div key={group.title}>
                  <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2">{group.title}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {groupFields.map(f => (
                      <label key={f.key} className={cn("block", group.fields.length <= 6 && !f.key.match(/H$|M$|Pct$/) && "col-span-2")}>
                        <span className="text-[11px] text-zinc-500">{f.label}</span>
                        {editing ? (
                          <input
                            value={draft[f.key] ?? fields[f.key] ?? ""}
                            onChange={(e) => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                            className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                          />
                        ) : (
                          <p className={cn("text-sm font-semibold px-2.5 py-1.5 rounded-lg bg-zinc-50 truncate", fields[f.key] ? "text-zinc-900" : "text-zinc-300")}>
                            {fields[f.key] || "—"}
                          </p>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
            {!signed && (
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <button onClick={() => { setEditing(false); setDraft({}) }} className="flex items-center gap-1.5 text-xs font-semibold border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-50">
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                    <button
                      onClick={() => run("save", async () => { await api(`/api/fvf/${fvf.id}`, { method: "PATCH", body: { fields: draft } }); setEditing(false) })}
                      disabled={busy !== null}
                      className="flex items-center gap-1.5 text-xs font-semibold bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 disabled:opacity-60"
                    >
                      {busy === "save" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save changes
                    </button>
                  </>
                ) : (
                  <button onClick={() => { setDraft({}); setEditing(true) }} className="flex items-center gap-1.5 text-xs font-semibold border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-50">
                    <Pencil className="w-3.5 h-3.5" /> Edit form fields
                  </button>
                )}
              </div>
            )}

            {/* Responsible supervisor signature */}
            <div className={cn("rounded-xl border p-3.5", signed ? "bg-emerald-50/50 border-emerald-100" : "border-zinc-200")}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-500">Responsible supervisor signature</p>
                  <p className="text-sm font-semibold text-zinc-900 truncate">{fields.respName || state.supervisorName}</p>
                </div>
                {signed
                  ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="w-4 h-4" /> {fmtDate(fvf.supervisor_signed_at!)}</span>
                  : <span className="flex items-center gap-1 text-xs text-zinc-400"><Clock className="w-4 h-4" /> Not signed</span>}
              </div>
              {fvf.supervisor_signature && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={fvf.supervisor_signature} alt="Supervisor signature" className="h-10 mt-2 object-contain" />
              )}
              {canSign && !signed && (
                <div className="mt-3 space-y-2">
                  <SignaturePad key={fields.respName} defaultName={fields.respName || state.supervisorName} onChange={setSignature} />
                  <p className="text-[11px] text-zinc-500">
                    By signing, you attest that this form and the corresponding monthly forms are true and correct, that the fieldwork met BACB requirements, and that you are the responsible supervisor in the signed supervision contract.
                  </p>
                  <button
                    onClick={() => run("sign", async () => { await api(`/api/fvf/${fvf.id}/sign`, { body: { signature } }); setSignature(null) })}
                    disabled={!signature || busy !== null}
                    className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-violet-700 disabled:opacity-50"
                  >
                    {busy === "sign" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />} Sign final form
                  </button>
                </div>
              )}
              {canSign && signed && (
                <button onClick={() => run("withdraw", () => api(`/api/fvf/${fvf.id}/sign`, { method: "DELETE" }))} disabled={busy !== null} className="mt-2 text-xs text-zinc-500 hover:text-red-600">
                  {busy === "withdraw" ? "Withdrawing…" : "Withdraw signature to make changes"}
                </button>
              )}
              {!canSign && !signed && (
                <p className="text-[11px] text-zinc-400 mt-2">Only the responsible (primary) supervisor signs the final form.</p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <a href={`/api/fvf/${fvf.id}/pdf?inline=1`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs font-semibold border border-zinc-200 px-3 py-2 rounded-lg hover:bg-zinc-50">
                <Eye className="w-3.5 h-3.5" /> View PDF
              </a>
              <a href={`/api/fvf/${fvf.id}/pdf`} className="flex items-center gap-1.5 text-xs font-semibold bg-zinc-900 text-white px-3 py-2 rounded-lg hover:bg-zinc-800">
                <Download className="w-3.5 h-3.5" /> Download PDF
              </a>
              {fvf.pdf_generated_at && <span className="text-[11px] text-zinc-400">Updated {fmtDate(fvf.pdf_generated_at)}</span>}
            </div>
          </div>
        )}
        {fvf && !generated && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            A month included in this form was unlocked, so its signature was cleared. Regenerate it once the monthly forms are signed again.
          </p>
        )}
      </div>
    </div>
  )
}
