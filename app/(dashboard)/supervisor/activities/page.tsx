"use client"

import { useEffect, useState } from "react"
import { Activity } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { ActivityLog } from "@/components/activity/ActivityLog"
import { UnlockRequestsList } from "@/components/unlock/UnlockRequestsList"

type Supervisee = { id: string; first_name: string; last_name: string }

// Supervisor view of supervisees' logged activities by week or month, incl. after approval
export default function SupervisorActivitiesPage() {
  const [supervisees, setSupervisees] = useState<Supervisee[]>([])
  const [traineeId, setTraineeId] = useState("")
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: rels } = await supabase
        .from("supervisor_relationships")
        .select("trainee_id")
        .eq("supervisor_id", user.id)
        .eq("status", "active")
      const ids = ((rels ?? []) as { trainee_id: string }[]).map(r => r.trainee_id)
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, first_name, last_name").in("id", ids).order("first_name")
        const list = (profiles ?? []) as Supervisee[]
        setSupervisees(list)
        setTraineeId(list[0]?.id ?? "")
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="p-4 md:p-7 flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-4 md:p-7 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Activities</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Review supervisees&apos; logged hours by week or month — including after approval</p>
      </div>

      {supervisees.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E8E6F4] py-16 text-center">
          <Activity className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-700">No active supervisees</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-[#E8E6F4] p-4 mb-5">
            <label className="block text-xs font-semibold text-zinc-500 mb-1">Candidate</label>
            <select
              value={traineeId}
              onChange={(e) => setTraineeId(e.target.value)}
              className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200"
            >
              {supervisees.map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
            </select>
          </div>
          <UnlockRequestsList key={`req-${traineeId}`} traineeId={traineeId} onChange={() => setReloadKey(k => k + 1)} />
          <ActivityLog key={`${traineeId}-${reloadKey}`} traineeId={traineeId} canUnlock />
        </>
      )}
    </div>
  )
}
