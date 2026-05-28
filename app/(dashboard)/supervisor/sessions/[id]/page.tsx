"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import {
  ChevronLeft, CheckCircle2, Clock, Pencil, Save,
  X, User, Calendar, Video, MessageSquare, Trash2
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"
import { useRouter } from "next/navigation"

type Session = Database["public"]["Tables"]["supervision_sessions"]["Row"]
type Profile = Database["public"]["Tables"]["profiles"]["Row"]

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
}
function formatTime(t: string) {
  const [h, m] = t.split(":")
  const hr = parseInt(h)
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`
}

export default function SessionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [session, setSession] = useState<Session | null>(null)
  const [trainee, setTrainee] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: sess } = await supabase
        .from("supervision_sessions")
        .select("*")
        .eq("id", id)
        .eq("supervisor_id", user.id)
        .single()

      if (!sess) { setNotFound(true); setLoading(false); return }
      setSession(sess)
      setNotes(sess.notes ?? "")

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", sess.trainee_id)
        .single()
      setTrainee(prof)
      setLoading(false)
    }
    load()
  }, [id])

  const handleSaveNotes = async () => {
    if (!session) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("supervision_sessions")
      .update({ notes: notes || null })
      .eq("id", session.id)
      .select()
      .single()
    if (data) setSession(data)
    setSaving(false)
    setEditing(false)
  }

  const handleConfirm = async () => {
    if (!session) return
    const supabase = createClient()
    const { data } = await supabase
      .from("supervision_sessions")
      .update({ status: "confirmed" })
      .eq("id", session.id)
      .select()
      .single()
    if (data) setSession(data)
  }

  const handleUnconfirm = async () => {
    if (!session) return
    const supabase = createClient()
    const { data } = await supabase
      .from("supervision_sessions")
      .update({ status: "pending" })
      .eq("id", session.id)
      .select()
      .single()
    if (data) setSession(data)
  }

  const handleDelete = async () => {
    if (!session || !confirm("Delete this session? This cannot be undone.")) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from("supervision_sessions").delete().eq("id", session.id)
    router.push("/supervisor/sessions")
  }

  if (loading) {
    return (
      <div className="p-4 md:p-7 max-w-2xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !session) {
    return (
      <div className="p-4 md:p-7 max-w-2xl mx-auto text-center py-20">
        <p className="text-zinc-400 mb-4">Session not found.</p>
        <Link href="/supervisor/sessions" className="text-sm font-semibold text-violet-600 hover:text-violet-700">
          ← Back to sessions
        </Link>
      </div>
    )
  }

  const durationH = session.duration_minutes / 60
  const isConfirmed = session.status === "confirmed"
  const traineeName = trainee ? `${trainee.first_name} ${trainee.last_name}` : "Trainee"
  const traineeIni = trainee ? `${trainee.first_name[0]}${trainee.last_name[0]}`.toUpperCase() : "??"

  return (
    <div className="p-4 md:p-7 max-w-2xl mx-auto">
      <Link href="/supervisor/sessions" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Sessions
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Supervision Session</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{formatDate(session.date)}</p>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={() => { setEditing(false); setNotes(session.notes ?? "") }}
                className="w-9 h-9 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 transition-colors">
                <X className="w-4 h-4" />
              </button>
              <button onClick={handleSaveNotes} disabled={saving}
                className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center text-white hover:bg-violet-700 transition-colors disabled:opacity-60">
                <Save className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="w-9 h-9 rounded-lg border border-[#E8E6F4] bg-white flex items-center justify-center text-zinc-500 hover:bg-zinc-50 transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Trainee card */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-4 mb-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-violet-700">{traineeIni}</span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-zinc-900">{traineeName}</p>
          <p className="text-xs text-zinc-400">BCBA Trainee</p>
        </div>
        <Link href={`/supervisor/supervisees/${session.trainee_id}`}
          className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors">
          View profile →
        </Link>
      </div>

      {/* Session details */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] divide-y divide-zinc-50 mb-4">
        {[
          { icon: <Calendar className="w-4 h-4 text-zinc-400" />, label: "Date", value: formatDate(session.date) },
          { icon: <Clock className="w-4 h-4 text-zinc-400" />, label: "Time", value: `${formatTime(session.start_time)} – ${formatTime(session.end_time)}` },
          { icon: <Clock className="w-4 h-4 text-zinc-400" />, label: "Duration", value: `${durationH.toFixed(1)} hour${durationH !== 1 ? "s" : ""}` },
          { icon: <User className="w-4 h-4 text-zinc-400" />, label: "Session type", value: session.session_type },
          { icon: <Video className="w-4 h-4 text-zinc-400" />, label: "Observation", value: session.observation_type },
          ...(session.observation_duration_minutes > 0 ? [
            { icon: <Clock className="w-4 h-4 text-zinc-400" />, label: "Obs. duration", value: `${session.observation_duration_minutes} min` }
          ] : []),
        ].map((row, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5">
            <div className="w-5 flex items-center justify-center flex-shrink-0">{row.icon}</div>
            <span className="text-sm text-zinc-500 w-28 flex-shrink-0">{row.label}</span>
            <span className="text-sm font-semibold text-zinc-900 flex-1 text-right capitalize">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Status badges */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <span className={cn(
          "text-xs font-semibold px-3 py-1.5 rounded-full border capitalize",
          session.session_type === "individual" ? "bg-violet-50 text-violet-700 border-violet-100" : "bg-blue-50 text-blue-700 border-blue-100"
        )}>
          {session.session_type}
        </span>
        <span className={cn(
          "text-xs font-semibold px-3 py-1.5 rounded-full border capitalize",
          session.observation_type === "direct" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-zinc-50 text-zinc-600 border-zinc-100"
        )}>
          {session.observation_type} observation
        </span>
        <span className={cn(
          "flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full",
          isConfirmed ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
        )}>
          {isConfirmed
            ? <><CheckCircle2 className="w-3 h-3" /> Confirmed</>
            : <><Clock className="w-3 h-3" /> Pending</>
          }
        </span>
      </div>

      {/* Notes */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-zinc-400" />
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Session Notes</p>
        </div>
        {editing ? (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Add session notes..."
            className="w-full text-sm text-zinc-700 bg-zinc-50 rounded-xl p-3 focus:outline-none resize-none placeholder:text-zinc-300 border border-zinc-200 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 transition-all"
          />
        ) : (
          <p className="text-sm text-zinc-600 leading-relaxed">
            {session.notes || <span className="text-zinc-300 italic">No notes added for this session.</span>}
          </p>
        )}
      </div>

      {/* Confirm/Unconfirm */}
      {!isConfirmed ? (
        <button
          onClick={handleConfirm}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold py-3 rounded-xl text-sm hover:bg-emerald-700 transition-colors mb-3"
        >
          <CheckCircle2 className="w-4 h-4" />
          Mark session as confirmed
        </button>
      ) : (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-3.5 mb-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-800">Session confirmed</p>
          </div>
          <button onClick={handleUnconfirm} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">
            Undo
          </button>
        </div>
      )}

      {/* Delete */}
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-red-500 border border-red-100 bg-red-50 py-2.5 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-60"
      >
        <Trash2 className="w-4 h-4" />
        {deleting ? "Deleting…" : "Delete session"}
      </button>
    </div>
  )
}
