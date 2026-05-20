"use client"

import { useState, use } from "react"
import Link from "next/link"
import {
  ChevronLeft, CheckCircle2, Clock, Pencil, Trash2,
  Save, X, AlertTriangle, User, Calendar, AlarmClock
} from "lucide-react"
import { activities } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export default function ActivityDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const activity = activities.find((a) => a.id === id) ?? activities[0]
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(activity.title)
  const [notes, setNotes] = useState(activity.notes)
  const [category, setCategory] = useState(activity.category)
  const [duration, setDuration] = useState(activity.duration)

  return (
    <div className="p-4 md:p-7 max-w-2xl mx-auto">
      {/* Back */}
      <Link
        href="/trainee/activities"
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5 transition-colors"
      >
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
            <h1 className="text-xl md:text-2xl font-bold text-zinc-900">{title}</h1>
          )}
          {activity.client && (
            <p className="text-sm text-zinc-500 mt-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> {activity.client}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {editing ? (
            <>
              <button
                onClick={() => setEditing(false)}
                className="w-9 h-9 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditing(false)}
                className="w-9 h-9 rounded-lg bg-violet-600 flex items-center justify-center text-white hover:bg-violet-700 transition-colors"
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
              <button className="w-9 h-9 rounded-lg border border-red-100 bg-red-50 flex items-center justify-center text-red-400 hover:bg-red-100 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-5">
        <span className={cn(
          "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full",
          activity.category === "Restricted" ? "bg-violet-50 text-violet-700 border border-violet-100" :
          activity.category === "Supervision" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
          "bg-blue-50 text-blue-700 border border-blue-100"
        )}>
          {activity.category}
        </span>
        <span className={cn(
          "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full",
          activity.status === "confirmed" ? "bg-emerald-50 text-emerald-700" :
          activity.status === "pending" ? "bg-amber-50 text-amber-700" :
          "bg-red-50 text-red-700"
        )}>
          {activity.status}
        </span>
        {activity.supervisorApproved
          ? <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Approved</span>
          : <span className="flex items-center gap-1 text-xs font-medium text-zinc-400"><Clock className="w-3.5 h-3.5" /> Pending approval</span>
        }
      </div>

      {/* Details card */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] divide-y divide-zinc-50 mb-4">
        {[
          {
            icon: <Calendar className="w-4 h-4 text-zinc-400" />,
            label: "Date",
            value: activity.date,
          },
          {
            icon: <AlarmClock className="w-4 h-4 text-zinc-400" />,
            label: "Time",
            value: `${activity.startTime} – ${activity.endTime}`,
          },
          {
            icon: <Clock className="w-4 h-4 text-zinc-400" />,
            label: "Duration",
            value: editing ? (
              <input
                type="number"
                step="0.5"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-20 text-sm font-semibold text-right bg-transparent border-b border-violet-400 focus:outline-none"
              />
            ) : `${duration} hours`,
          },
          {
            icon: <div className={cn("w-3 h-3 rounded-full", activity.category === "Restricted" ? "bg-violet-500" : activity.category === "Supervision" ? "bg-emerald-500" : "bg-blue-500")} />,
            label: "Category",
            value: editing ? (
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as typeof category)}
                className="text-sm font-semibold bg-transparent border-b border-violet-400 focus:outline-none"
              >
                <option>Restricted</option>
                <option>Unrestricted</option>
                <option>Supervision</option>
              </select>
            ) : category,
          },
          {
            icon: null,
            label: "Subcategory",
            value: activity.subcategory,
          },
        ].map((row, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5">
            <div className="w-5 flex items-center justify-center flex-shrink-0">
              {row.icon}
            </div>
            <span className="text-sm text-zinc-500 w-28 flex-shrink-0">{row.label}</span>
            <span className="text-sm font-semibold text-zinc-900 flex-1 text-right">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Flags */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-4 mb-4">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Flags</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Supervision-related", active: activity.supervisionRelated },
            { label: "Direct observation", active: activity.directObservation },
          ].map((flag) => (
            <span
              key={flag.label}
              className={cn(
                "text-xs font-semibold px-3 py-1.5 rounded-full border",
                flag.active
                  ? "bg-violet-50 text-violet-700 border-violet-100"
                  : "bg-zinc-50 text-zinc-400 border-zinc-100"
              )}
            >
              {flag.active ? "✓" : "–"} {flag.label}
            </span>
          ))}
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
            {notes || <span className="text-zinc-300 italic">No notes added</span>}
          </p>
        )}
      </div>

      {/* Audit trail */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-4">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Audit Trail</p>
        <div className="space-y-3">
          {[
            { action: "Activity created", by: "Sarah Mitchell", time: `${activity.date} · ${activity.startTime}`, icon: <div className="w-2 h-2 rounded-full bg-zinc-300" /> },
            { action: "Marked as confirmed", by: "Sarah Mitchell", time: `${activity.date} · ${activity.endTime}`, icon: <div className="w-2 h-2 rounded-full bg-violet-400" /> },
            ...(activity.supervisorApproved ? [{ action: "Approved by supervisor", by: "Dr. Emily Rodriguez", time: "1 day later", icon: <CheckCircle2 className="w-3 h-3 text-emerald-500" /> }] : []),
          ].map((entry, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-4 flex items-center justify-center mt-1 flex-shrink-0">{entry.icon}</div>
              <div>
                <p className="text-sm font-medium text-zinc-800">{entry.action}</p>
                <p className="text-xs text-zinc-400">{entry.by} · {entry.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Warning if pending */}
      {!activity.supervisorApproved && (
        <div className="mt-4 flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          This activity is awaiting approval from Dr. Rodriguez.
        </div>
      )}
    </div>
  )
}
