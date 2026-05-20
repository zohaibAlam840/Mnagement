"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Activity,
  CalendarCheck,
  FileText,
  Users,
  CheckSquare,
  UserCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

const traineeItems = [
  { label: "Home", icon: LayoutDashboard, href: "/trainee" },
  { label: "Activities", icon: Activity, href: "/trainee/activities" },
  { label: "Review", icon: CalendarCheck, href: "/trainee/weekly-review", badge: true },
  { label: "Reports", icon: FileText, href: "/trainee/reports" },
  { label: "Profile", icon: UserCircle, href: "/settings" },
]

const supervisorItems = [
  { label: "Home", icon: LayoutDashboard, href: "/supervisor" },
  { label: "Trainees", icon: Users, href: "/supervisor/supervisees" },
  { label: "Approvals", icon: CheckSquare, href: "/supervisor/approvals", badge: true },
  { label: "Reports", icon: FileText, href: "/supervisor/sign-off" },
  { label: "Profile", icon: UserCircle, href: "/settings" },
]

export function BottomNav() {
  const pathname = usePathname()
  const isSupervisor = pathname.startsWith("/supervisor")
  const items = isSupervisor ? supervisorItems : traineeItems

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-zinc-100 bottom-nav-safe">
      <div className="flex items-center h-16">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/trainee" &&
              item.href !== "/supervisor" &&
              pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 h-full relative transition-colors",
                active ? "text-violet-600" : "text-zinc-400"
              )}
            >
              <div className="relative">
                <item.icon className="w-5 h-5" />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-violet-600 rounded-full border-2 border-white" />
                )}
              </div>
              <span className={cn("text-[10px] font-medium leading-none", active ? "text-violet-600" : "text-zinc-400")}>
                {item.label}
              </span>
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-violet-600 rounded-b-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
