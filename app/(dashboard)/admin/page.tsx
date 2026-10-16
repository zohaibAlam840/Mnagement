"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ShieldCheck, Search, ChevronRight, Star, Trash2, Loader2, AlertTriangle, Clock, Unlock } from "lucide-react"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { UnlockRequestsList } from "@/components/unlock/UnlockRequestsList"

type AdminUser = {
  id: string
  email: string
  first_name: string
  last_name: string
  role: "trainee" | "supervisor"
  admin_level: "admin" | "director" | null
  created_at: string
}
type AdminRel = { id: string; trainee_id: string; supervisor_id: string; is_primary: boolean; status: string; start_date: string | null }
type Overview = {
  me: { id: string; adminLevel: string }
  users: AdminUser[]
  relationships: AdminRel[]
  pendingReviews: Record<string, number>
  pendingUnlocks: Record<string, number>
}

const name = (u?: AdminUser) => (u ? `${u.first_name} ${u.last_name}`.trim() || u.email : "—")

export default function AdminPage() {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<"candidates" | "supervisors" | "accounts">("candidates")
  const [q, setQ] = useState("")
  const [deleting, setDeleting] = useState<AdminUser | null>(null)
  const [confirmEmail, setConfirmEmail] = useState("")
  const [busy, setBusy] = useState(false)
  const [deleteError, setDeleteError] = useState("")

  const load = useCallback(async () => {
    try {
      setData(await api<Overview>("/api/admin/overview"))
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])
  useEffect(() => { load() }, [load])

  const byId = useMemo(() => Object.fromEntries((data?.users ?? []).map(u => [u.id, u])), [data])
  const match = (u: AdminUser) => `${u.first_name} ${u.last_name} ${u.email}`.toLowerCase().includes(q.toLowerCase())

  if (error) {
    return (
      <div className="p-4 md:p-7 max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-red-100 p-6 text-sm text-red-600 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="p-4 md:p-7 flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  const activeRels = data.relationships.filter(r => r.status === "active")
  const trainees = data.users.filter(u => u.role === "trainee").filter(match)
  const supervisors = data.users.filter(u => u.role === "supervisor").filter(match)
  const accounts = data.users.filter(match)

  const doDelete = async () => {
    if (!deleting) return
    setBusy(true)
    setDeleteError("")
    try {
      await api(`/api/admin/users/${deleting.id}`, { method: "DELETE", body: { confirmEmail } })
      setDeleting(null)
      setConfirmEmail("")
      await load()
    } catch (e) {
      setDeleteError((e as Error).message)
    }
    setBusy(false)
  }

  return (
    <div className="p-4 md:p-7 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-violet-700" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">{data.me.adminLevel === "director" ? "Director" : "Admin"} console</h1>
          <p className="text-sm text-zinc-500">All candidates and supervisors · unlock approvals · assign supervisors · manage accounts</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Candidates", value: data.users.filter(u => u.role === "trainee").length },
          { label: "Supervisors", value: data.users.filter(u => u.role === "supervisor").length },
          { label: "Weeks awaiting approval", value: Object.values(data.pendingReviews).reduce((a, b) => a + b, 0) },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-[#E8E6F4] p-4">
            <p className="text-2xl font-bold text-zinc-900">{s.value}</p>
            <p className="text-xs text-zinc-400">{s.label}</p>
          </div>
        ))}
      </div>

      <UnlockRequestsList allForAdmin onChange={load} />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center bg-zinc-100 rounded-lg p-0.5">
          {(["candidates", "supervisors", "accounts"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={cn("text-xs font-semibold px-3 py-1.5 rounded-md capitalize", tab === t ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500")}>
              {t}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
        </div>
      </div>

      {tab === "candidates" && (
        <div className="bg-white rounded-xl border border-[#E8E6F4] divide-y divide-zinc-50">
          {trainees.length === 0 && <p className="p-6 text-sm text-zinc-400 text-center">No candidates found.</p>}
          {trainees.map(t => {
            const rels = activeRels.filter(r => r.trainee_id === t.id)
            return (
              <Link key={t.id} href={`/admin/candidates/${t.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-zinc-50/70">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900">{name(t)}</p>
                  <p className="text-xs text-zinc-400 truncate">{t.email}</p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {rels.length === 0
                      ? <span className="text-amber-600">No active supervisor</span>
                      : rels.map(r => (
                        <span key={r.id} className="mr-2 inline-flex items-center gap-0.5">
                          {r.is_primary && <Star className="w-3 h-3 text-amber-500 fill-amber-400" />}
                          {name(byId[r.supervisor_id])}
                        </span>
                      ))}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!!data.pendingReviews[t.id] && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">
                      <Clock className="w-3 h-3" /> {data.pendingReviews[t.id]} pending
                    </span>
                  )}
                  {!!data.pendingUnlocks[t.id] && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100 px-2 py-0.5 rounded-full">
                      <Unlock className="w-3 h-3" /> unlock request
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-zinc-300" />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {tab === "supervisors" && (
        <div className="bg-white rounded-xl border border-[#E8E6F4] divide-y divide-zinc-50">
          {supervisors.length === 0 && <p className="p-6 text-sm text-zinc-400 text-center">No supervisors found.</p>}
          {supervisors.map(s => {
            const rels = activeRels.filter(r => r.supervisor_id === s.id)
            return (
              <div key={s.id} className="px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-zinc-900">{name(s)}</p>
                  {s.admin_level && <span className="text-[10px] font-semibold uppercase bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">{s.admin_level}</span>}
                </div>
                <p className="text-xs text-zinc-400">{s.email}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {rels.length === 0 && <span className="text-xs text-zinc-400">No supervisees</span>}
                  {rels.map(r => (
                    <Link key={r.id} href={`/admin/candidates/${r.trainee_id}`} className="text-xs bg-zinc-50 border border-zinc-200 hover:border-violet-200 rounded-full px-2.5 py-0.5 text-zinc-700">
                      {r.is_primary && "★ "}{name(byId[r.trainee_id])}
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === "accounts" && (
        <div className="bg-white rounded-xl border border-[#E8E6F4] divide-y divide-zinc-50">
          {accounts.map(u => (
            <div key={u.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-900">{name(u)}</p>
                <p className="text-xs text-zinc-400 truncate">{u.email} · <span className="capitalize">{u.role === "trainee" ? "candidate" : u.role}</span>{u.admin_level ? ` · ${u.admin_level}` : ""}</p>
              </div>
              {!u.admin_level && u.id !== data.me.id && (
                <button onClick={() => { setDeleting(u); setConfirmEmail(""); setDeleteError("") }} className="flex items-center gap-1 text-xs font-semibold text-red-600 border border-red-100 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => !busy && setDeleting(null)}>
          <div className="bg-white rounded-2xl p-5 w-full max-w-md space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <p className="font-bold text-zinc-900">Delete {name(deleting)}?</p>
            </div>
            <p className="text-sm text-zinc-600 leading-relaxed">
              This permanently deletes the account and {deleting.role === "trainee"
                ? "all of their logged hours, weekly reviews and verification forms"
                : "their sessions and supervision links. Approval history on their candidates' weeks moves to each candidate's other supervisor"}. It can&apos;t be undone.
            </p>
            <label className="block">
              <span className="text-xs font-semibold text-zinc-500">Type <span className="text-zinc-800">{deleting.email}</span> to confirm</span>
              <input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-red-200" />
            </label>
            {deleteError && <p className="text-xs text-red-600">{deleteError}</p>}
            <div className="flex gap-2">
              <button onClick={() => setDeleting(null)} disabled={busy} className="flex-1 text-sm font-semibold border border-zinc-200 rounded-lg py-2 hover:bg-zinc-50">Cancel</button>
              <button
                onClick={doDelete}
                disabled={busy || confirmEmail.trim().toLowerCase() !== deleting.email.toLowerCase()}
                className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold bg-red-600 text-white rounded-lg py-2 hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
