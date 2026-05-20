"use client"

import Link from "next/link"
import { Bell, CalendarCheck, TrendingUp, Clock, AlertTriangle, ChevronRight, CheckCircle2, Circle } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import { hoursOverTime, complianceData, activities } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

function ComplianceRing({ percent, max, label, color }: { percent: number; max: number; label: string; color: string }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const fill = (percent / 100) * circumference
  const isOver = percent > max

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="8" />
          <circle
            cx="48" cy="48" r={radius}
            fill="none"
            stroke={isOver ? "#EF4444" : color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - fill}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-lg font-bold", isOver ? "text-red-500" : "text-zinc-900")}>{percent}%</span>
          <span className="text-[9px] text-zinc-400 text-center leading-tight">{label}</span>
        </div>
      </div>
      <span className={cn("text-[10px] font-medium", isOver ? "text-red-500" : "text-zinc-500")}>
        {isOver ? `Over ${max}% limit` : `Max ${max}%`}
      </span>
    </div>
  )
}

export default function TraineeDashboard() {
  const { totalHours, targetHours, restrictedPercent, supervisionPercent, restrictedHours, unrestrictedHours, supervisionHours, alerts } = complianceData
  const progressPercent = Math.round((totalHours / targetHours) * 100)
  const recentActivities = activities.slice(0, 4)

  return (
    <div className="p-4 md:p-7 max-w-6xl mx-auto">
      {/* Top bar — greeting visible on both, bell hidden on mobile (top bar handles it) */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Good morning, Sarah</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Week 21 · May 19, 2025</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/trainee/weekly-review" className="flex items-center gap-1.5 text-xs font-semibold bg-violet-600 text-white px-3 py-2 rounded-lg hover:bg-violet-700 transition-colors">
            <CalendarCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Review Week</span>
            <span className="sm:hidden">Review</span>
            <span className="bg-white/20 text-white rounded-full px-1.5 py-0.5 text-[10px]">3</span>
          </Link>
          {/* Bell hidden on mobile — MobileTopBar handles it */}
          <Link href="/notifications" className="relative hidden md:flex w-9 h-9 rounded-lg bg-white border border-[#E8E6F4] items-center justify-center hover:bg-zinc-50 transition-colors">
            <Bell className="w-4 h-4 text-zinc-500" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-violet-600 rounded-full" />
          </Link>
        </div>
      </div>

      {/* Compliance alert */}
      {alerts.map((alert, i) => (
        <div key={i} className={cn(
          "flex items-start gap-3 px-4 py-3 rounded-xl text-sm mb-5",
          alert.type === "warning" ? "bg-amber-50 border border-amber-100 text-amber-800" :
          alert.type === "error" ? "bg-red-50 border border-red-100 text-red-800" :
          "bg-violet-50 border border-violet-100 text-violet-800"
        )}>
          {alert.type === "warning" ? <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          {alert.message}
        </div>
      ))}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Hours", value: totalHours.toFixed(1), sub: `of ${targetHours} required`, icon: Clock, color: "text-violet-600" },
          { label: "Restricted", value: `${restrictedHours}h`, sub: `${restrictedPercent}% of total`, icon: TrendingUp, color: "text-blue-600" },
          { label: "Unrestricted", value: `${unrestrictedHours}h`, sub: "program development etc.", icon: TrendingUp, color: "text-emerald-600" },
          { label: "Supervision", value: `${supervisionHours}h`, sub: `${supervisionPercent}% of total`, icon: CheckCircle2, color: "text-amber-600" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-[#E8E6F4] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400">{stat.label}</span>
              <stat.icon className={cn("w-3.5 h-3.5", stat.color)} />
            </div>
            <p className="text-2xl font-bold text-zinc-900">{stat.value}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid md:grid-cols-3 gap-5 mb-5">
        {/* Hours chart */}
        <div className="md:col-span-2 bg-white rounded-xl border border-[#E8E6F4] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-zinc-900 text-sm">Hours This Year</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Restricted + Unrestricted + Supervision</p>
            </div>
            <span className="text-xs text-zinc-400 font-medium">2025</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={hoursOverTime} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid #E8E6F4", borderRadius: 8, fontSize: 12 }}
                cursor={{ stroke: "#7C3AED", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
              <Area type="monotone" dataKey="hours" stroke="#7C3AED" strokeWidth={2} fill="url(#colorHours)" dot={{ fill: "#7C3AED", r: 3 }} activeDot={{ r: 5, fill: "#7C3AED" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Compliance ratios */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <h2 className="font-semibold text-zinc-900 text-sm mb-1">Compliance Ratios</h2>
          <p className="text-xs text-zinc-400 mb-5">BACB certification requirements</p>
          <div className="flex items-center justify-around">
            <ComplianceRing percent={restrictedPercent} max={50} label="Restricted" color="#7C3AED" />
            <ComplianceRing percent={supervisionPercent} max={100} label="Supervision" color="#10B981" />
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Toward certification</span>
              <span className="font-semibold text-zinc-900">{progressPercent}%</span>
            </div>
            <div className="mt-1.5 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">{totalHours} / {targetHours} hours</p>
          </div>
        </div>
      </div>

      {/* Recent activities */}
      <div className="bg-white rounded-xl border border-[#E8E6F4]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
          <h2 className="font-semibold text-zinc-900 text-sm">Recent Activities</h2>
          <Link href="/trainee/activities" className="text-xs text-violet-600 font-medium hover:text-violet-700 flex items-center gap-1">
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-zinc-50">
          {recentActivities.map((a) => (
            <div key={a.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50/50 transition-colors">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[10px] font-bold",
                a.category === "Restricted" ? "bg-violet-100 text-violet-700" :
                a.category === "Supervision" ? "bg-emerald-100 text-emerald-700" :
                "bg-blue-100 text-blue-700"
              )}>
                {a.duration}h
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 truncate">{a.title}</p>
                <p className="text-[11px] text-zinc-400">{a.date} · {a.startTime} – {a.endTime}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                  a.category === "Restricted" ? "bg-violet-50 text-violet-700" :
                  a.category === "Supervision" ? "bg-emerald-50 text-emerald-700" :
                  "bg-blue-50 text-blue-700"
                )}>
                  {a.category}
                </span>
                {a.supervisorApproved
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  : <Circle className="w-3.5 h-3.5 text-zinc-300" />
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
