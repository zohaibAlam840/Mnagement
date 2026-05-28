"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ChevronLeft, Repeat2, Save, X, ToggleLeft, ToggleRight,
  Trash2, Clock, TrendingUp, CheckCircle2, AlertCircle
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"

type TemplateRow = Database["public"]["Tables"]["activity_templates"]["Row"]
type ActivityRow = Database["public"]["Tables"]["activities"]["Row"]
type Category = "Restricted" | "Unrestricted" | "Supervision"

const SUBCATEGORIES: Record<Category, string[]> = {
  Restricted: ["Discrete Trial Training","Natural Environment Training","Functional Behavior Assessment","Behavior Intervention Plan","Skill Acquisition Program","Other Restricted"],
  Unrestricted: ["Program Development","Staff Training","Parent Training","Data Review","Graphing / Analysis","Documentation","Other Unrestricted"],
  Supervision: ["Individual Supervision","Group Supervision","Observation — Direct","Observation — Remote","Case Review","Other Supervision"],
}

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function formatTime(t: string) {
  const [h, m] = t.split(":")
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`
}
function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}
function calcDuration(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60)
}

export default function TemplateDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [template, setTemplate] = useState<TemplateRow | null>(null)
  const [recentActivities, setRecentActivities] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  // Edit state
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<Category>("Restricted")
  const [subcategory, setSubcategory] = useState("")
  const [days, setDays] = useState<string[]>([])
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [client, setClient] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: tmpl }, { data: acts }] = await Promise.all([
        supabase.from("activity_templates").select("*").eq("id", id).eq("trainee_id", user.id).single(),
        supabase.from("activities").select("*").eq("template_id", id).eq("trainee_id", user.id).order("date", { ascending: false }).limit(5),
      ])

      if (!tmpl) { setNotFound(true); setLoading(false); return }
      setTemplate(tmpl)
      setRecentActivities(acts ?? [])
      // populate edit fields
      setTitle(tmpl.title)
      setCategory(tmpl.category as Category)
      setSubcategory(tmpl.subcategory ?? "")
      setDays(tmpl.days)
      setStartTime(tmpl.start_time.slice(0, 5))
      setEndTime(tmpl.end_time.slice(0, 5))
      setClient(tmpl.client_name ?? "")
      setNotes(tmpl.notes ?? "")
      setLoading(false)
    }
    load()
  }, [id])

  const handleToggleActive = async () => {
    if (!template) return
    const supabase = createClient()
    const { data } = await supabase
      .from("activity_templates")
      .update({ active: !template.active })
      .eq("id", template.id)
      .select()
      .single()
    if (data) setTemplate(data)
  }

  const handleSave = async () => {
    if (!template) return
    setError("")
    if (!title.trim()) { setError("Template name is required"); return }
    if (days.length === 0) { setError("Select at least one day"); return }

    const startM = parseInt(startTime.split(":")[0]) * 60 + parseInt(startTime.split(":")[1])
    const endM = parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1])
    if (endM <= startM) { setError("End time must be after start time"); return }

    setSaving(true)
    const supabase = createClient()
    const { data, error: updateError } = await supabase
      .from("activity_templates")
      .update({
        title: title.trim(),
        category,
        subcategory: subcategory || null,
        days,
        start_time: startTime + ":00",
        end_time: endTime + ":00",
        client_name: client || null,
        notes: notes || null,
      })
      .eq("id", template.id)
      .select()
      .single()
    setSaving(false)
    if (updateError) { setError(updateError.message); return }
    if (data) setTemplate(data)
    setEditing(false)
  }

  const handleCancelEdit = () => {
    if (!template) return
    setTitle(template.title)
    setCategory(template.category as Category)
    setSubcategory(template.subcategory ?? "")
    setDays(template.days)
    setStartTime(template.start_time.slice(0, 5))
    setEndTime(template.end_time.slice(0, 5))
    setClient(template.client_name ?? "")
    setNotes(template.notes ?? "")
    setError("")
    setEditing(false)
  }

  const handleDelete = async () => {
    if (!template) return
    if (!confirm("Delete this template? This cannot be undone.")) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from("activity_templates").delete().eq("id", template.id)
    router.push("/trainee/templates")
  }

  if (loading) {
    return (
      <div className="p-4 md:p-7 max-w-2xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !template) {
    return (
      <div className="p-4 md:p-7 max-w-2xl mx-auto text-center py-20">
        <p className="text-zinc-400 mb-4">Template not found.</p>
        <Link href="/trainee/templates" className="text-sm font-semibold text-violet-600 hover:text-violet-700">
          ← Back to templates
        </Link>
      </div>
    )
  }

  const displayStart = editing ? startTime : template.start_time.slice(0, 5)
  const displayEnd = editing ? endTime : template.end_time.slice(0, 5)
  const duration = calcDuration(displayStart, displayEnd)
  const displayDays = editing ? days : template.days
  const weeklyHours = duration * displayDays.length
  const monthlyHours = weeklyHours * 4.3

  const displayCategory = (editing ? category : template.category) as Category

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
            displayCategory === "Restricted" ? "bg-violet-100" :
            displayCategory === "Supervision" ? "bg-emerald-100" : "bg-blue-100"
          )}>
            <Repeat2 className={cn(
              "w-5 h-5",
              displayCategory === "Restricted" ? "text-violet-600" :
              displayCategory === "Supervision" ? "text-emerald-600" : "text-blue-600"
            )} />
          </div>
          {editing ? (
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 text-xl font-bold text-zinc-900 bg-transparent border-b-2 border-violet-400 focus:outline-none pb-1"
            />
          ) : (
            <h1 className="text-lg md:text-xl font-bold text-zinc-900 leading-tight">{template.title}</h1>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {editing ? (
            <>
              <button
                onClick={handleCancelEdit}
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
              <button onClick={handleToggleActive} className="text-zinc-400 hover:text-violet-600 transition-colors">
                {template.active
                  ? <ToggleRight className="w-6 h-6 text-violet-500" />
                  : <ToggleLeft className="w-6 h-6" />
                }
              </button>
              <button
                onClick={() => setEditing(true)}
                className="text-xs font-semibold text-violet-600 border border-violet-200 bg-violet-50 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition-colors"
              >
                Edit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status badges */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {editing ? (
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value as Category); setSubcategory(SUBCATEGORIES[e.target.value as Category][0]) }}
            className="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100 focus:outline-none"
          >
            <option>Restricted</option>
            <option>Unrestricted</option>
            <option>Supervision</option>
          </select>
        ) : (
          <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full",
            template.category === "Restricted" ? "bg-violet-50 text-violet-700" :
            template.category === "Supervision" ? "bg-emerald-50 text-emerald-700" :
            "bg-blue-50 text-blue-700"
          )}>
            {template.category}
          </span>
        )}
        <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full",
          template.active ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500"
        )}>
          {template.active ? "Active" : "Paused"}
        </span>
        {(editing ? client : template.client_name) && (
          <span className="text-xs text-zinc-500 bg-zinc-100 px-2.5 py-1 rounded-full">
            {editing ? client : template.client_name}
          </span>
        )}
      </div>

      {/* Schedule card */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-4">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Schedule</p>

        <div className="mb-4">
          <p className="text-xs text-zinc-500 mb-2">Repeat on</p>
          <div className="flex gap-1.5">
            {ALL_DAYS.map((d) => (
              <button
                key={d}
                onClick={() => editing && setDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d])}
                disabled={!editing}
                className={cn(
                  "flex-1 py-2 text-xs font-bold rounded-lg border transition-all",
                  displayDays.includes(d)
                    ? displayCategory === "Restricted" ? "bg-violet-600 text-white border-violet-600" :
                      displayCategory === "Supervision" ? "bg-emerald-600 text-white border-emerald-600" :
                      "bg-blue-600 text-white border-blue-600"
                    : editing ? "border-zinc-200 text-zinc-400 hover:border-zinc-300" : "border-zinc-100 text-zinc-300"
                )}
              >
                {d[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">Start time</p>
            {editing ? (
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
              />
            ) : (
              <p className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                {formatTime(template.start_time)}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-1.5">End time</p>
            {editing ? (
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
              />
            ) : (
              <p className="text-sm font-semibold text-zinc-900 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                {formatTime(template.end_time)}
              </p>
            )}
          </div>
        </div>

        {editing && (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">Subcategory</p>
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all bg-white"
              >
                {SUBCATEGORIES[category].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">Client (optional)</p>
              <input
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="e.g. Client A"
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
              />
            </div>
          </div>
        )}

        {editing && (
          <div className="mt-3">
            <p className="text-xs text-zinc-500 mb-1.5">Notes (optional)</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all resize-none placeholder:text-zinc-300"
              placeholder="Additional notes..."
            />
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Projected hours */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-4">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
          <TrendingUp className="w-3.5 h-3.5 inline mr-1" />Projected Hours
        </p>
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

      {/* Notes (view only) */}
      {!editing && template.notes && (
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-4">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">Notes</p>
          <p className="text-sm text-zinc-600 leading-relaxed">{template.notes}</p>
        </div>
      )}

      {/* Recently generated activities */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] mb-4">
        <div className="px-5 py-4 border-b border-zinc-50">
          <p className="text-sm font-semibold text-zinc-900">Recently Generated</p>
          <p className="text-xs text-zinc-400 mt-0.5">Activities linked to this template</p>
        </div>
        {recentActivities.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-zinc-400">No activities generated from this template yet</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {recentActivities.map((a) => (
              <Link key={a.id} href={`/trainee/activities/${a.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-zinc-50/50 transition-colors">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                  a.category === "Restricted" ? "bg-violet-100 text-violet-700" :
                  a.category === "Supervision" ? "bg-emerald-100 text-emerald-700" :
                  "bg-blue-100 text-blue-700"
                )}>
                  {(a.duration_minutes / 60).toFixed(1)}h
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{a.title}</p>
                  <p className="text-xs text-zinc-400">{formatDate(a.date)}</p>
                </div>
                {a.status === "approved"
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <div className="w-4 h-4 rounded-full border-2 border-zinc-300 flex-shrink-0" />
                }
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-red-500 border border-red-100 bg-red-50 py-2.5 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-60"
      >
        <Trash2 className="w-4 h-4" />
        {deleting ? "Deleting…" : "Delete template"}
      </button>
    </div>
  )
}
