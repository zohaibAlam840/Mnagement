"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Clock, User, Tag, AlignLeft, CheckCircle2, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const CATEGORIES = ["Restricted", "Unrestricted", "Supervision"] as const
type Category = typeof CATEGORIES[number]

const SUBCATEGORIES: Record<Category, string[]> = {
  Restricted: [
    "Discrete Trial Training",
    "Natural Environment Training",
    "Functional Behavior Assessment",
    "Behavior Intervention Plan",
    "Skill Acquisition Program",
    "Other Restricted",
  ],
  Unrestricted: [
    "Program Development",
    "Staff Training",
    "Parent Training",
    "Data Review",
    "Graphing / Analysis",
    "Documentation",
    "Other Unrestricted",
  ],
  Supervision: [
    "Individual Supervision",
    "Group Supervision",
    "Observation — Direct",
    "Observation — Remote",
    "Case Review",
    "Other Supervision",
  ],
}

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export default function NewTemplatePage() {
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<Category>("Restricted")
  const [subcategory, setSubcategory] = useState(SUBCATEGORIES["Restricted"][0])
  const [days, setDays] = useState<string[]>(["Mon", "Tue", "Wed", "Thu", "Fri"])
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("11:00")
  const [client, setClient] = useState("")
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  const startMinutes = parseInt(startTime.split(":")[0]) * 60 + parseInt(startTime.split(":")[1])
  const endMinutes = parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1])
  const durationMinutes = Math.max(0, endMinutes - startMinutes)
  const durationHours = durationMinutes / 60
  const weeklyHours = durationHours * days.length
  const monthlyHours = weeklyHours * 4.3

  const handleCategoryChange = (c: Category) => {
    setCategory(c)
    setSubcategory(SUBCATEGORIES[c][0])
  }

  const toggleDay = (d: string) => {
    setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])
  }

  const handleSave = async () => {
    setError("")
    if (!title.trim()) { setError("Template name is required"); return }
    if (durationMinutes <= 0) { setError("End time must be after start time"); return }
    if (days.length === 0) { setError("Select at least one day"); return }

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError("Not signed in"); setSaving(false); return }

    const { error: insertError } = await supabase.from("activity_templates").insert({
      trainee_id: user.id,
      title: title.trim(),
      category,
      subcategory,
      days,
      start_time: startTime + ":00",
      end_time: endTime + ":00",
      client_name: client || null,
      notes: notes || null,
      active: true,
    })

    setSaving(false)
    if (insertError) { setError(insertError.message); return }
    setSaved(true)
  }

  if (saved) {
    return (
      <div className="p-4 md:p-7 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-1">Template saved!</h2>
        <p className="text-sm text-zinc-500 mb-1">{title} — {days.length}× per week</p>
        <p className="text-xs text-zinc-400 mb-6">
          {weeklyHours.toFixed(1)}h/week · {monthlyHours.toFixed(1)}h/month projected
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setSaved(false)
              setTitle("")
              setNotes("")
              setClient("")
              setDays(["Mon", "Tue", "Wed", "Thu", "Fri"])
            }}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Add another
          </button>
          <button
            onClick={() => router.push("/trainee/templates")}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors"
          >
            View all templates
          </button>
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
        <p className="text-sm text-zinc-500 mt-0.5">Set up a recurring activity schedule</p>
      </div>

      <div className="space-y-4">
        {/* Title */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
            <AlignLeft className="w-3.5 h-3.5" /> Template Name
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Morning DTT Session"
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
          />
        </div>

        {/* Days */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
            Recurring Days
          </label>
          <div className="flex gap-1.5">
            {ALL_DAYS.map((d) => (
              <button
                key={d}
                onClick={() => toggleDay(d)}
                className={cn(
                  "flex-1 py-2.5 text-xs font-bold rounded-lg border transition-all",
                  days.includes(d)
                    ? category === "Restricted" ? "bg-violet-600 text-white border-violet-600" :
                      category === "Supervision" ? "bg-emerald-600 text-white border-emerald-600" :
                      "bg-blue-600 text-white border-blue-600"
                    : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                )}
              >
                {d[0]}
              </button>
            ))}
          </div>
          {days.length > 0 && (
            <p className="text-xs text-zinc-400 mt-2">{days.length} day{days.length !== 1 ? "s" : ""} per week</p>
          )}
        </div>

        {/* Time */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
            <Clock className="w-3.5 h-3.5" /> Time
          </label>
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
          {durationMinutes > 0 && (
            <div className="flex items-center gap-2 text-sm text-zinc-500 bg-zinc-50 rounded-lg px-3.5 py-2 mt-3">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>
                {durationHours.toFixed(1)}h per session
                {days.length > 0 && (
                  <span className="text-zinc-400 ml-1">→ {weeklyHours.toFixed(1)}h/week</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Category */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
            <Tag className="w-3.5 h-3.5" /> BACB Category
          </label>
          <div className="flex gap-2 mb-4">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => handleCategoryChange(c)}
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
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">Subcategory</p>
            <select
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all bg-white"
            >
              {SUBCATEGORIES[category].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Client */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
            <User className="w-3.5 h-3.5" /> Client (optional)
          </label>
          <input
            value={client}
            onChange={(e) => setClient(e.target.value)}
            placeholder="e.g. Client A"
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
          />
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Notes (optional)</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Additional details about this recurring activity..."
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all resize-none placeholder:text-zinc-300"
          />
        </div>

        {/* Projected impact */}
        {durationMinutes > 0 && days.length > 0 && (
          <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Projected Impact</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: "Per session", value: `${durationHours.toFixed(1)}h` },
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

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={!title || durationMinutes <= 0 || days.length === 0 || saving}
          className={cn(
            "w-full py-3.5 text-sm font-semibold rounded-xl transition-colors",
            title && durationMinutes > 0 && days.length > 0 && !saving
              ? "bg-violet-600 text-white hover:bg-violet-700"
              : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
          )}
        >
          {saving ? "Saving…" : title && durationMinutes > 0 && days.length > 0
            ? `Save Template — ${weeklyHours.toFixed(1)}h/week`
            : "Fill in required fields to continue"}
        </button>
      </div>
    </div>
  )
}
