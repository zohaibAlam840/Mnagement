"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, ClipboardList, ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

const pageTitles: Record<string, string> = {
  "/trainee": "Dashboard",
  "/trainee/activities": "Activities",
  "/trainee/activities/new": "Log Activity",
  "/trainee/templates": "Templates",
  "/trainee/templates/new": "New Template",
  "/trainee/weekly-review": "Weekly Review",
  "/trainee/reports": "Reports",
  "/supervisor": "Dashboard",
  "/supervisor/supervisees": "Supervisees",
  "/supervisor/approvals": "Approvals",
  "/supervisor/sessions": "Sessions",
  "/supervisor/sessions/new": "Log Session",
  "/supervisor/sign-off": "Sign-Off",
  "/settings": "Settings",
  "/settings/calendar": "Calendar Sync",
  "/settings/notifications": "Notifications",
  "/settings/security": "Account & Security",
  "/notifications": "Notifications",
}

const backRoutes: Record<string, string> = {
  "/settings/calendar": "/settings",
  "/settings/notifications": "/settings",
  "/settings/security": "/settings",
  "/trainee/activities/new": "/trainee/activities",
  "/trainee/templates/new": "/trainee/templates",
  "/supervisor/sessions/new": "/supervisor/sessions",
}

function getTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname]
  if (pathname.startsWith("/trainee/reports/")) return "Monthly Report"
  if (pathname.startsWith("/trainee/activities/")) return "Activity Detail"
  if (pathname.startsWith("/trainee/templates/")) return "Template Detail"
  if (pathname.startsWith("/supervisor/supervisees/")) return "Trainee Detail"
  if (pathname.startsWith("/supervisor/approvals/")) return "Review Week"
  if (pathname.startsWith("/supervisor/sessions/")) return "Session Detail"
  return "FieldLog"
}

function getBackRoute(pathname: string): string | null {
  if (backRoutes[pathname]) return backRoutes[pathname]
  if (pathname.startsWith("/trainee/reports/")) return "/trainee/reports"
  if (pathname.startsWith("/trainee/activities/") && pathname !== "/trainee/activities") return "/trainee/activities"
  if (pathname.startsWith("/trainee/templates/") && pathname !== "/trainee/templates") return "/trainee/templates"
  if (pathname.startsWith("/supervisor/supervisees/") && pathname !== "/supervisor/supervisees") return "/supervisor/supervisees"
  if (pathname.startsWith("/supervisor/approvals/") && pathname !== "/supervisor/approvals") return "/supervisor/approvals"
  if (pathname.startsWith("/supervisor/sessions/") && pathname !== "/supervisor/sessions") return "/supervisor/sessions"
  return null
}

export function MobileTopBar() {
  const pathname = usePathname()
  const title = getTitle(pathname)
  const backRoute = getBackRoute(pathname)
  const isDashboard = pathname === "/trainee" || pathname === "/supervisor"

  return (
    <header className="md:hidden sticky top-0 z-30 bg-white border-b border-zinc-100 safe-top">
      <div className="flex items-center h-14 px-4">
        {/* Left: back button or logo */}
        {backRoute ? (
          <Link
            href={backRoute}
            className="flex items-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-800 transition-colors -ml-1"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Back</span>
          </Link>
        ) : isDashboard ? (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <ClipboardList className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-zinc-900 text-sm tracking-tight">FieldLog</span>
          </div>
        ) : (
          <div className="w-7" />
        )}

        {/* Center: page title */}
        <div className={cn("flex-1 text-center", backRoute ? "pr-14" : isDashboard ? "pr-12" : "")}>
          <span className="text-sm font-semibold text-zinc-900">{title}</span>
        </div>

        {/* Right: bell → notifications page */}
        <Link
          href="/notifications"
          className="relative w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:bg-zinc-50 transition-colors -mr-1"
        >
          <Bell className="w-[18px] h-[18px]" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-violet-600 rounded-full" />
        </Link>
      </div>
    </header>
  )
}
