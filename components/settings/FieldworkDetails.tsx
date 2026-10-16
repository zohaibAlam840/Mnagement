"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, FileSignature, Loader2 } from "lucide-react"
import { api } from "@/lib/api"

type Details = { role: string; bacbId: string; state?: string; country?: string }

const US_STATES = [
  "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "District of Columbia",
  "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
  "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
  "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
  "Pennsylvania", "Puerto Rico", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont",
  "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming",
]

const input = "w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"

// Details printed on the BACB Monthly Fieldwork Verification Form
export function FieldworkDetails() {
  const [d, setD] = useState<Details | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    api<Details>("/api/profile/fieldwork").then(setD).catch(e => setError(e.message))
  }, [])

  if (!d) return error ? <p className="text-sm text-red-600">{error}</p> : null
  const isTrainee = d.role === "trainee"

  const save = async () => {
    setSaving(true)
    setSaved(false)
    setError("")
    try {
      await api("/api/profile/fieldwork", { method: "PATCH", body: d })
      setSaved(true)
    } catch (e) {
      setError((e as Error).message)
    }
    setSaving(false)
  }

  return (
    <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-5">
      <div className="flex items-center gap-2 mb-1">
        <FileSignature className="w-4 h-4 text-violet-600" />
        <p className="text-sm font-semibold text-zinc-900">Verification form details</p>
      </div>
      <p className="text-xs text-zinc-400 mb-4">Printed on your BACB Monthly Fieldwork Verification Forms. Each form can still be edited before signing.</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-semibold text-zinc-500">{isTrainee ? "BACB ID #" : "Certification # or BACB ID #"}</span>
          <input value={d.bacbId} onChange={(e) => setD({ ...d, bacbId: e.target.value })} className={input} />
        </label>
        {isTrainee && (
          <>
            <label className="block">
              <span className="text-xs font-semibold text-zinc-500">Country where fieldwork occurs</span>
              <input value={d.country ?? ""} onChange={(e) => setD({ ...d, country: e.target.value })} className={input} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-semibold text-zinc-500">State where fieldwork occurs</span>
              <input list="fw-states" value={d.state ?? ""} onChange={(e) => setD({ ...d, state: e.target.value })} placeholder="Choose or type" className={input} />
              <datalist id="fw-states">
                {US_STATES.map(s => <option key={s} value={s} />)}
              </datalist>
            </label>
          </>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-3">{error}</p>}
      <div className="flex items-center gap-3 mt-4">
        <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-violet-700 disabled:opacity-60">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save details
        </button>
        {saved && <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Saved</span>}
      </div>
    </div>
  )
}

// Shown only to Admin / Director accounts (mobile has no sidebar)
export function AdminConsoleLink() {
  const [level, setLevel] = useState<string | null>(null)
  useEffect(() => {
    import("@/lib/supabase/client").then(async ({ createClient }) => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from("profiles").select("admin_level").eq("id", user.id).single()
      setLevel((data as { admin_level?: string | null } | null)?.admin_level ?? null)
    })
  }, [])
  if (!level) return null
  return (
    <a href="/admin" className="flex items-center justify-between bg-violet-600 text-white rounded-xl px-5 py-3.5 mb-5 hover:bg-violet-700">
      <span className="text-sm font-semibold">{level === "director" ? "Director" : "Admin"} console</span>
      <span className="text-xs opacity-80">Candidates · unlocks · accounts →</span>
    </a>
  )
}
