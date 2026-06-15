"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import {
  ChevronLeft, ChevronRight, Check, Pencil, CalendarDays,
  AlertTriangle, CheckCircle2, Clock, Send, RotateCcw, Calendar, X, Repeat2
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"]
type WeeklyReviewRow = Database["public"]["Tables"]["weekly_reviews"]["Row"]
type TemplateRow = Database["public"]["Tables"]["activity_templates"]["Row"]
type ActivityCategory = "Restricted" | "Unrestricted" | "Supervision"

type TemplateItem = {
  template: TemplateRow
  date: string
  selected: boolean
}

type GCalEvent = {
  id: string
  summary?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  status?: string
}

type ImportKind =
  | "Restricted"
  | "Unrestricted"
  | "Group Supervision"
  | "Individual Supervision"
  | "Observation"

type ImportItem = {
  event: GCalEvent
  kind: ImportKind
  selected: boolean
}

// Map a calendar-import choice to the structured activity fields the DB stores.
function kindToFields(kind: ImportKind, durationMins: number) {
  switch (kind) {
    case "Restricted":
      return { category: "Restricted" as const, session_type: null, supervision_present: false, observation_with_client: false, observation_type: null, observation_duration_minutes: 0 }
    case "Unrestricted":
      return { category: "Unrestricted" as const, session_type: null, supervision_present: false, observation_with_client: false, observation_type: null, observation_duration_minutes: 0 }
    case "Group Supervision":
      return { category: "Supervision" as const, session_type: "group" as const, supervision_present: true, observation_with_client: false, observation_type: null, observation_duration_minutes: 0 }
    case "Individual Supervision":
      return { category: "Supervision" as const, session_type: "individual" as const, supervision_present: true, observation_with_client: false, observation_type: null, observation_duration_minutes: 0 }
    case "Observation":
      return { category: "Supervision" as const, session_type: null, supervision_present: true, observation_with_client: true, observation_type: "direct" as const, observation_duration_minutes: durationMins }
  }
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function getWeekStart(date: Date): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return toLocalDateStr(d)
}

function getWeekEnd(weekStart: string): string {
  const d = new Date(weekStart + "T00:00:00")
  d.setDate(d.getDate() + 6)
  return toLocalDateStr(d)
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00")
  const end = new Date(weekStart + "T00:00:00")
  end.setDate(end.getDate() + 6)
  const mo: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
  return `${start.toLocaleDateString("en-US", mo)} – ${end.toLocaleDateString("en-US", { ...mo, year: "numeric" })}`
}

function formatTime(t: string) {
  const [h, m] = t.split(":")
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`
}

function getDayName(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" })
}

function formatDateShort(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function parseGCalTime(event: GCalEvent) {
  const startDT = new Date(event.start.dateTime!)
  const endDT = new Date(event.end.dateTime!)
  const durationMins = Math.round((endDT.getTime() - startDT.getTime()) / 60000)
  const date = toLocalDateStr(startDT)
  const startTime = `${String(startDT.getHours()).padStart(2, "0")}:${String(startDT.getMinutes()).padStart(2, "0")}`
  const endTime = `${String(endDT.getHours()).padStart(2, "0")}:${String(endDT.getMinutes()).padStart(2, "0")}`
  return { date, startTime, endTime, durationMins }
}

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export default function WeeklyReviewPage() {
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [review, setReview] = useState<WeeklyReviewRow | null>(null)
  const [supervisorId, setSupervisorId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submitSuccess, setSubmitSuccess] = useState(false)

  // Calendar import state
  const [showImport, setShowImport] = useState(false)
  const [importItems, setImportItems] = useState<ImportItem[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState("")
  const [importing, setImporting] = useState(false)
  const [importSuccess, setImportSuccess] = useState(0)

  // Template generation state
  const [showTemplates, setShowTemplates] = useState(false)
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [generatingFromTemplates, setGeneratingFromTemplates] = useState(false)
  const [templateGenSuccess, setTemplateGenSuccess] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    setSubmitSuccess(false)
    setSubmitError("")

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [
      { data: acts },
      { data: rev },
      { data: rel }
    ] = await Promise.all([
      supabase.from("activities").select("*")
        .eq("trainee_id", user.id)
        .gte("date", weekStart)
        .lte("date", getWeekEnd(weekStart))
        .order("date", { ascending: true })
        .order("start_time", { ascending: true }),
      supabase.from("weekly_reviews").select("*")
        .eq("trainee_id", user.id)
        .eq("week_start_date", weekStart)
        .maybeSingle(),
      supabase.from("supervisor_relationships").select("supervisor_id")
        .eq("trainee_id", user.id)
        .eq("status", "active")
        .eq("is_primary", true)
        .maybeSingle(),
    ])

    setActivities(acts ?? [])
    setReview(rev ?? null)
    setSupervisorId(rel?.supervisor_id ?? null)
    setLoading(false)
  }, [weekStart])

  useEffect(() => { load() }, [load])

  const todayWeekStart = getWeekStart(new Date())

  const prevWeek = () => {
    const d = new Date(weekStart + "T00:00:00")
    d.setDate(d.getDate() - 7)
    setWeekStart(toLocalDateStr(d))
  }
  const nextWeek = () => {
    if (weekStart >= todayWeekStart) return
    const d = new Date(weekStart + "T00:00:00")
    d.setDate(d.getDate() + 7)
    setWeekStart(toLocalDateStr(d))
  }

  const handleOpenImport = async () => {
    setShowImport(true)
    setImportItems([])
    setImportError("")
    setImportSuccess(0)
    setImportLoading(true)

    const weekEnd = getWeekEnd(weekStart)
    const timeMin = new Date(weekStart + "T00:00:00").toISOString()
    const timeMax = new Date(weekEnd + "T23:59:59").toISOString()

    try {
      const res = await fetch(`/api/calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`)
      const data = await res.json()

      if (!res.ok) {
        if (data.error === "not_connected") {
          setImportError("Google Calendar is not connected. Go to Settings → Calendar Sync to connect.")
        } else {
          setImportError(data.error || "Failed to fetch calendar events.")
        }
        setImportLoading(false)
        return
      }

      if (data.length === 0) {
        setImportError("No events found in Google Calendar for this week.")
        setImportLoading(false)
        return
      }

      setImportItems(data.map((e: GCalEvent) => ({
        event: e,
        kind: "Restricted" as const,
        selected: true,
      })))
    } catch {
      setImportError("Network error. Please try again.")
    }
    setImportLoading(false)
  }

  const handleConfirmImport = async () => {
    const selected = importItems.filter(i => i.selected)
    if (selected.length === 0) return

    setImporting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const activitiesToInsert = selected.map(item => {
      const { date, startTime, endTime, durationMins } = parseGCalTime(item.event)
      const fields = kindToFields(item.kind, durationMins)
      return {
        trainee_id: user.id,
        title: item.event.summary || "Imported from Google Calendar",
        date,
        start_time: startTime,
        end_time: endTime,
        duration_minutes: durationMins,
        ...fields,
        status: "draft" as const,
        notes: null,
        week_start_date: weekStart,
      }
    })

    const { error } = await supabase.from("activities").insert(activitiesToInsert)
    if (error) {
      setImportError(error.message)
    } else {
      setImportSuccess(selected.length)
      setShowImport(false)
      await load()
    }
    setImporting(false)
  }

  const handleOpenTemplates = async () => {
    setShowTemplates(true)
    setTemplateItems([])
    setTemplateGenSuccess(0)
    setTemplatesLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setTemplatesLoading(false); return }

    const { data: templates } = await supabase
      .from("activity_templates")
      .select("*")
      .eq("trainee_id", user.id)
      .eq("active", true)

    if (!templates || templates.length === 0) {
      setTemplatesLoading(false)
      return
    }

    // Map week day names to actual dates for the displayed week
    const dayToDate: Record<string, string> = {}
    WEEK_DAYS.forEach((day, i) => {
      const d = new Date(weekStart + "T00:00:00")
      d.setDate(d.getDate() + i)
      dayToDate[day] = toLocalDateStr(d)
    })

    // Explode templates into one item per matching day, skip days that already have an activity from this template
    const existingDates = new Set(activities.map(a => a.date))

    const items: TemplateItem[] = []
    for (const template of templates as TemplateRow[]) {
      for (const day of template.days) {
        const date = dayToDate[day]
        if (!date) continue
        // Skip if there's already an activity on this date with the same title (avoid duplicates)
        const alreadyExists = activities.some(
          a => a.date === date && a.title === template.title
        )
        if (alreadyExists) continue
        items.push({ template, date, selected: true })
      }
    }

    // Sort by date then start_time
    items.sort((a, b) => a.date.localeCompare(b.date) || a.template.start_time.localeCompare(b.template.start_time))
    setTemplateItems(items)
    setTemplatesLoading(false)
  }

  const handleGenerateFromTemplates = async () => {
    const selected = templateItems.filter(i => i.selected)
    if (selected.length === 0) return

    setGeneratingFromTemplates(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const toInsert = selected.map(({ template, date }) => {
      const [sh, sm] = template.start_time.split(":").map(Number)
      const [eh, em] = template.end_time.split(":").map(Number)
      const durationMins = Math.max(0, (eh * 60 + em) - (sh * 60 + sm))
      return {
        trainee_id: user.id,
        template_id: template.id,
        title: template.title,
        date,
        start_time: template.start_time,
        end_time: template.end_time,
        duration_minutes: durationMins,
        category: template.category as ActivityCategory,
        subcategory: template.subcategory,
        client_name: template.client_name,
        notes: template.notes,
        observation_with_client: false,
        observation_duration_minutes: 0,
        supervision_present: template.category === "Supervision",
        status: "draft" as const,
        week_start_date: weekStart,
      }
    })

    const { error } = await supabase.from("activities").insert(toInsert)
    if (!error) {
      setTemplateGenSuccess(selected.length)
      setShowTemplates(false)
      await load()
    }
    setGeneratingFromTemplates(false)
  }

  const handleSubmit = async () => {
    if (!supervisorId) {
      setSubmitError("No active supervisor linked. Ask your supervisor to connect with you first.")
      return
    }
    if (activities.length === 0) return

    setSubmitting(true)
    setSubmitError("")

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const weekEnd = getWeekEnd(weekStart)
    const totalH = activities.reduce((s, a) => s + a.duration_minutes, 0) / 60
    const restrictedH = activities.filter(a => a.category === "Restricted").reduce((s, a) => s + a.duration_minutes, 0) / 60
    const unrestrictedH = activities.filter(a => a.category === "Unrestricted").reduce((s, a) => s + a.duration_minutes, 0) / 60
    const supervisionH = activities.filter(a => a.category === "Supervision").reduce((s, a) => s + a.duration_minutes, 0) / 60

    const reviewPayload = {
      trainee_id: user.id,
      supervisor_id: supervisorId,
      week_start_date: weekStart,
      week_end_date: weekEnd,
      total_hours: totalH,
      restricted_hours: restrictedH,
      unrestricted_hours: unrestrictedH,
      supervision_hours: supervisionH,
      status: "submitted" as const,
      submitted_at: new Date().toISOString(),
      reviewed_at: null,
      supervisor_notes: null,
    }

    let reviewError
    let reviewData: WeeklyReviewRow | null = null

    if (review) {
      const { data, error } = await supabase
        .from("weekly_reviews")
        .update(reviewPayload)
        .eq("id", review.id)
        .select()
        .single()
      reviewError = error
      reviewData = data
    } else {
      const { data, error } = await supabase
        .from("weekly_reviews")
        .insert(reviewPayload)
        .select()
        .single()
      reviewError = error
      reviewData = data
    }

    if (reviewError) {
      setSubmitError(reviewError.message)
      setSubmitting(false)
      return
    }

    const draftIds = activities.filter(a => a.status === "draft").map(a => a.id)
    if (draftIds.length > 0) {
      await supabase.from("activities").update({ status: "submitted" }).in("id", draftIds)
    }

    await supabase.from("notifications").insert({
      user_id: supervisorId,
      type: "review_submitted",
      title: "Weekly review submitted",
      body: `A trainee submitted their week of ${formatWeekRange(weekStart)} for your review.`,
      read: false,
      related_id: reviewData?.id ?? null,
    })

    setSubmitting(false)
    setSubmitSuccess(true)
    await load()
  }

  const totalHours = activities.reduce((s, a) => s + a.duration_minutes, 0) / 60
  const restrictedHours = activities.filter(a => a.category === "Restricted").reduce((s, a) => s + a.duration_minutes, 0) / 60
  const unrestrictedHours = activities.filter(a => a.category === "Unrestricted").reduce((s, a) => s + a.duration_minutes, 0) / 60
  const supervisionHours = activities.filter(a => a.category === "Supervision").reduce((s, a) => s + a.duration_minutes, 0) / 60

  const isSubmitted = review?.status === "submitted"
  const isApproved = review?.status === "approved"
  const isRejected = review?.status === "rejected"
  const isCurrentWeek = weekStart === todayWeekStart
  const canImport = !isSubmitted && !isApproved

  const grouped = WEEK_DAYS
    .map((dayName) => ({ dayName, acts: activities.filter((a) => getDayName(a.date) === dayName) }))
    .filter(g => g.acts.length > 0)

  return (
    <div className="p-4 md:p-7 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Weekly Review</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Weekly submissions build your Monthly Supervisory Period (MSP)</p>
        </div>
        {canImport && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenTemplates}
              className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Repeat2 className="w-3.5 h-3.5" />
              From Templates
            </button>
            <button
              onClick={handleOpenImport}
              className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              Import from Calendar
            </button>
          </div>
        )}
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-[#E8E6F4] px-4 py-3 mb-5">
        <button onClick={prevWeek} className="w-8 h-8 rounded-lg hover:bg-zinc-50 flex items-center justify-center text-zinc-400 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-violet-600" />
            <p className="text-sm font-semibold text-zinc-900">{formatWeekRange(weekStart)}</p>
          </div>
          {isCurrentWeek
            ? <p className="text-xs text-violet-500 mt-0.5 font-medium">Current week</p>
            : <p className="text-xs text-zinc-400 mt-0.5">{totalHours.toFixed(1)}h logged</p>
          }
        </div>
        <button
          onClick={nextWeek}
          disabled={isCurrentWeek}
          className="w-8 h-8 rounded-lg hover:bg-zinc-50 flex items-center justify-center text-zinc-400 transition-colors disabled:opacity-30"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <>
          {/* Status banners */}
          {isApproved && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Week approved</p>
                <p className="text-xs text-emerald-600 mt-0.5">Your supervisor approved this week's activities.</p>
              </div>
            </div>
          )}
          {isRejected && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Review returned by supervisor</p>
                {review?.supervisor_notes && (
                  <p className="text-xs text-red-600 mt-1 leading-relaxed">"{review.supervisor_notes}"</p>
                )}
              </div>
            </div>
          )}
          {isSubmitted && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-5">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">Submitted — awaiting supervisor review.</p>
            </div>
          )}
          {submitSuccess && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-emerald-800">Successfully submitted to your supervisor!</p>
            </div>
          )}
          {importSuccess > 0 && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-emerald-800">{importSuccess} event{importSuccess > 1 ? "s" : ""} imported from Google Calendar as draft activities.</p>
            </div>
          )}
          {templateGenSuccess > 0 && (
            <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <p className="text-sm text-emerald-800">{templateGenSuccess} activit{templateGenSuccess > 1 ? "ies" : "y"} generated from templates.</p>
            </div>
          )}

          {/* Template generation panel */}
          {showTemplates && (
            <div className="bg-white rounded-xl border border-zinc-200 mb-5 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 bg-zinc-50">
                <div className="flex items-center gap-2">
                  <Repeat2 className="w-4 h-4 text-zinc-600" />
                  <p className="text-sm font-semibold text-zinc-800">Generate from Templates</p>
                </div>
                <button onClick={() => setShowTemplates(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {templatesLoading ? (
                <div className="py-10 flex items-center justify-center gap-2 text-sm text-zinc-400">
                  <div className="w-4 h-4 border-2 border-zinc-200 border-t-zinc-500 rounded-full animate-spin" />
                  Loading templates…
                </div>
              ) : templateItems.length === 0 ? (
                <div className="py-10 text-center">
                  <Repeat2 className="w-7 h-7 text-zinc-300 mx-auto mb-2" />
                  <p className="text-sm font-medium text-zinc-600 mb-1">No activities to generate</p>
                  <p className="text-xs text-zinc-400">
                    Either you have no active templates, or all template activities already exist this week.
                  </p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-zinc-50">
                    <div className="flex items-center justify-between px-5 py-2.5">
                      <p className="text-xs text-zinc-400">{templateItems.filter(i => i.selected).length} of {templateItems.length} selected</p>
                      <button
                        onClick={() => {
                          const allSelected = templateItems.every(i => i.selected)
                          setTemplateItems(prev => prev.map(i => ({ ...i, selected: !allSelected })))
                        }}
                        className="text-xs font-semibold text-violet-600 hover:text-violet-700"
                      >
                        {templateItems.every(i => i.selected) ? "Deselect all" : "Select all"}
                      </button>
                    </div>
                    {templateItems.map((item, idx) => (
                      <button
                        key={`${item.template.id}-${item.date}`}
                        onClick={() => setTemplateItems(prev => prev.map((x, i) => i === idx ? { ...x, selected: !x.selected } : x))}
                        className={cn(
                          "w-full flex items-center gap-3 px-5 py-3 text-left transition-colors",
                          item.selected ? "bg-zinc-50" : "bg-white opacity-50"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0",
                          item.selected ? "bg-violet-600 border-violet-600" : "border-zinc-300"
                        )}>
                          {item.selected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-zinc-800 truncate">{item.template.title}</p>
                          <p className="text-xs text-zinc-400">
                            {formatDateShort(item.date)} · {formatTime(item.template.start_time)} – {formatTime(item.template.end_time)}
                          </p>
                        </div>
                        <span className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0",
                          item.template.category === "Restricted" ? "bg-violet-50 text-violet-700" :
                          item.template.category === "Supervision" ? "bg-emerald-50 text-emerald-700" :
                          "bg-blue-50 text-blue-700"
                        )}>
                          {item.template.category}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="px-5 py-3.5 border-t border-zinc-100 flex items-center justify-between gap-3">
                    <button onClick={() => setShowTemplates(false)} className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors">
                      Cancel
                    </button>
                    <button
                      onClick={handleGenerateFromTemplates}
                      disabled={generatingFromTemplates || templateItems.filter(i => i.selected).length === 0}
                      className="flex items-center gap-2 bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-60"
                    >
                      {generatingFromTemplates ? (
                        <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating…</>
                      ) : (
                        <><Repeat2 className="w-3.5 h-3.5" />Generate {templateItems.filter(i => i.selected).length} Activities</>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Calendar import panel */}
          {showImport && (
            <div className="bg-white rounded-xl border border-violet-200 mb-5 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-violet-100 bg-violet-50">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-violet-600" />
                  <p className="text-sm font-semibold text-violet-900">Import from Google Calendar</p>
                </div>
                <button onClick={() => setShowImport(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {importLoading ? (
                <div className="py-10 flex flex-col items-center gap-3">
                  <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                  <p className="text-xs text-zinc-400">Fetching calendar events…</p>
                </div>
              ) : importError ? (
                <div className="p-5">
                  <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{importError}</p>
                  </div>
                  {importError.includes("not connected") && (
                    <Link href="/settings/calendar" className="mt-3 inline-flex text-sm font-semibold text-violet-600 hover:text-violet-700">
                      Go to Calendar Settings →
                    </Link>
                  )}
                </div>
              ) : (
                <div>
                  <div className="px-5 py-3 border-b border-zinc-50 flex items-center justify-between">
                    <p className="text-xs text-zinc-500">{importItems.filter(i => i.selected).length} of {importItems.length} selected</p>
                    <button
                      onClick={() => setImportItems(items => items.map(i => ({ ...i, selected: !items.every(x => x.selected) })))}
                      className="text-xs font-medium text-violet-600 hover:text-violet-700"
                    >
                      {importItems.every(i => i.selected) ? "Deselect all" : "Select all"}
                    </button>
                  </div>

                  <div className="divide-y divide-zinc-50 max-h-80 overflow-y-auto">
                    {importItems.map((item, idx) => {
                      const { date, startTime, endTime, durationMins } = parseGCalTime(item.event)
                      return (
                        <div
                          key={item.event.id}
                          className={cn(
                            "flex items-center gap-3 px-5 py-3.5 transition-colors",
                            item.selected ? "bg-white" : "bg-zinc-50 opacity-60"
                          )}
                        >
                          <button
                            onClick={() => setImportItems(items => items.map((it, i) => i === idx ? { ...it, selected: !it.selected } : it))}
                            className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                              item.selected ? "bg-violet-600 border-violet-600" : "border-zinc-300"
                            )}
                          >
                            {item.selected && <Check className="w-3 h-3 text-white" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 truncate">{item.event.summary || "Untitled event"}</p>
                            <p className="text-xs text-zinc-400 mt-0.5">
                              {new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                              {" · "}
                              {formatTime(startTime)} – {formatTime(endTime)}
                              {" · "}
                              {(durationMins / 60).toFixed(1)}h
                            </p>
                          </div>

                          <select
                            value={item.kind}
                            onChange={e => setImportItems(items => items.map((it, i) => i === idx ? { ...it, kind: e.target.value as ImportKind } : it))}
                            disabled={!item.selected}
                            className="text-xs font-semibold border border-zinc-200 rounded-lg px-2 py-1.5 focus:outline-none bg-white disabled:opacity-40 text-zinc-700"
                          >
                            <option value="Restricted">Restricted</option>
                            <option value="Unrestricted">Unrestricted</option>
                            <option value="Individual Supervision">Individual Supervision</option>
                            <option value="Group Supervision">Group Supervision</option>
                            <option value="Observation">Observation</option>
                          </select>
                        </div>
                      )
                    })}
                  </div>

                  <div className="px-5 py-4 border-t border-zinc-100 flex gap-3">
                    <button
                      onClick={handleConfirmImport}
                      disabled={importing || importItems.filter(i => i.selected).length === 0}
                      className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
                    >
                      {importing ? (
                        <span className="w-4 h-4 border-2 border-violet-200 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Calendar className="w-4 h-4" />
                      )}
                      {importing ? "Importing…" : `Import ${importItems.filter(i => i.selected).length} event${importItems.filter(i => i.selected).length !== 1 ? "s" : ""}`}
                    </button>
                    <button onClick={() => setShowImport(false)} className="text-sm font-medium text-zinc-400 hover:text-zinc-600 px-3 py-2 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activities.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-xl border border-[#E8E6F4]">
              <CalendarDays className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-zinc-700 mb-1">No activities this week</p>
              <p className="text-xs text-zinc-400 mb-4">Import from Google Calendar or log activities manually</p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={handleOpenImport}
                  className="flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-4 py-2 rounded-lg transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  Import from Calendar
                </button>
                <Link href="/trainee/activities/new" className="text-sm font-semibold text-zinc-500 hover:text-zinc-700">
                  + Log manually
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* Activities grouped by day */}
              <div className="space-y-4 mb-5">
                {grouped.map(({ dayName, acts }) => (
                  <div key={dayName}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{dayName}</span>
                      <span className="text-xs text-zinc-300">{formatDateShort(acts[0].date)}</span>
                      <div className="flex-1 h-px bg-zinc-100" />
                      <span className="text-xs text-zinc-400">
                        {(acts.reduce((s, a) => s + a.duration_minutes, 0) / 60).toFixed(1)}h
                      </span>
                    </div>
                    <div className="space-y-2">
                      {acts.map((a) => (
                        <div
                          key={a.id}
                          className={cn(
                            "flex items-center gap-3 bg-white rounded-xl border px-4 py-3.5 transition-all",
                            a.status === "approved" ? "border-emerald-100 bg-emerald-50/20" :
                            a.status === "submitted" ? "border-amber-100 bg-amber-50/10" :
                            "border-[#E8E6F4]"
                          )}
                        >
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                            a.status === "approved" ? "bg-emerald-500 border-emerald-500" :
                            a.status === "submitted" ? "bg-amber-400 border-amber-400" :
                            "border-zinc-300"
                          )}>
                            {(a.status === "approved" || a.status === "submitted") && (
                              <Check className="w-3.5 h-3.5 text-white" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 truncate">{a.title}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-[11px] text-zinc-400">
                                {formatTime(a.start_time)} – {formatTime(a.end_time)}
                              </span>
                              <span className={cn(
                                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                                a.category === "Restricted" ? "bg-violet-50 text-violet-700" :
                                a.category === "Supervision" ? "bg-emerald-50 text-emerald-700" :
                                "bg-blue-50 text-blue-700"
                              )}>
                                {a.category}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            <span className="text-sm font-semibold text-zinc-600">
                              {(a.duration_minutes / 60).toFixed(1)}h
                            </span>
                            {!isSubmitted && !isApproved && (
                              <Link
                                href={`/trainee/activities/${a.id}`}
                                className="w-7 h-7 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-400 transition-colors"
                              >
                                <Pencil className="w-3 h-3" />
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary + submit */}
              <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-zinc-900">Week summary</h3>
                  <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100">
                    Counts toward your MSP
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Total", value: totalHours, color: "text-zinc-900" },
                    { label: "Restricted", value: restrictedHours, color: "text-violet-600" },
                    { label: "Unrestricted", value: unrestrictedHours, color: "text-blue-600" },
                    { label: "Supervision", value: supervisionHours, color: "text-emerald-600" },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <p className={cn("text-xl font-bold", s.color)}>{s.value.toFixed(1)}h</p>
                      <p className="text-[11px] text-zinc-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {submitError && (
                  <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5 mb-3">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    {submitError}
                  </div>
                )}

                {isApproved ? (
                  <div className="w-full py-3 rounded-xl text-sm font-semibold text-center bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <CheckCircle2 className="w-4 h-4 inline mr-1.5" />
                    Approved by supervisor
                  </div>
                ) : isRejected ? (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full py-3 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {submitting ? "Resubmitting…" : "Resubmit for review"}
                  </button>
                ) : isSubmitted ? (
                  <div className="w-full py-3 rounded-xl text-sm font-semibold text-center bg-amber-50 text-amber-700 border border-amber-100">
                    <Clock className="w-4 h-4 inline mr-1.5" />
                    Awaiting supervisor review
                  </div>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || activities.length === 0}
                    className={cn(
                      "w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2",
                      !submitting && activities.length > 0
                        ? "bg-violet-600 text-white hover:bg-violet-700"
                        : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                    )}
                  >
                    <Send className="w-4 h-4" />
                    {submitting
                      ? "Submitting…"
                      : !supervisorId
                        ? "No supervisor linked"
                        : `Submit ${totalHours.toFixed(1)}h to supervisor →`
                    }
                  </button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
