"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Search, MoreHorizontal, CheckCircle2, Circle, Clock } from "lucide-react"
import { activities } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

type Category = "All" | "Restricted" | "Unrestricted" | "Supervision"

export default function ActivitiesPage() {
  const [filter, setFilter] = useState<Category>("All")
  const [search, setSearch] = useState("")

  const filtered = activities.filter((a) => {
    const matchesFilter = filter === "All" || a.category === filter
    const matchesSearch = a.title.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="p-4 md:p-7 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Activities</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{activities.length} logged entries</p>
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
                filter === c
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800"
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
          { label: "Total", value: "13.0h", color: "bg-zinc-100 text-zinc-600" },
          { label: "Restricted", value: "4.0h", color: "bg-violet-50 text-violet-700" },
          { label: "Unrestricted", value: "8.0h", color: "bg-blue-50 text-blue-700" },
          { label: "Supervision", value: "1.0h", color: "bg-emerald-50 text-emerald-700" },
        ].map((s) => (
          <span key={s.label} className={cn("flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold", s.color)}>
            {s.label}: {s.value}
          </span>
        ))}
      </div>

      {/* Table / List */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] overflow-hidden">
        {/* Desktop table header */}
        <div className="hidden md:grid grid-cols-[1fr_100px_80px_100px_80px_40px] gap-4 px-5 py-3 border-b border-zinc-50 bg-zinc-50/50">
          {["Activity", "Date", "Duration", "Category", "Status", ""].map((h) => (
            <span key={h} className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">{h}</span>
          ))}
        </div>

        <div className="divide-y divide-zinc-50">
          {filtered.map((a) => (
            <Link key={a.id} href={`/trainee/activities/${a.id}`} className="block hover:bg-zinc-50/30 transition-colors">
              {/* Mobile layout */}
              <div className="md:hidden flex items-start gap-3 px-4 py-4">
                <div className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold mt-0.5",
                  a.category === "Restricted" ? "bg-violet-100 text-violet-700" :
                  a.category === "Supervision" ? "bg-emerald-100 text-emerald-700" :
                  "bg-blue-100 text-blue-700"
                )}>
                  {a.duration}h
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">{a.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{a.date} · {a.startTime}–{a.endTime}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      a.category === "Restricted" ? "bg-violet-50 text-violet-700" :
                      a.category === "Supervision" ? "bg-emerald-50 text-emerald-700" :
                      "bg-blue-50 text-blue-700"
                    )}>{a.category}</span>
                    <span className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                      a.status === "confirmed" ? "bg-emerald-50 text-emerald-700" :
                      a.status === "pending" ? "bg-amber-50 text-amber-700" :
                      "bg-red-50 text-red-700"
                    )}>{a.status}</span>
                  </div>
                </div>
                {a.supervisorApproved
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-1" />
                  : <Circle className="w-4 h-4 text-zinc-300 flex-shrink-0 mt-1" />
                }
              </div>

              {/* Desktop layout */}
              <div className="hidden md:grid grid-cols-[1fr_100px_80px_100px_80px_40px] gap-4 px-5 py-3.5 items-center">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{a.title}</p>
                  {a.client && <p className="text-xs text-zinc-400">{a.client}</p>}
                </div>
                <div>
                  <p className="text-sm text-zinc-600">{a.date}</p>
                  <p className="text-xs text-zinc-400">{a.day}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-zinc-400" />
                  <span className="text-sm text-zinc-600">{a.duration}h</span>
                </div>
                <span className={cn(
                  "text-[11px] font-semibold px-2 py-1 rounded-full w-fit",
                  a.category === "Restricted" ? "bg-violet-50 text-violet-700" :
                  a.category === "Supervision" ? "bg-emerald-50 text-emerald-700" :
                  "bg-blue-50 text-blue-700"
                )}>{a.category}</span>
                <div className="flex items-center gap-1.5">
                  <span className={cn(
                    "text-[11px] font-semibold px-2 py-1 rounded-full w-fit",
                    a.status === "confirmed" ? "bg-emerald-50 text-emerald-700" :
                    a.status === "pending" ? "bg-amber-50 text-amber-700" :
                    "bg-red-50 text-red-700"
                  )}>{a.status}</span>
                </div>
                <div className="w-7 h-7 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-400 transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-zinc-400">No activities match your search</p>
          </div>
        )}
      </div>

    </div>
  )
}
