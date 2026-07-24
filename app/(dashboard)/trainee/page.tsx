"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, CalendarCheck, TrendingUp, Clock, AlertTriangle, ChevronRight, CheckCircle2, Circle, Info } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"
import {
  computeMetrics, inMonth, minSupervisionPct, monthlyCapHours, MIN_MONTHLY_HOURS,
  requiredContacts, requiredObservation, supervisionColor, RATIO_COLOR_CLASS,
  RESTRICTED_MAX_PCT, GROUP_SUPERVISION_MAX_PCT, CONCENTRATED_MULTIPLIER,
  type FieldworkType, type RequirementsYear,
} from "@/lib/bacb"
import MonthlyBreakdown from "@/components/dashboard/MonthlyBreakdown"
import MonthSelect, { currentMonthValue, monthLabelFor } from "@/components/dashboard/MonthSelect"

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

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export default function TraineeDashboard() {
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState("")
  const [traineeProfile, setTraineeProfile] = useState<TraineeProfile | null>(null)
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [supervisorStatus, setSupervisorStatus] = useState<"none" | "pending" | "active">("none")
  const [tab, setTab] = useState<"msp" | "total">("msp")
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue())

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

  const targetHours = traineeProfile?.target_hours ?? 1500
  const fieldworkType = (traineeProfile?.fieldwork_type ?? "concentrated") as FieldworkType
  const reqYear = (traineeProfile?.requirements_year ?? "both") as RequirementsYear

  // --- Monthly (MSP) metrics — for whichever month is selected in the dropdown ---
  const now = new Date()
  const monthLabel = monthLabelFor(selectedMonth)
  const m = computeMetrics(inMonth(activities, selectedMonth))
  const supColor = supervisionColor(m.supervisionPct)
  const supCls = RATIO_COLOR_CLASS[supColor]
  const minSup = minSupervisionPct(fieldworkType, reqYear)
  const reqContacts = requiredContacts(fieldworkType)
  const reqObs = requiredObservation(fieldworkType, reqYear)
  const obsMet = reqObs.kind === "count" ? m.obsCount >= reqObs.value : m.obsMinutes >= reqObs.value
  const cap = monthlyCapHours(reqYear)

  // --- Total (cumulative) metrics ---
  const t = computeMetrics(activities)
  const progressPercent = Math.min(Math.round((t.totalH / targetHours) * 100), 100)
  const weightedH = fieldworkType === "concentrated"
    ? Math.round(t.totalH * CONCENTRATED_MULTIPLIER * 10) / 10
    : t.totalH

  // --- Monthly alerts (supervision MONTHLY, restricted NOT critical monthly) ---
  const mspAlerts: { type: "warning" | "error" | "info"; message: string }[] = []
  if (m.totalH > 0) {
    if (m.supervisionPct < 5) {
      mspAlerts.push({ type: "error", message: `Supervision is ${m.supervisionPct}% this month — below the 5% minimum. This month is CRITICAL until you log more supervision.` })
    } else if (m.supervisionPct < minSup) {
      mspAlerts.push({ type: "warning", message: `Supervision is ${m.supervisionPct}% this month — below your ${minSup}% target for ${fieldworkType} fieldwork.` })
    }
    if (m.groupSupPct > GROUP_SUPERVISION_MAX_PCT) {
      mspAlerts.push({ type: "warning", message: `Group supervision is ${m.groupSupPct}% of supervision — must stay under ${GROUP_SUPERVISION_MAX_PCT}%.` })
    }
    if (m.contacts < reqContacts) {
      mspAlerts.push({ type: "warning", message: `${m.contacts} of ${reqContacts} required monthly contacts logged (meetings + observations).` })
    }
    if (!obsMet) {
      mspAlerts.push({ type: "warning", message: reqObs.kind === "count"
        ? `No client observation logged this month — ${reqObs.value} required.`
        : `Observation duration is ${m.obsMinutes} min — ${reqObs.value} min required this month.` })
    }
    if (m.totalH > cap) {
      mspAlerts.push({ type: "error", message: `${m.totalH}h logged this month — exceeds the ${cap}h monthly cap.` })
    } else if (m.totalH < MIN_MONTHLY_HOURS) {
      mspAlerts.push({ type: "info", message: `${m.totalH}h this month — at least ${MIN_MONTHLY_HOURS}h needed for the month to count.` })
    }
  }

  // --- Total alerts (Restricted 50% applies over the whole experience) ---
  const totalAlerts: { type: "warning" | "error" | "info"; message: string }[] = []
  if (t.totalH > 0) {
    if (t.restrictedPct > RESTRICTED_MAX_PCT) {
      totalAlerts.push({ type: "error", message: `Restricted is ${t.restrictedPct}% of your total experience — must end at or below ${RESTRICTED_MAX_PCT}%. This typically evens out as you add coordination/unrestricted hours.` })
    }
    if (progressPercent >= 90) {
      totalAlerts.push({ type: "info", message: `${progressPercent}% toward your ${targetHours}h goal — ${(targetHours - t.totalH).toFixed(1)}h remaining.` })
    }
  }

  // --- Chart (current year by month) ---
  const currentYear = now.getFullYear()
  const chartData = MONTH_NAMES.map((month, idx) => {
    const monthMin = activities
      .filter(a => { const d = new Date(a.date + "T00:00:00"); return d.getFullYear() === currentYear && d.getMonth() === idx })
      .reduce((s, a) => s + a.duration_minutes, 0)
    return { month, hours: Math.round((monthMin / 60) * 10) / 10 }
  })

  const recentActivities = [...activities]
    .sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time))
    .slice(0, 4)

  const hour = now.getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const todayLabel = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })

  if (loading) {
    return (
      <div className="p-4 md:p-7 max-w-6xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  const alerts = tab === "msp" ? mspAlerts : totalAlerts

  return (
    <div className="p-4 md:p-7 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">{greeting}{firstName ? `, ${firstName}` : ""}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{todayLabel}</p>
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

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex gap-1 p-1 bg-zinc-100 rounded-xl w-full sm:w-auto sm:inline-flex">
          <button
            onClick={() => setTab("msp")}
            className={cn("flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
              tab === "msp" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}
          >
            {monthLabel} (MSP)
          </button>
          <button
            onClick={() => setTab("total")}
            className={cn("flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
              tab === "total" ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700")}
          >
            Total Fieldwork
          </button>
        </div>
        {tab === "msp" && (
          <MonthSelect value={selectedMonth} onChange={setSelectedMonth} />
        )}
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

      {/* Alerts */}
      {alerts.map((alert, i) => (
        <div key={i} className={cn("flex items-start gap-3 px-4 py-3 rounded-xl text-sm mb-4",
          alert.type === "error" ? "bg-red-50 border border-red-100 text-red-800" :
          alert.type === "warning" ? "bg-amber-50 border border-amber-100 text-amber-800" :
          "bg-violet-50 border border-violet-100 text-violet-800")}>
          {alert.type === "info" ? <Info className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          {alert.message}
        </div>
      ))}

      {activities.length === 0 && (
        <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Info className="w-4 h-4 text-violet-600 flex-shrink-0" />
            <p className="text-sm text-violet-800">No activities logged yet. Start tracking your fieldwork hours.</p>
          </div>
          <Link href="/trainee/activities/new" className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex-shrink-0 ml-4">Log first activity →</Link>
        </div>
      )}

      {tab === "msp" ? (
        <MonthlyBreakdown m={m} monthLabel={monthLabel} supCls={supCls}
          reqContacts={reqContacts} reqObs={reqObs} obsMet={obsMet} cap={cap} />
      ) : (
        <TotalView t={t} targetHours={targetHours} progressPercent={progressPercent}
          weightedH={weightedH} fieldworkType={fieldworkType} chartData={chartData} currentYear={currentYear} />
      )}

      {/* Recent activities (shared) */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] mt-5">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
          <h2 className="font-semibold text-zinc-900 text-sm">Recent Activities</h2>
          <Link href="/trainee/activities" className="text-xs text-violet-600 font-medium hover:text-violet-700 flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></Link>
        </div>
        {recentActivities.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-zinc-400 mb-3">No activities logged yet</p>
            <Link href="/trainee/activities/new" className="text-sm font-semibold text-violet-600 hover:text-violet-700">+ Log your first activity</Link>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {recentActivities.map((a) => (
              <Link key={a.id} href={`/trainee/activities/${a.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50/50 transition-colors">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold",
                  a.category === "Restricted" ? "bg-violet-100 text-violet-700" :
                  a.category === "Supervision" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700")}>
                  {(a.duration_minutes / 60).toFixed(1)}h
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{a.title}</p>
                  <p className="text-[11px] text-zinc-400">{formatDate(a.date)} · {formatTime(a.start_time)} – {formatTime(a.end_time)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    a.category === "Restricted" ? "bg-violet-50 text-violet-700" :
                    a.category === "Supervision" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700")}>{a.category}</span>
                  {a.status === "approved" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-zinc-300" />}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// --- Total Fieldwork view -----------------------------------------------------
function TotalView({ t, targetHours, progressPercent, weightedH, fieldworkType, chartData, currentYear }: {
  t: ReturnType<typeof computeMetrics>
  targetHours: number
  progressPercent: number
  weightedH: number
  fieldworkType: FieldworkType
  chartData: { month: string; hours: number }[]
  currentYear: number
}) {
  const restrictedOver = t.restrictedPct > RESTRICTED_MAX_PCT
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Hours", value: `${t.totalH}h`, sub: `of ${targetHours} required`, color: "text-violet-600", center: "text-zinc-900" },
          { label: "Restricted", value: `${t.restrictedH}h`, sub: `${t.restrictedPct}% · max ${RESTRICTED_MAX_PCT}% overall`, color: "text-blue-600", center: restrictedOver ? "text-red-600" : "text-zinc-900" },
          { label: "Unrestricted", value: `${t.unrestrictedH}h`, sub: "program dev etc.", color: "text-emerald-600", center: "text-zinc-900" },
          { label: "Supervision", value: `${t.supervisionH}h`, sub: `${t.supervisionPct}% · grp ${t.groupSupPct}%`, color: "text-amber-600", center: "text-zinc-900" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-[#E8E6F4] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400">{s.label}</span>
              <TrendingUp className={cn("w-3.5 h-3.5", s.color)} />
            </div>
            <p className={cn("text-2xl font-bold", s.center)}>{s.value}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-5">
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
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E8E6F4", borderRadius: 8, fontSize: 12 }} cursor={{ stroke: "#7C3AED", strokeWidth: 1, strokeDasharray: "4 4" }} />
              <Area type="monotone" dataKey="hours" stroke="#7C3AED" strokeWidth={2} fill="url(#colorHours)" dot={{ fill: "#7C3AED", r: 3 }} activeDot={{ r: 5, fill: "#7C3AED" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <h2 className="font-semibold text-zinc-900 text-sm mb-1">Toward Certification</h2>
          <p className="text-xs text-zinc-400 mb-4">{fieldworkType} fieldwork</p>
          <p className="text-3xl font-bold text-zinc-900">{t.totalH}<span className="text-base font-medium text-zinc-400">h</span></p>
          <p className="text-xs text-zinc-400 mb-3">{progressPercent}% of {targetHours}h</p>
          <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
          {fieldworkType === "concentrated" && (
            <div className="mt-4 pt-4 border-t border-zinc-100">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Weighted (1.33×)</span>
                <span className="font-semibold text-zinc-900">{weightedH}h</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">Concentrated hours count at 1.33× toward completion (estimate).</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
