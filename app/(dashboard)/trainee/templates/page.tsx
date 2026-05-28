"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Plus, Repeat2, ToggleLeft, ToggleRight, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"

type TemplateRow = Database["public"]["Tables"]["activity_templates"]["Row"]

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function formatTime(t: string) {
  const [h, m] = t.split(":")
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`
}

function durationHours(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60)
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("activity_templates")
        .select("*")
        .eq("trainee_id", user.id)
        .order("created_at", { ascending: false })
      if (data) setTemplates(data)
      setLoading(false)
    }
    load()
  }, [])

  const handleToggle = async (t: TemplateRow) => {
    const supabase = createClient()
    const { data } = await supabase
      .from("activity_templates")
      .update({ active: !t.active })
      .eq("id", t.id)
      .select()
      .single()
    if (data) setTemplates((prev) => prev.map((x) => x.id === data.id ? data : x))
  }

  const activeTemplates = templates.filter((t) => t.active)

  const restrictedH = activeTemplates
    .filter((t) => t.category === "Restricted")
    .reduce((s, t) => s + durationHours(t.start_time, t.end_time) * t.days.length, 0)
  const unrestrictedH = activeTemplates
    .filter((t) => t.category === "Unrestricted")
    .reduce((s, t) => s + durationHours(t.start_time, t.end_time) * t.days.length, 0)
  const supervisionH = activeTemplates
    .filter((t) => t.category === "Supervision")
    .reduce((s, t) => s + durationHours(t.start_time, t.end_time) * t.days.length, 0)
  const totalH = restrictedH + unrestrictedH + supervisionH

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
          Tag a category once — ABA Fieldwork Pro handles the rest.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center">
          <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-zinc-400">Loading templates…</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="py-16 text-center">
          <div className="w-12 h-12 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-3">
            <Repeat2 className="w-6 h-6 text-violet-400" />
          </div>
          <p className="text-sm font-medium text-zinc-700 mb-1">No templates yet</p>
          <p className="text-xs text-zinc-400 mb-4">Create a recurring schedule to speed up your weekly logging</p>
          <Link href="/trainee/templates/new" className="text-sm font-semibold text-violet-600 hover:text-violet-700">
            + Create first template
          </Link>
        </div>
      ) : (
        <>
          {/* Template grid */}
          <div className="grid md:grid-cols-2 gap-4">
            {templates.map((t) => (
              <div key={t.id} className={cn(
                "bg-white rounded-xl border p-5 transition-all",
                t.active ? "border-[#E8E6F4]" : "border-zinc-100 opacity-60"
              )}>
                <div className="flex items-start justify-between mb-3">
                  <Link href={`/trainee/templates/${t.id}`} className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition-opacity">
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
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 leading-tight truncate">{t.title}</p>
                      {t.client_name && <p className="text-[11px] text-zinc-400 mt-0.5 truncate">{t.client_name}</p>}
                    </div>
                  </Link>
                  <button
                    onClick={() => handleToggle(t)}
                    className="ml-2 flex-shrink-0 text-zinc-400 hover:text-zinc-600 transition-colors"
                    title={t.active ? "Disable template" : "Enable template"}
                  >
                    {t.active
                      ? <ToggleRight className="w-5 h-5 text-violet-500" />
                      : <ToggleLeft className="w-5 h-5" />
                    }
                  </button>
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
                      {formatTime(t.start_time)} – {formatTime(t.end_time)}
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
                    <p className="text-xs font-semibold text-zinc-900">
                      {(durationHours(t.start_time, t.end_time) * t.days.length).toFixed(1)}h / week
                    </p>
                    <p className="text-[10px] text-zinc-400">{t.days.length}× per week</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Weekly hours summary */}
          {totalH > 0 && (
            <div className="mt-6 bg-white rounded-xl border border-[#E8E6F4] p-5">
              <h3 className="text-sm font-semibold text-zinc-900 mb-3">Projected Weekly Hours (active templates)</h3>
              <div className="grid grid-cols-3 gap-4 mb-3">
                {[
                  { label: "Restricted", value: restrictedH, color: "bg-violet-600" },
                  { label: "Unrestricted", value: unrestrictedH, color: "bg-blue-500" },
                  { label: "Supervision", value: supervisionH, color: "bg-emerald-500" },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={cn("w-2 h-2 rounded-full", s.color)} />
                      <span className="text-xs text-zinc-500">{s.label}</span>
                    </div>
                    <p className="text-lg font-bold text-zinc-900">{s.value.toFixed(1)}h</p>
                  </div>
                ))}
              </div>
              {totalH > 0 && (
                <>
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden flex">
                    <div className="bg-violet-600 h-full transition-all" style={{ width: `${(restrictedH / totalH) * 100}%` }} />
                    <div className="bg-blue-500 h-full transition-all" style={{ width: `${(unrestrictedH / totalH) * 100}%` }} />
                    <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(supervisionH / totalH) * 100}%` }} />
                  </div>
                  <p className="text-xs text-zinc-400 mt-1.5">{totalH.toFixed(1)}h projected total per week</p>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
