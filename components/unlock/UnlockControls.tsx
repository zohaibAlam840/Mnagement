"use client"

import { useState } from "react"
import { Unlock, Lock, Clock, Loader2, X, AlertTriangle } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"

export type UnlockRequestRow = Database["public"]["Tables"]["unlock_requests"]["Row"]

type Scope = "week" | "month"

// Candidate: ask the supervisor to unlock an approved week / signed month.
export function RequestUnlock({
  scope, period, pending, onChange, className,
}: {
  scope: Scope
  period: string // week: Monday "YYYY-MM-DD"; month: "YYYY-MM"
  pending?: UnlockRequestRow | null
  onChange?: () => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  if (pending) {
    const cancel = async () => {
      setBusy(true)
      try {
        await api(`/api/unlock-requests/${pending.id}`, { method: "PATCH", body: { action: "cancel" } })
        onChange?.()
      } catch (e) {
        setError((e as Error).message)
      }
      setBusy(false)
    }
    return (
      <div className={cn("flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2", className)}>
        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="flex-1">Unlock requested — waiting for your supervisor.</span>
        <button onClick={cancel} disabled={busy} className="font-semibold hover:text-amber-900 disabled:opacity-60">
          {busy ? "…" : "Cancel"}
        </button>
        {error && <span className="text-red-600">{error}</span>}
      </div>
    )
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn("flex items-center gap-1.5 text-xs font-semibold text-violet-700 bg-white border border-violet-200 hover:bg-violet-50 px-3 py-1.5 rounded-lg transition-colors", className)}
      >
        <Unlock className="w-3.5 h-3.5" />
        Request unlock
      </button>
    )
  }

  const submit = async () => {
    setBusy(true)
    setError("")
    try {
      await api("/api/unlock-requests", { body: { scope, period, reason } })
      setOpen(false)
      setReason("")
      onChange?.()
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  return (
    <div className={cn("bg-white border border-violet-100 rounded-xl p-3.5 space-y-2.5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-900">Request {scope === "week" ? "week" : "month"} unlock</p>
        <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600"><X className="w-4 h-4" /></button>
      </div>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="What needs to change? e.g. schedule change on Oct 3, import mistake…"
        className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 resize-none placeholder:text-zinc-300"
      />
      {scope === "month" && (
        <p className="text-[11px] text-zinc-500">Unlocking a month clears both signatures on its verification form. It will need to be regenerated and re-signed.</p>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        onClick={submit}
        disabled={busy || !reason.trim()}
        className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white text-sm font-semibold py-2 rounded-lg hover:bg-violet-700 disabled:opacity-60"
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        Send request to supervisor
      </button>
    </div>
  )
}

// Supervisor / admin: unlock a week or month (optionally fulfilling a candidate's request).
export function UnlockAction({
  traineeId, scope, period, requestId, onDone, label, className,
}: {
  traineeId: string
  scope: Scope
  period: string
  requestId?: string
  onDone?: () => void
  label?: string
  className?: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const run = async () => {
    setBusy(true)
    setError("")
    try {
      await api("/api/unlock", { body: { traineeId, scope, period, note, requestId } })
      setConfirming(false)
      setNote("")
      onDone?.()
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(false)
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className={cn("flex items-center gap-1.5 text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 px-3 py-1.5 rounded-lg transition-colors", className)}
      >
        <Unlock className="w-3.5 h-3.5" />
        {label ?? (scope === "week" ? "Unlock week" : "Unlock month")}
      </button>
    )
  }

  return (
    <div className={cn("bg-white border border-amber-200 rounded-xl p-3.5 space-y-2.5", className)}>
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-zinc-600 leading-relaxed">
          {scope === "week"
            ? "The candidate will be able to edit this week and must resubmit it. Days that belong to a month whose form is already signed stay locked."
            : "Every approved week in this month reopens for edits and both signatures on the month's verification form are cleared."}
        </p>
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note to candidate (optional)"
        className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 placeholder:text-zinc-300"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => setConfirming(false)} className="flex-1 text-sm font-semibold border border-zinc-200 rounded-lg py-2 hover:bg-zinc-50">Cancel</button>
        <button
          onClick={run}
          disabled={busy}
          className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold bg-amber-500 text-white rounded-lg py-2 hover:bg-amber-600 disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
          Unlock
        </button>
      </div>
    </div>
  )
}

export function LockedBadge({ text = "Locked" }: { text?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-600 bg-zinc-100 border border-zinc-200 px-2 py-1 rounded-lg">
      <Lock className="w-3 h-3" /> {text}
    </span>
  )
}
