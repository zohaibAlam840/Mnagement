"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { User, Bell, Shield, ChevronRight, Calendar, CheckCircle2, AlertCircle } from "lucide-react"
import { SignOutButton } from "@/components/auth/SignOutButton"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"

type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type TraineeProfile = Database["public"]["Tables"]["trainee_profiles"]["Row"]

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
]

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [traineeProfile, setTraineeProfile] = useState<TraineeProfile | null>(null)
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [timezone, setTimezone] = useState("America/Chicago")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profRaw } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      const prof = profRaw as Profile | null
      if (prof) {
        setProfile(prof)
        setFirstName(prof.first_name)
        setLastName(prof.last_name)
        setTimezone(prof.timezone || "America/Chicago")
      }

      if (prof?.role === "trainee") {
        const { data: tpRaw } = await supabase.from("trainee_profiles").select("*").eq("id", user.id).single()
        if (tpRaw) setTraineeProfile(tpRaw as TraineeProfile)
      }
    }
    load()
  }, [])

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    setError("")
    const supabase = createClient()
    const { error: updateError } = await (supabase as any)
      .from("profiles")
      .update({ first_name: firstName, last_name: lastName, timezone })
      .eq("id", profile.id)
    setSaving(false)
    if (updateError) { setError(updateError.message); return }
    setProfile((prev) => prev ? { ...prev, first_name: firstName, last_name: lastName, timezone } : prev)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const ini = profile ? `${profile.first_name[0] ?? ""}${profile.last_name[0] ?? ""}`.toUpperCase() : "…"
  const displayName = profile ? `${profile.first_name} ${profile.last_name}` : "Loading…"

  return (
    <div className="p-4 md:p-7 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Settings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-violet-600 flex items-center justify-center">
            <span className="text-white text-lg font-bold">{ini}</span>
          </div>
          <div>
            <p className="font-bold text-zinc-900">{displayName}</p>
            <p className="text-sm text-zinc-500 capitalize">{profile?.role ?? "—"}</p>
            <p className="text-xs text-zinc-400 mt-0.5">{profile?.email ?? "…"}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">First name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Last name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Email address</label>
            <input
              type="email"
              value={profile?.email ?? ""}
              readOnly
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-100 bg-zinc-50 text-zinc-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 bg-white"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "flex items-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60",
              saved ? "bg-emerald-600 text-white" : "bg-violet-600 text-white hover:bg-violet-700"
            )}
          >
            {saved ? <><CheckCircle2 className="w-4 h-4" /> Saved!</> : saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {/* BACB Info (trainees only) */}
      {traineeProfile && (
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-5">
          <h3 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-violet-600" />
            BACB Certification Details
          </h3>
          <div className="space-y-3">
            {[
              { label: "Certification target", value: traineeProfile.certification_target },
              { label: "Fieldwork type", value: traineeProfile.fieldwork_type },
              { label: "Requirements year", value: traineeProfile.requirements_year },
              { label: "Target hours", value: `${traineeProfile.target_hours.toLocaleString()} hours` },
              ...(traineeProfile.bacb_id ? [{ label: "BACB ID", value: traineeProfile.bacb_id }] : []),
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-zinc-50 last:border-0">
                <span className="text-sm text-zinc-500">{row.label}</span>
                <span className="text-sm font-semibold text-zinc-900 capitalize">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings list */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] overflow-hidden mb-5">
        {[
          { icon: Bell, label: "Notifications", desc: "Weekly reminders, approval alerts", href: "/settings/notifications" },
          { icon: Calendar, label: "Calendar Sync", desc: "Google Calendar connection", href: "/settings/calendar" },
          { icon: User, label: "Account & Security", desc: "Password, two-factor authentication", href: "/settings/security" },
        ].map((item, i, arr) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 transition-colors ${i < arr.length - 1 ? "border-b border-zinc-50" : ""}`}
          >
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
              <item.icon className="w-4 h-4 text-violet-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-zinc-900">{item.label}</p>
              <p className="text-xs text-zinc-400">{item.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-300" />
          </Link>
        ))}
      </div>

      <SignOutButton className="block w-full py-2.5 text-sm font-semibold text-red-500 border border-red-100 bg-red-50 rounded-xl hover:bg-red-100 transition-colors text-center">
        Sign out
      </SignOutButton>
    </div>
  )
}
