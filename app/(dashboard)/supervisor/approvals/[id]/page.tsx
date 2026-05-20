"use client"

import { useState, use } from "react"
import Link from "next/link"
import { ChevronLeft, Check, X, MessageSquare, CheckCircle2, Clock } from "lucide-react"
import { approvalQueue, activities } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export default function ApprovalDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const item = approvalQueue.find((a) => a.id === id) ?? approvalQueue[0]
  const weekActivities = activities.slice(0, 6)
  const [comment, setComment] = useState("")
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null)

  if (decision) {
    return (
      <div className="p-4 md:p-7 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className={cn(
          "w-16 h-16 rounded-full flex items-center justify-center mb-4",
          decision === "approved" ? "bg-emerald-100" : "bg-red-100"
        )}>
          {decision === "approved"
            ? <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            : <X className="w-8 h-8 text-red-500" />
          }
        </div>
        <h2 className="text-xl font-bold text-zinc-900 mb-1">
          {decision === "approved" ? "Week approved!" : "Week returned for edits"}
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          {decision === "approved"
            ? `${item.supervisee}'s week of ${item.weekOf} has been approved.`
            : `${item.supervisee} has been notified to review and resubmit.`}
        </p>
        <Link href="/supervisor/approvals" className="bg-violet-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-colors">
          Back to approvals
        </Link>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-7 max-w-3xl mx-auto">
      <Link href="/supervisor/approvals" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Approvals
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
            <span className="font-bold text-violet-700">{item.initials}</span>
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-zinc-900">{item.supervisee}</h1>
            <p className="text-sm text-zinc-500">Week of {item.weekOf} · Submitted {item.submittedAt}</p>
          </div>
          <span className="text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1.5 rounded-lg">
            Pending review
          </span>
        </div>
      </div>

      {/* Hours summary */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total", value: `${item.totalHours}h`, color: "text-zinc-900" },
          { label: "Restricted", value: `${item.restrictedHours}h`, color: "text-violet-600" },
          { label: "Unrestricted", value: `${item.unrestrictedHours}h`, color: "text-blue-600" },
          { label: "Supervision", value: `${item.supervisionHours}h`, color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-[#E8E6F4] p-3 text-center">
            <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
            <p className="text-[11px] text-zinc-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Activities list */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] mb-5">
        <div className="px-5 py-4 border-b border-zinc-50">
          <h3 className="text-sm font-semibold text-zinc-900">{item.activitiesCount} Activities This Week</h3>
        </div>
        <div className="divide-y divide-zinc-50">
          {weekActivities.map((a) => (
            <div key={a.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                a.category === "Restricted" ? "bg-violet-100 text-violet-700" :
                a.category === "Supervision" ? "bg-emerald-100 text-emerald-700" :
                "bg-blue-100 text-blue-700"
              )}>
                {a.duration}h
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{a.title}</p>
                <p className="text-[11px] text-zinc-400">{a.date} · {a.startTime}–{a.endTime}</p>
              </div>
              <span className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0",
                a.category === "Restricted" ? "bg-violet-50 text-violet-700" :
                a.category === "Supervision" ? "bg-emerald-50 text-emerald-700" :
                "bg-blue-50 text-blue-700"
              )}>
                {a.category}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Comment */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-5">
        <label className="flex items-center gap-2 text-sm font-semibold text-zinc-900 mb-2">
          <MessageSquare className="w-4 h-4 text-zinc-400" />
          Add a note (optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add feedback or notes for the trainee..."
          rows={3}
          className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all resize-none"
        />
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => setDecision("rejected")}
          className="flex-1 flex items-center justify-center gap-2 border border-zinc-200 bg-white text-zinc-700 font-semibold py-3 rounded-xl text-sm hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all"
        >
          <X className="w-4 h-4" />
          Request Edits
        </button>
        <button
          onClick={() => setDecision("approved")}
          className="flex-2 flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold py-3 rounded-xl text-sm hover:bg-emerald-700 transition-colors"
        >
          <Check className="w-4 h-4" />
          Approve Week
        </button>
      </div>
    </div>
  )
}
