"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { CheckCircle2, AlertTriangle, FileSignature, Clock, BarChart3, Download, Loader2, Lock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"

type MonthlySummary = Database["public"]["Tables"]["monthly_summaries"]["Row"]
type Profile = Database["public"]["Tables"]["profiles"]["Row"]
type EnrichedSummary = MonthlySummary & { trainee: Profile | null }

type Supervisee = {
  trainee_id: string
  profile: Profile
}

function formatMonth(m: string) {
  const [year, month] = m.split("-")
  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  })
}

function getComplianceStatus(s: MonthlySummary): "compliant" | "warning" | "critical" {
  const restrictedPct = s.total_hours > 0 ? (s.restricted_hours / s.total_hours) * 100 : 0
  if (restrictedPct > 50 || s.supervision_pct_met === false) return "critical"
  if (restrictedPct > 46 || s.within_monthly_cap === false) return "warning"
  return "compliant"
}

function getLast12Months(): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const value = `${year}-${month}`
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    options.push({ value, label })
  }
  return options
}

export default function SignOffPage() {
  const [summaries, setSummaries] = useState<EnrichedSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string>("")
  const [signing, setSigning] = useState(false)
  const [supervisorName, setSupervisorName] = useState("")
  const [supervisorId, setSupervisorId] = useState<string>("")

  // Generate form state
  const [supervisees, setSupervisees] = useState<Supervisee[]>([])
  const [genTraineeId, setGenTraineeId] = useState<string>("")
  const [genMonth, setGenMonth] = useState<string>("")
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string>("")
  const [genSuccess, setGenSuccess] = useState<string>("")

  const monthOptions = getLast12Months()

  // Check if the currently selected trainee+month combination is already signed (locked)
  // s.month comes back from Postgres as a full date ("YYYY-MM-DD"); genMonth is "YYYY-MM".
  const lockedRecord = useMemo(() => {
    if (!genTraineeId || !genMonth) return null
    return summaries.find(
      s => s.trainee_id === genTraineeId && s.month.slice(0, 7) === genMonth && !!s.supervisor_signed_at
    ) ?? null
  }, [summaries, genTraineeId, genMonth])

  const loadSummaries = useCallback(async (uid: string, profileMap?: Record<string, Profile>) => {
    const supabase = createClient()
    const { data: sumsRaw } = await supabase
      .from("monthly_summaries")
      .select("*")
      .eq("supervisor_id", uid)
      .order("month", { ascending: false })
    const sums = (sumsRaw ?? []) as MonthlySummary[]

    if (sums.length === 0) {
      setSummaries([])
      return
    }

    let pMap = profileMap
    if (!pMap) {
      const traineeIds = [...new Set(sums.map((s) => s.trainee_id))]
      const { data: profilesRaw } = await supabase.from("profiles").select("*").in("id", traineeIds)
      const profiles = (profilesRaw ?? []) as Profile[]
      pMap = Object.fromEntries(profiles.map((p) => [p.id, p]))
    }

    const enriched: EnrichedSummary[] = sums.map((s) => ({ ...s, trainee: pMap![s.trainee_id] ?? null }))
    setSummaries(enriched)
    if (enriched.length > 0 && !selectedId) setSelectedId(enriched[0].id)
  }, [selectedId])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      setSupervisorId(user.id)

      const { data: profRaw } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .single()
      const prof = profRaw as { first_name: string; last_name: string } | null
      if (prof) setSupervisorName(`${prof.first_name} ${prof.last_name}`)

      // Load active supervisees
      const { data: relsRaw } = await (supabase as any)
        .from("supervisor_relationships")
        .select("trainee_id")
        .eq("supervisor_id", user.id)
        .eq("status", "active")
      const rels = (relsRaw ?? []) as { trainee_id: string }[]

      if (rels.length > 0) {
        const ids = rels.map((r) => r.trainee_id)
        const { data: profilesRaw } = await supabase.from("profiles").select("*").in("id", ids)
        const profiles = (profilesRaw ?? []) as Profile[]
        const profileMap = Object.fromEntries(profiles.map((p) => [p.id, p]))
        const sv: Supervisee[] = rels
          .filter((r) => profileMap[r.trainee_id])
          .map((r) => ({ trainee_id: r.trainee_id, profile: profileMap[r.trainee_id] }))
        setSupervisees(sv)
        if (sv.length > 0) setGenTraineeId(sv[0].trainee_id)

        await loadSummaries(user.id, profileMap)
      } else {
        await loadSummaries(user.id)
      }

      if (monthOptions.length > 0) setGenMonth(monthOptions[0].value)
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGenerate = async () => {
    setGenError("")
    setGenSuccess("")
    if (!genTraineeId || !genMonth) {
      setGenError("Please select a trainee and month.")
      return
    }
    if (lockedRecord) {
      setGenError("This Monthly Supervisory Period is locked — it has already been signed. Undo the signature first to regenerate.")
      return
    }
    setGenerating(true)
    try {
      const supabase = createClient()

      // Parse month
      const [yearStr, monthStr] = genMonth.split("-")
      const year = parseInt(yearStr)
      const month = parseInt(monthStr)
      const monthStart = `${genMonth}-01`
      const nextMonthDate = new Date(year, month, 1) // month is 0-based in Date, but here month=parseInt(monthStr) which is 1-based, so this gives us month+1 correctly
      const nextMonthStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-01`

      // Fetch activities
      const { data: actsRaw, error: actsErr } = await (supabase as any)
        .from("activities")
        .select("duration_minutes, category, observation_with_client, observation_duration_minutes, session_type")
        .eq("trainee_id", genTraineeId)
        .gte("date", monthStart)
        .lt("date", nextMonthStr)
        .neq("status", "draft")

      if (actsErr) throw new Error(actsErr.message)
      const acts = (actsRaw ?? []) as {
        duration_minutes: number
        category: string
        observation_with_client: boolean
        observation_duration_minutes: number
        session_type: "individual" | "group" | null
      }[]

      // Aggregate
      const totalMins = acts.reduce((a, c) => a + (c.duration_minutes ?? 0), 0)
      const restrictedMins = acts.filter((a) => a.category === "Restricted").reduce((a, c) => a + (c.duration_minutes ?? 0), 0)
      const unrestrictedMins = acts.filter((a) => a.category === "Unrestricted").reduce((a, c) => a + (c.duration_minutes ?? 0), 0)
      const supervisionActs = acts.filter((a) => a.category === "Supervision")
      const supervisionMins = supervisionActs.reduce((a, c) => a + (c.duration_minutes ?? 0), 0)

      // Split supervision by session_type
      const individualSupMins = supervisionActs
        .filter((a) => a.session_type === "individual" || a.session_type === null)
        .reduce((a, c) => a + (c.duration_minutes ?? 0), 0)
      const groupSupMins = supervisionActs
        .filter((a) => a.session_type === "group")
        .reduce((a, c) => a + (c.duration_minutes ?? 0), 0)

      const totalH = totalMins / 60
      const restrictedH = restrictedMins / 60
      const unrestrictedH = unrestrictedMins / 60
      const supervisionH = supervisionMins / 60
      const individualSupH = individualSupMins / 60
      const groupSupH = groupSupMins / 60

      const obsActs = acts.filter((a) => a.observation_with_client === true)
      const obsCount = obsActs.length
      const obsMins = obsActs.reduce((a, c) => a + (c.observation_duration_minutes ?? 0), 0)

      // Trainee profile
      const { data: tpRaw } = await (supabase as any)
        .from("trainee_profiles")
        .select("fieldwork_type, requirements_year")
        .eq("id", genTraineeId)
        .single()
      const tp = tpRaw as { fieldwork_type: string; requirements_year: string } | null

      const fieldworkType = tp?.fieldwork_type ?? "supervised"
      const reqYear = tp?.requirements_year ?? "2022"

      const supPct = totalH > 0 ? (supervisionH / totalH) * 100 : 0
      const groupSupPct = supervisionH > 0 ? (groupSupH / supervisionH) * 100 : 0
      const minSupPct = fieldworkType === "concentrated" ? 7.5 : 5
      const monthlyCapHours = reqYear === "2027" ? 160 : 130
      const within_monthly_cap = totalH <= monthlyCapHours
      // Supervision met = minimum % AND group not exceeding 50% of supervision
      const supervision_pct_met = supPct >= minSupPct && groupSupPct <= 50
      const minObsDuration = fieldworkType === "concentrated" ? 90 : 60
      const observation_requirement_met = reqYear === "2022" ? obsCount >= 1 : obsMins >= minObsDuration

      // Upsert
      const payload = {
        trainee_id: genTraineeId,
        supervisor_id: supervisorId,
        month: monthStart,
        fieldwork_type: fieldworkType,
        requirements_year: reqYear,
        total_hours: totalH,
        restricted_hours: restrictedH,
        unrestricted_hours: unrestrictedH,
        supervision_hours_individual: individualSupH,
        supervision_hours_group: groupSupH,
        observations_count: obsCount,
        observations_duration_minutes: obsMins,
        within_monthly_cap,
        supervision_pct_met,
        observation_requirement_met,
        status: "pending",
      }

      // Check if already exists — and block if signed (locked)
      const { data: existing } = await (supabase as any)
        .from("monthly_summaries")
        .select("id, supervisor_signed_at")
        .eq("trainee_id", genTraineeId)
        .eq("supervisor_id", supervisorId)
        .eq("month", monthStart)
        .maybeSingle()

      if (existing?.supervisor_signed_at) {
        throw new Error("This Monthly Supervisory Period is locked (already signed). Undo the signature before regenerating.")
      }

      if (existing?.id) {
        const { error: upErr } = await (supabase as any)
          .from("monthly_summaries")
          .update(payload)
          .eq("id", existing.id)
        if (upErr) throw new Error(upErr.message)
      } else {
        const { error: insErr } = await (supabase as any)
          .from("monthly_summaries")
          .insert(payload)
        if (insErr) throw new Error(insErr.message)
      }

      setGenSuccess(`Report generated for ${formatMonth(genMonth)}.`)
      await loadSummaries(supervisorId)
    } catch (e: any) {
      setGenError(e.message ?? "Failed to generate report.")
    } finally {
      setGenerating(false)
    }
  }

  const handleSign = async () => {
    const sel = summaries.find((s) => s.id === selectedId)
    if (!sel) return
    setSigning(true)
    const supabase = createClient()
    const now = new Date().toISOString()
    await (supabase as any).from("monthly_summaries").update({ supervisor_signed_at: now }).eq("id", sel.id)
    setSummaries((prev) => prev.map((s) => (s.id === selectedId ? { ...s, supervisor_signed_at: now } : s)))
    setSigning(false)
  }

  const handleUnsign = async () => {
    const sel = summaries.find((s) => s.id === selectedId)
    if (!sel) return
    const supabase = createClient()
    await (supabase as any).from("monthly_summaries").update({ supervisor_signed_at: null }).eq("id", sel.id)
    setSummaries((prev) => prev.map((s) => (s.id === selectedId ? { ...s, supervisor_signed_at: null } : s)))
  }

  if (loading) {
    return (
      <div className="p-4 md:p-7 max-w-4xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  const selected = summaries.find((s) => s.id === selectedId)

  return (
    <div className="p-4 md:p-7 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Monthly Supervisory Period Sign-Off</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Review and sign each trainee&apos;s Monthly Supervisory Period (MSP) to confirm BACB compliance</p>
      </div>

      {/* Generate Monthly Report card */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-violet-600" />
          <p className="text-sm font-bold text-zinc-800">Generate Monthly Report</p>
        </div>

        {supervisees.length === 0 ? (
          <p className="text-sm text-zinc-400">No active supervisees found. Reports can only be generated for active supervisory relationships.</p>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            {/* Trainee selector */}
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-semibold text-zinc-500 mb-1">Trainee</label>
              <select
                value={genTraineeId}
                onChange={(e) => setGenTraineeId(e.target.value)}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
              >
                <option value="">Select trainee…</option>
                {supervisees.map((sv) => (
                  <option key={sv.trainee_id} value={sv.trainee_id}>
                    {sv.profile.first_name} {sv.profile.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Month selector */}
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-semibold text-zinc-500 mb-1">Month</label>
              <select
                value={genMonth}
                onChange={(e) => setGenMonth(e.target.value)}
                className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm text-zinc-900 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
              >
                <option value="">Select month…</option>
                {monthOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Generate button — locked if already signed */}
            {lockedRecord ? (
              <div className="flex items-center gap-2 bg-zinc-100 text-zinc-500 font-semibold px-5 py-2 rounded-xl text-sm whitespace-nowrap flex-shrink-0 cursor-not-allowed">
                <Lock className="w-4 h-4" />
                MSP Locked
              </div>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={generating || !genTraineeId || !genMonth}
                className="flex items-center gap-2 bg-violet-600 text-white font-semibold px-5 py-2 rounded-xl text-sm hover:bg-violet-700 transition-colors disabled:opacity-60 whitespace-nowrap flex-shrink-0"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Generating…</>
                ) : (
                  <><BarChart3 className="w-4 h-4" />Generate</>
                )}
              </button>
            )}
          </div>
        )}

        {lockedRecord && (
          <div className="mt-3 flex items-center gap-2 text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm">
            <Lock className="w-4 h-4 flex-shrink-0 text-zinc-500" />
            <span>
              This MSP was signed on {new Date(lockedRecord.supervisor_signed_at!).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} and is locked.
              Use <strong>Undo</strong> on the report to unsign before regenerating.
            </span>
          </div>
        )}
        {genError && (
          <div className="mt-3 flex items-center gap-2 text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {genError}
          </div>
        )}
        {genSuccess && (
          <div className="mt-3 flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 text-sm">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            {genSuccess}
          </div>
        )}
      </div>

      {summaries.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E8E6F4] py-16 text-center">
          <FileSignature className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-zinc-700 mb-1">No reports pending sign-off</p>
          <p className="text-xs text-zinc-400">Use the form above to generate a monthly report.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-5">
          {/* Trainee/month selector list */}
          <div className="bg-white rounded-xl border border-[#E8E6F4] p-4">
            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Reports</p>
            <div className="space-y-2">
              {summaries.map((s) => {
                const ini = s.trainee
                  ? `${s.trainee.first_name[0]}${s.trainee.last_name[0]}`.toUpperCase()
                  : "??"
                const traineeName = s.trainee ? `${s.trainee.first_name} ${s.trainee.last_name}` : "Trainee"
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedId(s.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                      selectedId === s.id ? "bg-violet-50 border border-violet-100" : "hover:bg-zinc-50"
                    )}
                  >
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-violet-700">{ini}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-semibold truncate", selectedId === s.id ? "text-violet-800" : "text-zinc-900")}>
                        {traineeName.split(" ")[0]}
                      </p>
                      <p className="text-[10px] text-zinc-400">{formatMonth(s.month)}</p>
                    </div>
                    {s.supervisor_signed_at
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      : <div className="w-4 h-4 rounded-full border-2 border-zinc-200 flex-shrink-0" />
                    }
                  </button>
                )
              })}
            </div>
          </div>

          {/* Report detail */}
          {selected && (() => {
            const traineeName = selected.trainee ? `${selected.trainee.first_name} ${selected.trainee.last_name}` : "Trainee"
            const supervisionH = selected.supervision_hours_individual + selected.supervision_hours_group
            const restrictedPct = selected.total_hours > 0 ? (selected.restricted_hours / selected.total_hours) * 100 : 0
            const supervisionPct = selected.total_hours > 0 ? (supervisionH / selected.total_hours) * 100 : 0
            const minSup = selected.fieldwork_type === "concentrated"
              ? (selected.requirements_year === "2022" ? 10 : 7.5)
              : 5
            const status = getComplianceStatus(selected)
            return (
              <div className="md:col-span-2 space-y-4">
                <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-bold text-zinc-900">{traineeName}</h2>
                      <p className="text-sm text-zinc-500">{formatMonth(selected.month)} · Monthly Supervisory Period (MSP)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => window.print()}
                        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 border border-zinc-200 px-3 py-1.5 rounded-lg hover:bg-zinc-50 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download PDF
                      </button>
                      <span className={cn(
                        "text-xs font-semibold px-2.5 py-1 rounded-lg",
                        status === "compliant" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
                      )}>
                        {status === "compliant"
                          ? <><CheckCircle2 className="w-3 h-3 inline mr-1" />Compliant</>
                          : <><AlertTriangle className="w-3 h-3 inline mr-1" />Warning</>
                        }
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { label: "Total", value: `${selected.total_hours.toFixed(1)}h` },
                      { label: "Restricted", value: `${selected.restricted_hours.toFixed(1)}h` },
                      { label: "Unrestricted", value: `${selected.unrestricted_hours.toFixed(1)}h` },
                      { label: "Supervision", value: `${supervisionH.toFixed(1)}h` },
                    ].map((item) => (
                      <div key={item.label} className="text-center bg-zinc-50 rounded-lg py-2.5">
                        <p className="text-lg font-bold text-zinc-900">{item.value}</p>
                        <p className="text-[10px] text-zinc-400">{item.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Supervision breakdown */}
                  {supervisionH > 0 && (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {[
                        { label: "Individual Supervision", value: `${selected.supervision_hours_individual.toFixed(1)}h` },
                        { label: "Group Supervision", value: `${selected.supervision_hours_group.toFixed(1)}h` },
                      ].map((item) => (
                        <div key={item.label} className="text-center bg-emerald-50 rounded-lg py-2">
                          <p className="text-sm font-bold text-emerald-900">{item.value}</p>
                          <p className="text-[10px] text-emerald-600">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2 mb-4">
                    {(() => {
                      const groupSupPct = supervisionH > 0 ? (selected.supervision_hours_group / supervisionH) * 100 : 0
                      return [
                        { label: `Restricted ≤ 50% (${restrictedPct.toFixed(1)}%)`, pass: restrictedPct <= 50 },
                        { label: `Supervision ≥ ${minSup}% (${supervisionPct.toFixed(1)}%)`, pass: supervisionPct >= minSup },
                        { label: `Group supervision ≤ 50% of supervision (${groupSupPct.toFixed(1)}%)`, pass: groupSupPct <= 50 },
                        { label: "Monthly minimum met", pass: selected.within_monthly_cap !== false },
                      ]
                    })().map((c) => (
                      <div key={c.label} className={cn(
                        "flex items-center gap-2.5 p-2.5 rounded-lg text-sm",
                        c.pass ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
                      )}>
                        {c.pass ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                        {c.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Signature area */}
                <div className={cn(
                  "rounded-xl border p-5",
                  selected.supervisor_signed_at ? "bg-emerald-50 border-emerald-100" : "bg-white border-[#E8E6F4]"
                )}>
                  <div className="flex items-start gap-3 mb-4">
                    <FileSignature className={cn("w-5 h-5 flex-shrink-0 mt-0.5", selected.supervisor_signed_at ? "text-emerald-600" : "text-zinc-400")} />
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">Supervisor Verification</p>
                      <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                        By signing, I confirm that I have reviewed this trainee&apos;s Monthly Supervisory Period (MSP) for {formatMonth(selected.month)}, that all entries are accurate, and that BACB supervision requirements were met. This record will be locked after signing.
                      </p>
                    </div>
                  </div>

                  {selected.supervisor_signed_at ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <div>
                          <p className="text-sm font-semibold text-emerald-800">Signed by {supervisorName}</p>
                          <p className="text-xs text-emerald-600">
                            {new Date(selected.supervisor_signed_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                      <button onClick={handleUnsign} className="text-xs text-zinc-500 hover:text-red-500 transition-colors">
                        Undo
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="h-14 border-2 border-dashed border-zinc-200 rounded-xl flex items-center justify-center text-sm text-zinc-400">
                        Tap to sign electronically
                      </div>
                      <button
                        onClick={handleSign}
                        disabled={signing}
                        className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-colors disabled:opacity-60"
                      >
                        <FileSignature className="w-4 h-4" />
                        {signing ? "Signing…" : "Sign & Approve"}
                      </button>
                    </div>
                  )}

                  {/* Trainee signature status */}
                  <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center gap-2">
                    {selected.trainee_signed_at
                      ? <><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-xs text-zinc-500">Trainee signed on {new Date(selected.trainee_signed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></>
                      : <><Clock className="w-4 h-4 text-zinc-300" /><span className="text-xs text-zinc-400">Awaiting trainee signature</span></>
                    }
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}
