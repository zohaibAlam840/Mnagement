"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ChevronLeft, CheckCircle2, Clock, Pencil, Trash2,
  Save, X, AlertTriangle, User, Calendar, AlarmClock
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"]

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
function formatTime(t: string) {
  const [h, m] = t.split(":")
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`
}

export default function ActivityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [activity, setActivity] = useState<ActivityRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Editable fields
  const [title, setTitle] = useState("")
  const [notes, setNotes] = useState("")
  const [category, setCategory] = useState<ActivityRow["category"]>("Restricted")
  const [sessionType, setSessionType] = useState<"individual" | "group" | null>(null)
  const [observationType, setObservationType] = useState<"direct" | "remote" | "indirect" | null>(null)
  const [observationMinutes, setObservationMinutes] = useState(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from("activities")
        .select("*")
        .eq("id", id)
        .eq("trainee_id", user.id)
        .single()

      if (!data) { setNotFound(true); setLoading(false); return }
      setActivity(data)
      setTitle(data.title)
      setNotes(data.notes ?? "")
      setCategory(data.category)
      setSessionType(data.session_type ?? null)
      setObservationType(data.observation_type ?? null)
      setObservationMinutes(data.observation_duration_minutes ?? 0)
      setLoading(false)
    }
    load()
  }, [id])

  const handleSave = async () => {
    if (!activity) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("activities")
      .update({
        title,
        notes: notes || null,
        category,
        session_type: category === "Supervision" ? sessionType : null,
        observation_type: observationType,
        observation_duration_minutes: observationMinutes,
      })
      .eq("id", activity.id)
      .select()
      .single()
    if (data) setActivity(data)
    setSaving(false)
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!activity) return
    if (!confirm("Delete this activity? This cannot be undone.")) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from("activities").delete().eq("id", activity.id)
    router.push("/trainee/activities")
  }

  if (loading) {
    return (
      <div className="p-4 md:p-7 max-w-2xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !activity) {
    return (
      <div className="p-4 md:p-7 max-w-2xl mx-auto text-center py-20">
        <p className="text-zinc-400 mb-4">Activity not found.</p>
        <Link href="/trainee/activities" className="text-sm font-semibold text-violet-600 hover:text-violet-700">
          ← Back to activities
        </Link>
      </div>
    )
  }

  const durationHours = activity.duration_minutes / 60

  return (
    <div className="p-4 md:p-7 max-w-2xl mx-auto">
      <Link href="/trainee/activities" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Activities
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex-1 min-w-0 pr-4">
          {editing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xl font-bold text-zinc-900 bg-transparent border-b-2 border-violet-400 focus:outline-none pb-1"
            />
          ) : (
            <h1 className="text-xl md:text-2xl font-bold text-zinc-900">{activity.title}</h1>
          )}
          {activity.client_name && (
            <p className="text-sm text-zinc-500 mt-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> {activity.client_name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {editing ? (
            <>
              <button
                onClick={() => { setEditing(false); setTitle(activity.title); setNotes(activity.notes ?? ""); setCategory(activity.category) }}
                className="w-9 h-9 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center text-white hover:bg-violet-700 transition-colors disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEditing(true)}
                className="w-9 h-9 rounded-lg border border-[#E8E6F4] bg-white flex items-center justify-center text-zinc-500 hover:bg-zinc-50 transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-9 h-9 rounded-lg border border-red-100 bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 transition-colors disabled:opacity-60"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-2 mb-5">
        <span className={cn(
          "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border",
          activity.category === "Restricted" ? "bg-violet-50 text-violet-700 border-violet-100" :
          activity.category === "Supervision" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
          "bg-blue-50 text-blue-700 border-blue-100"
        )}>
          {editing ? (
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ActivityRow["category"])}
              className="bg-transparent focus:outline-none text-xs font-semibold"
            >
              <option>Restricted</option>
              <option>Unrestricted</option>
              <option>Supervision</option>
            </select>
          ) : activity.category}
        </span>
        <span className={cn(
          "text-xs font-semibold px-3 py-1.5 rounded-full",
          activity.status === "approved" ? "bg-emerald-50 text-emerald-700" :
          activity.status === "submitted" ? "bg-amber-50 text-amber-700" :
          activity.status === "rejected" ? "bg-red-50 text-red-700" :
          "bg-zinc-50 text-zinc-500"
        )}>
          {activity.status === "submitted" ? "Pending" :
           activity.status === "approved" ? "Approved" :
           activity.status === "rejected" ? "Rejected" : "Draft"}
        </span>
        {activity.status === "approved" && (
          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>
        )}
        {activity.status === "submitted" && (
          <span className="flex items-center gap-1 text-xs font-medium text-amber-500"><Clock className="w-3.5 h-3.5" /> Pending approval</span>
        )}
      </div>

      {/* Details card */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] divide-y divide-zinc-50 mb-4">
        {[
          { icon: <Calendar className="w-4 h-4 text-zinc-400" />, label: "Date", value: formatDate(activity.date) },
          { icon: <AlarmClock className="w-4 h-4 text-zinc-400" />, label: "Time", value: `${formatTime(activity.start_time)} – ${formatTime(activity.end_time)}` },
          { icon: <Clock className="w-4 h-4 text-zinc-400" />, label: "Duration", value: `${durationHours.toFixed(1)} hours` },
          { icon: <div className={cn("w-3 h-3 rounded-full", activity.category === "Restricted" ? "bg-violet-500" : activity.category === "Supervision" ? "bg-emerald-500" : "bg-blue-500")} />, label: "Category", value: activity.category },
          { icon: null, label: "Subcategory", value: activity.subcategory ?? "—" },
        ].map((row, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5">
            <div className="w-5 flex items-center justify-center flex-shrink-0">{row.icon}</div>
            <span className="text-sm text-zinc-500 w-28 flex-shrink-0">{row.label}</span>
            <span className="text-sm font-semibold text-zinc-900 flex-1 text-right">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Flags */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-4 mb-4">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Supervision & Observation</p>
        <div className="flex flex-wrap gap-2">
          {activity.supervision_present && (
            <span className="text-xs font-semibold px-3 py-1.5 rounded-full border bg-violet-50 text-violet-700 border-violet-100">
              ✓ Supervision-related
            </span>
          )}
          {activity.category === "Supervision" && (
            editing ? (
              <div className="w-full flex gap-2 mt-1">
                {(["individual", "group"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setSessionType(t)}
                    className={cn(
                      "flex-1 py-2 text-xs font-semibold rounded-lg border capitalize transition-all",
                      sessionType === t ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-zinc-200 text-zinc-500"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            ) : activity.session_type ? (
              <span className={cn(
                "text-xs font-semibold px-3 py-1.5 rounded-full border capitalize",
                activity.session_type === "individual"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                  : "bg-blue-50 text-blue-700 border-blue-100"
              )}>
                {activity.session_type} supervision
              </span>
            ) : null
          )}
          {activity.observation_with_client && (
            editing ? (
              <div className="w-full space-y-2 mt-1">
                <div className="flex gap-2">
                  {(["direct", "remote", "indirect"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setObservationType(t)}
                      className={cn(
                        "flex-1 py-2 text-xs font-semibold rounded-lg border capitalize transition-all",
                        observationType === t ? "border-violet-500 bg-violet-50 text-violet-800" : "border-zinc-200 text-zinc-500"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="0"
                  value={observationMinutes}
                  onChange={(e) => setObservationMinutes(parseInt(e.target.value) || 0)}
                  placeholder="Observation minutes"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
            ) : (
              <>
                {activity.observation_type && (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full border bg-violet-50 text-violet-700 border-violet-100 capitalize">
                    {activity.observation_type} observation
                  </span>
                )}
                {activity.observation_duration_minutes > 0 && (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-100">
                    {activity.observation_duration_minutes} min
                  </span>
                )}
              </>
            )
          )}
          {!activity.supervision_present && !activity.observation_with_client && activity.category !== "Supervision" && (
            <span className="text-xs text-zinc-400 italic">No supervision flags</span>
          )}
        </div>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-4 mb-4">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Notes</p>
        {editing ? (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add notes..."
            className="w-full text-sm text-zinc-700 bg-transparent focus:outline-none resize-none placeholder:text-zinc-300"
          />
        ) : (
          <p className="text-sm text-zinc-600 leading-relaxed">
            {activity.notes || <span className="text-zinc-300 italic">No notes added</span>}
          </p>
        )}
      </div>

      {/* Audit trail */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-4">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Audit Trail</p>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-4 flex items-center justify-center mt-1 flex-shrink-0">
              <div className="w-2 h-2 rounded-full bg-zinc-300" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-800">Activity created</p>
              <p className="text-xs text-zinc-400">{formatDate(activity.created_at.split("T")[0])}</p>
            </div>
          </div>
          {activity.status === "approved" && (
            <div className="flex items-start gap-3">
              <div className="w-4 flex items-center justify-center mt-1 flex-shrink-0">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-800">Approved by supervisor</p>
                <p className="text-xs text-zinc-400">{formatDate(activity.updated_at.split("T")[0])}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {activity.status === "submitted" && (
        <div className="mt-4 flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          This activity has been submitted and is awaiting approval from your supervisor.
        </div>
      )}
      {activity.status === "draft" && (
        <div className="mt-4 flex items-start gap-3 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm text-zinc-600">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          This activity is a draft. Go to <Link href="/trainee/weekly-review" className="font-semibold text-violet-600 hover:text-violet-700 mx-1">Weekly Review</Link> to submit it to your supervisor.
        </div>
      )}
    </div>
  )
}
