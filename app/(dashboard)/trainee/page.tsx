"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, CalendarCheck, TrendingUp, Clock, AlertTriangle, ChevronRight, CheckCircle2, Circle, Info } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"]
type TraineeProfile = Database["public"]["Tables"]["trainee_profiles"]["Row"]

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
function formatTime(t: string) {
  const [h, m] = t.split(":")
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`
}

function ComplianceRing({ percent, max, label, color, isMin }: {
  percent: number; max: number; label: string; color: string; isMin?: boolean
}) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const capped = Math.min(percent, 100)
  const fill = (capped / 100) * circumference
  const isOver = !isMin && percent > max
  const isUnder = isMin && percent < max

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="8" />
          <circle
            cx="48" cy="48" r={radius}
            fill="none"
            stroke={isOver || isUnder ? "#EF4444" : color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - fill}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-lg font-bold", isOver || isUnder ? "text-red-500" : "text-zinc-900")}>
            {percent}%
          </span>
          <span className="text-[9px] text-zinc-400 text-center leading-tight">{label}</span>
        </div>
      </div>
      <span className={cn("text-[10px] font-medium text-center", isOver ? "text-red-500" : isUnder ? "text-red-500" : "text-zinc-500")}>
        {isOver ? `Over ${max}% limit` : isMin ? `Min ${max}%` : `Max ${max}%`}
      </span>
    </div>
  )
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export default function TraineeDashboard() {
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState("")
  const [traineeProfile, setTraineeProfile] = useState<TraineeProfile | null>(null)
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [supervisorStatus, setSupervisorStatus] = useState<"none" | "pending" | "active">("none")

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, traineeRes, activitiesRes, relRes] = await Promise.all([
        supabase.from("profiles").select("first_name").eq("id", user.id).single(),
        supabase.from("trainee_profiles").select("*").eq("id", user.id).single(),
        supabase.from("activities").select("*").eq("trainee_id", user.id),
        supabase.from("supervisor_relationships").select("status").eq("trainee_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ])

      if (profileRes.data) setFirstName(profileRes.data.first_name)
      if (traineeRes.data) setTraineeProfile(traineeRes.data)
      if (activitiesRes.data) setActivities(activitiesRes.data)
      const relStatus = relRes.data?.status
      setSupervisorStatus(relStatus === "active" ? "active" : relStatus === "pending" ? "pending" : "none")
      setLoading(false)
    }
    load()
  }, [])

  // --- Calculated stats ---
  const totalMin = activities.reduce((s, a) => s + a.duration_minutes, 0)
  const restrictedMin = activities.filter(a => a.category === "Restricted").reduce((s, a) => s + a.duration_minutes, 0)
  const unrestrictedMin = activities.filter(a => a.category === "Unrestricted").reduce((s, a) => s + a.duration_minutes, 0)
  const supervisionMin = activities.filter(a => a.category === "Supervision").reduce((s, a) => s + a.duration_minutes, 0)

  const totalHours = parseFloat((totalMin / 60).toFixed(1))
  const restrictedHours = parseFloat((restrictedMin / 60).toFixed(1))
  const unrestrictedHours = parseFloat((unrestrictedMin / 60).toFixed(1))
  const supervisionHours = parseFloat((supervisionMin / 60).toFixed(1))

  const targetHours = traineeProfile?.target_hours ?? 1500
  const fieldworkType = traineeProfile?.fieldwork_type ?? "concentrated"
  const reqYear = traineeProfile?.requirements_year ?? "both"

  const restrictedPercent = totalMin > 0 ? Math.round((restrictedMin / totalMin) * 100) : 0
  const supervisionPercent = totalMin > 0 ? Math.round((supervisionMin / totalMin) * 100) : 0
  const progressPercent = Math.min(Math.round((totalHours / targetHours) * 100), 100)

  // Min supervision % based on fieldwork type + req year
  const minSupervisionPct = fieldworkType === "concentrated"
    ? (reqYear === "2027" ? 7.5 : 10)
    : 5

  // Monthly hour cap: 2022 = 130h, 2027 = 160h; "both" uses stricter 130h
  const monthlyCapHours = reqYear === "2027" ? 160 : 130

  // Current month hours
  const now2 = new Date()
  const monthStart = `${now2.getFullYear()}-${String(now2.getMonth() + 1).padStart(2, "0")}-01`
  const monthlyHours = parseFloat((activities.filter(a => a.date >= monthStart).reduce((s, a) => s + a.duration_minutes, 0) / 60).toFixed(1))

  // --- Compliance alerts ---
  const alerts: { type: "warning" | "error" | "info"; message: string }[] = []
  if (totalHours > 0) {
    if (restrictedPercent > 50) {
      alerts.push({ type: "error", message: `Restricted hours are ${restrictedPercent}% of total — BACB limit is 50%. You need to log more unrestricted hours.` })
    } else if (restrictedPercent > 45) {
      alerts.push({ type: "warning", message: `Restricted hours at ${restrictedPercent}% — approaching the 50% BACB limit.` })
    }
    if (supervisionPercent < minSupervisionPct && totalHours > 10) {
      alerts.push({ type: "warning", message: `Supervision is only ${supervisionPercent}% of total hours. Minimum required: ${minSupervisionPct}% (${fieldworkType} fieldwork).` })
    }
    if (monthlyHours > monthlyCapHours) {
      alerts.push({ type: "error", message: `You've logged ${monthlyHours}h this month — exceeds the ${monthlyCapHours}h monthly BACB cap for ${reqYear} requirements.` })
    } else if (monthlyHours > monthlyCapHours * 0.9) {
      alerts.push({ type: "warning", message: `${monthlyHours}h logged this month — approaching the ${monthlyCapHours}h monthly BACB cap.` })
    }
    if (progressPercent >= 90) {
      alerts.push({ type: "info", message: `You're ${progressPercent}% toward your ${targetHours}h goal — ${(targetHours - totalHours).toFixed(1)} hours remaining!` })
    }
  }

  // --- Chart data (current year by month) ---
  const currentYear = new Date().getFullYear()
  const chartData = MONTH_NAMES.map((month, idx) => {
    const monthMin = activities
      .filter(a => {
        const d = new Date(a.date + "T00:00:00")
        return d.getFullYear() === currentYear && d.getMonth() === idx
      })
      .reduce((s, a) => s + a.duration_minutes, 0)
    return { month, hours: parseFloat((monthMin / 60).toFixed(1)) }
  })

  // --- Recent 4 activities ---
  const recentActivities = [...activities]
    .sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time))
    .slice(0, 4)

  // --- Greeting + date ---
  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 1)
  const weekNum = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
  const todayLabel = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })

  if (loading) {
    return (
      <div className="p-4 md:p-7 max-w-6xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-7 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">
            {greeting}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">Week {weekNum} · {todayLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/trainee/weekly-review" className="flex items-center gap-1.5 text-xs font-semibold bg-violet-600 text-white px-3 py-2 rounded-lg hover:bg-violet-700 transition-colors">
            <CalendarCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Review Week</span>
            <span className="sm:hidden">Review</span>
          </Link>
          <Link href="/notifications" className="relative hidden md:flex w-9 h-9 rounded-lg bg-white border border-[#E8E6F4] items-center justify-center hover:bg-zinc-50 transition-colors">
            <Bell className="w-4 h-4 text-zinc-500" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-violet-600 rounded-full" />
          </Link>
        </div>
      </div>

      {/* Supervisor status banner */}
      {supervisorStatus === "pending" && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm mb-4 bg-amber-50 border border-amber-100 text-amber-800">
          <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>You have a pending supervisor connection waiting for review.</span>
          <Link href="/trainee/supervisor" className="ml-auto text-xs font-semibold text-amber-700 hover:text-amber-900 whitespace-nowrap">Review →</Link>
        </div>
      )}
      {supervisorStatus === "none" && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm mb-4 bg-zinc-50 border border-zinc-200 text-zinc-600">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>No supervisor connected yet.</span>
          <Link href="/trainee/supervisor" className="ml-auto text-xs font-semibold text-violet-600 hover:text-violet-800 whitespace-nowrap">Connect →</Link>
        </div>
      )}

      {/* Compliance alerts */}
      {alerts.map((alert, i) => (
        <div key={i} className={cn(
          "flex items-start gap-3 px-4 py-3 rounded-xl text-sm mb-4",
          alert.type === "error" ? "bg-red-50 border border-red-100 text-red-800" :
          alert.type === "warning" ? "bg-amber-50 border border-amber-100 text-amber-800" :
          "bg-violet-50 border border-violet-100 text-violet-800"
        )}>
          {alert.type === "info"
            ? <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
            : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          {alert.message}
        </div>
      ))}

      {/* No activities yet */}
      {activities.length === 0 && (
        <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Info className="w-4 h-4 text-violet-600 flex-shrink-0" />
            <p className="text-sm text-violet-800">No activities logged yet. Start tracking your fieldwork hours.</p>
          </div>
          <Link href="/trainee/activities/new" className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex-shrink-0 ml-4">
            Log first activity →
          </Link>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Hours", value: `${totalHours}h`, sub: `of ${targetHours} required`, icon: Clock, color: "text-violet-600" },
          { label: "Restricted", value: `${restrictedHours}h`, sub: totalMin > 0 ? `${restrictedPercent}% of total` : "0% of total", icon: TrendingUp, color: "text-blue-600" },
          { label: "Unrestricted", value: `${unrestrictedHours}h`, sub: "program development etc.", icon: TrendingUp, color: "text-emerald-600" },
          { label: "Supervision", value: `${supervisionHours}h`, sub: totalMin > 0 ? `${supervisionPercent}% of total` : "0% of total", icon: CheckCircle2, color: "text-amber-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-[#E8E6F4] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400">{stat.label}</span>
              <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
            </div>
            <p className="text-2xl font-bold text-zinc-900">{stat.value}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid md:grid-cols-3 gap-5 mb-5">
        {/* Chart */}
        <div className="md:col-span-2 bg-white rounded-xl border border-[#E8E6F4] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-zinc-900 text-sm">Hours This Year</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Restricted + Unrestricted + Supervision</p>
            </div>
            <span className="text-xs text-zinc-400 font-medium">{currentYear}</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid #E8E6F4", borderRadius: 8, fontSize: 12 }}
                cursor={{ stroke: "#7C3AED", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Area type="monotone" dataKey="hours" stroke="#7C3AED" strokeWidth={2} fill="url(#colorHours)" dot={{ fill: "#7C3AED", r: 3 }} activeDot={{ r: 5, fill: "#7C3AED" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Compliance rings */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <h2 className="font-semibold text-zinc-900 text-sm mb-1">Compliance Ratios</h2>
          <p className="text-xs text-zinc-400 mb-5">BACB certification requirements</p>
          <div className="flex items-center justify-around">
            <ComplianceRing percent={restrictedPercent} max={50} label="Restricted" color="#7C3AED" />
            <ComplianceRing percent={supervisionPercent} max={minSupervisionPct} label="Supervision" color="#10B981" isMin />
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Toward certification</span>
              <span className="font-semibold text-zinc-900">{progressPercent}%</span>
            </div>
            <div className="mt-1.5 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">{totalHours} / {targetHours} hours</p>
          </div>
        </div>
      </div>

      {/* Recent activities */}
      <div className="bg-white rounded-xl border border-[#E8E6F4]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
          <h2 className="font-semibold text-zinc-900 text-sm">Recent Activities</h2>
          <Link href="/trainee/activities" className="text-xs text-violet-600 font-medium hover:text-violet-700 flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        {recentActivities.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-zinc-400 mb-3">No activities logged yet</p>
            <Link href="/trainee/activities/new" className="text-sm font-semibold text-violet-600 hover:text-violet-700">
              + Log your first activity
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {recentActivities.map((a) => (
              <Link key={a.id} href={`/trainee/activities/${a.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50/50 transition-colors">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold",
                  a.category === "Restricted" ? "bg-violet-100 text-violet-700" :
                  a.category === "Supervision" ? "bg-emerald-100 text-emerald-700" :
                  "bg-blue-100 text-blue-700"
                )}>
                  {(a.duration_minutes / 60).toFixed(1)}h
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{a.title}</p>
                  <p className="text-[11px] text-zinc-400">{formatDate(a.date)} · {formatTime(a.start_time)} – {formatTime(a.end_time)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
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
                    : <Circle className="w-3.5 h-3.5 text-zinc-300" />
                  }
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
