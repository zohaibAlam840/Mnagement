"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, CheckCircle2, Users, Calendar, Clock, Video, MessageSquare } from "lucide-react"
import { supervisees } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

type SessionType = "Individual" | "Group"
type ObservationType = "Direct" | "Remote" | "Indirect"

export default function NewSessionPage() {
  const [superviseeId, setSuperviseeId] = useState(supervisees[0].id)
  const [date, setDate] = useState("2025-05-19")
  const [startTime, setStartTime] = useState("14:00")
  const [endTime, setEndTime] = useState("15:00")
  const [sessionType, setSessionType] = useState<SessionType>("Individual")
  const [observationType, setObservationType] = useState<ObservationType>("Direct")
  const [notes, setNotes] = useState("")
  const [saved, setSaved] = useState(false)

  const startMins = parseInt(startTime.split(":")[0]) * 60 + parseInt(startTime.split(":")[1])
  const endMins = parseInt(endTime.split(":")[0]) * 60 + parseInt(endTime.split(":")[1])
  const duration = Math.max(0, (endMins - startMins) / 60)

  const selectedSupervisee = supervisees.find((s) => s.id === superviseeId) ?? supervisees[0]

  if (saved) {
    return (
      <div className="p-4 md:p-7 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-1">Session logged!</h2>
        <p className="text-sm text-zinc-500 mb-1">
          {sessionType} session with <span className="font-semibold text-zinc-700">{selectedSupervisee.name}</span>
        </p>
        <p className="text-xs text-zinc-400 mb-6">
          {duration.toFixed(1)}h · {observationType} observation · {date}
        </p>
        <div className="flex gap-3">
          <Link href="/supervisor/sessions/new" onClick={() => setSaved(false)} className="px-5 py-2.5 text-sm font-semibold rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 transition-colors">
            Log another
          </Link>
          <Link href="/supervisor/sessions" className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors">
            View sessions
          </Link>
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
        {/* Supervisee */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <label className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">
            <Users className="w-3.5 h-3.5" /> Supervisee
          </label>
          <div className="space-y-2">
            {supervisees.map((s) => (
              <button
                key={s.id}
                onClick={() => setSuperviseeId(s.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left",
                  superviseeId === s.id ? "border-violet-200 bg-violet-50" : "border-zinc-100 hover:border-zinc-200"
                )}
              >
                <div className="w-9 h-9 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-violet-700">{s.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold truncate", superviseeId === s.id ? "text-violet-900" : "text-zinc-800")}>{s.name}</p>
                  <p className="text-xs text-zinc-400">{s.totalHours.toFixed(0)}h logged · {s.certType}</p>
                </div>
                {superviseeId === s.id && <CheckCircle2 className="w-4 h-4 text-violet-600 flex-shrink-0" />}
              </button>
            ))}
          </div>
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
            {duration > 0 && (
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
            {(["Individual", "Group"] as SessionType[]).map((t) => (
              <button
                key={t}
                onClick={() => setSessionType(t)}
                className={cn(
                  "py-2.5 text-sm font-semibold rounded-lg border transition-all",
                  sessionType === t ? "bg-violet-600 text-white border-violet-600" : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mb-2">Observation method</p>
          <div className="grid grid-cols-3 gap-2">
            {(["Direct", "Remote", "Indirect"] as ObservationType[]).map((o) => (
              <button
                key={o}
                onClick={() => setObservationType(o)}
                className={cn(
                  "py-2 text-xs font-semibold rounded-lg border transition-all",
                  observationType === o ? "bg-emerald-600 text-white border-emerald-600" : "border-zinc-200 text-zinc-500 hover:border-zinc-300"
                )}
              >
                {o}
              </button>
            ))}
          </div>
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

        {/* Save */}
        <button
          onClick={() => setSaved(true)}
          disabled={duration <= 0}
          className={cn(
            "w-full py-3.5 text-sm font-semibold rounded-xl transition-colors",
            duration > 0
              ? "bg-violet-600 text-white hover:bg-violet-700"
              : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
          )}
        >
          {duration > 0
            ? `Save ${duration.toFixed(1)}h ${sessionType} Session`
            : "Set a valid time range to continue"
          }
        </button>
      </div>
    </div>
  )
}
