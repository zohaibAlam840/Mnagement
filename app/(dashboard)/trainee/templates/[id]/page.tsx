"use client"

import { useState, use } from "react"
import Link from "next/link"
import {
  ChevronLeft, Repeat2, Save, X, ToggleLeft, ToggleRight,
  Trash2, Clock, CalendarDays, TrendingUp
} from "lucide-react"
import { templates, activities } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export default function TemplateDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const template = templates.find((t) => t.id === id) ?? templates[0]

  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(template.title)
  const [selectedDays, setSelectedDays] = useState(new Set(template.days))
  const [startTime, setStartTime] = useState(template.startTime)
  const [endTime, setEndTime] = useState(template.endTime)
  const [category, setCategory] = useState(template.category)
  const [active, setActive] = useState(template.active)

  const toggleDay = (d: string) => {
    setSelectedDays((prev) => {
      const next = new Set(prev)
      next.has(d) ? next.delete(d) : next.add(d)
      return next
    })
  }

  const generatedActivities = activities
    .filter((a) => a.category === template.category)
    .slice(0, 4)

  const weeklyHours = selectedDays.size * template.duration
  const monthlyHours = weeklyHours * 4.3

  return (
    <div className="p-4 md:p-7 max-w-2xl mx-auto">
      <Link href="/trainee/templates" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Templates
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            template.category === "Restricted" ? "bg-violet-100" :
            template.category === "Supervision" ? "bg-emerald-100" : "bg-blue-100"
          )}>
            <Repeat2 className={cn(
              "w-5 h-5",
              template.category === "Restricted" ? "text-violet-600" :
              template.category === "Supervision" ? "text-emerald-600" : "text-blue-600"
            )} />
          </div>
          {editing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 text-xl font-bold text-zinc-900 bg-transparent border-b-2 border-violet-400 focus:outline-none pb-1"
            />
          ) : (
            <h1 className="text-lg md:text-xl font-bold text-zinc-900 leading-tight">{title}</h1>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="w-9 h-9 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 transition-colors">
                <X className="w-4 h-4" />
              </button>
              <button onClick={() => setEditing(false)} className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center text-white hover:bg-violet-700 transition-colors">
                <Save className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setActive(!active)} className="text-zinc-400 hover:text-violet-600 transition-colors">
                {active ? <ToggleRight className="w-6 h-6 text-violet-500" /> : <ToggleLeft className="w-6 h-6" />}
              </button>
              <button onClick={() => setEditing(true)} className="text-xs font-semibold text-violet-600 border border-violet-200 bg-violet-50 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition-colors">
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center gap-2 mb-5">
        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full",
          template.category === "Restricted" ? "bg-violet-50 text-violet-700" :
          template.category === "Supervision" ? "bg-emerald-50 text-emerald-700" :
          "bg-blue-50 text-blue-700"
        )}>
          {template.category}
        </span>
        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full",
          active ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
        )}>
          {active ? "Active" : "Paused"}
        </span>
        {template.client && (
          <span className="text-xs text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-full">{template.client}</span>
        )}
      </div>

      {/* Schedule */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-4">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Schedule</p>

        <div className="mb-4">
          <p className="text-xs text-zinc-500 mb-2">Repeat on</p>
          <div className="flex gap-1.5">
            {DAYS.map((d) => (
              <button
                key={d}
                onClick={() => editing && toggleDay(d)}
                disabled={!editing}
                className={cn(
                  "w-9 h-9 rounded-full text-xs font-bold transition-all",
                  selectedDays.has(d)
                    ? template.category === "Restricted" ? "bg-violet-600 text-white" :
                      template.category === "Supervision" ? "bg-emerald-600 text-white" :
                      "bg-blue-600 text-white"
                    : editing ? "bg-zinc-100 text-zinc-400 hover:bg-zinc-200" : "bg-zinc-100 text-zinc-400"
                )}
              >
                {d[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-zinc-500 mb-1">Start time</p>
            {editing ? (
              <input type="time" value={startTime.replace(" AM", "").replace(" PM", "")} onChange={(e) => setStartTime(e.target.value)} className="w-full text-sm font-semibold border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
            ) : (
              <p className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-zinc-400" />{startTime}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1">End time</p>
            {editing ? (
              <input type="time" value={endTime.replace(" AM", "").replace(" PM", "")} onChange={(e) => setEndTime(e.target.value)} className="w-full text-sm font-semibold border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
            ) : (
              <p className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-zinc-400" />{endTime}</p>
            )}
          </div>
        </div>

        {editing && (
          <div className="mt-3">
            <p className="text-xs text-zinc-500 mb-1">Category</p>
            <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="w-full text-sm font-semibold border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none bg-white">
              <option>Restricted</option>
              <option>Unrestricted</option>
              <option>Supervision</option>
            </select>
          </div>
        )}
      </div>

      {/* Projected hours */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-4">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Projected Hours</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: "Per session", value: `${template.duration}h` },
            { label: "Per week", value: `${weeklyHours}h`, icon: <TrendingUp className="w-3 h-3" /> },
            { label: "Per month (est.)", value: `${monthlyHours.toFixed(1)}h` },
          ].map((s) => (
            <div key={s.label} className="bg-zinc-50 rounded-xl py-3">
              <p className="text-xl font-bold text-zinc-900">{s.value}</p>
              <p className="text-[10px] text-zinc-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
        {template.nextOccurrence && (
          <p className="text-xs text-zinc-500 mt-3 flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" />
            Next occurrence: <span className="font-semibold text-zinc-800">{template.nextOccurrence}</span>
          </p>
        )}
      </div>

      {/* Generated activities */}
      <div className="bg-white rounded-xl border border-[#E8E6F4]">
        <div className="px-5 py-4 border-b border-zinc-50">
          <p className="text-sm font-semibold text-zinc-900">Recently Generated</p>
          <p className="text-xs text-zinc-400 mt-0.5">Activities created from this template</p>
        </div>
        <div className="divide-y divide-zinc-50">
          {generatedActivities.map((a) => (
            <Link key={a.id} href={`/trainee/activities/${a.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50/50 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-[10px] font-bold text-violet-700 flex-shrink-0">
                {a.duration}h
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{a.title}</p>
                <p className="text-xs text-zinc-400">{a.date}</p>
              </div>
              <ChevronLeft className="w-3.5 h-3.5 text-zinc-300 rotate-180" />
            </Link>
          ))}
        </div>
      </div>

      {/* Delete */}
      <button className="mt-5 w-full flex items-center justify-center gap-2 text-sm font-semibold text-red-500 border border-red-100 bg-red-50 py-2.5 rounded-xl hover:bg-red-100 transition-colors">
        <Trash2 className="w-4 h-4" /> Delete template
      </button>
    </div>
  )
}
