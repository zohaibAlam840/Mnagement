"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Calendar, CheckCircle2, AlertCircle, RefreshCw, Info } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

function CalendarSyncInner() {
  const searchParams = useSearchParams()
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [flash, setFlash] = useState<"connected" | "error" | "denied" | null>(null)

  useEffect(() => {
    const param = searchParams.get("connected")
    const err = searchParams.get("error")
    if (param === "true") setFlash("connected")
    else if (err === "denied") setFlash("denied")
    else if (err) setFlash("error")
  }, [searchParams])

  useEffect(() => {
    async function checkConnection() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await (supabase.from("profiles") as any)
        .select("google_refresh_token")
        .eq("id", user.id)
        .single()

      setConnected(!!data?.google_refresh_token)
      setLoading(false)
    }
    checkConnection()
  }, [])

  const handleDisconnect = async () => {
    setDisconnecting(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await (supabase.from("profiles") as any)
      .update({
        google_refresh_token: null,
        google_access_token: null,
        google_token_expires_at: null,
      })
      .eq("id", user.id)

    setConnected(false)
    setDisconnecting(false)
  }

  if (loading) {
    return (
      <div className="p-4 md:p-7 max-w-2xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-7 max-w-2xl mx-auto">
      <Link href="/settings" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Settings
      </Link>

      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Calendar Sync</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Connect Google Calendar to import your sessions automatically</p>
      </div>

      {/* Flash messages */}
      {flash === "connected" && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 mb-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <p className="text-sm text-emerald-800 font-medium">Google Calendar connected successfully!</p>
        </div>
      )}
      {(flash === "error" || flash === "denied") && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-800">
            {flash === "denied" ? "You denied calendar access. Connect again to allow access." : "Connection failed. Please try again."}
          </p>
        </div>
      )}

      {/* Connection status card */}
      <div className={cn(
        "rounded-xl border p-5 mb-5",
        connected ? "bg-emerald-50 border-emerald-100" : "bg-white border-[#E8E6F4]"
      )}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white rounded-xl border border-zinc-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-zinc-900">
              {connected ? "Google Calendar connected" : "Google Calendar not connected"}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {connected
                ? "Your calendar events can now be imported into Weekly Review"
                : "Connect to pull your sessions directly from Google Calendar"}
            </p>
          </div>
          {connected
            ? <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            : <AlertCircle className="w-5 h-5 text-zinc-300 flex-shrink-0" />
          }
        </div>

        {connected ? (
          <div className="flex gap-2">
            <Link
              href="/trainee/weekly-review"
              className="flex items-center gap-2 bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
            >
              <Calendar className="w-3.5 h-3.5" />
              Import this week
            </Link>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-red-500 px-3 py-2 transition-colors disabled:opacity-50"
            >
              {disconnecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
              Disconnect
            </button>
          </div>
        ) : (
          <Link
            href="/api/auth/google"
            className="inline-flex items-center gap-2 bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
          >
            Connect Google Calendar
          </Link>
        )}
      </div>

      {/* How it works */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-violet-500" />
          <h3 className="text-sm font-semibold text-zinc-900">How calendar sync works</h3>
        </div>
        <div className="space-y-3">
          {[
            { step: "1", title: "Connect your Google Calendar", desc: "Authorize read-only access to your calendar events." },
            { step: "2", title: "Go to Weekly Review", desc: "Click \"Import from Google Calendar\" to pull this week's events." },
            { step: "3", title: "Tag and confirm", desc: "Assign each event a BACB category (Restricted / Unrestricted / Supervision) and import as draft activities." },
            { step: "4", title: "Submit to supervisor", desc: "Review the imported activities and submit your week when ready." },
          ].map((item) => (
            <div key={item.step} className="flex gap-3">
              <div className="w-5 h-5 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[10px] font-bold text-violet-700">{item.step}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-800">{item.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function CalendarSyncPage() {
  return (
    <Suspense fallback={
      <div className="p-4 md:p-7 max-w-2xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    }>
      <CalendarSyncInner />
    </Suspense>
  )
}
