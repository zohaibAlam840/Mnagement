"use client"

import { useState, useEffect } from "react"
import { Check, X, User, CheckCircle2, Clock, AlertTriangle, UserPlus, Mail, Star, Loader2 } from "lucide-react"
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

  // Invite a supervisor
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

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

  const handleInvite = async () => {
    const email = inviteEmail.trim().toLowerCase()
    if (!email) return
    setInviting(true)
    setInviteMsg(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setInviting(false); return }

    // Look up supervisor by email via SECURITY DEFINER RPC (bypasses RLS so we can
    // find accounts we aren't yet linked to)
    const { data: lookupRows } = await (supabase as any)
      .rpc("lookup_profile_by_email", { p_email: email })
    const supProfile = (lookupRows && lookupRows[0]) as { id: string; role: string } | undefined

    if (!supProfile) {
      setInviteMsg({ type: "error", text: "No account found with that email address. The supervisor must sign up first." })
      setInviting(false)
      return
    }
    if (supProfile.role !== "supervisor") {
      setInviteMsg({ type: "error", text: "That account is not a supervisor." })
      setInviting(false)
      return
    }
    if (supProfile.id === user.id) {
      setInviteMsg({ type: "error", text: "You can't add yourself." })
      setInviting(false)
      return
    }

    // Check if a relationship already exists
    const { data: existing } = await supabase
      .from("supervisor_relationships")
      .select("id, status")
      .eq("supervisor_id", supProfile.id)
      .eq("trainee_id", user.id)
      .maybeSingle()

    if (existing) {
      setInviteMsg({ type: "error", text: `A relationship with this supervisor already exists (${existing.status}).` })
      setInviting(false)
      return
    }

    // First supervisor becomes primary by default
    const { data: existingPrimary } = await supabase
      .from("supervisor_relationships")
      .select("id")
      .eq("trainee_id", user.id)
      .eq("is_primary", true)
      .eq("status", "active")
      .maybeSingle()

    const { error } = await supabase.from("supervisor_relationships").insert({
      supervisor_id: supProfile.id,
      trainee_id: user.id,
      is_primary: !existingPrimary,
      status: "pending",
      start_date: null,
      end_date: null,
    })

    if (error) {
      setInviteMsg({ type: "error", text: error.message })
      setInviting(false)
      return
    }

    // Notify the supervisor
    await supabase.from("notifications").insert({
      user_id: supProfile.id,
      type: "trainee_invite",
      title: "Supervision request",
      body: "A trainee has requested you as their supervisor. Accept it from your Supervisees page.",
      read: false,
      related_id: user.id,
    })

    setInviteMsg({ type: "success", text: `Request sent to ${email}. They'll need to accept it.` })
    setInviteEmail("")
    setInviting(false)
    load()
  }

  const handleSetPrimary = async (rel: RelWithProfile) => {
    setActing(rel.id)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setActing(null); return }

    // Clear existing primary, then set this one
    await supabase
      .from("supervisor_relationships")
      .update({ is_primary: false })
      .eq("trainee_id", user.id)
      .eq("is_primary", true)

    await supabase
      .from("supervisor_relationships")
      .update({ is_primary: true })
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">My Supervisors</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Add, switch, and manage your supervision relationships</p>
        </div>
        <button
          onClick={() => { setShowInvite(!showInvite); setInviteMsg(null) }}
          className="flex items-center gap-1.5 text-sm font-semibold bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Supervisor</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="bg-white rounded-xl border border-violet-200 p-5 mb-5">
          <p className="text-sm font-semibold text-zinc-900 mb-1">Add a supervisor by email</p>
          <p className="text-xs text-zinc-400 mb-3">
            Supervisors can change between jobs, and you may have more than one at the same company. Add as many as you need.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                placeholder="supervisor@example.com"
                type="email"
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
              />
            </div>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="px-4 py-2.5 text-sm font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-60 whitespace-nowrap"
            >
              {inviting ? "Sending…" : "Send request"}
            </button>
          </div>
          {inviteMsg && (
            <p className={cn("text-xs mt-2", inviteMsg.type === "success" ? "text-emerald-600" : "text-red-500")}>
              {inviteMsg.type === "success" ? "✓ " : "✗ "}{inviteMsg.text}
            </p>
          )}
          <p className="text-xs text-zinc-400 mt-2">The supervisor must already have an ABA Fieldwork Pro account. They&apos;ll accept from their Supervisees page.</p>
        </div>
      )}

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
                  <div className="mt-4 flex items-center gap-2">
                    {!rel.is_primary && (
                      <button
                        onClick={() => handleSetPrimary(rel)}
                        disabled={acting === rel.id}
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-violet-600 border border-violet-200 py-2 rounded-lg hover:bg-violet-50 transition-colors disabled:opacity-60"
                      >
                        {acting === rel.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className="w-3.5 h-3.5" />}
                        Set as primary
                      </button>
                    )}
                    <button
                      onClick={() => handleEndRelationship(rel)}
                      disabled={acting === rel.id}
                      className={cn(
                        "text-xs font-semibold text-zinc-400 hover:text-red-500 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-60",
                        rel.is_primary ? "w-full" : "px-3"
                      )}
                    >
                      {acting === rel.id ? "Ending…" : "End"}
                    </button>
                  </div>
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
          <p className="text-xs text-zinc-400 leading-relaxed max-w-xs mx-auto mb-4">
            Add your supervisor by email, or ask them to invite you using your account email address.
          </p>
          <button
            onClick={() => { setShowInvite(true); setInviteMsg(null) }}
            className="text-sm font-semibold text-violet-600 hover:text-violet-700"
          >
            + Add your first supervisor
          </button>
        </div>
      )}
    </div>
  )
}
