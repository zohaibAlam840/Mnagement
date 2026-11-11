"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, Clock, User, Tag, AlignLeft, Calendar, CheckCircle2, AlertCircle, Eye } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { KindPicker } from "@/components/activity/KindPicker"
import {
  kindNeedsCategory, kindToFields, resolveCategory, activityLabel,
  type ActivityKind, type FieldworkCategory,
} from "@/lib/activityKind"

type ObservationType = "direct" | "remote" | "indirect"

const SUBCATEGORIES: Record<ActivityKind, string[]> = {
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
  "Individual Supervision": ["Individual Supervision", "Case Review", "Other Supervision"],
  "Group Supervision": ["Group Supervision", "Case Review", "Other Supervision"],
  Observation: ["Observation — Direct", "Observation — Remote", "Observation — Indirect"],
}

function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function NewActivityPage() {
  const [title, setTitle] = useState("")
  const [date, setDate] = useState(localToday)
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("11:00")
  const [kind, setKind] = useState<ActivityKind>("Restricted")
  // Required for supervision/observation; never preselected
  const [categoryToggle, setCategoryToggle] = useState<FieldworkCategory | null>(null)
  const [subcategory, setSubcategory] = useState(SUBCATEGORIES["Restricted"][0])
  const [client, setClient] = useState("")

  const [observationType, setObservationType] = useState<ObservationType>("direct")
  const [observationMinutes, setObservationMinutes] = useState<number | null>(null)

  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [triedSave, setTriedSave] = useState(false)

  const startMinutes = parseInt(startTime.split(":")[0]) * 60 + parseInt(startTime.split(":")[1])
  const endMinutes = parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1])
  const durationMinutes = Math.max(0, endMinutes - startMinutes)
  const durationHours = durationMinutes / 60
  const category = resolveCategory(kind, categoryToggle)
  const missingCategory = kindNeedsCategory(kind) && !category
  const obsMinutes = observationMinutes ?? durationMinutes

  const handleKindChange = (k: ActivityKind) => {
    setKind(k)
    setSubcategory(SUBCATEGORIES[k][0])
    setCategoryToggle(null)
    setTriedSave(false)
  }

  const handleSave = async () => {
    setError("")
    setTriedSave(true)
    if (missingCategory) {
      setError("Select Restricted or Unrestricted for this supervision/observation entry.")
      return
    }
    setSaving(true)
    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError("Not signed in"); setSaving(false); return }

    const fields = kindToFields(kind, categoryToggle, obsMinutes)
    const { error: insertError } = await supabase.from("activities").insert({
      trainee_id: user.id,
      title,
      date,
      start_time: startTime + ":00",
      end_time: endTime + ":00",
      duration_minutes: durationMinutes,
      subcategory,
      client_name: client || null,
      ...fields,
      observation_type: kind === "Observation" ? observationType : null,
      notes: notes || null,
      status: "draft",
      week_start_date: getWeekStart(date),
    })

    setSaving(false)
    if (insertError) { setError(insertError.message); return }
    setSaved(activityLabel(fields))
  }

  if (saved) {
    return (
      <div className="p-4 md:p-7 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-1">Activity logged!</h2>
        <p className="text-sm text-zinc-500 mb-6">
          {durationHours.toFixed(1)} hours saved as {saved}.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => { setSaved(null); setTitle(""); setNotes(""); setClient(""); setCategoryToggle(null); setTriedSave(false); setObservationMinutes(null) }}
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

  const canSave = !!title && durationMinutes > 0 && !saving

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

        {/* Activity type + Restricted/Unrestricted */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
            <Tag className="w-3.5 h-3.5" /> Activity Type
          </label>
          <KindPicker
            kind={kind}
            onKind={handleKindChange}
            category={categoryToggle}
            onCategory={c => { setCategoryToggle(c); setError("") }}
            showError={triedSave}
          />
          {kindNeedsCategory(kind) && (
            <p className="text-[11px] text-zinc-400 mt-2">
              Supervision and observation hours count toward your Restricted or Unrestricted total as well as your supervised hours.
              {kind === "Group Supervision" && " Group supervision must not exceed 50% of total supervision time."}
            </p>
          )}
          <div className="mt-4">
            <p className="text-xs text-zinc-500 mb-1.5">Subcategory</p>
            <select
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all bg-white"
            >
              {SUBCATEGORIES[kind].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Observation details */}
        {kind === "Observation" && (
          <div className="bg-white rounded-xl border border-violet-100 p-5">
            <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
              <Eye className="w-3.5 h-3.5" /> Observation
            </label>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-zinc-500 mb-1.5">Observation Type</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["direct", "remote", "indirect"] as ObservationType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setObservationType(type)}
                      className={cn(
                        "py-2 px-3 rounded-lg border text-xs font-semibold capitalize transition-all",
                        observationType === type
                          ? "border-violet-500 bg-violet-50 text-violet-800"
                          : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1.5">Minutes observed with client</p>
                <input
                  type="number"
                  min="0"
                  value={obsMinutes}
                  onChange={(e) => setObservationMinutes(parseInt(e.target.value) || 0)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Defaults to the session length. 2027 BACB minimum: Concentrated = 90 min/month · Supervised = 60 min/month
                </p>
              </div>
            </div>
          </div>
        )}

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
          disabled={!canSave}
          className={cn(
            "w-full py-3.5 text-sm font-semibold rounded-xl transition-colors",
            canSave ? "bg-violet-600 text-white hover:bg-violet-700" : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
          )}
        >
          {saving ? "Saving…" : title && durationMinutes > 0
            ? missingCategory
              ? "Select Restricted or Unrestricted"
              : `Save ${durationHours.toFixed(1)}h ${kind}${kindNeedsCategory(kind) ? ` · ${category}` : ""}`
            : "Fill in title and time to continue"}
        </button>
      </div>
    </div>
  )
}
