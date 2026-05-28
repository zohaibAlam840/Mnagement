"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Search, MoreHorizontal, CheckCircle2, Circle, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"]
type Category = "All" | "Restricted" | "Unrestricted" | "Supervision"

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
function formatDay(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })
}
function formatTime(t: string) {
  const [h, m] = t.split(":")
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`
}
function toHours(minutes: number) {
  return (minutes / 60).toFixed(1)
}

function statusStyle(status: string) {
  if (status === "approved") return "bg-emerald-50 text-emerald-700"
  if (status === "submitted") return "bg-amber-50 text-amber-700"
  if (status === "rejected") return "bg-red-50 text-red-700"
  return "bg-zinc-50 text-zinc-500"
}
function statusLabel(status: string) {
  if (status === "submitted") return "Pending"
  if (status === "approved") return "Approved"
  if (status === "rejected") return "Rejected"
  return "Draft"
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Category>("All")
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("activities")
        .select("*")
        .eq("trainee_id", user.id)
        .order("date", { ascending: false })
        .order("start_time", { ascending: false })
      if (data) setActivities(data)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = activities.filter((a) => {
    const matchesFilter = filter === "All" || a.category === filter
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const totalMin = activities.reduce((s, a) => s + a.duration_minutes, 0)
  const restrictedMin = activities.filter(a => a.category === "Restricted").reduce((s, a) => s + a.duration_minutes, 0)
  const unrestrictedMin = activities.filter(a => a.category === "Unrestricted").reduce((s, a) => s + a.duration_minutes, 0)
  const supervisionMin = activities.filter(a => a.category === "Supervision").reduce((s, a) => s + a.duration_minutes, 0)

  return (
    <div className="p-4 md:p-7 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Activities</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{loading ? "Loading…" : `${activities.length} logged entries`}</p>
        </div>
        <Link
          href="/trainee/activities/new"
          className="flex items-center gap-1.5 text-sm font-semibold bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Activity</span>
          <span className="sm:hidden">Add</span>
        </Link>
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activities..."
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-[#E8E6F4] bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
          />
        </div>
        <div className="flex gap-1.5 bg-white border border-[#E8E6F4] rounded-lg p-1">
          {(["All", "Restricted", "Unrestricted", "Supervision"] as Category[]).map((c) => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                filter === c ? "bg-violet-600 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-800"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Hour summary pills */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[
          { label: "Total", value: `${toHours(totalMin)}h`, color: "bg-zinc-100 text-zinc-600" },
          { label: "Restricted", value: `${toHours(restrictedMin)}h`, color: "bg-violet-50 text-violet-700" },
          { label: "Unrestricted", value: `${toHours(unrestrictedMin)}h`, color: "bg-blue-50 text-blue-700" },
          { label: "Supervision", value: `${toHours(supervisionMin)}h`, color: "bg-emerald-50 text-emerald-700" },
        ].map((s) => (
          <span key={s.label} className={cn("flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold", s.color)}>
            {s.label}: {s.value}
          </span>
        ))}
      </div>

      {/* Table / List */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_100px_80px_100px_80px_40px] gap-4 px-5 py-3 border-b border-zinc-50 bg-zinc-50/50">
          {["Activity", "Date", "Duration", "Category", "Status", ""].map((h) => (
            <span key={h} className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">{h}</span>
          ))}
        </div>

        {loading ? (
          <div className="py-12 text-center">
            <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-zinc-400">Loading activities…</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {filtered.map((a) => (
              <Link key={a.id} href={`/trainee/activities/${a.id}`} className="block hover:bg-zinc-50/30 transition-colors">
                {/* Mobile */}
                <div className="md:hidden flex items-start gap-3 px-4 py-4">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5",
                    a.category === "Restricted" ? "bg-violet-100 text-violet-700" :
                    a.category === "Supervision" ? "bg-emerald-100 text-emerald-700" :
                    "bg-blue-100 text-blue-700"
                  )}>
                    {toHours(a.duration_minutes)}h
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">{a.title}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{formatDate(a.date)} · {formatTime(a.start_time)}–{formatTime(a.end_time)}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                        a.category === "Restricted" ? "bg-violet-50 text-violet-700" :
                        a.category === "Supervision" ? "bg-emerald-50 text-emerald-700" :
                        "bg-blue-50 text-blue-700"
                      )}>{a.category}</span>
                      <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full", statusStyle(a.status))}>
                        {statusLabel(a.status)}
                      </span>
                    </div>
                  </div>
                  {a.status === "approved"
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-1" />
                    : <Circle className="w-4 h-4 text-zinc-300 flex-shrink-0 mt-1" />
                  }
                </div>

                {/* Desktop */}
                <div className="hidden md:grid grid-cols-[1fr_100px_80px_100px_80px_40px] gap-4 px-5 py-3.5 items-center">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-900 truncate">{a.title}</p>
                    {a.client_name && <p className="text-xs text-zinc-400">{a.client_name}</p>}
                  </div>
                  <div>
                    <p className="text-sm text-zinc-600">{formatDate(a.date)}</p>
                    <p className="text-xs text-zinc-400">{formatDay(a.date)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-zinc-400" />
                    <span className="text-sm text-zinc-600">{toHours(a.duration_minutes)}h</span>
                  </div>
                  <span className={cn(
                    "text-[11px] font-semibold px-2 py-1 rounded-full w-fit",
                    a.category === "Restricted" ? "bg-violet-50 text-violet-700" :
                    a.category === "Supervision" ? "bg-emerald-50 text-emerald-700" :
                    "bg-blue-50 text-blue-700"
                  )}>{a.category}</span>
                  <span className={cn("text-[11px] font-semibold px-2 py-1 rounded-full w-fit", statusStyle(a.status))}>
                    {statusLabel(a.status)}
                  </span>
                  <div className="w-7 h-7 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-400 transition-colors">
                    <MoreHorizontal className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}

            {filtered.length === 0 && !loading && (
              <div className="py-12 text-center">
                <p className="text-sm text-zinc-400">
                  {activities.length === 0 ? "No activities yet — log your first one!" : "No activities match your search"}
                </p>
                {activities.length === 0 && (
                  <Link href="/trainee/activities/new" className="mt-3 inline-block text-sm font-semibold text-violet-600 hover:text-violet-700">
                    + Log first activity
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
