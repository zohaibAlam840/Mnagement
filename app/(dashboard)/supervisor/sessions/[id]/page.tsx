"use client"

import { useState, use } from "react"
import Link from "next/link"
import {
  ChevronLeft, CheckCircle2, Clock, Pencil, Save,
  X, User, Calendar, Video, MessageSquare
} from "lucide-react"
import { supervisionSessions } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export default function SessionDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const session = supervisionSessions.find((s) => s.id === id) ?? supervisionSessions[0]
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(session.notes)
  const [approved, setApproved] = useState(session.approved)

  return (
    <div className="p-4 md:p-7 max-w-2xl mx-auto">
      <Link href="/supervisor/sessions" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Sessions
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Supervision Session</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{session.date}</p>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="w-9 h-9 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 transition-colors">
                <X className="w-4 h-4" />
              </button>
              <button onClick={() => setEditing(false)} className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center text-white hover:bg-violet-700 transition-colors">
                <Save className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} className="w-9 h-9 rounded-lg border border-[#E8E6F4] bg-white flex items-center justify-center text-zinc-500 hover:bg-zinc-50 transition-colors">
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Supervisee card */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-4 mb-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-bold text-violet-700">{session.initials}</span>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-zinc-900">{session.supervisee}</p>
          <p className="text-xs text-zinc-400">BCBA Trainee</p>
        </div>
        <Link href={`/supervisor/supervisees/${session.superviseeId}`} className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors">
          View profile →
        </Link>
      </div>

      {/* Session details */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] divide-y divide-zinc-50 mb-4">
        {[
          { icon: <Calendar className="w-4 h-4 text-zinc-400" />, label: "Date", value: session.date },
          { icon: <Clock className="w-4 h-4 text-zinc-400" />, label: "Duration", value: `${session.duration} hour${session.duration !== 1 ? "s" : ""}` },
          { icon: <User className="w-4 h-4 text-zinc-400" />, label: "Session type", value: session.type },
          { icon: <Video className="w-4 h-4 text-zinc-400" />, label: "Observation", value: session.observationType },
        ].map((row, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5">
            <div className="w-5 flex items-center justify-center flex-shrink-0">{row.icon}</div>
            <span className="text-sm text-zinc-500 w-28 flex-shrink-0">{row.label}</span>
            <span className="text-sm font-semibold text-zinc-900 flex-1 text-right">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Session type badges */}
      <div className="flex gap-2 mb-4">
        <span className={cn(
          "text-xs font-semibold px-3 py-1.5 rounded-full border",
          session.type === "Individual" ? "bg-violet-50 text-violet-700 border-violet-100" : "bg-blue-50 text-blue-700 border-blue-100"
        )}>
          {session.type}
        </span>
        <span className={cn(
          "text-xs font-semibold px-3 py-1.5 rounded-full border",
          session.observationType === "Direct" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-zinc-50 text-zinc-600 border-zinc-100"
        )}>
          {session.observationType} observation
        </span>
        <span className={cn(
          "flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full",
          approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
        )}>
          {approved ? <><CheckCircle2 className="w-3 h-3" /> Confirmed</> : <><Clock className="w-3 h-3" /> Pending</>}
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
            {notes || <span className="text-zinc-300 italic">No notes added for this session.</span>}
          </p>
        )}
      </div>

      {/* Confirm / unconfirm */}
      {!approved ? (
        <button
          onClick={() => setApproved(true)}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold py-3 rounded-xl text-sm hover:bg-emerald-700 transition-colors"
        >
          <CheckCircle2 className="w-4 h-4" />
          Mark session as confirmed
        </button>
      ) : (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-800">Session confirmed</p>
          </div>
          <button onClick={() => setApproved(false)} className="text-xs text-emerald-600 hover:text-emerald-800 font-medium">
            Undo
          </button>
        </div>
      )}
    </div>
  )
}
