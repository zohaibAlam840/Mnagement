"use client"

import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { TYPE_LABEL, activityTypeOf, type FieldworkCategory } from "@/lib/activityKind"
import { formatHM } from "@/lib/period"
import { CategoryToggle } from "./KindPicker"
import type { Database } from "@/lib/supabase/types"

type ActivityRow = Database["public"]["Tables"]["activities"]["Row"]

function dayLabel(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

// Candidate-facing review list: legacy supervision/observation entries that were
// logged before Restricted/Unrestricted was required. Works on locked weeks too —
// only the missing category is saved.
export function NeedsCategoryPanel({ onChange, className }: { onChange?: () => void; className?: string }) {
  const [rows, setRows] = useState<ActivityRow[]>([])
  const [loaded, setLoaded] = useState(false)
  const [choice, setChoice] = useState<Record<string, FieldworkCategory>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(0)
  const [expanded, setExpanded] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from("activities").select("*")
      .eq("trainee_id", user.id).is("category", null)
      .order("date", { ascending: false }).limit(500)
    setRows((data ?? []) as ActivityRow[])
    setLoaded(true)
  }, [])

  useEffect(() => { load() }, [load])

  const save = async (ids: string[], category: FieldworkCategory) => {
    setSaving(true)
    setError("")
    try {
      const { updated } = await api<{ updated: number }>("/api/activities/category", { body: { ids, category } })
      setDone(d => d + updated)
      setChoice(c => { const n = { ...c }; ids.forEach(id => delete n[id]); return n })
      await load()
      onChange?.()
    } catch (e) {
      setError((e as Error).message)
    }
    setSaving(false)
  }

  const saveChosen = async () => {
    const byCat: Record<FieldworkCategory, string[]> = { Restricted: [], Unrestricted: [] }
    for (const [id, c] of Object.entries(choice)) byCat[c].push(id)
    for (const c of ["Restricted", "Unrestricted"] as const) if (byCat[c].length) await save(byCat[c], c)
  }

  if (!loaded) return null
  if (rows.length === 0) {
    return done > 0 ? (
      <div className={cn("flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm text-emerald-800", className)}>
        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> All entries now have Restricted or Unrestricted.
      </div>
    ) : null
  }

  const shown = expanded ? rows : rows.slice(0, 5)
  const chosenCount = Object.keys(choice).length

  return (
    <div className={cn("bg-amber-50 border border-amber-200 rounded-xl overflow-hidden", className)}>
      <div className="flex items-start gap-3 px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-amber-900">
            {rows.length} supervision/observation entr{rows.length === 1 ? "y needs" : "ies need"} Restricted or Unrestricted
          </p>
          <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
            Supervision and observation hours now count toward your Restricted or Unrestricted totals. Pick one for each entry below.
            This works on approved weeks too: only the category is saved. Hours, approvals and signed forms don&apos;t change.
          </p>
        </div>
      </div>
      <div className="bg-white border-t border-amber-100 divide-y divide-zinc-100">
        {shown.map(a => (
          <div key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <div className="flex-1 min-w-[10rem]">
              <p className="text-sm font-medium text-zinc-900 truncate">{a.title}</p>
              <p className="text-[11px] text-zinc-400">
                {dayLabel(a.date)} · {TYPE_LABEL[activityTypeOf(a)]} · {formatHM(a.duration_minutes)}
                {a.status === "approved" ? " · approved" : ""}
              </p>
            </div>
            <div className="w-56">
              <CategoryToggle compact value={choice[a.id] ?? null} onChange={c => setChoice(x => ({ ...x, [a.id]: c }))} disabled={saving} />
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5 border-t border-amber-100 bg-white">
        {rows.length > 5 && (
          <button onClick={() => setExpanded(e => !e)} className="text-xs font-semibold text-zinc-500 hover:text-zinc-700 mr-auto">
            {expanded ? "Show fewer" : `Show all ${rows.length}`}
          </button>
        )}
        {error && <p className="text-xs text-red-600 w-full">{error}</p>}
        <button
          onClick={() => confirm(`Mark all ${rows.length} entries as Restricted?`) && save(rows.map(r => r.id), "Restricted")}
          disabled={saving}
          className="text-xs font-semibold text-violet-700 border border-violet-200 bg-violet-50 hover:bg-violet-100 px-3 py-1.5 rounded-lg disabled:opacity-50 ml-auto"
        >
          Mark all Restricted
        </button>
        <button
          onClick={() => confirm(`Mark all ${rows.length} entries as Unrestricted?`) && save(rows.map(r => r.id), "Unrestricted")}
          disabled={saving}
          className="text-xs font-semibold text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg disabled:opacity-50"
        >
          Mark all Unrestricted
        </button>
        <button
          onClick={saveChosen}
          disabled={saving || chosenCount === 0}
          className="text-xs font-semibold text-white bg-violet-600 hover:bg-violet-700 px-3 py-1.5 rounded-lg disabled:opacity-50"
        >
          {saving ? "Saving…" : `Save ${chosenCount || ""} selected`.replace("  ", " ")}
        </button>
      </div>
    </div>
  )
}
