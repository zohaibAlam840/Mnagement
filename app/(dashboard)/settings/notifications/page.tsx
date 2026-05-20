"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, Bell, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

type Toggle = { id: string; label: string; desc: string; on: boolean }

const INITIAL_TOGGLES: Toggle[] = [
  { id: "weekly_reminder", label: "Weekly review reminder", desc: "Remind me to review my weekly log every Friday", on: true },
  { id: "approval_notify", label: "Approval notifications", desc: "Alert when supervisor approves or rejects an activity", on: true },
  { id: "session_confirm", label: "Session confirmations", desc: "Notify when a supervision session is confirmed", on: true },
  { id: "compliance_alert", label: "Compliance alerts", desc: "Warn when restricted hours approach the 50% limit", on: true },
  { id: "report_ready", label: "Monthly report ready", desc: "Alert when your monthly summary is available for review", on: false },
  { id: "supervisor_msg", label: "Supervisor messages", desc: "Push notification for direct messages from my supervisor", on: false },
]

const EMAIL_TOGGLES: Toggle[] = [
  { id: "email_weekly", label: "Weekly digest", desc: "Summary of hours logged each week", on: true },
  { id: "email_approval", label: "Approval updates", desc: "Email when supervisor acts on your submissions", on: true },
  { id: "email_monthly", label: "Monthly report", desc: "Full compliance report at the end of each month", on: false },
]

type Frequency = "immediately" | "daily" | "weekly"

export default function NotificationsSettingsPage() {
  const [push, setPush] = useState(INITIAL_TOGGLES)
  const [email, setEmail] = useState(EMAIL_TOGGLES)
  const [frequency, setFrequency] = useState<Frequency>("immediately")
  const [saved, setSaved] = useState(false)

  const togglePush = (id: string) =>
    setPush((prev) => prev.map((t) => (t.id === id ? { ...t, on: !t.on } : t)))

  const toggleEmail = (id: string) =>
    setEmail((prev) => prev.map((t) => (t.id === id ? { ...t, on: !t.on } : t)))

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="p-4 md:p-7 max-w-2xl mx-auto">
      <Link href="/settings" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Settings
      </Link>

      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Notifications</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Choose how and when FieldLog contacts you</p>
      </div>

      {/* Push notifications */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] mb-4">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-50">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
            <Bell className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">Push Notifications</p>
            <p className="text-xs text-zinc-400">In-app and mobile push alerts</p>
          </div>
        </div>
        <div className="divide-y divide-zinc-50">
          {push.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-zinc-800">{item.label}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{item.desc}</p>
              </div>
              <button
                onClick={() => togglePush(item.id)}
                className={cn(
                  "w-11 h-6 rounded-full flex items-center transition-all flex-shrink-0",
                  item.on ? "bg-violet-600 justify-end" : "bg-zinc-200 justify-start"
                )}
              >
                <div className={cn("w-5 h-5 rounded-full bg-white shadow-sm mx-0.5 transition-all")} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Email notifications */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] mb-4">
        <div className="px-5 py-4 border-b border-zinc-50">
          <p className="text-sm font-semibold text-zinc-900">Email Notifications</p>
          <p className="text-xs text-zinc-400 mt-0.5">Sent to sarah.mitchell@email.com</p>
        </div>
        <div className="divide-y divide-zinc-50">
          {email.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-zinc-800">{item.label}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{item.desc}</p>
              </div>
              <button
                onClick={() => toggleEmail(item.id)}
                className={cn(
                  "w-11 h-6 rounded-full flex items-center transition-all flex-shrink-0",
                  item.on ? "bg-violet-600 justify-end" : "bg-zinc-200 justify-start"
                )}
              >
                <div className="w-5 h-5 rounded-full bg-white shadow-sm mx-0.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery frequency */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-5">
        <p className="text-sm font-semibold text-zinc-900 mb-1">Email delivery frequency</p>
        <p className="text-xs text-zinc-400 mb-4">How often to batch non-urgent email notifications</p>
        <div className="space-y-2">
          {([
            { value: "immediately", label: "Send immediately", desc: "As soon as an event occurs" },
            { value: "daily", label: "Daily digest", desc: "One summary email per day at 8:00 AM" },
            { value: "weekly", label: "Weekly digest", desc: "One summary email every Monday morning" },
          ] as { value: Frequency; label: string; desc: string }[]).map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFrequency(opt.value)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left",
                frequency === opt.value ? "border-violet-200 bg-violet-50" : "border-zinc-100 hover:border-zinc-200"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                frequency === opt.value ? "bg-violet-600 border-violet-600" : "border-zinc-300"
              )}>
                {frequency === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </div>
              <div>
                <p className={cn("text-sm font-semibold", frequency === opt.value ? "text-violet-800" : "text-zinc-700")}>{opt.label}</p>
                <p className="text-xs text-zinc-400">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        className={cn(
          "w-full py-3 text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2",
          saved ? "bg-emerald-600 text-white" : "bg-violet-600 text-white hover:bg-violet-700"
        )}
      >
        {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : "Save preferences"}
      </button>
    </div>
  )
}
