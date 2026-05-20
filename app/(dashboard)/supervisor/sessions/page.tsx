import Link from "next/link"
import { Plus, CheckCircle2, Clock } from "lucide-react"
import { supervisionSessions, supervisees } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export default function SessionsPage() {
  return (
    <div className="p-4 md:p-7 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Supervision Sessions</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{supervisionSessions.length} sessions logged this month</p>
        </div>
        <Link
          href="/supervisor/sessions/new"
          className="flex items-center gap-1.5 text-sm font-semibold bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Log Session</span>
          <span className="sm:hidden">Log</span>
        </Link>
      </div>

      {/* Summary by supervisee */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {supervisees.map((s) => {
          const sessions = supervisionSessions.filter((ss) => ss.superviseeId === s.id)
          const totalHours = sessions.reduce((sum, ss) => sum + ss.duration, 0)
          return (
            <div key={s.id} className="bg-white rounded-xl border border-[#E8E6F4] p-3 text-center">
              <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-1.5">
                <span className="text-xs font-bold text-violet-700">{s.initials}</span>
              </div>
              <p className="text-xs font-semibold text-zinc-700 truncate">{s.name.split(" ")[0]}</p>
              <p className="text-lg font-bold text-zinc-900">{totalHours}h</p>
              <p className="text-[10px] text-zinc-400">{sessions.length} sessions</p>
            </div>
          )
        })}
      </div>

      {/* Sessions list */}
      <div className="bg-white rounded-xl border border-[#E8E6F4]">
        <div className="divide-y divide-zinc-50">
          {supervisionSessions.map((s) => (
            <Link key={s.id} href={`/supervisor/sessions/${s.id}`} className="block px-5 py-4 hover:bg-zinc-50/40 transition-colors">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-violet-700">{s.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-semibold text-zinc-900">{s.supervisee}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-700">{s.duration}h</span>
                      {s.approved
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        : <Clock className="w-4 h-4 text-zinc-300" />
                      }
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs text-zinc-500">{s.date}</span>
                    <span className="text-zinc-300">·</span>
                    <span className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                      s.type === "Individual" ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700"
                    )}>
                      {s.type}
                    </span>
                    <span className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                      s.observationType === "Direct" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                    )}>
                      {s.observationType}
                    </span>
                  </div>
                  {s.notes && <p className="text-xs text-zinc-500 leading-relaxed">{s.notes}</p>}
                  {!s.approved && (
                    <span className="mt-2 text-xs font-semibold text-violet-600 block">
                      Tap to confirm →
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
