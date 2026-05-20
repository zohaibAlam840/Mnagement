"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, Calendar, RefreshCw, CheckCircle2, AlertCircle, ToggleLeft, ToggleRight, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

const calendars = [
  { id: "c1", name: "Sarah Mitchell", email: "sarah.mitchell@gmail.com", color: "#7C3AED", syncing: true, events: 24 },
  { id: "c2", name: "Work Sessions", email: "sarah.mitchell@gmail.com", color: "#2563EB", syncing: true, events: 12 },
  { id: "c3", name: "Birthdays", email: "sarah.mitchell@gmail.com", color: "#10B981", syncing: false, events: 0 },
]

export default function CalendarSyncPage() {
  const [connected, setConnected] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [activeCalendars, setActiveCalendars] = useState(new Set(["c1", "c2"]))

  const handleSync = () => {
    setSyncing(true)
    setTimeout(() => setSyncing(false), 1500)
  }

  const toggleCalendar = (id: string) => {
    setActiveCalendars((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="p-4 md:p-7 max-w-2xl mx-auto">
      <Link href="/settings" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Settings
      </Link>

      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Calendar Sync</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Manage your Google Calendar connection</p>
      </div>

      {/* Connection status */}
      <div className={cn(
        "rounded-xl border p-5 mb-5",
        connected ? "bg-emerald-50 border-emerald-100" : "bg-zinc-50 border-zinc-200"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl border border-zinc-100 flex items-center justify-center">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                {connected ? "Google Calendar connected" : "Google Calendar not connected"}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {connected ? "sarah.mitchell@gmail.com · Last synced 4 min ago" : "Connect to automatically pull your sessions"}
              </p>
            </div>
          </div>
          {connected
            ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            : <AlertCircle className="w-5 h-5 text-zinc-400 flex-shrink-0" />
          }
        </div>
        <div className="flex gap-2 mt-4">
          {connected ? (
            <>
              <button
                onClick={handleSync}
                className="flex items-center gap-2 bg-white text-zinc-700 text-sm font-semibold px-4 py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition-colors"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
                {syncing ? "Syncing..." : "Sync now"}
              </button>
              <button
                onClick={() => setConnected(false)}
                className="text-sm font-medium text-zinc-400 hover:text-red-500 px-3 py-2 transition-colors"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={() => setConnected(true)}
              className="flex items-center gap-2 bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
            >
              Connect Google Calendar
            </button>
          )}
        </div>
      </div>

      {/* Calendars to sync */}
      {connected && (
        <div className="bg-white rounded-xl border border-[#E8E6F4] mb-5">
          <div className="px-5 py-4 border-b border-zinc-50">
            <h3 className="text-sm font-semibold text-zinc-900">Calendars to sync</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Only selected calendars will be pulled into FieldLog</p>
          </div>
          <div className="divide-y divide-zinc-50">
            {calendars.map((cal) => (
              <div key={cal.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cal.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">{cal.name}</p>
                  <p className="text-xs text-zinc-400">{activeCalendars.has(cal.id) ? `${cal.events} events pulled this month` : "Not syncing"}</p>
                </div>
                <button onClick={() => toggleCalendar(cal.id)} className="text-zinc-400 hover:text-violet-600 transition-colors">
                  {activeCalendars.has(cal.id)
                    ? <ToggleRight className="w-6 h-6 text-violet-500" />
                    : <ToggleLeft className="w-6 h-6" />
                  }
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sync settings */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-5">
        <h3 className="text-sm font-semibold text-zinc-900 mb-4">Sync settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-800">Sync frequency</p>
              <p className="text-xs text-zinc-400">How often FieldLog checks for new events</p>
            </div>
            <select className="text-sm font-medium border border-zinc-200 rounded-lg px-3 py-1.5 focus:outline-none bg-white">
              <option>Every 15 minutes</option>
              <option>Every 30 minutes</option>
              <option>Every hour</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-800">Pull recurring events</p>
              <p className="text-xs text-zinc-400">Match recurring calendar events to your templates</p>
            </div>
            <ToggleRight className="w-6 h-6 text-violet-500" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-800">Auto-categorize by template</p>
              <p className="text-xs text-zinc-400">Apply template category when event title matches</p>
            </div>
            <ToggleRight className="w-6 h-6 text-violet-500" />
          </div>
        </div>
      </div>

      {/* Sync log */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
        <h3 className="text-sm font-semibold text-zinc-900 mb-3">Recent sync activity</h3>
        <div className="space-y-2.5">
          {[
            { time: "4 min ago", msg: "6 events pulled from 'Sarah Mitchell' calendar", ok: true },
            { time: "19 min ago", msg: "3 events matched to recurring templates", ok: true },
            { time: "34 min ago", msg: "Sync completed — no new events", ok: true },
            { time: "49 min ago", msg: "1 event skipped — outside fieldwork hours", ok: false },
          ].map((log, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                <Clock className="w-3 h-3 text-zinc-300" />
                <span className="text-[10px] text-zinc-400 w-14">{log.time}</span>
              </div>
              {log.ok
                ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                : <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
              }
              <p className="text-xs text-zinc-500">{log.msg}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
