"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, Repeat2, Clock, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
type Category = "Restricted" | "Unrestricted" | "Supervision"

const categoryColors: Record<Category, { bg: string; text: string; ring: string }> = {
  Restricted: { bg: "bg-violet-600", text: "text-violet-600", ring: "ring-violet-300" },
  Unrestricted: { bg: "bg-blue-600", text: "text-blue-600", ring: "ring-blue-300" },
  Supervision: { bg: "bg-emerald-600", text: "text-emerald-600", ring: "ring-emerald-300" },
}

export default function NewTemplatePage() {
  const [name, setName] = useState("")
  const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set(["Mon", "Wed", "Fri"]))
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("11:00")
  const [category, setCategory] = useState<Category>("Restricted")
  const [client, setClient] = useState("")
  const [saved, setSaved] = useState(false)

  const toggleDay = (d: string) => {
    setSelectedDays((prev) => {
      const next = new Set(prev)
      next.has(d) ? next.delete(d) : next.add(d)
      return next
    })
  }

  const startMins = parseInt(startTime.split(":")[0]) * 60 + parseInt(startTime.split(":")[1])
  const endMins = parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1])
  const duration = Math.max(0, (endMins - startMins) / 60)
  const weeklyHours = duration * selectedDays.size
  const monthlyHours = weeklyHours * 4.3

  const colors = categoryColors[category]

  if (saved) {
    return (
      <div className="p-4 md:p-7 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
          <Repeat2 className="w-8 h-8 text-violet-600" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-1">Template created!</h2>
        <p className="text-sm text-zinc-500 mb-2">
          <span className="font-semibold text-zinc-700">{name || "New Template"}</span> will repeat on {Array.from(selectedDays).join(", ")}.
        </p>
        <p className="text-xs text-zinc-400 mb-6">
          Projected {weeklyHours.toFixed(1)}h / week · {monthlyHours.toFixed(1)}h / month
        </p>
        <div className="flex gap-3">
          <Link href="/trainee/templates/new" onClick={() => setSaved(false)} className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors">
            Add another
          </Link>
          <Link href="/trainee/templates" className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors">
            View templates
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-7 max-w-2xl mx-auto">
      <Link href="/trainee/templates" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Templates
      </Link>

      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900">New Template</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Set up a recurring schedule for auto-logging</p>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Template Name</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Monday DTT Session"
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
          />
        </div>

        {/* Category */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">BACB Category</p>
          <div className="flex gap-2">
            {(["Restricted", "Unrestricted", "Supervision"] as Category[]).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "flex-1 py-2 text-xs font-semibold rounded-lg border transition-all",
                  category === c
                    ? c === "Restricted" ? "bg-violet-600 text-white border-violet-600" :
                      c === "Supervision" ? "bg-emerald-600 text-white border-emerald-600" :
                      "bg-blue-600 text-white border-blue-600"
                    : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Schedule</p>

          <div className="mb-4">
            <p className="text-xs text-zinc-500 mb-2">Repeat on</p>
            <div className="flex gap-1.5">
              {DAYS.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    "w-9 h-9 rounded-full text-xs font-bold transition-all",
                    selectedDays.has(d)
                      ? colors.bg + " text-white"
                      : "bg-zinc-100 text-zinc-400 hover:bg-zinc-200"
                  )}
                >
                  {d[0]}
                </button>
              ))}
            </div>
            {selectedDays.size === 0 && (
              <p className="text-xs text-amber-500 mt-2">Select at least one day</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">Start time</p>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
              />
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">End time</p>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Client */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Client (optional)</p>
          <input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="e.g. Client A"
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
          />
        </div>

        {/* Projected hours preview */}
        {duration > 0 && selectedDays.size > 0 && (
          <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-zinc-400" />
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Projected Impact</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Per session", value: `${duration.toFixed(1)}h` },
                { label: "Per week", value: `${weeklyHours.toFixed(1)}h` },
                { label: "Per month", value: `${monthlyHours.toFixed(1)}h` },
              ].map((s) => (
                <div key={s.label} className="bg-zinc-50 rounded-xl py-3">
                  <p className="text-xl font-bold text-zinc-900">{s.value}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save */}
        <button
          onClick={() => setSaved(true)}
          disabled={!name || selectedDays.size === 0 || duration <= 0}
          className={cn(
            "w-full py-3.5 text-sm font-semibold rounded-xl transition-colors",
            name && selectedDays.size > 0 && duration > 0
              ? "bg-violet-600 text-white hover:bg-violet-700"
              : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
          )}
        >
          {name && selectedDays.size > 0 && duration > 0
            ? `Create Template — ${weeklyHours.toFixed(1)}h / week`
            : "Fill in name, days, and time to continue"
          }
        </button>
      </div>
    </div>
  )
}
