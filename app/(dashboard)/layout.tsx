import { Sidebar } from "@/components/layout/Sidebar"
import { BottomNav } from "@/components/layout/BottomNav"
import { MobileTopBar } from "@/components/layout/MobileTopBar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Mobile top bar */}
      <MobileTopBar />

      {/* Mobile bottom nav */}
      <BottomNav />

      {/* Main content — offset for sidebar on desktop, padded for bottom nav on mobile */}
      <main className="md:pl-[240px] dashboard-main md:pb-0 min-h-screen">
        {children}
      </main>
    </div>
  )
}
