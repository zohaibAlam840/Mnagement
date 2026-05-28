"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ChevronLeft, Check, X, MessageSquare, CheckCircle2, Clock, AlertCircle
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"

type WeeklyReviewRow = Database["public"]["Tables"]["weekly_reviews"]["Row"]
type ActivityRow = Database["public"]["Tables"]["activities"]["Row"]
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

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

function formatDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return "Just now"
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)} days ago`
}

export default function ApprovalDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [review, setReview] = useState<WeeklyReviewRow | null>(null)
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [trainee, setTrainee] = useState<Pick<ProfileRow, "id" | "first_name" | "last_name" | "email"> | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [comment, setComment] = useState("")
  const [acting, setActing] = useState(false)
  const [actError, setActError] = useState("")
  const [decision, setDecision] = useState<"approved" | "rejected" | null>(null)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: rev } = await supabase
        .from("weekly_reviews")
        .select("*")
        .eq("id", id)
        .eq("supervisor_id", user.id)
        .single()

      if (!rev) { setNotFound(true); setLoading(false); return }
      setReview(rev)
      if (rev.status === "approved" || rev.status === "rejected") {
        setDecision(rev.status as "approved" | "rejected")
      }

      const [{ data: acts }, { data: profile }] = await Promise.all([
        supabase.from("activities").select("*")
          .eq("trainee_id", rev.trainee_id)
          .eq("week_start_date", rev.week_start_date)
          .order("date", { ascending: true })
          .order("start_time", { ascending: true }),
        supabase.from("profiles").select("id, first_name, last_name, email")
          .eq("id", rev.trainee_id)
          .single(),
      ])

      setActivities(acts ?? [])
      setTrainee(profile)
      setLoading(false)
    }
    load()
  }, [id])

  const handleDecision = async (action: "approved" | "rejected") => {
    if (!review || !trainee) return
    setActing(true)
    setActError("")

    const supabase = createClient()
    const now = new Date().toISOString()

    const { error: reviewError } = await supabase
      .from("weekly_reviews")
      .update({
        status: action,
        reviewed_at: now,
        supervisor_notes: comment || null,
      })
      .eq("id", review.id)

    if (reviewError) { setActError(reviewError.message); setActing(false); return }

    // Update activity statuses
    const activityIds = activities.map(a => a.id)
    if (activityIds.length > 0) {
      await supabase
        .from("activities")
        .update({ status: action })
        .in("id", activityIds)
    }

    // Notify trainee
    await supabase.from("notifications").insert({
      user_id: trainee.id,
      type: action === "approved" ? "review_approved" : "review_rejected",
      title: action === "approved" ? "Weekly review approved" : "Weekly review returned",
      body: action === "approved"
        ? `Your week of ${formatWeekRange(review.week_start_date)} has been approved.`
        : `Your week of ${formatWeekRange(review.week_start_date)} was returned. ${comment ? `Note: ${comment}` : ""}`,
      read: false,
      related_id: review.id,
    })

    setActing(false)
    setDecision(action)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-7 max-w-3xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (notFound || !review) {
    return (
      <div className="p-4 md:p-7 max-w-2xl mx-auto text-center py-20">
        <p className="text-zinc-400 mb-4">Review not found.</p>
        <Link href="/supervisor/approvals" className="text-sm font-semibold text-violet-600 hover:text-violet-700">
          ← Back to approvals
        </Link>
      </div>
    )
  }

  const traineeName = trainee
    ? `${trainee.first_name} ${trainee.last_name}`
    : "Unknown trainee"
  const traineeInitials = trainee
    ? `${trainee.first_name[0]}${trainee.last_name[0]}`.toUpperCase()
    : "??"

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
            ? `${traineeName}'s week of ${formatWeekRange(review.week_start_date)} has been approved.`
            : `${traineeName} has been notified to review and resubmit.`
          }
        </p>
        <Link
          href="/supervisor/approvals"
          className="bg-violet-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-colors"
        >
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
            <span className="font-bold text-violet-700">{traineeInitials}</span>
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-zinc-900">{traineeName}</h1>
            <p className="text-sm text-zinc-500">
              Week of {formatWeekRange(review.week_start_date)}
              {review.submitted_at && ` · Submitted ${timeAgo(review.submitted_at)}`}
            </p>
          </div>
          <span className="text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1.5 rounded-lg">
            <Clock className="w-3 h-3 inline mr-1" />Pending
          </span>
        </div>
      </div>

      {/* Hours summary */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total", value: review.total_hours.toFixed(1) + "h", color: "text-zinc-900" },
          { label: "Restricted", value: review.restricted_hours.toFixed(1) + "h", color: "text-violet-600" },
          { label: "Unrestricted", value: review.unrestricted_hours.toFixed(1) + "h", color: "text-blue-600" },
          { label: "Supervision", value: review.supervision_hours.toFixed(1) + "h", color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-[#E8E6F4] p-3 text-center">
            <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
            <p className="text-[11px] text-zinc-400">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Activities */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] mb-5">
        <div className="px-5 py-4 border-b border-zinc-50">
          <h3 className="text-sm font-semibold text-zinc-900">{activities.length} Activities This Week</h3>
        </div>
        {activities.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-zinc-400">No activities found for this week.</div>
        ) : (
          <div className="divide-y divide-zinc-50">
            {activities.map((a) => (
              <div key={a.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0",
                  a.category === "Restricted" ? "bg-violet-100 text-violet-700" :
                  a.category === "Supervision" ? "bg-emerald-100 text-emerald-700" :
                  "bg-blue-100 text-blue-700"
                )}>
                  {(a.duration_minutes / 60).toFixed(1)}h
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{a.title}</p>
                  <p className="text-[11px] text-zinc-400">
                    {formatDate(a.date)} · {formatTime(a.start_time)} – {formatTime(a.end_time)}
                  </p>
                  {a.client_name && (
                    <p className="text-[11px] text-zinc-400 mt-0.5">Client: {a.client_name}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={cn(
                    "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                    a.category === "Restricted" ? "bg-violet-50 text-violet-700" :
                    a.category === "Supervision" ? "bg-emerald-50 text-emerald-700" :
                    "bg-blue-50 text-blue-700"
                  )}>
                    {a.category}
                  </span>
                  {a.notes && (
                    <span className="text-[10px] text-zinc-400 italic max-w-[140px] truncate">{a.notes}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
          placeholder="Add feedback or instructions for the trainee..."
          rows={3}
          className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all resize-none placeholder:text-zinc-300"
        />
      </div>

      {actError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5 mb-4">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {actError}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleDecision("rejected")}
          disabled={acting}
          className="flex-1 flex items-center justify-center gap-2 border border-zinc-200 bg-white text-zinc-700 font-semibold py-3 rounded-xl text-sm hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all disabled:opacity-60"
        >
          <X className="w-4 h-4" />
          {acting ? "…" : "Request Edits"}
        </button>
        <button
          onClick={() => handleDecision("approved")}
          disabled={acting}
          className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold py-3 rounded-xl text-sm hover:bg-emerald-700 transition-colors disabled:opacity-60"
        >
          <Check className="w-4 h-4" />
          {acting ? "…" : "Approve Week"}
        </button>
      </div>
    </div>
  )
}
