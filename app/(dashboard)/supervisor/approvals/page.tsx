import Link from "next/link"
import { ChevronRight, CheckCircle2, Clock, Filter } from "lucide-react"
import { approvalQueue } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export default function ApprovalsPage() {
  const pending = approvalQueue.filter((a) => a.status === "pending")
  const reviewed = approvalQueue.filter((a) => a.status !== "pending")

  return (
    <div className="p-4 md:p-7 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Approvals</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{pending.length} pending review</p>
        </div>
        <button className="flex items-center gap-1.5 text-sm text-zinc-600 border border-[#E8E6F4] bg-white px-3 py-2 rounded-lg hover:bg-zinc-50 transition-colors">
          <Filter className="w-3.5 h-3.5" />
          Filter
        </button>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="mb-6">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Needs Review</p>
          <div className="space-y-2">
            {pending.map((item) => (
              <Link
                key={item.id}
                href={`/supervisor/approvals/${item.id}`}
                className="flex items-center gap-4 bg-white rounded-xl border border-[#E8E6F4] px-5 py-4 hover:border-violet-200 hover:shadow-sm transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-violet-700">{item.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-zinc-900">{item.supervisee}</p>
                    <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">pending</span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{item.weekOf} · Submitted {item.submittedAt}</p>
                  <div className="flex items-center gap-3 mt-2">
                    {[
                      { label: "R", value: `${item.restrictedHours}h`, color: "text-violet-700 bg-violet-50" },
                      { label: "U", value: `${item.unrestrictedHours}h`, color: "text-blue-700 bg-blue-50" },
                      { label: "S", value: `${item.supervisionHours}h`, color: "text-emerald-700 bg-emerald-50" },
                    ].map((h) => (
                      <span key={h.label} className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", h.color)}>
                        {h.label}: {h.value}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-lg font-bold text-zinc-900">{item.totalHours}h</p>
                    <p className="text-[10px] text-zinc-400">{item.activitiesCount} activities</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-300" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Recently Reviewed</p>
          <div className="space-y-2">
            {reviewed.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 bg-white rounded-xl border border-zinc-100 px-5 py-3.5 opacity-70"
              >
                <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-zinc-500">{item.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-700">{item.supervisee}</p>
                  <p className="text-xs text-zinc-400">{item.weekOf}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-500">{item.totalHours}h</span>
                  {item.status === "approved"
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    : <Clock className="w-4 h-4 text-zinc-300" />
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
