"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileSignature,
  CalendarCheck,
  Bell,
  X,
  UserPlus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"

type Notification = Database["public"]["Tables"]["notifications"]["Row"]

function timeAgo(isoStr: string) {
  const diff = Date.now() - new Date(isoStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(isoStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function getHref(notif: Notification): string | undefined {
  switch (notif.type) {
    case "weekly_review_submitted": return notif.related_id ? `/supervisor/approvals/${notif.related_id}` : "/supervisor/approvals"
    case "weekly_review_approved": return "/trainee/reports"
    case "weekly_review_rejected": return "/trainee/weekly-review"
    case "invite_received": return "/trainee/supervisor"
    case "invite_accepted": return `/supervisor/supervisees/${notif.related_id ?? ""}`
    case "session_confirmed": return notif.related_id ? `/supervisor/sessions/${notif.related_id}` : "/supervisor/sessions"
    case "supervisor_signed": return notif.related_id ? `/trainee/reports/${notif.related_id}` : "/trainee/reports"
    case "monthly_summary_ready": return notif.related_id ? `/trainee/reports/${notif.related_id}` : "/trainee/reports"
    default: return undefined
  }
}

const iconMap: Record<string, React.ReactNode> = {
  weekly_review_submitted: <CalendarCheck className="w-4 h-4 text-blue-600" />,
  weekly_review_approved: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  weekly_review_rejected: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  invite_received: <UserPlus className="w-4 h-4 text-violet-600" />,
  invite_accepted: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  session_confirmed: <CalendarCheck className="w-4 h-4 text-blue-600" />,
  supervisor_signed: <FileSignature className="w-4 h-4 text-violet-600" />,
  monthly_summary_ready: <FileSignature className="w-4 h-4 text-violet-600" />,
  compliance_warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  default: <Bell className="w-4 h-4 text-zinc-500" />,
}

const bgMap: Record<string, string> = {
  weekly_review_submitted: "bg-blue-50",
  weekly_review_approved: "bg-emerald-50",
  weekly_review_rejected: "bg-amber-50",
  invite_received: "bg-violet-50",
  invite_accepted: "bg-emerald-50",
  session_confirmed: "bg-blue-50",
  supervisor_signed: "bg-violet-50",
  monthly_summary_ready: "bg-violet-50",
  compliance_warning: "bg-amber-50",
  default: "bg-zinc-100",
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "unread">("all")

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
      setNotifications(data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length
  const displayed = filter === "unread" ? notifications.filter((n) => !n.read) : notifications

  const markRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    const supabase = createClient()
    await (supabase as any).from("notifications").update({ read: true }).eq("id", id)
  }

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await (supabase as any).from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false)
  }

  const dismiss = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    const supabase = createClient()
    await supabase.from("notifications").delete().eq("id", id)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-7 max-w-2xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  const innerClass = "flex items-start gap-3 px-5 py-4 pl-7"

  return (
    <div className="p-4 md:p-7 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Notifications</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="flex gap-1 bg-zinc-100 rounded-lg p-1 mb-5 w-fit">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-1.5 text-xs font-semibold rounded-md transition-all capitalize",
              filter === f ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
            )}
          >
            {f}
            {f === "unread" && unreadCount > 0 && (
              <span className="ml-1.5 bg-violet-600 text-white rounded-full px-1.5 py-0.5 text-[9px]">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
            <Bell className="w-6 h-6 text-zinc-400" />
          </div>
          <p className="text-sm font-semibold text-zinc-700">
            {filter === "unread" ? "No unread notifications" : "No notifications yet"}
          </p>
          <p className="text-xs text-zinc-400 mt-1">You&apos;re all caught up.</p>
          {filter === "unread" && notifications.length > 0 && (
            <button
              onClick={() => setFilter("all")}
              className="mt-3 text-xs font-semibold text-violet-600 hover:text-violet-700"
            >
              View all notifications →
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((notif) => {
            const href = getHref(notif)
            const icon = iconMap[notif.type] ?? iconMap.default
            const bg = bgMap[notif.type] ?? bgMap.default

            const content = (
              <>
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5", bg)}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm leading-snug", notif.read ? "font-medium text-zinc-600" : "font-semibold text-zinc-900")}>
                      {notif.title}
                    </p>
                    <span className="text-[10px] text-zinc-400 flex-shrink-0 mt-0.5">{timeAgo(notif.created_at)}</span>
                  </div>
                  {notif.body && <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{notif.body}</p>}
                </div>
              </>
            )

            return (
              <div
                key={notif.id}
                className={cn(
                  "relative group bg-white rounded-xl border transition-all",
                  notif.read ? "border-zinc-100 opacity-70" : "border-[#E8E6F4] shadow-sm"
                )}
              >
                {!notif.read && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-violet-600 rounded-full" />
                )}

                {href ? (
                  <Link href={href} onClick={() => markRead(notif.id)} className={innerClass}>
                    {content}
                  </Link>
                ) : (
                  <div className={innerClass}>{content}</div>
                )}

                <button
                  onClick={() => dismiss(notif.id)}
                  className="absolute top-3 right-3 w-5 h-5 rounded-md opacity-0 group-hover:opacity-100 flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
