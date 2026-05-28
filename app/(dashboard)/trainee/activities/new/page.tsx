"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Clock, User, Tag, AlignLeft, Calendar, CheckCircle2, AlertCircle } from "lucide-react"
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

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function NewActivityPage() {
  const router = useRouter()
  const today = new Date().toISOString().split("T")[0]

  const [title, setTitle] = useState("")
  const [date, setDate] = useState(today)
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("11:00")
  const [category, setCategory] = useState<Category>("Restricted")
  const [subcategory, setSubcategory] = useState(SUBCATEGORIES["Restricted"][0])
  const [client, setClient] = useState("")
  const [supervisionRelated, setSupervisionRelated] = useState(false)
  const [directObservation, setDirectObservation] = useState(false)
  const [observationMinutes, setObservationMinutes] = useState(0)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  const startMinutes = parseInt(startTime.split(":")[0]) * 60 + parseInt(startTime.split(":")[1])
  const endMinutes = parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1])
  const durationMinutes = Math.max(0, endMinutes - startMinutes)
  const durationHours = durationMinutes / 60

  const handleCategoryChange = (c: Category) => {
    setCategory(c)
    setSubcategory(SUBCATEGORIES[c][0])
  }

  const handleSave = async () => {
    setError("")
    setSaving(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError("Not signed in"); setSaving(false); return }

    const { error: insertError } = await supabase.from("activities").insert({
      trainee_id: user.id,
      title,
      date,
      start_time: startTime + ":00",
      end_time: endTime + ":00",
      duration_minutes: durationMinutes,
      category,
      subcategory,
      client_name: client || null,
      observation_with_client: directObservation,
      observation_duration_minutes: directObservation ? observationMinutes : 0,
      supervision_present: supervisionRelated,
      notes: notes || null,
      status: "draft",
      week_start_date: getWeekStart(date),
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
        <h2 className="text-xl font-bold text-zinc-900 mb-1">Activity logged!</h2>
        <p className="text-sm text-zinc-500 mb-6">
          {durationHours.toFixed(1)} hours of {category} activity saved.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => { setSaved(false); setTitle(""); setNotes(""); setClient("") }}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Log another
          </button>
          <Link href="/trainee/activities" className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors">
            View all activities
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-7 max-w-2xl mx-auto">
      <Link href="/trainee/activities" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Activities
      </Link>

      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Log Activity</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Record BACB fieldwork hours</p>
      </div>

      <div className="space-y-4">
        {/* Title */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
            <AlignLeft className="w-3.5 h-3.5" /> Activity Title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Discrete Trial Training — Client A"
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
          />
        </div>

        {/* Date + time */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
            <Calendar className="w-3.5 h-3.5" /> Date & Time
          </label>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">Date</p>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
              />
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
            {durationMinutes > 0 && (
              <div className="flex items-center gap-2 text-sm text-zinc-500 bg-zinc-50 rounded-lg px-3.5 py-2">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Duration: <span className="font-semibold text-zinc-900">{durationHours.toFixed(1)} hours</span></span>
              </div>
            )}
          </div>
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

        {/* Flags */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Flags</p>
          <div className="space-y-3">
            {[
              { label: "Supervision-related", desc: "This activity was conducted under active supervision", value: supervisionRelated, onChange: setSupervisionRelated },
              { label: "Direct observation", desc: "Supervisor was physically or remotely present", value: directObservation, onChange: setDirectObservation },
            ].map((flag) => (
              <button
                key={flag.label}
                onClick={() => flag.onChange(!flag.value)}
                className={cn(
                  "w-full flex items-start gap-3 text-left px-4 py-3 rounded-xl border transition-all",
                  flag.value ? "border-violet-200 bg-violet-50" : "border-zinc-100 bg-zinc-50 hover:border-zinc-200"
                )}
              >
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5",
                  flag.value ? "bg-violet-600 border-violet-600" : "border-zinc-300"
                )}>
                  {flag.value && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <p className={cn("text-sm font-semibold", flag.value ? "text-violet-800" : "text-zinc-700")}>{flag.label}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{flag.desc}</p>
                </div>
              </button>
            ))}
          </div>
          {directObservation && (
            <div className="mt-3">
              <p className="text-xs text-zinc-500 mb-1.5">Observation duration (minutes)</p>
              <input
                type="number"
                min="0"
                value={observationMinutes}
                onChange={(e) => setObservationMinutes(parseInt(e.target.value) || 0)}
                placeholder="e.g. 60"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
              />
              <p className="text-[11px] text-zinc-400 mt-1">2027 BACB requirement: concentrated = 90 min/month · supervised = 60 min/month</p>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Notes (optional)</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Describe what happened during this activity..."
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all resize-none placeholder:text-zinc-300"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!title || durationMinutes <= 0 || saving}
          className={cn(
            "w-full py-3.5 text-sm font-semibold rounded-xl transition-colors",
            title && durationMinutes > 0 && !saving
              ? "bg-violet-600 text-white hover:bg-violet-700"
              : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
          )}
        >
          {saving ? "Saving…" : title && durationMinutes > 0
            ? `Save ${durationHours.toFixed(1)}h ${category} Activity`
            : "Fill in title and time to continue"}
        </button>
      </div>
    </div>
  )
}
