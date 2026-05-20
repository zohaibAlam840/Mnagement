import Link from "next/link"
import { CheckSquare, AlertTriangle, Users, Video, ChevronRight, CheckCircle2, Clock } from "lucide-react"
import { supervisees, approvalQueue, supervisionSessions } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export default function SupervisorDashboard() {
  const pending = approvalQueue.filter((a) => a.status === "pending")
  const warnings = supervisees.filter((s) => s.complianceStatus === "warning")
  const recentSessions = supervisionSessions.slice(0, 3)

  return (
    <div className="p-4 md:p-7 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Good morning, Dr. Rodriguez</h1>
          <p className="text-sm text-zinc-500 mt-0.5">May 19, 2025 · 3 supervisees active</p>
        </div>
        <Link
          href="/supervisor/approvals"
          className="flex items-center gap-1.5 text-sm font-semibold bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
        >
          <CheckSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Review Approvals</span>
          <span className="sm:hidden">Approvals</span>
          <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-[10px]">{pending.length}</span>
        </Link>
      </div>

      {/* Warning banner */}
      {warnings.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-5 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            <strong>{warnings.map((w) => w.name.split(" ")[0]).join(", ")}</strong> {warnings.length === 1 ? "has" : "have"} compliance warnings — restricted hours may be approaching the 50% limit.
          </span>
          <Link href="/supervisor/supervisees" className="ml-auto text-xs font-semibold text-amber-700 hover:text-amber-800 flex-shrink-0">
            Review →
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Active Supervisees", value: supervisees.length, icon: Users, color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Pending Approvals", value: pending.length, icon: CheckSquare, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Compliance Alerts", value: warnings.length, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
          { label: "Sessions This Month", value: supervisionSessions.length, icon: Video, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-[#E8E6F4] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400">{stat.label}</span>
              <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", stat.bg)}>
                <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
              </div>
            </div>
            <p className="text-3xl font-bold text-zinc-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Supervisees overview */}
        <div className="bg-white rounded-xl border border-[#E8E6F4]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
            <h2 className="font-semibold text-zinc-900 text-sm">Supervisees</h2>
            <Link href="/supervisor/supervisees" className="text-xs text-violet-600 font-medium hover:text-violet-700 flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-zinc-50">
            {supervisees.map((s) => (
              <Link key={s.id} href={`/supervisor/supervisees/${s.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-violet-700">{s.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">{s.name}</p>
                  <p className="text-[11px] text-zinc-400">{s.totalHours}h · {s.fieldworkType}</p>
                </div>
                <div className="flex items-center gap-2">
                  {s.pendingApprovals > 0 && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full w-5 h-5 flex items-center justify-center">
                      {s.pendingApprovals}
                    </span>
                  )}
                  <span className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    s.complianceStatus === "compliant" ? "bg-emerald-50 text-emerald-700" :
                    s.complianceStatus === "warning" ? "bg-amber-50 text-amber-700" :
                    "bg-red-50 text-red-700"
                  )}>
                    {s.complianceStatus}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Pending approvals */}
        <div className="bg-white rounded-xl border border-[#E8E6F4]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
            <h2 className="font-semibold text-zinc-900 text-sm">Pending Approvals</h2>
            <Link href="/supervisor/approvals" className="text-xs text-violet-600 font-medium hover:text-violet-700 flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-zinc-50">
            {pending.slice(0, 3).map((item) => (
              <Link key={item.id} href={`/supervisor/approvals/${item.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50/50 transition-colors">
                <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-zinc-600">{item.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900">{item.supervisee}</p>
                  <p className="text-[11px] text-zinc-400">{item.weekOf}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-zinc-900">{item.totalHours}h</p>
                  <p className="text-[10px] text-zinc-400">{item.activitiesCount} activities</p>
                </div>
              </Link>
            ))}
            {pending.length === 0 && (
              <div className="py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm text-zinc-400">All caught up!</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent supervision sessions */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] md:col-span-2">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
            <h2 className="font-semibold text-zinc-900 text-sm">Recent Supervision Sessions</h2>
            <Link href="/supervisor/sessions" className="text-xs text-violet-600 font-medium hover:text-violet-700 flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="divide-y divide-zinc-50">
            {recentSessions.map((s) => (
              <div key={s.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-violet-700">{s.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">{s.supervisee}</p>
                  <p className="text-[11px] text-zinc-400">{s.date} · {s.type} · {s.observationType}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-semibold text-zinc-600">{s.duration}h</span>
                  {s.approved
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    : <Clock className="w-3.5 h-3.5 text-zinc-300" />
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
