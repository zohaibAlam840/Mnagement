import Link from "next/link"
import { ChevronRight, AlertTriangle, CheckCircle2 } from "lucide-react"
import { supervisees } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export default function SuperviseesPage() {
  return (
    <div className="p-4 md:p-7 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Supervisees</h1>
        <p className="text-sm text-zinc-500 mt-0.5">{supervisees.length} active trainees under your supervision</p>
      </div>

      <div className="space-y-3">
        {supervisees.map((s) => (
          <Link
            key={s.id}
            href={`/supervisor/supervisees/${s.id}`}
            className="block bg-white rounded-xl border border-[#E8E6F4] p-5 hover:border-violet-200 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-violet-700">{s.initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-900">{s.name}</p>
                    {s.pendingApprovals > 0 && (
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                        {s.pendingApprovals} pending
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[11px] font-semibold px-2.5 py-1 rounded-lg",
                      s.complianceStatus === "compliant" ? "bg-emerald-50 text-emerald-700" :
                      s.complianceStatus === "warning" ? "bg-amber-50 text-amber-700" :
                      "bg-red-50 text-red-700"
                    )}>
                      {s.complianceStatus === "compliant" && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                      {s.complianceStatus === "warning" && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                      {s.complianceStatus}
                    </span>
                    <ChevronRight className="w-4 h-4 text-zinc-300" />
                  </div>
                </div>

                <p className="text-xs text-zinc-400 mb-3">{s.certType} · {s.fieldworkType} fieldwork · Started {s.startDate}</p>

                {/* Progress to certification */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] text-zinc-500">Toward certification</span>
                    <span className="text-[11px] font-semibold text-zinc-700">{s.totalHours} / {s.targetHours}h</span>
                  </div>
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(s.totalHours / s.targetHours) * 100}%` }} />
                  </div>
                </div>

                {/* Compliance ratios */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Restricted", value: `${s.restrictedPercent}%`, warn: s.restrictedPercent > 48 },
                    { label: "Supervision", value: `${s.supervisionPercent}%`, warn: s.supervisionPercent < 5.5 },
                    { label: "This month", value: `${s.monthlyHours}h`, warn: false },
                  ].map((m) => (
                    <div key={m.label} className={cn("text-center py-1.5 px-2 rounded-lg", m.warn ? "bg-amber-50" : "bg-zinc-50")}>
                      <p className={cn("text-sm font-bold", m.warn ? "text-amber-600" : "text-zinc-800")}>{m.value}</p>
                      <p className="text-[10px] text-zinc-400">{m.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
