"use client"

import { useCallback, useEffect, useState } from "react"
import {
  FileSignature, CheckCircle2, Clock, AlertTriangle, Download, Eye, Loader2, Pencil, RefreshCw, Lock, Save, X, FileText,
} from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { MVF_FIELD_GROUPS, MVF_FORM_LABEL, type MvfValues } from "@/lib/mvf"
import { formatMonthLabel } from "@/lib/period"
import type { Database, MvfFormType } from "@/lib/supabase/types"
import { SignaturePad } from "./SignaturePad"
import { RequestUnlock, UnlockAction, type UnlockRequestRow } from "@/components/unlock/UnlockControls"

type Summary = Database["public"]["Tables"]["monthly_summaries"]["Row"]
type Readiness = { approved: number; submitted: number; rejected: number; draft: number; ready: boolean; message: string }
type MvfState = {
  summary: Summary | null
  supervisorName: string
  readiness: Readiness
  access: "self" | "supervisor" | "admin"
  signAs: "trainee" | "supervisor" | null
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// BACB Monthly Fieldwork Verification Form for one candidate + month.
// Either party can generate (once hours are approved), edit fields, sign in-app and download.
export function MvfPanel({ traineeId, month, onChange }: { traineeId: string; month: string; onChange?: () => void }) {
  const [state, setState] = useState<MvfState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [formType, setFormType] = useState<MvfFormType>("organization")
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Partial<MvfValues>>({})
  const [signature, setSignature] = useState<string | null>(null)
  const [monthRequest, setMonthRequest] = useState<UnlockRequestRow | null>(null)

  const load = useCallback(async () => {
    setError("")
    try {
      const data = await api<MvfState>(`/api/mvf?traineeId=${traineeId}&month=${month}`)
      setState(data)
      if (data.summary) setFormType(data.summary.form_type ?? "organization")
      if (data.access === "self") {
        const r = await api<{ requests: UnlockRequestRow[] }>(`/api/unlock-requests?traineeId=${traineeId}`)
        setMonthRequest(r.requests.find(x => x.scope === "month" && x.period_start === `${month}-01`) ?? null)
      }
    } catch (e) {
      setError((e as Error).message)
    }
    setLoading(false)
  }, [traineeId, month])

  useEffect(() => {
    setLoading(true)
    setEditing(false)
    load()
  }, [load])

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key)
    setError("")
    try {
      await fn()
      await load()
      onChange?.()
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(null)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-8 flex justify-center">
        <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }
  if (!state) {
    return <div className="bg-white rounded-xl border border-red-100 p-5 text-sm text-red-600">{error || "Could not load the form."}</div>
  }

  const { summary, readiness, access, signAs } = state
  const generated = !!summary?.pdf_path
  const bothSigned = !!(summary?.supervisor_signed_at && summary?.trainee_signed_at)
  const wasUnlocked = !!summary && !generated
  const canManage = access === "supervisor" || access === "admin"
  const fields = (summary?.form_fields ?? {}) as Partial<MvfValues>
  const myName = signAs === "trainee" ? fields.traineeName ?? "" : fields.supervisorName || state.supervisorName

  const generate = () => run("generate", () => api("/api/mvf", { body: { traineeId, month, formType } }))
  const saveFields = () => run("save", async () => {
    await api(`/api/mvf/${summary!.id}`, { method: "PATCH", body: { fields: draft, formType } })
    setEditing(false)
  })
  const sign = () => run("sign", async () => {
    await api(`/api/mvf/${summary!.id}/sign`, { body: { signature } })
    setSignature(null)
  })
  const withdraw = () => run("withdraw", () => api(`/api/mvf/${summary!.id}/sign`, { method: "DELETE" }))

  const status = !summary
    ? { label: "Not generated", cls: "bg-zinc-50 text-zinc-600 border-zinc-200", icon: FileText }
    : bothSigned
      ? { label: "Signed · locked", cls: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: Lock }
      : wasUnlocked
        ? { label: "Unlocked · regenerate", cls: "bg-amber-50 text-amber-700 border-amber-100", icon: AlertTriangle }
        : { label: "Awaiting signatures", cls: "bg-violet-50 text-violet-700 border-violet-100", icon: Clock }

  const signers = [
    { role: "supervisor" as const, title: "Supervisor signature", name: fields.supervisorName || state.supervisorName, at: summary?.supervisor_signed_at, img: summary?.supervisor_signature },
    { role: "trainee" as const, title: "Trainee signature", name: fields.traineeName, at: summary?.trainee_signed_at, img: summary?.trainee_signature },
  ]

  return (
    <div className="bg-white rounded-xl border border-[#E8E6F4] overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4 border-b border-zinc-100">
        <div className="flex items-start gap-3">
          <FileSignature className="w-5 h-5 text-violet-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-zinc-900">Monthly Fieldwork Verification Form</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {formatMonthLabel(month)} · BACB 2027 · {MVF_FORM_LABEL[summary?.form_type ?? formType]}
            </p>
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

        {/* Generate / regenerate */}
        {!bothSigned && (
          <div className="space-y-3">
            {wasUnlocked && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                This month was unlocked{summary?.unlocked_at ? ` on ${fmtDate(summary.unlocked_at)}` : ""}, so the previous form and its signatures were cleared.
                Once the hours are re-approved, regenerate the form — it replaces the old one.
              </p>
            )}
            {!readiness.ready && (
              <p className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2">{readiness.message}</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as MvfFormType)}
                className="text-xs font-semibold border border-zinc-200 rounded-lg px-2.5 py-2 bg-white text-zinc-700 focus:outline-none"
              >
                <option value="organization">MVF · Multiple supervisors (organization)</option>
                <option value="individual">MVF · Individual supervisor</option>
              </select>
              <button
                onClick={generate}
                disabled={!readiness.ready || busy !== null}
                className="flex items-center gap-2 bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-violet-700 disabled:opacity-50"
              >
                {busy === "generate" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {generated ? "Regenerate from approved hours" : "Generate form"}
              </button>
            </div>
            {generated && (summary?.supervisor_signed_at || summary?.trainee_signed_at) && (
              <p className="text-[11px] text-zinc-400">Regenerating or editing clears existing signatures.</p>
            )}
          </div>
        )}

        {/* Form values */}
        {generated && summary && (
          <div className="space-y-4">
            {MVF_FIELD_GROUPS.map(group => (
              <div key={group.title}>
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2">{group.title}</p>
                <div className={cn("grid gap-2", group.fields.length > 5 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2")}>
                  {group.fields.map(f => (
                    <label key={f.key} className="block">
                      <span className="text-[11px] text-zinc-500">{f.label}</span>
                      {editing ? (
                        <input
                          value={draft[f.key] ?? fields[f.key] ?? ""}
                          inputMode={f.numeric ? "decimal" : undefined}
                          onChange={(e) => setDraft(d => ({ ...d, [f.key]: e.target.value }))}
                          className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
                        />
                      ) : (
                        <p className={cn("text-sm font-semibold px-2.5 py-1.5 rounded-lg bg-zinc-50", fields[f.key] ? "text-zinc-900" : "text-red-500")}>
                          {fields[f.key] || "Missing"}
                        </p>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            {!bothSigned && (
              <div className="flex flex-wrap gap-2">
                {editing ? (
                  <>
                    <button onClick={() => { setEditing(false); setDraft({}) }} className="flex items-center gap-1.5 text-xs font-semibold border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-50">
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                    <button onClick={saveFields} disabled={busy !== null} className="flex items-center gap-1.5 text-xs font-semibold bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 disabled:opacity-60">
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
            {Object.values(fields).some(v => v === "") && !editing && (
              <p className="text-[11px] text-red-500">
                Forms with missing information are denied by the BACB. Fill in the missing fields (BACB IDs and state can also be saved in Settings).
              </p>
            )}
          </div>
        )}

        {/* Signatures */}
        {generated && summary && (
          <div className="space-y-3">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">Responsible supervisor and trainee attestation</p>
            {signers.map(s => {
              const mine = signAs === s.role
              return (
                <div key={s.role} className={cn("rounded-xl border p-3.5", s.at ? "bg-emerald-50/50 border-emerald-100" : "border-zinc-200")}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-zinc-500">{s.title}</p>
                      <p className="text-sm font-semibold text-zinc-900 truncate">{s.name || "—"}</p>
                    </div>
                    {s.at ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="w-4 h-4" /> {fmtDate(s.at)}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-zinc-400"><Clock className="w-4 h-4" /> Not signed</span>
                    )}
                  </div>
                  {s.img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.img} alt={`${s.title}`} className="h-10 mt-2 object-contain" />
                  )}
                  {mine && !s.at && (
                    <div className="mt-3 space-y-2">
                      <SignaturePad key={myName} defaultName={myName} onChange={setSignature} />
                      <p className="text-[11px] text-zinc-500">
                        By signing, you attest that the information in this form is true and correct and that the fieldwork complied with BACB requirements.
                      </p>
                      <button
                        onClick={sign}
                        disabled={!signature || busy !== null}
                        className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-violet-700 disabled:opacity-50"
                      >
                        {busy === "sign" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSignature className="w-4 h-4" />}
                        Sign form
                      </button>
                    </div>
                  )}
                  {mine && s.at && !bothSigned && (
                    <button onClick={withdraw} disabled={busy !== null} className="mt-2 text-xs text-zinc-500 hover:text-red-600">
                      {busy === "withdraw" ? "Withdrawing…" : "Withdraw my signature"}
                    </button>
                  )}
                </div>
              )
            })}
            {!signAs && !bothSigned && (
              <p className="text-[11px] text-zinc-400">Only the candidate and their primary (responsible) supervisor sign this form.</p>
            )}
          </div>
        )}

        {/* Download + lock */}
        {generated && summary && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              href={`/api/mvf/${summary.id}/pdf?inline=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold border border-zinc-200 px-3 py-2 rounded-lg hover:bg-zinc-50"
            >
              <Eye className="w-3.5 h-3.5" /> View PDF
            </a>
            <a
              href={`/api/mvf/${summary.id}/pdf`}
              className="flex items-center gap-1.5 text-xs font-semibold bg-zinc-900 text-white px-3 py-2 rounded-lg hover:bg-zinc-800"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </a>
            {summary.pdf_generated_at && (
              <span className="text-[11px] text-zinc-400">Updated {fmtDate(summary.pdf_generated_at)}</span>
            )}
          </div>
        )}

        {bothSigned && (
          <div className="pt-1 space-y-2">
            <p className="text-xs text-zinc-500">
              Both parties signed this form, so this month&apos;s hours are locked. Both of you can download it from here at any time. The BACB requires each of you to keep a copy for 7 years.
            </p>
            {canManage && <UnlockAction traineeId={traineeId} scope="month" period={month} onDone={() => { load(); onChange?.() }} />}
            {access === "self" && <RequestUnlock scope="month" period={month} pending={monthRequest} onChange={load} />}
          </div>
        )}
        {!bothSigned && canManage && summary && (
          <UnlockAction traineeId={traineeId} scope="month" period={month} label="Unlock month for edits" onDone={() => { load(); onChange?.() }} />
        )}
        {!bothSigned && access === "self" && readiness.approved > 0 && (
          <RequestUnlock scope="month" period={month} pending={monthRequest} onChange={load} />
        )}
      </div>
    </div>
  )
}
