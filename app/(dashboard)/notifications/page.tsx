"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileSignature,
  CalendarCheck,
  Bell,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

type NotifType = "approval" | "warning" | "signature" | "submission" | "info"

interface Notification {
  id: string
  type: NotifType
  title: string
  body: string
  time: string
  read: boolean
  href?: string
}

const traineeNotifications: Notification[] = [
  {
    id: "n1",
    type: "approval",
    title: "Week approved",
    body: "Dr. Rodriguez approved your log for May 6–10, 2025.",
    time: "2h ago",
    read: false,
    href: "/trainee/reports",
  },
  {
    id: "n2",
    type: "warning",
    title: "Compliance warning",
    body: "Your restricted hours for March reached 54.3% — above the 50% limit. Review your March report.",
    time: "3 days ago",
    read: false,
    href: "/trainee/reports/mar-2025",
  },
  {
    id: "n3",
    type: "info",
    title: "Weekly review ready",
    body: "Your activities for May 13–17 have been pulled from Google Calendar. Confirm before Friday.",
    time: "4 days ago",
    read: false,
    href: "/trainee/weekly-review",
  },
  {
    id: "n4",
    type: "signature",
    title: "April report signed",
    body: "Dr. Rodriguez has reviewed and signed your April 2025 verification form.",
    time: "May 5",
    read: true,
    href: "/trainee/reports/apr-2025",
  },
  {
    id: "n5",
    type: "approval",
    title: "Week approved",
    body: "Dr. Rodriguez approved your log for April 28 – May 2, 2025.",
    time: "May 3",
    read: true,
    href: "/trainee/reports",
  },
  {
    id: "n6",
    type: "info",
    title: "576.5 hours remaining",
    body: "You're 42.4% of the way to BCBA certification. Keep up the pace — you're on track.",
    time: "May 1",
    read: true,
  },
  {
    id: "n7",
    type: "warning",
    title: "Supervision below target",
    body: "You logged only 3h of supervision in March (8.6%). Try to hit 5%+ each month.",
    time: "Apr 2",
    read: true,
    href: "/trainee/reports/mar-2025",
  },
]

const supervisorNotifications: Notification[] = [
  {
    id: "s1",
    type: "submission",
    title: "New submission from Sarah Mitchell",
    body: "Sarah submitted her weekly log for May 13–17 (10.5h across 6 activities). Ready for review.",
    time: "2h ago",
    read: false,
    href: "/supervisor/approvals/aq1",
  },
  {
    id: "s2",
    type: "submission",
    title: "New submission from Marcus Chen",
    body: "Marcus submitted his weekly log for May 13–17 (8h). He has 2 weeks pending review.",
    time: "5h ago",
    read: false,
    href: "/supervisor/approvals/aq2",
  },
  {
    id: "s3",
    type: "warning",
    title: "Compliance alert — Marcus Chen",
    body: "Marcus's restricted hours reached 55.8% this month — above the 50% BACB limit. Review required.",
    time: "1 day ago",
    read: false,
    href: "/supervisor/supervisees/sup-s2",
  },
  {
    id: "s4",
    type: "signature",
    title: "Sign-off needed — April reports",
    body: "Sarah Mitchell and Aisha Johnson's April reports are ready for your signature.",
    time: "May 6",
    read: true,
    href: "/supervisor/sign-off",
  },
  {
    id: "s5",
    type: "approval",
    title: "Approved — Sarah Mitchell May 6–10",
    body: "You approved Sarah's weekly log. 11h logged across 7 activities.",
    time: "May 3",
    read: true,
  },
  {
    id: "s6",
    type: "info",
    title: "Aisha Johnson — 156.5 hours logged",
    body: "Aisha is progressing well on her unrestricted fieldwork path. Supervision is at 11.5%.",
    time: "May 1",
    read: true,
    href: "/supervisor/supervisees/sup-s3",
  },
]

const iconMap: Record<NotifType, React.ReactNode> = {
  approval: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
  warning: <AlertTriangle className="w-4 h-4 text-amber-500" />,
  signature: <FileSignature className="w-4 h-4 text-violet-600" />,
  submission: <CalendarCheck className="w-4 h-4 text-blue-600" />,
  info: <Bell className="w-4 h-4 text-zinc-500" />,
}

const bgMap: Record<NotifType, string> = {
  approval: "bg-emerald-50",
  warning: "bg-amber-50",
  signature: "bg-violet-50",
  submission: "bg-blue-50",
  info: "bg-zinc-100",
}

export default function NotificationsPage() {
  const pathname = usePathname()
  const isSupervisor = pathname.startsWith("/supervisor") ||
    (typeof window !== "undefined" && document.referrer.includes("/supervisor"))

  const allNotifs = isSupervisor ? supervisorNotifications : traineeNotifications
  const [notifications, setNotifications] = useState(allNotifs)
  const [filter, setFilter] = useState<"all" | "unread">("all")

  const unreadCount = notifications.filter((n) => !n.read).length
  const displayed = filter === "unread" ? notifications.filter((n) => !n.read) : notifications

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const dismiss = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  return (
    <div className="p-4 md:p-7 max-w-2xl mx-auto">
      {/* Header */}
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

      {/* Filter tabs */}
      <div className="flex gap-1 bg-zinc-100 rounded-lg p-1 mb-5 w-fit">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-4 py-1.5 text-xs font-semibold rounded-md transition-all capitalize",
              filter === f
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700"
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

      {/* Notifications list */}
      {displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center mb-3">
            <Bell className="w-6 h-6 text-zinc-400" />
          </div>
          <p className="text-sm font-semibold text-zinc-700">No unread notifications</p>
          <p className="text-xs text-zinc-400 mt-1">You&apos;re all caught up for now.</p>
          {filter === "unread" && (
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
            const innerClass = "flex items-start gap-3 px-5 py-4 pl-7"
            return (
              <div
                key={notif.id}
                className={cn(
                  "relative group bg-white rounded-xl border transition-all",
                  notif.read
                    ? "border-zinc-100 opacity-70"
                    : "border-[#E8E6F4] shadow-sm"
                )}
              >
                {/* Unread dot */}
                {!notif.read && (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-violet-600 rounded-full" />
                )}

                {notif.href ? (
                  <Link href={notif.href} onClick={() => markRead(notif.id)} className={innerClass}>
                    {/* Icon */}
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                      bgMap[notif.type]
                    )}>
                      {iconMap[notif.type]}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm leading-snug", notif.read ? "font-medium text-zinc-600" : "font-semibold text-zinc-900")}>{notif.title}</p>
                        <span className="text-[10px] text-zinc-400 flex-shrink-0 mt-0.5">{notif.time}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{notif.body}</p>
                    </div>
                  </Link>
                ) : (
                  <div className={innerClass}>
                    {/* Icon */}
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5",
                      bgMap[notif.type]
                    )}>
                      {iconMap[notif.type]}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-sm leading-snug", notif.read ? "font-medium text-zinc-600" : "font-semibold text-zinc-900")}>{notif.title}</p>
                        <span className="text-[10px] text-zinc-400 flex-shrink-0 mt-0.5">{notif.time}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{notif.body}</p>
                    </div>
                  </div>
                )}

                {/* Dismiss button */}
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
