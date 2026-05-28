"use client"

import { useState, useEffect } from "react"
import { Check, X, User, CheckCircle2, Clock, AlertTriangle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"

type Relationship = Database["public"]["Tables"]["supervisor_relationships"]["Row"]
type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type SupervisorProfile = Database["public"]["Tables"]["supervisor_profiles"]["Row"]

type RelWithProfile = Relationship & {
  supervisor: (Profile & { supervisorProfile: SupervisorProfile | null }) | null
}

export default function MysupervisorPage() {
  const [active, setActive] = useState<RelWithProfile[]>([])
  const [pending, setPending] = useState<RelWithProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: rels } = await supabase
      .from("supervisor_relationships")
      .select("*")
      .eq("trainee_id", user.id)
      .order("created_at", { ascending: false })

    if (!rels || rels.length === 0) { setLoading(false); return }

    const supIds = [...new Set(rels.map(r => r.supervisor_id))]
    const [{ data: profiles }, { data: supProfiles }] = await Promise.all([
      supabase.from("profiles").select("*").in("id", supIds),
      supabase.from("supervisor_profiles").select("*").in("id", supIds),
    ])

    const profileMap = Object.fromEntries((profiles ?? []).map(p => [p.id, p]))
    const supProfileMap = Object.fromEntries((supProfiles ?? []).map(p => [p.id, p]))

    const enrich = (r: Relationship): RelWithProfile => {
      const prof = profileMap[r.supervisor_id] ?? null
      return {
        ...r,
        supervisor: prof ? { ...prof, supervisorProfile: supProfileMap[r.supervisor_id] ?? null } : null,
      }
    }

    setActive(rels.filter(r => r.status === "active").map(enrich))
    setPending(rels.filter(r => r.status === "pending").map(enrich))
    setLoading(false)
  }

  const handleAccept = async (rel: RelWithProfile) => {
    setActing(rel.id)
    const supabase = createClient()
    await supabase
      .from("supervisor_relationships")
      .update({ status: "active", start_date: new Date().toISOString().split("T")[0] })
      .eq("id", rel.id)

    // Notify supervisor
    if (rel.supervisor_id) {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from("notifications").insert({
        user_id: rel.supervisor_id,
        type: "invite_accepted",
        title: "Invitation accepted",
        body: "A trainee has accepted your supervision invitation.",
        read: false,
        related_id: user?.id ?? null,
      })
    }

    setActing(null)
    load()
  }

  const handleDecline = async (rel: RelWithProfile) => {
    setActing(rel.id)
    const supabase = createClient()
    await supabase.from("supervisor_relationships").delete().eq("id", rel.id)
    setActing(null)
    load()
  }

  const handleEndRelationship = async (rel: RelWithProfile) => {
    if (!confirm("End this supervision relationship? This cannot be undone.")) return
    setActing(rel.id)
    const supabase = createClient()
    await supabase
      .from("supervisor_relationships")
      .update({ status: "ended", end_date: new Date().toISOString().split("T")[0] })
      .eq("id", rel.id)
    setActing(null)
    load()
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
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900">My Supervisor</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Manage your supervision relationships</p>
      </div>

      {/* Pending invitations */}
      {pending.length > 0 && (
        <div className="mb-6">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
            Pending Invitations ({pending.length})
          </p>
          <div className="space-y-3">
            {pending.map((rel) => {
              const name = rel.supervisor
                ? `${rel.supervisor.first_name} ${rel.supervisor.last_name}`
                : "Supervisor"
              const cert = rel.supervisor?.supervisorProfile?.certification_level ?? "BCBA"
              const ini = rel.supervisor
                ? `${rel.supervisor.first_name[0]}${rel.supervisor.last_name[0]}`.toUpperCase()
                : "??"
              return (
                <div key={rel.id} className="bg-white rounded-xl border border-amber-200 p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-violet-700">{ini}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-900">{name}</p>
                      <p className="text-xs text-zinc-400">{cert} · Supervisor</p>
                      {rel.supervisor?.email && (
                        <p className="text-xs text-zinc-400">{rel.supervisor.email}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-2 py-1 rounded-full">
                      <Clock className="w-3 h-3 inline mr-1" />Pending
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-4 bg-zinc-50 rounded-lg p-3 leading-relaxed">
                    <AlertTriangle className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
                    By accepting, <strong>{name}</strong> will be able to view and approve your logged activities and weekly reviews.
                    {rel.is_primary && " This will be set as your primary supervisor."}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDecline(rel)}
                      disabled={acting === rel.id}
                      className="flex-1 flex items-center justify-center gap-2 border border-zinc-200 text-zinc-600 font-semibold py-2.5 rounded-xl text-sm hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all disabled:opacity-60"
                    >
                      <X className="w-4 h-4" />
                      Decline
                    </button>
                    <button
                      onClick={() => handleAccept(rel)}
                      disabled={acting === rel.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-violet-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-colors disabled:opacity-60"
                    >
                      <Check className="w-4 h-4" />
                      {acting === rel.id ? "Accepting…" : "Accept"}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Active supervisors */}
      {active.length > 0 && (
        <div>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Active Supervisors</p>
          <div className="space-y-3">
            {active.map((rel) => {
              const name = rel.supervisor
                ? `${rel.supervisor.first_name} ${rel.supervisor.last_name}`
                : "Supervisor"
              const cert = rel.supervisor?.supervisorProfile?.certification_level ?? "BCBA"
              const ini = rel.supervisor
                ? `${rel.supervisor.first_name[0]}${rel.supervisor.last_name[0]}`.toUpperCase()
                : "??"
              return (
                <div key={rel.id} className="bg-white rounded-xl border border-[#E8E6F4] p-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-violet-700">{ini}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-900">{name}</p>
                        {rel.is_primary && (
                          <span className="text-[10px] font-semibold bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full">Primary</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400">{cert} · Supervisor</p>
                      {rel.supervisor?.email && (
                        <p className="text-xs text-zinc-400">{rel.supervisor.email}</p>
                      )}
                      {rel.start_date && (
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Since {new Date(rel.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </p>
                      )}
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  </div>
                  <button
                    onClick={() => handleEndRelationship(rel)}
                    disabled={acting === rel.id}
                    className="mt-4 w-full text-xs font-semibold text-zinc-400 hover:text-red-500 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60"
                  >
                    {acting === rel.id ? "Ending…" : "End this relationship"}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {active.length === 0 && pending.length === 0 && (
        <div className="py-16 text-center bg-white rounded-xl border border-[#E8E6F4]">
          <User className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-700 mb-1">No supervisor yet</p>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto">
            Ask your supervisor to send you an invitation using your account email address.
          </p>
        </div>
      )}
    </div>
  )
}
