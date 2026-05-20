"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Check, Pencil, Trash2, CalendarDays, AlertTriangle } from "lucide-react"
import { weeklyActivities } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const dayGroups = ["Mon", "Tue", "Wed", "Thu", "Fri"]

export default function WeeklyReviewPage() {
  const [confirmed, setConfirmed] = useState<Set<string>>(
    new Set(weeklyActivities.filter((a) => a.confirmed).map((a) => a.id))
  )

  const toggleConfirm = (id: string) => {
    setConfirmed((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const allConfirmed = weeklyActivities.every((a) => confirmed.has(a.id))
  const totalHours = weeklyActivities.reduce((s, a) => s + a.duration, 0)
  const confirmedHours = weeklyActivities.filter((a) => confirmed.has(a.id)).reduce((s, a) => s + a.duration, 0)

  return (
    <div className="p-4 md:p-7 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Weekly Review</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Confirm your activities before submitting to your supervisor</p>
        </div>
      </div>

      {/* Week nav */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-[#E8E6F4] px-4 py-3 mb-5">
        <button className="w-8 h-8 rounded-lg hover:bg-zinc-50 flex items-center justify-center text-zinc-400 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-violet-600" />
            <p className="text-sm font-semibold text-zinc-900">May 19–23, 2025</p>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">Week 21 · {confirmedHours}/{totalHours}h confirmed</p>
        </div>
        <button className="w-8 h-8 rounded-lg hover:bg-zinc-50 flex items-center justify-center text-zinc-400 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] px-4 py-3 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-zinc-700">Confirmation progress</span>
          <span className="text-xs font-semibold text-violet-600">{confirmed.size} / {weeklyActivities.length} activities</span>
        </div>
        <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all"
            style={{ width: `${(confirmed.size / weeklyActivities.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Alert: unconfirmed */}
      {!allConfirmed && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-5 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{weeklyActivities.length - confirmed.size} activities still need your confirmation before you can submit.</span>
        </div>
      )}

      {/* Activities by day */}
      <div className="space-y-4 mb-6">
        {dayGroups.map((day) => {
          const dayActivities = weeklyActivities.filter((a) => a.day === day)
          if (dayActivities.length === 0) return null
          return (
            <div key={day}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{day}</span>
                <span className="text-xs text-zinc-300">{dayActivities[0].date}</span>
                <div className="flex-1 h-px bg-zinc-100" />
                <span className="text-xs text-zinc-400">
                  {dayActivities.reduce((s, a) => s + a.duration, 0)}h
                </span>
              </div>
              <div className="space-y-2">
                {dayActivities.map((a) => {
                  const isConfirmed = confirmed.has(a.id)
                  return (
                    <div
                      key={a.id}
                      className={cn(
                        "flex items-center gap-3 bg-white rounded-xl border px-4 py-3.5 transition-all",
                        isConfirmed ? "border-emerald-100 bg-emerald-50/30" : "border-[#E8E6F4]"
                      )}
                    >
                      <button
                        onClick={() => toggleConfirm(a.id)}
                        className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                          isConfirmed ? "bg-emerald-500 border-emerald-500" : "border-zinc-300 hover:border-violet-400"
                        )}
                      >
                        {isConfirmed && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-semibold truncate", isConfirmed ? "text-zinc-700" : "text-zinc-900")}>
                          {a.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-zinc-400">{a.startTime}–{a.endTime}</span>
                          <span className={cn(
                            "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                            a.category === "Restricted" ? "bg-violet-50 text-violet-700" :
                            a.category === "Supervision" ? "bg-emerald-50 text-emerald-700" :
                            "bg-blue-50 text-blue-700"
                          )}>
                            {a.category}
                          </span>
                          {a.source === "manual" && (
                            <span className="text-[10px] text-zinc-400 italic">manual</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-sm font-semibold text-zinc-600">{a.duration}h</span>
                        <button className="w-7 h-7 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-400 transition-colors">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-zinc-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Week summary + submit */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
        <h3 className="text-sm font-semibold text-zinc-900 mb-3">Week summary</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Restricted", value: `${weeklyActivities.filter((a) => a.category === "Restricted").reduce((s, a) => s + a.duration, 0)}h`, color: "text-violet-600" },
            { label: "Unrestricted", value: `${weeklyActivities.filter((a) => a.category === "Unrestricted").reduce((s, a) => s + a.duration, 0)}h`, color: "text-blue-600" },
            { label: "Supervision", value: `${weeklyActivities.filter((a) => a.category === "Supervision").reduce((s, a) => s + a.duration, 0)}h`, color: "text-emerald-600" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
              <p className="text-[11px] text-zinc-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        <button
          disabled={!allConfirmed}
          className={cn(
            "w-full py-3 rounded-xl text-sm font-semibold transition-all",
            allConfirmed
              ? "bg-violet-600 text-white hover:bg-violet-700"
              : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
          )}
        >
          {allConfirmed ? "Submit to Dr. Rodriguez →" : `Confirm all activities to submit`}
        </button>
      </div>
    </div>
  )
}
