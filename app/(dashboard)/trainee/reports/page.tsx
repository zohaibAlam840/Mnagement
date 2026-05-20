"use client"

import Link from "next/link"
import { Download, ChevronRight, CheckCircle2, AlertTriangle, Clock, FileText } from "lucide-react"
import { monthlyReports } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

function StatusBadge({ status }: { status: string }) {
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
      Violation
    </span>
  )
}

export default function ReportsPage() {
  const totalHours = monthlyReports.reduce((s, r) => s + r.totalHours, 0)

  return (
    <div className="p-4 md:p-7 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Reports</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Monthly BACB verification summaries</p>
      </div>

      {/* Total stat */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-zinc-900">{totalHours.toFixed(1)}h</p>
            <p className="text-sm text-zinc-400 mt-0.5">Total fieldwork hours · Jan – May 2025</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-zinc-900">576.5h remaining</p>
            <p className="text-xs text-zinc-400">to BCBA certification (1,000h)</p>
          </div>
        </div>
        <div className="mt-4 h-2.5 bg-zinc-100 rounded-full overflow-hidden">
          <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(totalHours / 1000) * 100}%` }} />
        </div>
        <p className="text-xs text-zinc-400 mt-1">{totalHours} / 1,000 hours · {((totalHours / 1000) * 100).toFixed(1)}% complete</p>
      </div>

      {/* Monthly list */}
      <div className="space-y-3">
        {monthlyReports.map((r) => (
          <Link
            key={r.id}
            href={`/trainee/reports/${r.slug}`}
            className="block bg-white rounded-xl border border-[#E8E6F4] hover:border-violet-200 hover:shadow-sm transition-all"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{r.month}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <StatusBadge status={r.complianceStatus} />
                      {r.inProgress && (
                        <span className="text-[10px] font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">
                          In progress
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {r.generatedPdf && (
                    <button
                      onClick={(e) => e.preventDefault()}
                      className="w-8 h-8 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-400 hover:text-violet-600 hover:border-violet-300 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <ChevronRight className="w-4 h-4 text-zinc-300" />
                </div>
              </div>

              {/* Hours breakdown */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { label: "Total", value: `${r.totalHours}h` },
                  { label: "Restricted", value: `${r.restrictedHours}h` },
                  { label: "Unrestricted", value: `${r.unrestrictedHours}h` },
                  { label: "Supervision", value: `${r.supervisionHours}h` },
                ].map((s) => (
                  <div key={s.label} className="text-center bg-zinc-50 rounded-lg py-2">
                    <p className="text-sm font-bold text-zinc-900">{s.value}</p>
                    <p className="text-[10px] text-zinc-400">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Compliance bars */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 w-24 flex-shrink-0">Restricted {r.restrictedPercent}%</span>
                  <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", r.restrictedPercent > 50 ? "bg-red-400" : "bg-violet-500")}
                      style={{ width: `${Math.min(r.restrictedPercent * 2, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400 w-12 text-right">max 50%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 w-24 flex-shrink-0">Supervision {r.supervisionPercent}%</span>
                  <div className="flex-1 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(r.supervisionPercent * 5, 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-zinc-400 w-12 text-right">min 5%</span>
                </div>
              </div>

              {/* Supervisor signature */}
              <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-zinc-50">
                {r.supervisorSigned
                  ? <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /><span className="text-xs text-zinc-500">Signed by Dr. Rodriguez</span></>
                  : <><Clock className="w-3.5 h-3.5 text-zinc-300" /><span className="text-xs text-zinc-400">Awaiting supervisor signature</span></>
                }
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
