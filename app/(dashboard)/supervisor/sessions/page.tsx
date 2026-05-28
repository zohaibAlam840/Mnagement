"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, CheckCircle2, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"

type Session = Database["public"]["Tables"]["supervision_sessions"]["Row"]
type Profile = Database["public"]["Tables"]["profiles"]["Row"]

type SessionWithProfile = Session & { trainee: Profile | null }

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionWithProfile[]>([])
  const [supervisees, setSupervisees] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()
      const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`

      const [{ data: sess }, { data: rels }] = await Promise.all([
        supabase.from("supervision_sessions").select("*")
          .eq("supervisor_id", user.id)
          .order("date", { ascending: false })
          .order("start_time", { ascending: false }),
        supabase.from("supervisor_relationships").select("trainee_id")
          .eq("supervisor_id", user.id)
          .eq("status", "active"),
      ])

      const traineeIds = [...new Set([
        ...(sess ?? []).map(s => s.trainee_id),
        ...(rels ?? []).map(r => r.trainee_id),
      ])]

      let profiles: Profile[] = []
      if (traineeIds.length > 0) {
        const { data } = await supabase.from("profiles").select("*").in("id", traineeIds)
        profiles = data ?? []
      }

      const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
      const enriched = (sess ?? []).map(s => ({ ...s, trainee: profileMap[s.trainee_id] ?? null }))

      setSessions(enriched)
      setSupervisees(profiles.filter(p => (rels ?? []).some(r => r.trainee_id === p.id)))
      setLoading(false)
    }
    load()
  }, [])

  const today = new Date()
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
  const thisMonthSessions = sessions.filter(s => s.date >= monthStart)

  // Summary per supervisee (this month)
  const summaryMap: Record<string, { hours: number; count: number; name: string; ini: string }> = {}
  supervisees.forEach(p => {
    summaryMap[p.id] = {
      hours: 0, count: 0,
      name: `${p.first_name} ${p.last_name}`,
      ini: `${p.first_name[0]}${p.last_name[0]}`.toUpperCase(),
    }
  })
  thisMonthSessions.forEach(s => {
    if (summaryMap[s.trainee_id]) {
      summaryMap[s.trainee_id].hours += s.duration_minutes / 60
      summaryMap[s.trainee_id].count += 1
    }
  })

  if (loading) {
    return (
      <div className="p-4 md:p-7 max-w-3xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-7 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Supervision Sessions</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{thisMonthSessions.length} sessions logged this month</p>
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

      {/* Per-supervisee summary */}
      {supervisees.length > 0 && (
        <div className={cn("grid gap-3 mb-5", supervisees.length === 1 ? "grid-cols-1" : supervisees.length === 2 ? "grid-cols-2" : "grid-cols-3")}>
          {supervisees.map((p) => {
            const s = summaryMap[p.id]
            return (
              <div key={p.id} className="bg-white rounded-xl border border-[#E8E6F4] p-3 text-center">
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-1.5">
                  <span className="text-xs font-bold text-violet-700">{s.ini}</span>
                </div>
                <p className="text-xs font-semibold text-zinc-700 truncate">{p.first_name}</p>
                <p className="text-lg font-bold text-zinc-900">{s.hours.toFixed(1)}h</p>
                <p className="text-[10px] text-zinc-400">{s.count} sessions</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Sessions list */}
      {sessions.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-[#E8E6F4]">
          <p className="text-sm font-medium text-zinc-700 mb-1">No sessions yet</p>
          <p className="text-xs text-zinc-400 mb-4">Log your first supervision session</p>
          <Link href="/supervisor/sessions/new" className="text-sm font-semibold text-violet-600 hover:text-violet-700">
            + Log session
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E8E6F4]">
          <div className="divide-y divide-zinc-50">
            {sessions.map((s) => {
              const name = s.trainee ? `${s.trainee.first_name} ${s.trainee.last_name}` : "Trainee"
              const ini = s.trainee ? `${s.trainee.first_name[0]}${s.trainee.last_name[0]}`.toUpperCase() : "??"
              const durationH = s.duration_minutes / 60
              return (
                <Link key={s.id} href={`/supervisor/sessions/${s.id}`} className="block px-5 py-4 hover:bg-zinc-50/40 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-violet-700">{ini}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="text-sm font-semibold text-zinc-900">{name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-zinc-700">{durationH.toFixed(1)}h</span>
                          {s.status === "confirmed"
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            : <Clock className="w-4 h-4 text-zinc-300" />
                          }
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-zinc-500">{formatDate(s.date)}</span>
                        <span className="text-zinc-300">·</span>
                        <span className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                          s.session_type === "individual" ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700"
                        )}>
                          {s.session_type}
                        </span>
                        <span className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                          s.observation_type === "direct" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                        )}>
                          {s.observation_type}
                        </span>
                      </div>
                      {s.notes && <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2">{s.notes}</p>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
