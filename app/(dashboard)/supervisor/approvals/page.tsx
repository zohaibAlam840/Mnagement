"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronRight, CheckCircle2, Clock, XCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"

type WeeklyReviewRow = Database["public"]["Tables"]["weekly_reviews"]["Row"]
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"]

type ReviewWithProfile = WeeklyReviewRow & {
  trainee: Pick<ProfileRow, "first_name" | "last_name" | "email"> | null
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart + "T00:00:00")
  const end = new Date(weekStart + "T00:00:00")
  end.setDate(end.getDate() + 6)
  const mo: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
  return `${start.toLocaleDateString("en-US", mo)} – ${end.toLocaleDateString("en-US", { ...mo, year: "numeric" })}`
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return "Just now"
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return "Yesterday"
  return `${days} days ago`
}

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase()
}

export default function ApprovalsPage() {
  const [pending, setPending] = useState<ReviewWithProfile[]>([])
  const [reviewed, setReviewed] = useState<ReviewWithProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Fetch submitted reviews
      const { data: pendingData } = await supabase
        .from("weekly_reviews")
        .select("*")
        .eq("supervisor_id", user.id)
        .eq("status", "submitted")
        .order("submitted_at", { ascending: true })

      // Fetch recently reviewed (last 20)
      const { data: reviewedData } = await supabase
        .from("weekly_reviews")
        .select("*")
        .eq("supervisor_id", user.id)
        .in("status", ["approved", "rejected"])
        .order("reviewed_at", { ascending: false })
        .limit(20)

      // Collect all unique trainee IDs
      const allReviews = [...(pendingData ?? []), ...(reviewedData ?? [])]
      const traineeIds = [...new Set(allReviews.map(r => r.trainee_id))]

      let profileMap: Record<string, Pick<ProfileRow, "first_name" | "last_name" | "email">> = {}
      if (traineeIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", traineeIds)
        if (profiles) {
          profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
        }
      }

      const enrich = (reviews: typeof pendingData): ReviewWithProfile[] =>
        (reviews ?? []).map(r => ({ ...r, trainee: profileMap[r.trainee_id] ?? null }))

      setPending(enrich(pendingData))
      setReviewed(enrich(reviewedData))
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-4 md:p-7 max-w-3xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-7 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Approvals</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {pending.length > 0 ? `${pending.length} pending review` : "All reviews up to date"}
          </p>
        </div>
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="mb-6">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Needs Review</p>
          <div className="space-y-2">
            {pending.map((item) => {
              const name = item.trainee
                ? `${item.trainee.first_name} ${item.trainee.last_name}`
                : "Unknown trainee"
              const ini = item.trainee
                ? initials(item.trainee.first_name, item.trainee.last_name)
                : "??"
              return (
                <Link
                  key={item.id}
                  href={`/supervisor/approvals/${item.id}`}
                  className="flex items-center gap-4 bg-white rounded-xl border border-[#E8E6F4] px-5 py-4 hover:border-violet-200 hover:shadow-sm transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-violet-700">{ini}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-900">{name}</p>
                      <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">pending</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {formatWeekRange(item.week_start_date)}
                      {item.submitted_at && ` · Submitted ${timeAgo(item.submitted_at)}`}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {[
                        { label: "R", value: item.restricted_hours.toFixed(1) + "h", color: "text-violet-700 bg-violet-50" },
                        { label: "U", value: item.unrestricted_hours.toFixed(1) + "h", color: "text-blue-700 bg-blue-50" },
                        { label: "S", value: item.supervision_hours.toFixed(1) + "h", color: "text-emerald-700 bg-emerald-50" },
                      ].map((h) => (
                        <span key={h.label} className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", h.color)}>
                          {h.label}: {h.value}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold text-zinc-900">{item.total_hours.toFixed(1)}h</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-300" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {pending.length === 0 && reviewed.length === 0 && (
        <div className="py-16 text-center bg-white rounded-xl border border-[#E8E6F4]">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-700 mb-1">No pending reviews</p>
          <p className="text-xs text-zinc-400">Your trainees haven't submitted any weeks yet.</p>
        </div>
      )}

      {/* Recently reviewed */}
      {reviewed.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Recently Reviewed</p>
          <div className="space-y-2">
            {reviewed.map((item) => {
              const name = item.trainee
                ? `${item.trainee.first_name} ${item.trainee.last_name}`
                : "Unknown trainee"
              const ini = item.trainee
                ? initials(item.trainee.first_name, item.trainee.last_name)
                : "??"
              return (
                <Link
                  key={item.id}
                  href={`/supervisor/approvals/${item.id}`}
                  className="flex items-center gap-4 bg-white rounded-xl border border-zinc-100 px-5 py-3.5 opacity-70 hover:opacity-100 transition-opacity"
                >
                  <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-zinc-500">{ini}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-700">{name}</p>
                    <p className="text-xs text-zinc-400">{formatWeekRange(item.week_start_date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-500">{item.total_hours.toFixed(1)}h</span>
                    {item.status === "approved"
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      : item.status === "rejected"
                        ? <XCircle className="w-4 h-4 text-red-400" />
                        : <Clock className="w-4 h-4 text-zinc-300" />
                    }
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
