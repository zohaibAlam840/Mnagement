"use client"

import { useState, useEffect, useCallback } from "react"
import { CheckCircle2, FileSignature, Clock, AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"
import { formatMonthLabel, monthOf, toDateStr } from "@/lib/period"
import { MvfPanel } from "@/components/mvf/MvfPanel"
import { FvfPanel } from "@/components/mvf/FvfPanel"
import { ActivityLog } from "@/components/activity/ActivityLog"
import { UnlockRequestsList } from "@/components/unlock/UnlockRequestsList"

type MonthlySummary = Database["public"]["Tables"]["monthly_summaries"]["Row"]
type Profile = Database["public"]["Tables"]["profiles"]["Row"]

function getLast12Months(): { value: string; label: string }[] {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const value = monthOf(toDateStr(new Date(now.getFullYear(), now.getMonth() - i, 1)))
    return { value, label: formatMonthLabel(value) }
  })
}

export default function SignOffPage() {
  const monthOptions = getLast12Months()
  const [supervisees, setSupervisees] = useState<Profile[]>([])
  const [forms, setForms] = useState<MonthlySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [traineeId, setTraineeId] = useState("")
  const [formsVersion, setFormsVersion] = useState(0)
  // Default to last month: forms are signed in the month after the supervisory period
  const [month, setMonth] = useState(monthOptions[1]?.value ?? monthOptions[0].value)

  const loadForms = useCallback(async (ids: string[]) => {
    if (ids.length === 0) { setForms([]); return }
    const supabase = createClient()
    const { data } = await supabase
      .from("monthly_summaries")
      .select("*")
      .in("trainee_id", ids)
      .order("month", { ascending: false })
    setForms((data ?? []) as MonthlySummary[])
  }, [])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: rels } = await supabase
        .from("supervisor_relationships")
        .select("trainee_id")
        .eq("supervisor_id", user.id)
        .eq("status", "active")
      const ids = ((rels ?? []) as { trainee_id: string }[]).map(r => r.trainee_id)

      if (ids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("*").in("id", ids).order("first_name")
        const list = (profiles ?? []) as Profile[]
        setSupervisees(list)
        setTraineeId(list[0]?.id ?? "")
      }
      await loadForms(ids)
      setLoading(false)
    }
    load()
  }, [loadForms])

  // A signed/unlocked monthly form changes what the final form can include
  const refreshForms = () => { loadForms(supervisees.map(s => s.id)); setFormsVersion(v => v + 1) }

  if (loading) {
    return (
      <div className="p-4 md:p-7 max-w-5xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  const nameOf = (id: string) => {
    const p = supervisees.find(s => s.id === id)
    return p ? `${p.first_name} ${p.last_name}` : "Candidate"
  }

  return (
    <div className="p-4 md:p-7 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Monthly Verification Forms</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Generate, sign and store each candidate&apos;s BACB Monthly Fieldwork Verification Form (MVF)</p>
      </div>

      <UnlockRequestsList onChange={refreshForms} />

      {supervisees.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E8E6F4] py-16 text-center">
          <FileSignature className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-700 mb-1">No active supervisees</p>
          <p className="text-xs text-zinc-400">Forms can only be generated for active supervisory relationships.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-5">
          {/* Existing forms */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-[#E8E6F4] p-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Candidate</label>
                <select
                  value={traineeId}
                  onChange={(e) => setTraineeId(e.target.value)}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200"
                >
                  {supervisees.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-500 mb-1">Month</label>
                <select
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200"
                >
                  {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E8E6F4] p-4">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Forms</p>
              {forms.length === 0 ? (
                <p className="text-xs text-zinc-400">No forms generated yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {forms.map(f => {
                    const m = String(f.month).slice(0, 7)
                    const both = f.supervisor_signed_at && f.trainee_signed_at
                    const active = f.trainee_id === traineeId && m === month
                    return (
                      <button
                        key={f.id}
                        onClick={() => { setTraineeId(f.trainee_id); setMonth(m) }}
                        className={cn("w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-all", active ? "bg-violet-50 border border-violet-100" : "hover:bg-zinc-50")}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-semibold truncate", active ? "text-violet-800" : "text-zinc-900")}>{nameOf(f.trainee_id)}</p>
                          <p className="text-[10px] text-zinc-400">{formatMonthLabel(m)}</p>
                        </div>
                        {both
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          : !f.pdf_path
                            ? <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            : <Clock className="w-4 h-4 text-zinc-300 flex-shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-2 space-y-5">
            {traineeId && (
              <>
                <MvfPanel key={`${traineeId}-${month}`} traineeId={traineeId} month={month} onChange={refreshForms} />
                <ActivityLog key={`log-${traineeId}-${month}`} traineeId={traineeId} canUnlock initialMode="month" initialMonth={month} />
                <FvfPanel key={`fvf-${traineeId}-${formsVersion}`} traineeId={traineeId} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
