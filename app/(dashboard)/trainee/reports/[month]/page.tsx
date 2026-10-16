"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { ChevronLeft, CheckCircle2, AlertTriangle, Clock, Lock } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import type { Database } from "@/lib/supabase/types"
import {
  computeMetrics, minSupervisionPct, monthlyCapHours, MIN_MONTHLY_HOURS,
  requiredContacts, requiredObservation, supervisionColor, RATIO_COLOR_CLASS,
  GROUP_SUPERVISION_MAX_PCT, type FieldworkType, type RequirementsYear,
} from "@/lib/bacb"
import { MvfPanel } from "@/components/mvf/MvfPanel"
import { ActivityLog } from "@/components/activity/ActivityLog"

type MonthlySummary = Database["public"]["Tables"]["monthly_summaries"]["Row"]
type ContactBreakdown = { individualMeetings: number; groupMeetings: number; obsCount: number; contacts: number }

function formatMonth(m: string) {
  const [year, month] = m.split("-")
  return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

export default function MonthlyReportDetail({ params }: { params: Promise<{ month: string }> }) {
  const { month } = use(params)

  const [summary, setSummary] = useState<MonthlySummary | null>(null)
  const [contacts, setContacts] = useState<ContactBreakdown | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState("")
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // "month" (the route param) is "YYYY-MM"; the DB column is a full date,
      // always stored as the 1st of the month.
      const monthStart = `${month}-01`
      const [y, mo] = month.split("-").map(Number)
      const nextMonth = `${mo === 12 ? y + 1 : y}-${String(mo === 12 ? 1 : mo + 1).padStart(2, "0")}-01`

      const { data: sRaw } = await supabase
        .from("monthly_summaries")
        .select("*")
        .eq("trainee_id", user.id)
        .eq("month", monthStart)
        .order("updated_at", { ascending: false })
        .limit(1)
      setSummary(((sRaw ?? [])[0] as MonthlySummary | undefined) ?? null)

      // Contacts/meeting counts aren't stored on the summary, so compute them
      // live from the month's non-draft activities.
      const { data: actsRaw } = await (supabase as any)
        .from("activities")
        .select("duration_minutes, category, session_type, observation_with_client, observation_duration_minutes")
        .eq("trainee_id", user.id)
        .gte("date", monthStart)
        .lt("date", nextMonth)
        .neq("status", "draft")
      const metrics = computeMetrics(actsRaw ?? [])
      setContacts({
        individualMeetings: metrics.individualMeetings,
        groupMeetings: metrics.groupMeetings,
        obsCount: metrics.obsCount,
        contacts: metrics.contacts,
      })

      setLoading(false)
    }
    load()
  }, [month, reloadKey])

  if (loading) {
    return (
      <div className="p-4 md:p-7 max-w-3xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="w-6 h-6 border-2 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
      </div>
    )
  }

  const extras = userId ? (
    <div className="space-y-5">
      <MvfPanel traineeId={userId} month={month} onChange={() => setReloadKey(k => k + 1)} />
      <ActivityLog traineeId={userId} linkToActivity initialMode="month" initialMonth={month} />
    </div>
  ) : null

  if (!summary) {
    return (
      <div className="p-4 md:p-7 max-w-3xl mx-auto">
        <Link href="/trainee/reports" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5 transition-colors">
          <ChevronLeft className="w-4 h-4" /> MSP Reports
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900 mb-1">{formatMonth(month)}</h1>
        <p className="text-sm text-zinc-500 mb-6">Monthly Supervisory Period (MSP) · BACB Fieldwork Verification</p>
        {extras}
      </div>
    )
  }

  const ft = summary.fieldwork_type as FieldworkType
  const ry = summary.requirements_year as RequirementsYear
  const supervisionH = summary.supervision_hours_individual + summary.supervision_hours_group
  const restrictedPct = summary.total_hours > 0 ? (summary.restricted_hours / summary.total_hours) * 100 : 0
  const supervisionPct = summary.total_hours > 0 ? (supervisionH / summary.total_hours) * 100 : 0
  const groupSupPct = supervisionH > 0 ? (summary.supervision_hours_group / supervisionH) * 100 : 0
  const minSupervision = minSupervisionPct(ft, ry)
  const cap = monthlyCapHours(ry)
  const supColor = supervisionColor(supervisionPct)
  const supCls = RATIO_COLOR_CLASS[supColor]
  const reqObs = requiredObservation(ft, ry)
  const reqContacts = requiredContacts(ft)

  // Supervision is evaluated MONTHLY; group must stay under 50%.
  const supervisionOk = supervisionPct >= minSupervision
  const groupOk = groupSupPct <= GROUP_SUPERVISION_MAX_PCT
  const monthlyCapOk = summary.total_hours <= cap
  const monthlyMinOk = summary.total_hours >= MIN_MONTHLY_HOURS
  const contactsOk = (contacts?.contacts ?? 0) >= reqContacts
  const obsOk = summary.observation_requirement_met !== false
  // Restricted 50% is NOT a monthly compliance failure — it applies over the
  // entire experience, so it's shown for information only.
  const isCompliant = supervisionOk && groupOk && monthlyCapOk

  const isLocked = !!(summary.supervisor_signed_at && summary.trainee_signed_at)

  return (
    <div className="p-4 md:p-7 max-w-3xl mx-auto">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          aside { display: none !important; }
          header { display: none !important; }
          nav { display: none !important; }
          main.dashboard-main { padding-left: 0 !important; }
          body { background: white !important; }
          .print-hide { display: none !important; }
          @page { margin: 1.5cm; }
        }
      ` }} />
      <Link href="/trainee/reports" className="print-hide flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5 transition-colors">
        <ChevronLeft className="w-4 h-4" /> MSP Reports
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">{formatMonth(month)}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Monthly Supervisory Period (MSP) · BACB Fieldwork Verification</p>
        </div>
        <div className="flex items-center gap-2">
          {isLocked && (
            <span className="flex items-center gap-1 text-xs font-semibold text-zinc-600 bg-zinc-100 px-2.5 py-1.5 rounded-lg border border-zinc-200">
              <Lock className="w-3.5 h-3.5" /> MSP Locked
            </span>
          )}
          {isCompliant
            ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100"><CheckCircle2 className="w-3.5 h-3.5" /> Compliant</span>
            : <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100"><AlertTriangle className="w-3.5 h-3.5" /> Warning</span>
          }
        </div>
      </div>

      {/* Hours breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Hours", value: summary.total_hours, color: "text-zinc-900" },
          { label: "Restricted", value: summary.restricted_hours, color: "text-violet-600" },
          { label: "Unrestricted", value: summary.unrestricted_hours, color: "text-blue-600" },
          { label: "Supervision", value: supervisionH, color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-[#E8E6F4] p-4">
            <p className={cn("text-2xl font-bold", s.color)}>{s.value.toFixed(1)}h</p>
            <p className="text-xs text-zinc-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Stacked bar */}
      {summary.total_hours > 0 && (
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-5">
          <h3 className="text-sm font-semibold text-zinc-900 mb-3">Hours Breakdown</h3>
          <div className="flex h-8 rounded-lg overflow-hidden gap-0.5 mb-3">
            <div className="bg-violet-500 flex items-center justify-center" style={{ width: `${(summary.restricted_hours / summary.total_hours) * 100}%` }}>
              {summary.restricted_hours > 0 && <span className="text-[10px] font-bold text-white">{summary.restricted_hours.toFixed(1)}h</span>}
            </div>
            <div className="bg-blue-400 flex items-center justify-center" style={{ width: `${(summary.unrestricted_hours / summary.total_hours) * 100}%` }}>
              {summary.unrestricted_hours > 0 && <span className="text-[10px] font-bold text-white">{summary.unrestricted_hours.toFixed(1)}h</span>}
            </div>
            <div className="bg-emerald-400 flex items-center justify-center" style={{ width: `${(supervisionH / summary.total_hours) * 100}%` }}>
              {supervisionH > 0 && <span className="text-[10px] font-bold text-white">{supervisionH.toFixed(1)}h</span>}
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            {[
              { color: "bg-violet-500", label: "Restricted" },
              { color: "bg-blue-400", label: "Unrestricted" },
              { color: "bg-emerald-400", label: "Supervision" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={cn("w-2.5 h-2.5 rounded-sm", l.color)} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compliance checks (monthly) */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-5">
        <h3 className="text-sm font-semibold text-zinc-900 mb-3">Monthly Compliance Checks</h3>
        <div className="space-y-3">
          {([
            {
              label: `Supervision ≥ ${minSupervision}% of total (monthly)`,
              value: `${supervisionPct.toFixed(1)}%`,
              tone: supervisionPct < 5 ? "fail" : (supervisionOk ? "pass" : "warn"),
              detail: supervisionPct < 5 ? "Critical — below 5% this month" : supervisionOk ? supCls.label : `Below ${minSupervision}% target`,
            },
            {
              label: `Group supervision ≤ ${GROUP_SUPERVISION_MAX_PCT}% of supervision`,
              value: `${groupSupPct.toFixed(1)}%`,
              tone: groupOk ? "pass" : "fail",
              detail: groupOk ? "Within limit" : `Exceeds ${GROUP_SUPERVISION_MAX_PCT}% limit`,
            },
            {
              label: `Contacts ≥ ${reqContacts} this month`,
              value: `${contacts?.contacts ?? 0}`,
              tone: contactsOk ? "pass" : "warn",
              detail: `${contacts?.individualMeetings ?? 0} individual + ${contacts?.groupMeetings ?? 0} group + ${contacts?.obsCount ?? 0} observation`,
            },
            {
              label: reqObs.kind === "count" ? "Client observation (≥ 1/month)" : `Observation duration (≥ ${reqObs.value} min/month)`,
              value: reqObs.kind === "count" ? `${summary.observations_count} contact(s)` : `${summary.observations_duration_minutes} min`,
              tone: obsOk ? "pass" : "warn",
              detail: obsOk ? "Requirement met" : "Below requirement",
            },
            {
              label: `Monthly hours ≥ ${MIN_MONTHLY_HOURS}h and ≤ ${cap}h`,
              value: `${summary.total_hours.toFixed(1)}h`,
              tone: (monthlyMinOk && monthlyCapOk) ? "pass" : "warn",
              detail: !monthlyMinOk ? `Below ${MIN_MONTHLY_HOURS}h minimum` : !monthlyCapOk ? `Exceeds ${cap}h cap` : "Within range",
            },
            {
              label: "Restricted share (tracked over total experience)",
              value: `${restrictedPct.toFixed(1)}%`,
              tone: "info" as const,
              detail: "Not capped monthly — evens out across your experience",
            },
          ] as { label: string; value: string; tone: "pass" | "fail" | "warn" | "info"; detail: string }[]).map((check) => {
            const styles = {
              pass: { box: "bg-emerald-50 border-emerald-100", title: "text-emerald-800", sub: "text-emerald-600", val: "text-emerald-700", icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> },
              fail: { box: "bg-red-50 border-red-100", title: "text-red-800", sub: "text-red-600", val: "text-red-600", icon: <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" /> },
              warn: { box: "bg-amber-50 border-amber-100", title: "text-amber-800", sub: "text-amber-600", val: "text-amber-700", icon: <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" /> },
              info: { box: "bg-zinc-50 border-zinc-200", title: "text-zinc-700", sub: "text-zinc-500", val: "text-zinc-600", icon: <Clock className="w-4 h-4 text-zinc-400 flex-shrink-0" /> },
            }[check.tone]
            return (
              <div key={check.label} className={cn("flex items-center justify-between p-3 rounded-lg border", styles.box)}>
                <div className="flex items-center gap-2.5">
                  {styles.icon}
                  <div>
                    <p className={cn("text-sm font-medium", styles.title)}>{check.label}</p>
                    <p className={cn("text-xs", styles.sub)}>{check.detail}</p>
                  </div>
                </div>
                <span className={cn("text-sm font-bold", styles.val)}>{check.value}</span>
              </div>
            )
          })}
        </div>
      </div>

      {extras}
    </div>
  )
}
