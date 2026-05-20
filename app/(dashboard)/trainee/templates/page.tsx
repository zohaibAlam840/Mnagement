"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Repeat2, ToggleLeft, ToggleRight, Clock } from "lucide-react"
import { templates } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export default function TemplatesPage() {
  return (
    <div className="p-4 md:p-7 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Templates</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Recurring schedules that auto-populate your weekly log</p>
        </div>
        <Link
          href="/trainee/templates/new"
          className="flex items-center gap-1.5 text-sm font-semibold bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Template</span>
          <span className="sm:hidden">New</span>
        </Link>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 mb-6 mt-4">
        <Repeat2 className="w-4 h-4 text-violet-600 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-violet-700 leading-relaxed">
          Templates auto-generate activities in your weekly review based on your recurring schedule.
          Tag a category once — FieldLog handles the rest.
        </p>
      </div>

      {/* Template grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {templates.map((t) => (
          <Link key={t.id} href={`/trainee/templates/${t.id}`} className={cn(
            "bg-white rounded-xl border p-5 transition-all block hover:shadow-sm",
            t.active ? "border-[#E8E6F4]" : "border-zinc-100 opacity-60"
          )}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  t.category === "Restricted" ? "bg-violet-100" :
                  t.category === "Supervision" ? "bg-emerald-100" : "bg-blue-100"
                )}>
                  <Repeat2 className={cn(
                    "w-4 h-4",
                    t.category === "Restricted" ? "text-violet-600" :
                    t.category === "Supervision" ? "text-emerald-600" : "text-blue-600"
                  )} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 leading-tight">{t.title}</p>
                  {t.client && <p className="text-[11px] text-zinc-400 mt-0.5">{t.client}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-zinc-400">
                  {t.active ? <ToggleRight className="w-5 h-5 text-violet-500" /> : <ToggleLeft className="w-5 h-5" />}
                </span>
              </div>
            </div>

            {/* Day pills */}
            <div className="flex gap-1 mb-3">
              {DAYS.map((d) => (
                <span key={d} className={cn(
                  "text-[10px] font-semibold w-7 h-7 rounded-full flex items-center justify-center",
                  t.days.includes(d)
                    ? t.category === "Restricted" ? "bg-violet-600 text-white" :
                      t.category === "Supervision" ? "bg-emerald-600 text-white" :
                      "bg-blue-600 text-white"
                    : "bg-zinc-100 text-zinc-400"
                )}>
                  {d[0]}
                </span>
              ))}
            </div>

            {/* Details row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-xs text-zinc-500">
                  <Clock className="w-3 h-3" />
                  {t.startTime} – {t.endTime}
                </div>
                <span className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                  t.category === "Restricted" ? "bg-violet-50 text-violet-700" :
                  t.category === "Supervision" ? "bg-emerald-50 text-emerald-700" :
                  "bg-blue-50 text-blue-700"
                )}>
                  {t.category}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-zinc-900">{t.weeklyHours}h / week</p>
                {t.nextOccurrence && (
                  <p className="text-[10px] text-zinc-400">Next: {t.nextOccurrence}</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Weekly hours summary */}
      <div className="mt-6 bg-white rounded-xl border border-[#E8E6F4] p-5">
        <h3 className="text-sm font-semibold text-zinc-900 mb-3">Projected Weekly Hours</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Restricted", value: "8.0h", color: "bg-violet-600" },
            { label: "Unrestricted", value: "3.0h", color: "bg-blue-500" },
            { label: "Supervision", value: "1.0h", color: "bg-emerald-500" },
          ].map((s) => (
            <div key={s.label}>
              <div className="flex items-center gap-1.5 mb-1">
                <div className={cn("w-2 h-2 rounded-full", s.color)} />
                <span className="text-xs text-zinc-500">{s.label}</span>
              </div>
              <p className="text-lg font-bold text-zinc-900">{s.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 h-2 bg-zinc-100 rounded-full overflow-hidden flex">
          <div className="bg-violet-600 h-full" style={{ width: "66.7%" }} />
          <div className="bg-blue-500 h-full" style={{ width: "25%" }} />
          <div className="bg-emerald-500 h-full" style={{ width: "8.3%" }} />
        </div>
        <p className="text-xs text-zinc-400 mt-1.5">12.0h projected total per week</p>
      </div>

    </div>
  )
}
