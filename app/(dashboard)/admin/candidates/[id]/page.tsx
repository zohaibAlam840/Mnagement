"use client"

import { use, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, Star, UserPlus, X, Loader2, AlertTriangle } from "lucide-react"
import { api } from "@/lib/api"
import { formatMonthLabel, monthOf, toDateStr } from "@/lib/period"
import { ActivityLog } from "@/components/activity/ActivityLog"
import { MvfPanel } from "@/components/mvf/MvfPanel"
import { FvfPanel } from "@/components/mvf/FvfPanel"
import { UnlockRequestsList } from "@/components/unlock/UnlockRequestsList"

type User = { id: string; email: string; first_name: string; last_name: string; role: string; admin_level: string | null }
type Rel = { id: string; trainee_id: string; supervisor_id: string; is_primary: boolean; status: string }
type Overview = { users: User[]; relationships: Rel[] }

const name = (u?: User) => (u ? `${u.first_name} ${u.last_name}`.trim() || u.email : "—")

export default function AdminCandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState<string | null>(null)
  const [addSupervisor, setAddSupervisor] = useState("")
  const [reloadKey, setReloadKey] = useState(0)

  const months = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 12 }, (_, i) => monthOf(toDateStr(new Date(now.getFullYear(), now.getMonth() - i, 1))))
  }, [])
  const [month, setMonth] = useState(months[1])

  const load = useCallback(async () => {
    try {
      setData(await api<Overview>("/api/admin/overview"))
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])
  useEffect(() => { load() }, [load])

  if (error && !data) {
    return <div className="p-7 text-sm text-red-600">{error}</div>
  }
  if (!data) {
    return (
      <div className="p-7 flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  const byId = Object.fromEntries(data.users.map(u => [u.id, u]))
  const candidate = byId[id]
  if (!candidate) return <div className="p-7 text-sm text-zinc-500">Candidate not found.</div>

  const rels = data.relationships.filter(r => r.trainee_id === id && r.status === "active")
  const available = data.users.filter(u => u.role === "supervisor" && !rels.some(r => r.supervisor_id === u.id))

  const act = async (action: "assign" | "remove" | "primary", supervisorId: string) => {
    setBusy(`${action}-${supervisorId}`)
    setError("")
    try {
      await api("/api/admin/relationships", { body: { action, traineeId: id, supervisorId } })
      setAddSupervisor("")
      await load()
      setReloadKey(k => k + 1)
    } catch (e) {
      setError((e as Error).message)
    }
    setBusy(null)
  }

  return (
    <div className="p-4 md:p-7 max-w-4xl mx-auto space-y-5">
      <Link href="/admin" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800">
        <ChevronLeft className="w-4 h-4" /> Admin console
      </Link>

      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
        <h1 className="text-lg font-bold text-zinc-900">{name(candidate)}</h1>
        <p className="text-sm text-zinc-500">{candidate.email}</p>
      </div>

      {/* Supervisors */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 space-y-3">
        <p className="text-sm font-semibold text-zinc-900">Supervisors</p>
        {error && (
          <p className="flex items-center gap-2 text-xs text-red-600"><AlertTriangle className="w-3.5 h-3.5" /> {error}</p>
        )}
        {rels.length === 0 && <p className="text-xs text-amber-600">No active supervisor — assign one so this candidate can submit hours.</p>}
        <div className="space-y-2">
          {rels.map(r => (
            <div key={r.id} className="flex items-center gap-3 border border-zinc-100 rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-900 flex items-center gap-1.5">
                  {name(byId[r.supervisor_id])}
                  {r.is_primary && <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full"><Star className="w-3 h-3 fill-amber-400 text-amber-500" /> Primary · signs MVF</span>}
                </p>
                <p className="text-xs text-zinc-400">{byId[r.supervisor_id]?.email}</p>
              </div>
              {!r.is_primary && (
                <button onClick={() => act("primary", r.supervisor_id)} disabled={busy !== null} className="text-xs font-semibold text-zinc-600 border border-zinc-200 px-2.5 py-1.5 rounded-lg hover:bg-zinc-50 disabled:opacity-60">
                  Make primary
                </button>
              )}
              <button onClick={() => act("remove", r.supervisor_id)} disabled={busy !== null} className="text-zinc-400 hover:text-red-600 disabled:opacity-60" title="Remove supervisor">
                {busy === `remove-${r.supervisor_id}` ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <select
            value={addSupervisor}
            onChange={(e) => setAddSupervisor(e.target.value)}
            className="flex-1 border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-200"
          >
            <option value="">Assign a supervisor…</option>
            {available.map(s => <option key={s.id} value={s.id}>{name(s)} · {s.email}</option>)}
          </select>
          <button
            onClick={() => addSupervisor && act("assign", addSupervisor)}
            disabled={!addSupervisor || busy !== null}
            className="flex items-center gap-1.5 bg-violet-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-violet-700 disabled:opacity-50"
          >
            {busy?.startsWith("assign") ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />} Assign
          </button>
        </div>
      </div>

      <UnlockRequestsList traineeId={id} onChange={() => setReloadKey(k => k + 1)} />

      <ActivityLog key={`log-${reloadKey}`} traineeId={id} canUnlock />

      <div className="bg-white rounded-xl border border-[#E8E6F4] p-4 flex items-center gap-3">
        <p className="text-sm font-semibold text-zinc-900 flex-1">Verification form month</p>
        <select value={month} onChange={(e) => setMonth(e.target.value)} className="border border-zinc-200 rounded-lg px-3 py-2 text-sm bg-white">
          {months.map(m => <option key={m} value={m}>{formatMonthLabel(m)}</option>)}
        </select>
      </div>
      <MvfPanel key={`${month}-${reloadKey}`} traineeId={id} month={month} />
      <FvfPanel key={`fvf-${reloadKey}`} traineeId={id} />
    </div>
  )
}
