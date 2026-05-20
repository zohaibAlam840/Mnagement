import Link from "next/link"
import { ChevronLeft, CheckCircle2, AlertTriangle, Clock, MoreHorizontal } from "lucide-react"
import { supervisees, activities, monthlyReports } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export default async function SuperviseeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supervisee = supervisees.find((s) => s.id === id) ?? supervisees[0]
  const recentActivities = activities.slice(0, 5)

  return (
    <div className="p-4 md:p-7 max-w-4xl mx-auto">
      <Link href="/supervisor/supervisees" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Supervisees
      </Link>

      {/* Profile header */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-violet-100 flex items-center justify-center">
              <span className="text-lg font-bold text-violet-700">{supervisee.initials}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900">{supervisee.name}</h1>
              <p className="text-sm text-zinc-500">{supervisee.email}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">{supervisee.certType}</span>
                <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">{supervisee.fieldworkType}</span>
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                  supervisee.complianceStatus === "compliant" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                )}>
                  {supervisee.complianceStatus === "compliant" ? <><CheckCircle2 className="w-3 h-3 inline mr-0.5" />Compliant</> : <><AlertTriangle className="w-3 h-3 inline mr-0.5" />Warning</>}
                </span>
              </div>
            </div>
          </div>
          <button className="w-9 h-9 rounded-lg border border-[#E8E6F4] flex items-center justify-center text-zinc-400 hover:bg-zinc-50 transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Hours", value: `${supervisee.totalHours}h`, sub: `of ${supervisee.targetHours}h` },
          { label: "Restricted", value: `${supervisee.restrictedPercent}%`, sub: "max 50%" },
          { label: "Supervision", value: `${supervisee.supervisionPercent}%`, sub: "min 5%" },
          { label: "This Month", value: `${supervisee.monthlyHours}h`, sub: supervisee.lastActivity },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-[#E8E6F4] p-4">
            <p className="text-2xl font-bold text-zinc-900">{s.value}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{s.label}</p>
            <p className="text-[10px] text-zinc-300 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-zinc-900">Certification Progress</h3>
          <span className="text-sm font-bold text-violet-600">{((supervisee.totalHours / supervisee.targetHours) * 100).toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-zinc-100 rounded-full overflow-hidden mb-1">
          <div className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full" style={{ width: `${(supervisee.totalHours / supervisee.targetHours) * 100}%` }} />
        </div>
        <p className="text-xs text-zinc-400">{supervisee.totalHours} / {supervisee.targetHours} hours · Started {supervisee.startDate}</p>
      </div>

      {/* Recent activities */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] mb-5">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
          <h3 className="text-sm font-semibold text-zinc-900">Recent Activities</h3>
          <Link href="/supervisor/approvals" className="text-xs text-violet-600 font-medium">View approvals</Link>
        </div>
        <div className="divide-y divide-zinc-50">
          {recentActivities.map((a) => (
            <div key={a.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                a.category === "Restricted" ? "bg-violet-100 text-violet-700" :
                a.category === "Supervision" ? "bg-emerald-100 text-emerald-700" :
                "bg-blue-100 text-blue-700"
              )}>
                {a.duration}h
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{a.title}</p>
                <p className="text-[11px] text-zinc-400">{a.date} · {a.category}</p>
              </div>
              {a.supervisorApproved
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                : <Clock className="w-4 h-4 text-zinc-300 flex-shrink-0" />
              }
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href={`/supervisor/approvals`} className="flex-1 text-center bg-violet-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-colors">
          Review Pending Approvals
          {supervisee.pendingApprovals > 0 && (
            <span className="ml-2 bg-white/20 text-white text-xs rounded-full px-1.5 py-0.5">{supervisee.pendingApprovals}</span>
          )}
        </Link>
        <Link href="/supervisor/sessions" className="flex-1 text-center border border-[#E8E6F4] bg-white text-zinc-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-zinc-50 transition-colors">
          Log Session
        </Link>
      </div>
    </div>
  )
}
