"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, CheckCircle2, Users, Calendar, Clock, Video, MessageSquare, AlertCircle, Repeat2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type TraineeProfile = Database["public"]["Tables"]["trainee_profiles"]["Row"]
type SessionType = "individual" | "group"
type ObservationType = "direct" | "remote" | "indirect"

const REPEAT_OPTIONS = [
  { weeks: 1, label: "One-time" },
  { weeks: 4, label: "Weekly ×4" },
  { weeks: 8, label: "Weekly ×8" },
  { weeks: 12, label: "Weekly ×12" },
]

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00")
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export default function NewSessionPage() {
  const router = useRouter()
  const today = new Date().toISOString().split("T")[0]

  const [supervisees, setSupervisees] = useState<(Profile & { traineeProfile: TraineeProfile | null })[]>([])
  const [loadingSupervisees, setLoadingSupervisees] = useState(true)

  const [traineeId, setTraineeId] = useState("")
  const [date, setDate] = useState(today)
  const [startTime, setStartTime] = useState("14:00")
  const [endTime, setEndTime] = useState("15:00")
  const [sessionType, setSessionType] = useState<SessionType>("individual")
  const [observationType, setObservationType] = useState<ObservationType>("direct")
  const [observationMinutes, setObservationMinutes] = useState(60)
  const [repeatWeeks, setRepeatWeeks] = useState(1)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedName, setSavedName] = useState("")
  const [savedCount, setSavedCount] = useState(1)
  const [error, setError] = useState("")

  const startMins = parseInt(startTime.split(":")[0]) * 60 + parseInt(startTime.split(":")[1])
  const endMins = parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1])
  const durationMinutes = Math.max(0, endMins - startMins)
  const duration = durationMinutes / 60

  useEffect(() => {
    async function loadSupervisees() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: rels } = await supabase
        .from("supervisor_relationships")
        .select("trainee_id")
        .eq("supervisor_id", user.id)
        .eq("status", "active")

      if (!rels || rels.length === 0) { setLoadingSupervisees(false); return }

      const ids = rels.map(r => r.trainee_id)
      const [{ data: profiles }, { data: traineeProfiles }] = await Promise.all([
        supabase.from("profiles").select("*").in("id", ids),
        supabase.from("trainee_profiles").select("*").in("id", ids),
      ])

      const tpMap = Object.fromEntries((traineeProfiles ?? []).map(t => [t.id, t]))
      const enriched = (profiles ?? []).map(p => ({ ...p, traineeProfile: tpMap[p.id] ?? null }))
      setSupervisees(enriched)
      if (enriched.length > 0) setTraineeId(enriched[0].id)
      setLoadingSupervisees(false)
    }
    loadSupervisees()
  }, [])

  const handleSave = async () => {
    setError("")
    if (!traineeId) { setError("Select a supervisee"); return }
    if (durationMinutes <= 0) { setError("End time must be after start time"); return }

    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Build one row per weekly occurrence (repeatWeeks === 1 → single session).
    const rows = Array.from({ length: repeatWeeks }, (_, i) => ({
      supervisor_id: user.id,
      trainee_id: traineeId,
      date: addDays(date, i * 7),
      start_time: startTime + ":00",
      end_time: endTime + ":00",
      duration_minutes: durationMinutes,
      session_type: sessionType,
      observation_type: observationType,
      observation_duration_minutes: observationMinutes,
      notes: notes || null,
      status: "pending",
    }))

    const { error: insertError } = await supabase.from("supervision_sessions").insert(rows)

    setSaving(false)
    if (insertError) { setError(insertError.message); return }

    const sel = supervisees.find(s => s.id === traineeId)
    setSavedName(sel ? `${sel.first_name} ${sel.last_name}` : "Trainee")
    setSavedCount(rows.length)
    setSaved(true)
  }

  if (saved) {
    return (
      <div className="p-4 md:p-7 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-1">
          {savedCount > 1 ? `${savedCount} sessions logged!` : "Session logged!"}
        </h2>
        <p className="text-sm text-zinc-500 mb-1">
          {sessionType} session{savedCount > 1 ? "s" : ""} with <span className="font-semibold text-zinc-700">{savedName}</span>
        </p>
        <p className="text-xs text-zinc-400 mb-6">
          {duration.toFixed(1)}h · {observationType} observation · {savedCount > 1 ? `${savedCount} weekly occurrences from ${date}` : date}
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => { setSaved(false); setNotes(""); setDate(today); setRepeatWeeks(1) }}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Log another
          </button>
          <button
            onClick={() => router.push("/supervisor/sessions")}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors"
          >
            View sessions
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-7 max-w-2xl mx-auto">
      <Link href="/supervisor/sessions" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Sessions
      </Link>

      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Log Session</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Record a supervision session with a trainee</p>
      </div>

      <div className="space-y-4">
        {/* Supervisee picker */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
            <Users className="w-3.5 h-3.5" /> Supervisee
          </label>
          {loadingSupervisees ? (
            <div className="py-4 text-center text-sm text-zinc-400">Loading supervisees…</div>
          ) : supervisees.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-zinc-400 mb-2">No active supervisees</p>
              <Link href="/supervisor/supervisees" className="text-sm font-semibold text-violet-600 hover:text-violet-700">
                Invite a trainee first →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {supervisees.map((s) => {
                const ini = `${s.first_name[0]}${s.last_name[0]}`.toUpperCase()
                return (
                  <button
                    key={s.id}
                    onClick={() => setTraineeId(s.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left",
                      traineeId === s.id ? "border-violet-200 bg-violet-50" : "border-zinc-100 hover:border-zinc-200"
                    )}
                  >
                    <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-violet-700">{ini}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-semibold truncate", traineeId === s.id ? "text-violet-900" : "text-zinc-800")}>
                        {s.first_name} {s.last_name}
                      </p>
                      <p className="text-xs text-zinc-400">{s.traineeProfile?.certification_target ?? "BCBA"}</p>
                    </div>
                    {traineeId === s.id && <CheckCircle2 className="w-4 h-4 text-violet-600 flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}
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
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 mb-1.5">End time</p>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" />
              </div>
            </div>
            {durationMinutes > 0 && (
              <div className="flex items-center gap-2 text-sm text-zinc-500 bg-zinc-50 rounded-lg px-3.5 py-2">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Duration: <span className="font-semibold text-zinc-900">{duration.toFixed(1)} hours</span></span>
              </div>
            )}
          </div>
        </div>

        {/* Session type */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
            <Video className="w-3.5 h-3.5" /> Session Type
          </label>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {(["individual", "group"] as SessionType[]).map((t) => (
              <button key={t} onClick={() => setSessionType(t)}
                className={cn(
                  "py-2.5 text-sm font-semibold rounded-lg border transition-all capitalize",
                  sessionType === t ? "bg-violet-600 text-white border-violet-600" : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                )}>
                {t}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mb-2">Observation method</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(["direct", "remote", "indirect"] as ObservationType[]).map((o) => (
              <button key={o} onClick={() => setObservationType(o)}
                className={cn(
                  "py-2 text-xs font-semibold rounded-lg border transition-all capitalize",
                  observationType === o ? "bg-emerald-600 text-white border-emerald-600" : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                )}>
                {o}
              </button>
            ))}
          </div>
          {observationType !== "indirect" && (
            <div>
              <p className="text-xs text-zinc-500 mb-1.5">Observation duration (minutes)</p>
              <input
                type="number"
                min="0"
                value={observationMinutes}
                onChange={(e) => setObservationMinutes(parseInt(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
              />
              <p className="text-[11px] text-zinc-400 mt-1">2027 BACB requirement: concentrated fieldwork = 90 min/month · supervised fieldwork = 60 min/month</p>
            </div>
          )}
        </div>

        {/* Repeat — make sessions recurring like templates */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
            <Repeat2 className="w-3.5 h-3.5" /> Repeat
          </label>
          <div className="grid grid-cols-4 gap-2">
            {REPEAT_OPTIONS.map((opt) => (
              <button key={opt.weeks} onClick={() => setRepeatWeeks(opt.weeks)}
                className={cn(
                  "py-2 text-xs font-semibold rounded-lg border transition-all",
                  repeatWeeks === opt.weeks ? "bg-violet-600 text-white border-violet-600" : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                )}>
                {opt.label}
              </button>
            ))}
          </div>
          {repeatWeeks > 1 && (
            <p className="text-[11px] text-zinc-400 mt-2">
              Creates {repeatWeeks} sessions, one each week starting {date}.
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
            <MessageSquare className="w-3.5 h-3.5" /> Session Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Describe what was covered in this session..."
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all resize-none placeholder:text-zinc-300"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={durationMinutes <= 0 || !traineeId || saving}
          className={cn(
            "w-full py-3.5 text-sm font-semibold rounded-xl transition-colors",
            durationMinutes > 0 && traineeId && !saving
              ? "bg-violet-600 text-white hover:bg-violet-700"
              : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
          )}
        >
          {saving ? "Saving…" : durationMinutes > 0 && traineeId
            ? (repeatWeeks > 1
                ? `Save ${repeatWeeks} weekly ${sessionType} sessions`
                : `Save ${duration.toFixed(1)}h ${sessionType} Session`)
            : "Set a valid time range and supervisee to continue"
          }
        </button>
      </div>
    </div>
  )
}
