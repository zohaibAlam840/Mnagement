"use client"

import { useCallback, useEffect, useState } from "react"
import { Unlock, X, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { formatPeriod, monthOf } from "@/lib/period"
import { UnlockAction, type UnlockRequestRow } from "./UnlockControls"

type RequestWithTrainee = UnlockRequestRow & { trainee: { first_name: string; last_name: string; email: string } | null }

function timeAgo(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000)
  if (h < 1) return "just now"
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// Pending candidate unlock requests with Approve (unlock) / Decline.
export function UnlockRequestsList({ traineeId, allForAdmin = false, onChange }: { traineeId?: string; allForAdmin?: boolean; onChange?: () => void }) {
  const [requests, setRequests] = useState<RequestWithTrainee[]>([])
  const [loading, setLoading] = useState(true)
  const [denying, setDenying] = useState<string | null>(null)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    const qs = new URLSearchParams({ status: "pending" })
    if (traineeId) qs.set("traineeId", traineeId)
    if (allForAdmin) qs.set("scope", "all")
    try {
      const data = await api<{ requests: RequestWithTrainee[] }>(`/api/unlock-requests?${qs}`)
      setRequests(data.requests)
    } catch (e) {
      setError((e as Error).message)
    }
    setLoading(false)
  }, [traineeId, allForAdmin])

  useEffect(() => { load() }, [load])

  const refresh = () => { load(); onChange?.() }

  const deny = async (id: string) => {
    setDenying(id)
    try {
      await api(`/api/unlock-requests/${id}`, { method: "PATCH", body: { action: "deny" } })
      refresh()
    } catch (e) {
      setError((e as Error).message)
    }
    setDenying(null)
  }

  if (loading || (requests.length === 0 && !error)) return null

  return (
    <div className="bg-white rounded-xl border border-amber-200 mb-5 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-amber-100 bg-amber-50/60">
        <Unlock className="w-4 h-4 text-amber-600" />
        <p className="text-sm font-semibold text-zinc-900">Unlock requests</p>
        <span className="text-[10px] font-bold bg-amber-500 text-white rounded-full px-1.5 py-0.5">{requests.length}</span>
      </div>
      {error && <p className="px-5 py-2 text-xs text-red-600">{error}</p>}
      <div className="divide-y divide-zinc-50">
        {requests.map((r) => (
          <div key={r.id} className="px-5 py-3.5 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-900">
                  {r.trainee ? `${r.trainee.first_name} ${r.trainee.last_name}` : "Candidate"}
                  <span className="font-normal text-zinc-500"> · {formatPeriod(r.scope, r.period_start)}</span>
                </p>
                {r.reason && <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">&ldquo;{r.reason}&rdquo;</p>}
                <p className="text-[11px] text-zinc-400 mt-0.5">{timeAgo(r.created_at)}</p>
              </div>
              <button
                onClick={() => deny(r.id)}
                disabled={denying === r.id}
                className="flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-red-600 border border-zinc-200 px-2.5 py-1.5 rounded-lg disabled:opacity-60 flex-shrink-0"
              >
                {denying === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
                Decline
              </button>
            </div>
            <UnlockAction
              traineeId={r.trainee_id}
              scope={r.scope}
              period={r.scope === "week" ? r.period_start : monthOf(r.period_start)}
              requestId={r.id}
              label={r.scope === "week" ? "Approve & unlock week" : "Approve & unlock month"}
              onDone={refresh}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
