"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { CheckSquare, AlertTriangle, Users, Video, ChevronRight, CheckCircle2, Clock, UserPlus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type TraineeProfile = Database["public"]["Tables"]["trainee_profiles"]["Row"]
type Relationship = Database["public"]["Tables"]["supervisor_relationships"]["Row"]
type WeeklyReview = Database["public"]["Tables"]["weekly_reviews"]["Row"]
type Session = Database["public"]["Tables"]["supervision_sessions"]["Row"]

type SuperviseeEntry = {
  rel: Relationship
  profile: Profile
  traineeProfile: TraineeProfile | null
  totalHours: number
  restrictedPct: number
  supervisionPct: number
  pendingApprovals: number
  complianceStatus: "compliant" | "warning" | "critical"
}

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase()
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

export default function SupervisorDashboard() {
  const [supervisorName, setSupervisorName] = useState("")
  const [supervisees, setSupervisees] = useState<SuperviseeEntry[]>([])
  const [pendingReviews, setPendingReviews] = useState<(WeeklyReview & { trainee: Profile | null })[]>([])
  const [recentSessions, setRecentSessions] = useState<(Session & { trainee: Profile | null })[]>([])
  const [sessionCount, setSessionCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const today = new Date()
      const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`

      const [
        { data: profile },
        { data: activeRels },
        { data: pendingRevs },
        { data: sessions },
      ] = await Promise.all([
        supabase.from("profiles").select("first_name, last_name").eq("id", user.id).single(),
        supabase.from("supervisor_relationships").select("*").eq("supervisor_id", user.id).eq("status", "active"),
        supabase.from("weekly_reviews").select("*").eq("supervisor_id", user.id).eq("status", "submitted").order("submitted_at", { ascending: true }),
        supabase.from("supervision_sessions").select("*").eq("supervisor_id", user.id).gte("date", monthStart).order("date", { ascending: false }),
      ])

      if (profile) setSupervisorName(`${profile.first_name} ${profile.last_name}`)
      setSessionCount(sessions?.length ?? 0)

      const traineeIds = (activeRels ?? []).map(r => r.trainee_id)
      const pendingTraineeIds = (pendingRevs ?? []).map(r => r.trainee_id)
      const sessionTraineeIds = (sessions ?? []).slice(0, 3).map(s => s.trainee_id)
      const allIds = [...new Set([...traineeIds, ...pendingTraineeIds, ...sessionTraineeIds])]

      let profiles: Profile[] = []
      let traineeProfiles: TraineeProfile[] = []
      let activities: { trainee_id: string; category: string; duration_minutes: number }[] = []

      if (allIds.length > 0) {
        const [p, tp, acts] = await Promise.all([
          supabase.from("profiles").select("*").in("id", allIds),
          supabase.from("trainee_profiles").select("*").in("id", traineeIds),
          supabase.from("activities").select("trainee_id, category, duration_minutes").in("trainee_id", traineeIds),
        ])
        profiles = p.data ?? []
        traineeProfiles = tp.data ?? []
        activities = acts.data ?? []
      }

      const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
      const traineeProfileMap = Object.fromEntries(traineeProfiles.map(t => [t.id, t]))

      // Count pending reviews per trainee
      const pendingCountMap: Record<string, number> = {}
      ;(pendingRevs ?? []).forEach(r => { pendingCountMap[r.trainee_id] = (pendingCountMap[r.trainee_id] ?? 0) + 1 })

      const superviseeEntries: SuperviseeEntry[] = (activeRels ?? []).map(rel => {
        const profile = profileMap[rel.trainee_id]
        const traineeProfile = traineeProfileMap[rel.trainee_id] ?? null
        const myActs = activities.filter(a => a.trainee_id === rel.trainee_id)
        const totalHours = myActs.reduce((s, a) => s + a.duration_minutes, 0) / 60
        const restrictedH = myActs.filter(a => a.category === "Restricted").reduce((s, a) => s + a.duration_minutes, 0) / 60
        const supervisionH = myActs.filter(a => a.category === "Supervision").reduce((s, a) => s + a.duration_minutes, 0) / 60
        const restrictedPct = totalHours > 0 ? (restrictedH / totalHours) * 100 : 0
        const supervisionPct = totalHours > 0 ? (supervisionH / totalHours) * 100 : 0
        const minSup = traineeProfile?.fieldwork_type === "concentrated"
          ? (traineeProfile?.requirements_year === "2022" ? 10 : 7.5)
          : 5
        const pendingApprovals = pendingCountMap[rel.trainee_id] ?? 0
        let complianceStatus: "compliant" | "warning" | "critical" = "compliant"
        if (restrictedPct > 50) complianceStatus = "critical"
        else if (restrictedPct > 46 || (supervisionPct < minSup && totalHours > 0)) complianceStatus = "warning"
        return { rel, profile, traineeProfile, totalHours, restrictedPct, supervisionPct, pendingApprovals, complianceStatus }
      })

      const enrichedReviews = (pendingRevs ?? []).slice(0, 3).map(r => ({
        ...r,
        trainee: profileMap[r.trainee_id] ?? null,
      }))

      const enrichedSessions = (sessions ?? []).slice(0, 3).map(s => ({
        ...s,
        trainee: profileMap[s.trainee_id] ?? null,
      }))

      setSupervisees(superviseeEntries)
      setPendingReviews(enrichedReviews)
      setRecentSessions(enrichedSessions)
      setLoading(false)
    }
    load()
  }, [])

  const warnings = supervisees.filter(s => s.complianceStatus !== "compliant")
  const totalPending = pendingReviews.length

  if (loading) {
    return (
      <div className="p-4 md:p-7 max-w-6xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-7 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">
            {greeting()}{supervisorName ? `, ${supervisorName.split(" ")[0]}` : ""}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            {supervisees.length > 0 && ` · ${supervisees.length} active ${supervisees.length === 1 ? "supervisee" : "supervisees"}`}
          </p>
        </div>
        <Link
          href="/supervisor/approvals"
          className="flex items-center gap-1.5 text-sm font-semibold bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
        >
          <CheckSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Review Approvals</span>
          <span className="sm:hidden">Approvals</span>
          {totalPending > 0 && (
            <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-[10px]">{totalPending}</span>
          )}
        </Link>
      </div>

      {/* Compliance warning banner */}
      {warnings.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-5 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            <strong>
              {warnings.map(w => w.profile ? w.profile.first_name : "A trainee").join(", ")}
            </strong>{" "}
            {warnings.length === 1 ? "has" : "have"} compliance warnings — check their restricted hours ratio.
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
          { label: "Pending Approvals", value: totalPending, icon: CheckSquare, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Compliance Alerts", value: warnings.length, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
          { label: "Sessions This Month", value: sessionCount, icon: Video, color: "text-emerald-600", bg: "bg-emerald-50" },
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
        {/* Supervisees */}
        <div className="bg-white rounded-xl border border-[#E8E6F4]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
            <h2 className="font-semibold text-zinc-900 text-sm">Supervisees</h2>
            <Link href="/supervisor/supervisees" className="text-xs text-violet-600 font-medium hover:text-violet-700 flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          {supervisees.length === 0 ? (
            <div className="py-10 text-center">
              <UserPlus className="w-7 h-7 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">No supervisees yet</p>
              <Link href="/supervisor/supervisees" className="text-xs text-violet-600 font-medium mt-1 block">
                Invite a trainee →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {supervisees.slice(0, 4).map((s) => {
                const name = s.profile ? `${s.profile.first_name} ${s.profile.last_name}` : "Unknown"
                const ini = s.profile ? initials(s.profile.first_name, s.profile.last_name) : "??"
                return (
                  <Link key={s.rel.id} href={`/supervisor/supervisees/${s.rel.trainee_id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50/50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-violet-700">{ini}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900">{name}</p>
                      <p className="text-[11px] text-zinc-400">{s.totalHours.toFixed(1)}h · {s.traineeProfile?.fieldwork_type ?? "supervised"}</p>
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
                )
              })}
            </div>
          )}
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
            {pendingReviews.map((r) => {
              const name = r.trainee ? `${r.trainee.first_name} ${r.trainee.last_name}` : "Trainee"
              const ini = r.trainee ? initials(r.trainee.first_name, r.trainee.last_name) : "??"
              const weekRange = (() => {
                const s = new Date(r.week_start_date + "T00:00:00")
                const e = new Date(r.week_start_date + "T00:00:00")
                e.setDate(e.getDate() + 6)
                return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
              })()
              return (
                <Link key={r.id} href={`/supervisor/approvals/${r.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50/50 transition-colors">
                  <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-zinc-600">{ini}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900">{name}</p>
                    <p className="text-[11px] text-zinc-400">{weekRange}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-zinc-900">{r.total_hours.toFixed(1)}h</p>
                  </div>
                </Link>
              )
            })}
            {pendingReviews.length === 0 && (
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
          {recentSessions.length === 0 ? (
            <div className="py-8 text-center">
              <Video className="w-7 h-7 text-zinc-300 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">No sessions logged this month</p>
              <Link href="/supervisor/sessions/new" className="text-xs text-violet-600 font-medium mt-1 block">
                Log a session →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {recentSessions.map((s) => {
                const name = s.trainee ? `${s.trainee.first_name} ${s.trainee.last_name}` : "Trainee"
                const ini = s.trainee ? initials(s.trainee.first_name, s.trainee.last_name) : "??"
                const durationH = s.duration_minutes / 60
                return (
                  <Link key={s.id} href={`/supervisor/sessions/${s.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50/50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-violet-700">{ini}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900">{name}</p>
                      <p className="text-[11px] text-zinc-400">
                        {new Date(s.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {s.session_type} · {s.observation_type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-semibold text-zinc-600">{durationH.toFixed(1)}h</span>
                      {s.status === "confirmed"
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        : <Clock className="w-3.5 h-3.5 text-zinc-300" />
                      }
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
