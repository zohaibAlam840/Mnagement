"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertTriangle, CircleDashed, History } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { computeMvfMinutes } from "@/lib/mvf"
import {
  addDays, formatHM, formatMonthLabel, formatWeekRange, monthOf, monthRange, toDateStr, weekEndOf, weekStartOf,
} from "@/lib/period"
import type { Database } from "@/lib/supabase/types"
import { UnlockAction } from "@/components/unlock/UnlockControls"

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"]
type ReviewLite = {
  id: string
  week_start_date: string
  status: string
  reviewed_at: string | null
  unlocked_at: string | null
  unlock_note: string | null
}

const STATUS_STYLE: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: CheckCircle2 },
  submitted: { label: "Pending", cls: "bg-amber-50 text-amber-700 border-amber-100", icon: Clock },
  rejected: { label: "Returned", cls: "bg-red-50 text-red-700 border-red-100", icon: AlertTriangle },
  draft: { label: "Draft", cls: "bg-zinc-50 text-zinc-600 border-zinc-200", icon: CircleDashed },
}

function formatTime(t: string) {
  const [h, m] = t.split(":")
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`
}

function dayLabel(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

// Read-only history of logged activities for a week or a month, including after approval.
// Supervisors/admins also get per-week unlock buttons.
export function ActivityLog({
  traineeId, canUnlock = false, linkToActivity = false, initialMode = "week", initialMonth,
}: {
  traineeId: string
  canUnlock?: boolean
  linkToActivity?: boolean
  initialMode?: "week" | "month"
  initialMonth?: string
}) {
  const today = toDateStr(new Date())
  const [mode, setMode] = useState<"week" | "month">(initialMode)
  const [anchor, setAnchor] = useState(initialMonth ? `${initialMonth}-01` : today)
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [reviews, setReviews] = useState<ReviewLite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const { from, to, title } = useMemo(() => {
    if (mode === "week") {
      const ws = weekStartOf(anchor)
      return { from: ws, to: weekEndOf(ws), title: formatWeekRange(ws) }
    }
    const m = monthOf(anchor)
    const { start, next } = monthRange(m)
    return { from: start, to: addDays(next, -1), title: formatMonthLabel(m) }
  }, [mode, anchor])

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await api<{ activities: ActivityRow[]; reviews: ReviewLite[] }>(
        `/api/activities?traineeId=${traineeId}&from=${from}&to=${to}`,
      )
      setActivities(data.activities)
      setReviews(data.reviews)
    } catch (e) {
      setError((e as Error).message)
    }
    setLoading(false)
  }, [traineeId, from, to])

  useEffect(() => { load() }, [load])

  const step = (dir: -1 | 1) => {
    if (mode === "week") setAnchor(addDays(weekStartOf(anchor), dir * 7))
    else {
      const [y, m] = monthOf(anchor).split("-").map(Number)
      const d = new Date(y, m - 1 + dir, 1)
      setAnchor(toDateStr(d))
    }
  }

  const weeks = useMemo(() => {
    const starts: string[] = []
    for (let w = weekStartOf(from); w <= to; w = addDays(w, 7)) starts.push(w)
    return starts.map(ws => ({
      weekStart: ws,
      review: reviews.find(r => r.week_start_date === ws) ?? null,
      acts: activities.filter(a => weekStartOf(a.date) === ws),
    }))
  }, [from, to, activities, reviews])

  const mins = computeMvfMinutes(activities)
  const approvedMins = computeMvfMinutes(activities.filter(a => a.status === "approved")).total

  return (
    <div className="bg-white rounded-xl border border-[#E8E6F4] overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 justify-between px-4 py-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-violet-600" />
          <p className="text-sm font-semibold text-zinc-900">Logged activities</p>
        </div>
        <div className="flex items-center bg-zinc-100 rounded-lg p-0.5">
          {(["week", "month"] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn("text-xs font-semibold px-3 py-1 rounded-md capitalize", mode === m ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500")}
            >
              {m === "week" ? "Weekly" : "Monthly"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-50">
        <button onClick={() => step(-1)} className="w-8 h-8 rounded-lg hover:bg-zinc-50 flex items-center justify-center text-zinc-400">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-900">{title}</p>
          <p className="text-[11px] text-zinc-400">
            {formatHM(mins.total)} logged · {formatHM(approvedMins)} approved
            {mode === "month" && " · only days in this month"}
          </p>
        </div>
        <button
          onClick={() => step(1)}
          disabled={to >= today}
          className="w-8 h-8 rounded-lg hover:bg-zinc-50 flex items-center justify-center text-zinc-400 disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {activities.length > 0 && (
        <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-zinc-50">
          {[
            { label: "Independent", value: formatHM(mins.independent), cls: "text-blue-600" },
            { label: "Supervised", value: formatHM(mins.supervised), cls: "text-emerald-600" },
            { label: "Observation", value: formatHM(mins.observation), cls: "text-violet-600" },
          ].map(s => (
            <div key={s.label} className="text-center bg-zinc-50 rounded-lg py-2">
              <p className={cn("text-sm font-bold", s.cls)}>{s.value}</p>
              <p className="text-[10px] text-zinc-400">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="py-10 flex justify-center">
          <div className="w-5 h-5 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="px-4 py-6 text-sm text-red-600">{error}</p>
      ) : activities.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-zinc-400">No activities logged in this period.</p>
      ) : (
        <div className="divide-y divide-zinc-100">
          {weeks.filter(w => w.acts.length > 0 || w.review).map(w => {
            const st = w.review ? STATUS_STYLE[w.review.status] : null
            return (
              <div key={w.weekStart}>
                <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 bg-zinc-50/70">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide flex-1">Week of {formatWeekRange(w.weekStart)}</p>
                  {st ? (
                    <span className={cn("inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border", st.cls)}>
                      <st.icon className="w-3 h-3" />
                      {w.review!.status === "draft" && w.review!.unlocked_at ? "Unlocked for edits" : st.label}
                    </span>
                  ) : (
                    <span className="text-[10px] text-zinc-400">Not submitted</span>
                  )}
                  {canUnlock && w.review?.status === "approved" && (
                    <UnlockAction traineeId={traineeId} scope="week" period={w.weekStart} onDone={load} className="ml-1" />
                  )}
                </div>
                {w.acts.map(a => {
                  const s = STATUS_STYLE[a.status] ?? STATUS_STYLE.draft
                  const row = (
                    <div className="flex items-center gap-3 px-4 py-2.5">
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                        a.category === "Restricted" ? "bg-violet-100 text-violet-700" :
                        a.category === "Supervision" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700",
                      )}>
                        {formatHM(a.duration_minutes)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">{a.title}</p>
                        <p className="text-[11px] text-zinc-400">
                          {dayLabel(a.date)} · {formatTime(a.start_time)} – {formatTime(a.end_time)} · {a.category}
                          {a.observation_with_client ? ` · ${a.observation_duration_minutes}m observation` : ""}
                        </p>
                      </div>
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0", s.cls)}>{s.label}</span>
                    </div>
                  )
                  return linkToActivity
                    ? <Link key={a.id} href={`/trainee/activities/${a.id}`} className="block hover:bg-zinc-50/60">{row}</Link>
                    : <div key={a.id}>{row}</div>
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
