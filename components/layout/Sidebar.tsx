"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
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
  UserCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SignOutButton } from "@/components/auth/SignOutButton"
import { createClient } from "@/lib/supabase/client"

type NavItem = { label: string; icon: React.ElementType; href: string; badge?: string }

const traineeNav: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/trainee" },
  { label: "Activities", icon: Activity, href: "/trainee/activities" },
  { label: "Templates", icon: Repeat2, href: "/trainee/templates" },
  { label: "Weekly Review", icon: CalendarCheck, href: "/trainee/weekly-review" },
  { label: "My Supervisor", icon: UserCheck, href: "/trainee/supervisor" },
  { label: "MSP Reports", icon: FileText, href: "/trainee/reports" },
]

const supervisorNavBase: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/supervisor" },
  { label: "Supervisees", icon: Users, href: "/supervisor/supervisees" },
  { label: "Approvals", icon: CheckSquare, href: "/supervisor/approvals" },
  { label: "Sessions", icon: Video, href: "/supervisor/sessions" },
  { label: "MSP Sign-Off", icon: FileText, href: "/supervisor/sign-off" },
]

const bottomNavBase: NavItem[] = [
  { label: "Notifications", icon: Bell, href: "/notifications" },
  { label: "Settings", icon: Settings, href: "/settings" },
]

export function Sidebar() {
  const pathname = usePathname()
  const isTrainee = pathname.startsWith("/trainee")
  const isSupervisor = pathname.startsWith("/supervisor")

  const [userName, setUserName] = useState("")
  const [userRole, setUserRole] = useState("")
  const [unreadCount, setUnreadCount] = useState(0)
  const [pendingApprovals, setPendingApprovals] = useState(0)

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [profileRes, unreadRes, approvalsRes] = await Promise.all([
        supabase.from("profiles").select("first_name, last_name, role").eq("id", user.id).single(),
        supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false),
        supabase.from("weekly_reviews").select("*", { count: "exact", head: true }).eq("supervisor_id", user.id).eq("status", "submitted"),
      ])

      const profile = profileRes.data as { first_name: string; last_name: string; role: string } | null
      if (profile) {
        setUserName(`${profile.first_name} ${profile.last_name}`)
        setUserRole(profile.role)
      }
      setUnreadCount((unreadRes as { count: number | null }).count ?? 0)
      setPendingApprovals((approvalsRes as { count: number | null }).count ?? 0)
    }
    loadUser()
  }, [pathname])

  const supervisorNav = supervisorNavBase.map((item) =>
    item.href === "/supervisor/approvals" && pendingApprovals > 0
      ? { ...item, badge: String(pendingApprovals) }
      : item
  )
  const bottomNav = bottomNavBase.map((item) =>
    item.href === "/notifications" && unreadCount > 0
      ? { ...item, badge: String(unreadCount) }
      : item
  )

  const showSupervisorNav = isSupervisor || (!isTrainee && userRole === "supervisor")
  const navItems = showSupervisorNav ? supervisorNav : traineeNav

  return (
    <aside className="hidden md:flex print:hidden flex-col fixed left-0 top-0 bottom-0 w-[240px] z-40"
      style={{ backgroundColor: "var(--sidebar)" }}>

      {/* Logo */}
      <div className="flex items-center px-5 h-16 border-b border-white/5">
        <Image
          src="/WhatsApp_Image_2026-05-28_at_12.32.44__2_-removebg-preview.png"
          alt="ABA Fieldwork Pro"
          width={160}
          height={40}
          className="h-10 w-auto object-contain"
        />
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-3 overflow-y-auto">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-zinc-600 px-2 mb-2">
          {showSupervisorNav ? "Supervisor" : "My Fieldwork"}
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
                  <span className="flex-1 leading-none">{item.label}</span>
                  {"badge" in item && item.badge && (
                    <span className="text-[10px] font-semibold bg-violet-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
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
              {userName ? `${userName.split(" ")[0][0]}${userName.split(" ")[1]?.[0] ?? ""}`.toUpperCase() : "…"}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">
              {userName || "Loading…"}
            </p>
            <p className="text-zinc-500 text-[10px] truncate capitalize">
              {userRole || (isSupervisor ? "Supervisor" : "Trainee")}
            </p>
          </div>
          <SignOutButton className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <LogOut className="w-3.5 h-3.5" />
          </SignOutButton>
        </div>
      </div>
    </aside>
  )
}
