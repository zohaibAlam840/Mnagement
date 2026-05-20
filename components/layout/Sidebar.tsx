"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Activity,
  Repeat2,
  CalendarCheck,
  FileText,
  Users,
  CheckSquare,
  Video,
  Settings,
  LogOut,
  Bell,
  ClipboardList,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

const traineeNav = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/trainee" },
  { label: "Activities", icon: Activity, href: "/trainee/activities" },
  { label: "Templates", icon: Repeat2, href: "/trainee/templates" },
  { label: "Weekly Review", icon: CalendarCheck, href: "/trainee/weekly-review", badge: "3" },
  { label: "Reports", icon: FileText, href: "/trainee/reports" },
]

const supervisorNav = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/supervisor" },
  { label: "Supervisees", icon: Users, href: "/supervisor/supervisees" },
  { label: "Approvals", icon: CheckSquare, href: "/supervisor/approvals", badge: "3" },
  { label: "Sessions", icon: Video, href: "/supervisor/sessions" },
  { label: "Sign-Off", icon: FileText, href: "/supervisor/sign-off" },
]

const bottomNav = [
  { label: "Notifications", icon: Bell, href: "/notifications", badge: "3" },
  { label: "Settings", icon: Settings, href: "/settings" },
]

export function Sidebar() {
  const pathname = usePathname()
  const isTrainee = pathname.startsWith("/trainee")
  const isSupervisor = pathname.startsWith("/supervisor")
  const navItems = isSupervisor ? supervisorNav : traineeNav

  return (
    <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-[240px] z-40"
      style={{ backgroundColor: "var(--sidebar)" }}>

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
          <ClipboardList className="w-4 h-4 text-white" />
        </div>
        <span className="text-white font-semibold text-[15px] tracking-tight">FieldLog</span>
      </div>

      {/* Role switcher (demo only) */}
      <div className="mx-4 mt-4 mb-1 flex rounded-lg overflow-hidden border border-white/10 text-xs font-medium">
        <Link
          href="/trainee"
          className={cn(
            "flex-1 text-center py-1.5 transition-colors",
            isTrainee
              ? "bg-violet-600 text-white"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          Trainee
        </Link>
        <Link
          href="/supervisor"
          className={cn(
            "flex-1 text-center py-1.5 transition-colors",
            isSupervisor
              ? "bg-violet-600 text-white"
              : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          Supervisor
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-zinc-600 px-2 mb-2">
          {isSupervisor ? "Supervisor" : "My Fieldwork"}
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== "/trainee" && item.href !== "/supervisor" && pathname.startsWith(item.href))
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group",
                    active
                      ? "bg-violet-500/15 text-violet-300"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                  )}
                >
                  <item.icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-violet-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                  <span className="flex-1 leading-none">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] font-semibold bg-violet-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                  {active && <ChevronRight className="w-3 h-3 text-violet-500" />}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="my-4 border-t border-white/5" />

        <p className="text-[10px] font-semibold tracking-widest uppercase text-zinc-600 px-2 mb-2">
          Account
        </p>
        <ul className="space-y-0.5">
          {bottomNav.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all group",
                    active
                      ? "bg-violet-500/15 text-violet-300"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0 text-zinc-500 group-hover:text-zinc-300" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User card */}
      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 border border-white/5">
          <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-semibold">
              {isSupervisor ? "ER" : "SM"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">
              {isSupervisor ? "Dr. Emily Rodriguez" : "Sarah Mitchell"}
            </p>
            <p className="text-zinc-500 text-[10px] truncate">
              {isSupervisor ? "BCBA-D · Supervisor" : "BCBA Trainee"}
            </p>
          </div>
          <button className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}
