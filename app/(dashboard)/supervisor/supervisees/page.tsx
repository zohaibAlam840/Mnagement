"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { ChevronRight, AlertTriangle, CheckCircle2, Plus, Mail, X, UserPlus, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type TraineeProfile = Database["public"]["Tables"]["trainee_profiles"]["Row"]
type Relationship = Database["public"]["Tables"]["supervisor_relationships"]["Row"]

type SuperviseeData = {
  relationship: Relationship
  profile: Profile
  traineeProfile: TraineeProfile | null
  totalHours: number
  restrictedHours: number
  supervisionHours: number
  monthlyHours: number
  pendingApprovals: number
  complianceStatus: "compliant" | "warning" | "critical"
}

function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase()
}

function complianceLabel(data: SuperviseeData): "compliant" | "warning" | "critical" {
  const { totalHours, restrictedHours, supervisionHours, traineeProfile } = data
  if (totalHours === 0) return "compliant"
  const restrictedPct = (restrictedHours / totalHours) * 100
  const supervisionPct = (supervisionHours / totalHours) * 100
  const minSupervision = traineeProfile?.fieldwork_type === "concentrated" &&
    traineeProfile?.requirements_year !== "2022" ? 7.5 : 5
  if (restrictedPct > 50) return "critical"
  if (restrictedPct > 46 || supervisionPct < minSupervision) return "warning"
  return "compliant"
}

export default function SuperviseesPage() {
  const [supervisees, setSupervisees] = useState<SuperviseeData[]>([])
  const [pending, setPending] = useState<(Relationship & { trainee: Profile | null })[]>([])
  const [loading, setLoading] = useState(true)

  // Invite form
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviting, setInviting] = useState(false)
  const [inviteMsg, setInviteMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Active supervisees
    const { data: activeRels } = await supabase
      .from("supervisor_relationships")
      .select("*")
      .eq("supervisor_id", user.id)
      .eq("status", "active")

    // Pending outgoing invites
    const { data: pendingRels } = await supabase
      .from("supervisor_relationships")
      .select("*")
      .eq("supervisor_id", user.id)
      .eq("status", "pending")

    const allRels = [...(activeRels ?? []), ...(pendingRels ?? [])]
    const traineeIds = allRels.map(r => r.trainee_id)

    let profiles: Profile[] = []
    let traineeProfiles: TraineeProfile[] = []
    let activities: { trainee_id: string; category: string; duration_minutes: number; date: string }[] = []
    let pendingReviews: { trainee_id: string }[] = []

    if (traineeIds.length > 0) {
      const thisMonth = new Date()
      thisMonth.setDate(1)
      const monthStart = thisMonth.toISOString().split("T")[0]

      const [p, tp, acts, reviews] = await Promise.all([
        supabase.from("profiles").select("*").in("id", traineeIds),
        supabase.from("trainee_profiles").select("*").in("id", traineeIds),
        supabase.from("activities").select("trainee_id, category, duration_minutes, date").in("trainee_id", traineeIds),
        supabase.from("weekly_reviews").select("trainee_id").eq("supervisor_id", user.id).eq("status", "submitted"),
      ])
      profiles = p.data ?? []
      traineeProfiles = tp.data ?? []
      activities = acts.data ?? []
      pendingReviews = reviews.data ?? []
    }

    const profileMap = Object.fromEntries(profiles.map(p => [p.id, p]))
    const traineeProfileMap = Object.fromEntries(traineeProfiles.map(t => [t.id, t]))

    // Build supervisee data
    const superviseeData: SuperviseeData[] = (activeRels ?? []).map(rel => {
      const profile = profileMap[rel.trainee_id]
      const traineeProfile = traineeProfileMap[rel.trainee_id] ?? null
      const myActs = activities.filter(a => a.trainee_id === rel.trainee_id)
      const totalHours = myActs.reduce((s, a) => s + a.duration_minutes, 0) / 60
      const restrictedHours = myActs.filter(a => a.category === "Restricted").reduce((s, a) => s + a.duration_minutes, 0) / 60
      const supervisionHours = myActs.filter(a => a.category === "Supervision").reduce((s, a) => s + a.duration_minutes, 0) / 60
      const today = new Date()
      const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
      const monthlyHours = myActs.filter(a => a.date >= monthStart).reduce((s, a) => s + a.duration_minutes, 0) / 60
      const pendingApprovals = pendingReviews.filter(r => r.trainee_id === rel.trainee_id).length
      const partial: SuperviseeData = { relationship: rel, profile, traineeProfile, totalHours, restrictedHours, supervisionHours, monthlyHours, pendingApprovals, complianceStatus: "compliant" }
      partial.complianceStatus = complianceLabel(partial)
      return partial
    })

    // Pending invites with profile
    const pendingWithProfile = (pendingRels ?? []).map(rel => ({
      ...rel,
      trainee: profileMap[rel.trainee_id] ?? null,
    }))

    setSupervisees(superviseeData)
    setPending(pendingWithProfile)
    setLoading(false)
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setInviteMsg(null)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Look up trainee by email
    const { data: traineeProfile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("email", inviteEmail.trim().toLowerCase())
      .single()

    if (!traineeProfile) {
      setInviteMsg({ type: "error", text: "No account found with that email address." })
      setInviting(false)
      return
    }
    if (traineeProfile.role !== "trainee") {
      setInviteMsg({ type: "error", text: "That account is not a trainee." })
      setInviting(false)
      return
    }

    // Check if relationship already exists
    const { data: existing } = await supabase
      .from("supervisor_relationships")
      .select("id, status")
      .eq("supervisor_id", user.id)
      .eq("trainee_id", traineeProfile.id)
      .maybeSingle()

    if (existing) {
      setInviteMsg({ type: "error", text: `Relationship already exists (${existing.status}).` })
      setInviting(false)
      return
    }

    // Check if trainee already has a primary supervisor
    const { data: existingPrimary } = await supabase
      .from("supervisor_relationships")
      .select("id")
      .eq("trainee_id", traineeProfile.id)
      .eq("is_primary", true)
      .eq("status", "active")
      .maybeSingle()

    const { error } = await supabase.from("supervisor_relationships").insert({
      supervisor_id: user.id,
      trainee_id: traineeProfile.id,
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

    // Notify trainee
    await supabase.from("notifications").insert({
      user_id: traineeProfile.id,
      type: "supervisor_invite",
      title: "Supervision invitation",
      body: "A supervisor has invited you to connect. Check your supervisor settings to accept.",
      read: false,
      related_id: user.id,
    })

    setInviteMsg({ type: "success", text: `Invitation sent to ${inviteEmail.trim()}` })
    setInviteEmail("")
    setInviting(false)
    load()
  }

  const handleCancelInvite = async (relId: string) => {
    const supabase = createClient()
    await supabase.from("supervisor_relationships").delete().eq("id", relId)
    setPending(prev => prev.filter(r => r.id !== relId))
  }

  const handleAcceptPending = async (rel: (typeof pending)[0]) => {
    const supabase = createClient()
    await supabase
      .from("supervisor_relationships")
      .update({ status: "active", start_date: new Date().toISOString().split("T")[0] })
      .eq("id", rel.id)

    if (rel.trainee_id) {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from("notifications").insert({
        user_id: rel.trainee_id,
        type: "invite_accepted",
        title: "Supervisor approved your connection",
        body: "Your supervisor has accepted your connection request. You're now connected!",
        read: false,
        related_id: user?.id ?? null,
      })
    }

    load()
  }

  if (loading) {
    return (
      <div className="p-4 md:p-7 max-w-4xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-7 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Supervisees</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            {supervisees.length} active {supervisees.length === 1 ? "trainee" : "trainees"} under your supervision
          </p>
        </div>
        <button
          onClick={() => { setShowInvite(!showInvite); setInviteMsg(null) }}
          className="flex items-center gap-1.5 text-sm font-semibold bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Invite Trainee</span>
          <span className="sm:hidden">Invite</span>
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="bg-white rounded-xl border border-violet-200 p-5 mb-5">
          <p className="text-sm font-semibold text-zinc-900 mb-3">Invite a trainee by email</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                placeholder="trainee@example.com"
                type="email"
                className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
              />
            </div>
            <button
              onClick={handleInvite}
              disabled={inviting || !inviteEmail.trim()}
              className="px-4 py-2.5 text-sm font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-60"
            >
              {inviting ? "Sending…" : "Send invite"}
            </button>
          </div>
          {inviteMsg && (
            <p className={cn("text-xs mt-2", inviteMsg.type === "success" ? "text-emerald-600" : "text-red-500")}>
              {inviteMsg.type === "success" ? "✓ " : "✗ "}{inviteMsg.text}
            </p>
          )}
          <p className="text-xs text-zinc-400 mt-2">The trainee must already have an ABA Fieldwork Pro account.</p>
        </div>
      )}

      {/* Pending invitations */}
      {pending.length > 0 && (
        <div className="mb-5">
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Pending Invitations</p>
          <div className="space-y-2">
            {pending.map((rel) => (
              <div key={rel.id} className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-800">
                    {rel.trainee ? `${rel.trainee.first_name} ${rel.trainee.last_name}` : "Trainee"}
                  </p>
                  <p className="text-xs text-zinc-400">Pending connection</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCancelInvite(rel.id)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-zinc-200 text-zinc-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                    title="Decline"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleAcceptPending(rel)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                    title="Accept"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active supervisees */}
      {supervisees.length === 0 && pending.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-[#E8E6F4]">
          <UserPlus className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-700 mb-1">No supervisees yet</p>
          <p className="text-xs text-zinc-400 mb-4">Invite trainees to get started</p>
          <button onClick={() => setShowInvite(true)} className="text-sm font-semibold text-violet-600 hover:text-violet-700">
            + Invite first trainee
          </button>
        </div>
      ) : supervisees.length === 0 ? null : (
        <div className="space-y-3">
          {supervisees.map((s) => {
            const name = s.profile ? `${s.profile.first_name} ${s.profile.last_name}` : "Unknown"
            const ini = s.profile ? initials(s.profile.first_name, s.profile.last_name) : "??"
            const targetH = s.traineeProfile?.target_hours ?? 1500
            const restrictedPct = s.totalHours > 0 ? (s.restrictedHours / s.totalHours) * 100 : 0
            const supervisionPct = s.totalHours > 0 ? (s.supervisionHours / s.totalHours) * 100 : 0
            const minSup = s.traineeProfile?.fieldwork_type === "concentrated" &&
              s.traineeProfile?.requirements_year !== "2022" ? 7.5 : 5

            return (
              <Link
                key={s.relationship.id}
                href={`/supervisor/supervisees/${s.relationship.trainee_id}`}
                className="block bg-white rounded-xl border border-[#E8E6F4] p-5 hover:border-violet-200 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-violet-700">{ini}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-900">{name}</p>
                        {s.pendingApprovals > 0 && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                            {s.pendingApprovals} pending
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-[11px] font-semibold px-2.5 py-1 rounded-lg",
                          s.complianceStatus === "compliant" ? "bg-emerald-50 text-emerald-700" :
                          s.complianceStatus === "warning" ? "bg-amber-50 text-amber-700" :
                          "bg-red-50 text-red-700"
                        )}>
                          {s.complianceStatus === "compliant" && <CheckCircle2 className="w-3 h-3 inline mr-1" />}
                          {s.complianceStatus === "warning" && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                          {s.complianceStatus}
                        </span>
                        <ChevronRight className="w-4 h-4 text-zinc-300" />
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 mb-3">
                      {s.traineeProfile?.certification_target ?? "BCBA"} · {s.traineeProfile?.fieldwork_type ?? "supervised"} fieldwork
                    </p>

                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-zinc-500">Toward certification</span>
                        <span className="text-[11px] font-semibold text-zinc-700">
                          {s.totalHours.toFixed(1)} / {targetH}h
                        </span>
                      </div>
                      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min((s.totalHours / targetH) * 100, 100)}%` }} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Restricted", value: `${restrictedPct.toFixed(1)}%`, warn: restrictedPct > 46 },
                        { label: "Supervision", value: `${supervisionPct.toFixed(1)}%`, warn: supervisionPct < minSup && s.totalHours > 0 },
                        { label: "This month", value: `${s.monthlyHours.toFixed(1)}h`, warn: false },
                      ].map((m) => (
                        <div key={m.label} className={cn("text-center py-1.5 px-2 rounded-lg", m.warn ? "bg-amber-50" : "bg-zinc-50")}>
                          <p className={cn("text-sm font-bold", m.warn ? "text-amber-600" : "text-zinc-800")}>{m.value}</p>
                          <p className="text-[10px] text-zinc-400">{m.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
