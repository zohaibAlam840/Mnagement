"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { ChevronLeft, CheckCircle2, AlertTriangle, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type TraineeProfile = Database["public"]["Tables"]["trainee_profiles"]["Row"]
type ActivityRow = Database["public"]["Tables"]["activities"]["Row"]
type WeeklyReview = Database["public"]["Tables"]["weekly_reviews"]["Row"]

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
function formatTime(t: string) {
  const [h, m] = t.split(":")
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`
}

export default function SuperviseeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [profile, setProfile] = useState<Profile | null>(null)
  const [traineeProfile, setTraineeProfile] = useState<TraineeProfile | null>(null)
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [pendingReviews, setPendingReviews] = useState<WeeklyReview[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Verify relationship
      const { data: rel } = await supabase
        .from("supervisor_relationships")
        .select("id")
        .eq("supervisor_id", user.id)
        .eq("trainee_id", id)
        .eq("status", "active")
        .maybeSingle()

      if (!rel) { setNotFound(true); setLoading(false); return }

      const [
        { data: prof },
        { data: tProf },
        { data: acts },
        { data: reviews },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        supabase.from("trainee_profiles").select("*").eq("id", id).single(),
        supabase.from("activities").select("*").eq("trainee_id", id).order("date", { ascending: false }),
        supabase.from("weekly_reviews").select("*").eq("trainee_id", id).eq("supervisor_id", user.id).eq("status", "submitted"),
      ])

      if (!prof) { setNotFound(true); setLoading(false); return }
      setProfile(prof)
      setTraineeProfile(tProf)
      setActivities(acts ?? [])
      setPendingReviews(reviews ?? [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="p-4 md:p-7 max-w-4xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !profile) {
    return (
      <div className="p-4 md:p-7 max-w-2xl mx-auto text-center py-20">
        <p className="text-zinc-400 mb-4">Supervisee not found or not under your supervision.</p>
        <Link href="/supervisor/supervisees" className="text-sm font-semibold text-violet-600 hover:text-violet-700">
          ← Back to supervisees
        </Link>
      </div>
    )
  }

  const totalHours = activities.reduce((s, a) => s + a.duration_minutes, 0) / 60
  const restrictedH = activities.filter(a => a.category === "Restricted").reduce((s, a) => s + a.duration_minutes, 0) / 60
  const supervisionH = activities.filter(a => a.category === "Supervision").reduce((s, a) => s + a.duration_minutes, 0) / 60
  const restrictedPct = totalHours > 0 ? (restrictedH / totalHours) * 100 : 0
  const supervisionPct = totalHours > 0 ? (supervisionH / totalHours) * 100 : 0

  const today = new Date()
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
  const monthlyHours = activities.filter(a => a.date >= monthStart).reduce((s, a) => s + a.duration_minutes, 0) / 60

  const targetHours = traineeProfile?.target_hours ?? 1500
  const minSupervision = traineeProfile?.fieldwork_type === "concentrated"
    ? (traineeProfile?.requirements_year === "2022" ? 10 : 7.5)
    : 5

  let complianceStatus: "compliant" | "warning" | "critical" = "compliant"
  if (restrictedPct > 50) complianceStatus = "critical"
  else if (restrictedPct > 46 || (supervisionPct < minSupervision && totalHours > 0)) complianceStatus = "warning"

  const name = `${profile.first_name} ${profile.last_name}`
  const ini = `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
  const recentActivities = activities.slice(0, 6)

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
              <span className="text-lg font-bold text-violet-700">{ini}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900">{name}</h1>
              <p className="text-sm text-zinc-500">{profile.email}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                  {traineeProfile?.certification_target ?? "BCBA"}
                </span>
                <span className="text-xs font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">
                  {traineeProfile?.fieldwork_type ?? "supervised"}
                </span>
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                  complianceStatus === "compliant" ? "bg-emerald-50 text-emerald-700" :
                  complianceStatus === "warning" ? "bg-amber-50 text-amber-700" :
                  "bg-red-50 text-red-700"
                )}>
                  {complianceStatus === "compliant" && <CheckCircle2 className="w-3 h-3 inline mr-0.5" />}
                  {complianceStatus !== "compliant" && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
                  {complianceStatus}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Hours", value: `${totalHours.toFixed(1)}h`, sub: `of ${targetHours}h target` },
          { label: "Restricted", value: `${restrictedPct.toFixed(1)}%`, sub: "max 50%", warn: restrictedPct > 46 },
          { label: "Supervision", value: `${supervisionPct.toFixed(1)}%`, sub: `min ${minSupervision}%`, warn: supervisionPct < minSupervision && totalHours > 0 },
          { label: "This Month", value: `${monthlyHours.toFixed(1)}h`, sub: `${activities.filter(a => a.date >= monthStart).length} activities` },
        ].map((s) => (
          <div key={s.label} className={cn("bg-white rounded-xl border p-4", (s as any).warn ? "border-amber-200 bg-amber-50/30" : "border-[#E8E6F4]")}>
            <p className={cn("text-2xl font-bold", (s as any).warn ? "text-amber-700" : "text-zinc-900")}>{s.value}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{s.label}</p>
            <p className="text-[10px] text-zinc-300 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Certification progress */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-zinc-900">Certification Progress</h3>
          <span className="text-sm font-bold text-violet-600">
            {Math.min((totalHours / targetHours) * 100, 100).toFixed(1)}%
          </span>
        </div>
        <div className="h-3 bg-zinc-100 rounded-full overflow-hidden mb-1">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full transition-all"
            style={{ width: `${Math.min((totalHours / targetHours) * 100, 100)}%` }}
          />
        </div>
        <p className="text-xs text-zinc-400">
          {totalHours.toFixed(1)} / {targetHours} hours
          {traineeProfile?.fieldwork_start_date && ` · Started ${formatDate(traineeProfile.fieldwork_start_date)}`}
        </p>
      </div>

      {/* Recent activities */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] mb-5">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
          <h3 className="text-sm font-semibold text-zinc-900">Recent Activities ({activities.length} total)</h3>
          {pendingReviews.length > 0 && (
            <Link href="/supervisor/approvals" className="text-xs font-semibold text-violet-600 hover:text-violet-700">
              {pendingReviews.length} pending review{pendingReviews.length !== 1 ? "s" : ""} →
            </Link>
          )}
        </div>
        {recentActivities.length === 0 ? (
          <div className="py-8 text-center text-sm text-zinc-400">No activities logged yet.</div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {recentActivities.map((a) => (
              <div key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                  a.category === "Restricted" ? "bg-violet-100 text-violet-700" :
                  a.category === "Supervision" ? "bg-emerald-100 text-emerald-700" :
                  "bg-blue-100 text-blue-700"
                )}>
                  {(a.duration_minutes / 60).toFixed(1)}h
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{a.title}</p>
                  <p className="text-[11px] text-zinc-400">
                    {formatDate(a.date)} · {formatTime(a.start_time)} – {formatTime(a.end_time)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    a.category === "Restricted" ? "bg-violet-50 text-violet-700" :
                    a.category === "Supervision" ? "bg-emerald-50 text-emerald-700" :
                    "bg-blue-50 text-blue-700"
                  )}>
                    {a.category}
                  </span>
                  {a.status === "approved"
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    : a.status === "submitted"
                      ? <Clock className="w-3.5 h-3.5 text-amber-400" />
                      : null
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href="/supervisor/approvals"
          className="flex-1 text-center bg-violet-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-colors"
        >
          Review Approvals
          {pendingReviews.length > 0 && (
            <span className="ml-2 bg-white/20 text-white text-xs rounded-full px-1.5 py-0.5">{pendingReviews.length}</span>
          )}
        </Link>
        <Link
          href="/supervisor/sessions/new"
          className="flex-1 text-center border border-[#E8E6F4] bg-white text-zinc-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-zinc-50 transition-colors"
        >
          Log Session
        </Link>
      </div>
    </div>
  )
}
