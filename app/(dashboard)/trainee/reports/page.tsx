"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Download, ChevronRight, CheckCircle2, AlertTriangle, Clock, FileText } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"

type MonthlySummary = Database["public"]["Tables"]["monthly_summaries"]["Row"]

function formatMonth(m: string) {
  const [year, month] = m.split("-")
  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function getComplianceStatus(s: MonthlySummary): "compliant" | "warning" | "critical" {
  // Supervision is evaluated MONTHLY: under 5% is critical. Restricted % is NOT
  // a monthly failure — it's tracked over the entire experience.
  const supervisionH = s.supervision_hours_individual + s.supervision_hours_group
  const supervisionPct = s.total_hours > 0 ? (supervisionH / s.total_hours) * 100 : 0
  if (s.total_hours > 0 && supervisionPct < 5) return "critical"
  if (s.supervision_pct_met === false || s.within_monthly_cap === false || s.observation_requirement_met === false) return "warning"
  return "compliant"
}

function StatusBadge({ status }: { status: "compliant" | "warning" | "critical" }) {
  if (status === "compliant") return (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="w-3 h-3" /> Compliant
    </span>
  )
  if (status === "warning") return (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
      <AlertTriangle className="w-3 h-3" /> Warning
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
      <AlertTriangle className="w-3 h-3" /> Violation
    </span>
  )
}

type LiveMonth = {
  totalH: number; restrictedH: number; unrestrictedH: number; supervisionH: number
  restrictedPct: number; supervisionPct: number; actCount: number
}

export default function ReportsPage() {
  const [summaries, setSummaries] = useState<MonthlySummary[]>([])
  const [targetHours, setTargetHours] = useState(1500)
  const [loading, setLoading] = useState(true)
  const [liveMonth, setLiveMonth] = useState<LiveMonth | null>(null)
  const [currentMonthLabel, setCurrentMonthLabel] = useState("")

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const now = new Date()
      const y = now.getFullYear()
      const m = now.getMonth() + 1
      const monthStart = `${y}-${String(m).padStart(2, "0")}-01`
      const nextD = new Date(y, m, 1)
      const monthEnd = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, "0")}-01`
      setCurrentMonthLabel(now.toLocaleDateString("en-US", { month: "long", year: "numeric" }))

      const [sumsRes, tpRes, actsRes] = await Promise.all([
        supabase.from("monthly_summaries").select("*").eq("trainee_id", user.id).order("month", { ascending: false }),
        supabase.from("trainee_profiles").select("target_hours").eq("id", user.id).single(),
        supabase.from("activities").select("duration_minutes, category").eq("trainee_id", user.id).gte("date", monthStart).lt("date", monthEnd),
      ])
      setSummaries((sumsRes.data ?? []) as MonthlySummary[])
      const tp = tpRes.data as { target_hours: number } | null
      if (tp?.target_hours) setTargetHours(tp.target_hours)

      const acts = (actsRes.data ?? []) as { duration_minutes: number; category: string }[]
      if (acts.length > 0) {
        const totalH = acts.reduce((s, a) => s + a.duration_minutes, 0) / 60
        const restrictedH = acts.filter(a => a.category === "Restricted").reduce((s, a) => s + a.duration_minutes, 0) / 60
        const unrestrictedH = acts.filter(a => a.category === "Unrestricted").reduce((s, a) => s + a.duration_minutes, 0) / 60
        const supervisionH = acts.filter(a => a.category === "Supervision").reduce((s, a) => s + a.duration_minutes, 0) / 60
        setLiveMonth({
          totalH, restrictedH, unrestrictedH, supervisionH,
          restrictedPct: totalH > 0 ? (restrictedH / totalH) * 100 : 0,
          supervisionPct: totalH > 0 ? (supervisionH / totalH) * 100 : 0,
          actCount: acts.length,
        })
      }
      setLoading(false)
    }
    load()
  }, [])

  const totalHours = summaries.reduce((s, r) => s + r.total_hours, 0)

  if (loading) {
    return (
      <div className="p-4 md:p-7 max-w-3xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-7 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900">MSP Reports</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Monthly Supervisory Period (MSP) compliance records — the BACB compliance unit</p>
      </div>

      {/* Total stat */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-zinc-900">{totalHours.toFixed(1)}h</p>
            <p className="text-sm text-zinc-400 mt-0.5">Total fieldwork hours logged</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-zinc-900">{Math.max(0, targetHours - totalHours).toFixed(1)}h remaining</p>
            <p className="text-xs text-zinc-400">to certification ({targetHours.toLocaleString()}h target)</p>
          </div>
        </div>
        <div className="mt-4 h-2.5 bg-zinc-100 rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min((totalHours / targetHours) * 100, 100)}%` }} />
        </div>
        <p className="text-xs text-zinc-400 mt-1">{totalHours.toFixed(1)} / {targetHours.toLocaleString()} hours · {Math.min((totalHours / targetHours) * 100, 100).toFixed(1)}% complete</p>
      </div>

      {/* Current month live stats */}
      {liveMonth && (
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">{currentMonthLabel}</p>
              <p className="text-xs text-zinc-400">Current MSP · {liveMonth.actCount} activities logged · live data</p>
            </div>
            <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">In progress</span>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { label: "Total", value: liveMonth.totalH.toFixed(1) + "h", color: "text-zinc-900" },
              { label: "Restricted", value: liveMonth.restrictedH.toFixed(1) + "h", color: "text-violet-600" },
              { label: "Unrestricted", value: liveMonth.unrestrictedH.toFixed(1) + "h", color: "text-blue-600" },
              { label: "Supervision", value: liveMonth.supervisionH.toFixed(1) + "h", color: "text-emerald-600" },
            ].map(s => (
              <div key={s.label} className="text-center bg-zinc-50 rounded-lg py-2">
                <p className={cn("text-sm font-bold", s.color)}>{s.value}</p>
                <p className="text-[10px] text-zinc-400">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 w-24 flex-shrink-0">Restricted {liveMonth.restrictedPct.toFixed(1)}%</span>
              <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full", liveMonth.restrictedPct > 50 ? "bg-red-400" : "bg-violet-500")} style={{ width: `${Math.min(liveMonth.restrictedPct * 2, 100)}%` }} />
              </div>
              <span className="text-[10px] text-zinc-400 w-12 text-right">max 50%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 w-24 flex-shrink-0">Supervision {liveMonth.supervisionPct.toFixed(1)}%</span>
              <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(liveMonth.supervisionPct * 10, 100)}%` }} />
              </div>
              <span className="text-[10px] text-zinc-400 w-12 text-right">min 5%</span>
            </div>
          </div>
        </div>
      )}

      {/* Monthly list */}
      {summaries.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E8E6F4] py-16 text-center">
          <FileText className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-700 mb-1">No reports yet</p>
          <p className="text-xs text-zinc-400">MSP records appear here once your supervisor generates your Monthly Supervisory Period report.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {summaries.map((r) => {
            const supervisionH = r.supervision_hours_individual + r.supervision_hours_group
            const restrictedPct = r.total_hours > 0 ? (r.restricted_hours / r.total_hours) * 100 : 0
            const supervisionPct = r.total_hours > 0 ? (supervisionH / r.total_hours) * 100 : 0
            const minSup = r.fieldwork_type === "concentrated"
              ? (r.requirements_year === "2022" ? 10 : 7.5)
              : 5
            const status = getComplianceStatus(r)
            // r.month comes back from Postgres as a full date ("YYYY-MM-DD").
            const monthKey = r.month.slice(0, 7)
            const isCurrentMonth = monthKey === new Date().toISOString().slice(0, 7)

            return (
              <Link
                key={r.id}
                href={`/trainee/reports/${monthKey}`}
                className="block bg-white rounded-xl border border-[#E8E6F4] hover:border-violet-200 hover:shadow-sm transition-all"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">{formatMonth(r.month)}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StatusBadge status={status} />
                          {isCurrentMonth && (
                            <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">
                              In progress
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300" />
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {[
                      { label: "Total", value: `${r.total_hours.toFixed(1)}h` },
                      { label: "Restricted", value: `${r.restricted_hours.toFixed(1)}h` },
                      { label: "Unrestricted", value: `${r.unrestricted_hours.toFixed(1)}h` },
                      { label: "Supervision", value: `${supervisionH.toFixed(1)}h` },
                    ].map((s) => (
                      <div key={s.label} className="text-center bg-zinc-50 rounded-lg py-2">
                        <p className="text-sm font-bold text-zinc-900">{s.value}</p>
                        <p className="text-[10px] text-zinc-400">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500 w-24 flex-shrink-0">Restricted {restrictedPct.toFixed(1)}%</span>
                      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", restrictedPct > 50 ? "bg-red-400" : "bg-violet-500")}
                          style={{ width: `${Math.min(restrictedPct * 2, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-400 w-12 text-right">max 50%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500 w-24 flex-shrink-0">Supervision {supervisionPct.toFixed(1)}%</span>
                      <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min((supervisionPct / minSup) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-zinc-400 w-12 text-right">min {minSup}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-zinc-50">
                    {r.supervisor_signed_at
                      ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /><span className="text-xs text-zinc-500">Supervisor signed</span></>
                      : <><Clock className="w-3.5 h-3.5 text-zinc-300" /><span className="text-xs text-zinc-400">Awaiting supervisor signature</span></>
                    }
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
