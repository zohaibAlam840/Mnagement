"use client"

import { TrendingUp, Clock, CheckCircle2, Users, Eye } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  computeMetrics, requiredObservation, GROUP_SUPERVISION_MAX_PCT, RATIO_COLOR_CLASS,
} from "@/lib/bacb"

function Ring({ percent, ringColor, centerColor, label, footer }: {
  percent: number; ringColor: string; centerColor: string; label: string; footer: string
}) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const fill = (Math.min(percent, 100) / 100) * circumference
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="#f3f4f6" strokeWidth="8" />
          <circle cx="48" cy="48" r={radius} fill="none" stroke={ringColor} strokeWidth="8"
            strokeDasharray={circumference} strokeDashoffset={circumference - fill} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-lg font-bold", centerColor)}>{percent}%</span>
          <span className="text-[9px] text-zinc-400 text-center leading-tight">{label}</span>
        </div>
      </div>
      <span className="text-[10px] font-medium text-center text-zinc-500">{footer}</span>
    </div>
  )
}

// Monthly (MSP) breakdown — shared between the trainee dashboard and the
// supervisor's per-supervisee view so both show identical numbers.
export default function MonthlyBreakdown({ m, monthLabel, supCls, reqContacts, reqObs, obsMet, cap }: {
  m: ReturnType<typeof computeMetrics>
  monthLabel: string
  supCls: typeof RATIO_COLOR_CLASS[keyof typeof RATIO_COLOR_CLASS]
  reqContacts: number
  reqObs: ReturnType<typeof requiredObservation>
  obsMet: boolean
  cap: number
}) {
  const supervisedH = Math.round((m.individualSupH + m.groupSupH) * 10) / 10
  const unsupervisedH = Math.round((m.restrictedH + m.unrestrictedH) * 10) / 10
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total This Month", value: `${m.totalH}h`, sub: `cap ${cap}h`, color: "text-violet-600", icon: Clock },
          { label: "Supervised Hours", value: `${supervisedH}h`, sub: `ind ${m.individualSupH} · grp ${m.groupSupH}`, color: "text-emerald-600", icon: Users },
          { label: "Unsupervised Hours", value: `${unsupervisedH}h`, sub: `restricted + unrestricted`, color: "text-blue-600", icon: TrendingUp },
          { label: "Supervision %", value: `${m.supervisionPct}%`, sub: supCls.label, color: supCls.text, icon: CheckCircle2 },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-[#E8E6F4] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400">{s.label}</span>
              <s.icon className={cn("w-3.5 h-3.5", s.color)} />
            </div>
            <p className={cn("text-2xl font-bold", s.label === "Supervision %" ? s.color : "text-zinc-900")}>{s.value}</p>
            <p className="text-[11px] text-zinc-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {/* Ratios */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
          <h2 className="font-semibold text-zinc-900 text-sm mb-1">Monthly Ratios</h2>
          <p className="text-xs text-zinc-400 mb-5">{monthLabel} · supervision evaluated monthly</p>
          <div className="flex items-center justify-around">
            <Ring percent={m.supervisionPct} ringColor={supCls.ring} centerColor={supCls.text} label="Supervision" footer={supCls.label} />
            <Ring percent={m.groupSupPct} ringColor={m.groupSupPct > GROUP_SUPERVISION_MAX_PCT ? "#EF4444" : "#3B82F6"}
              centerColor={m.groupSupPct > GROUP_SUPERVISION_MAX_PCT ? "text-red-600" : "text-blue-600"} label="Group" footer={`Max ${GROUP_SUPERVISION_MAX_PCT}%`} />
          </div>
          <div className="mt-4 pt-4 border-t border-zinc-100 text-[11px] text-zinc-500 leading-relaxed">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> &lt;5% critical</span>{"  "}
            <span className="inline-flex items-center gap-1 ml-2"><span className="w-2 h-2 rounded-full bg-amber-400" /> 5% supervised</span>{"  "}
            <span className="inline-flex items-center gap-1 ml-2"><span className="w-2 h-2 rounded-full bg-emerald-400" /> 10% concentrated</span>
          </div>
        </div>

        {/* Contacts + Observations */}
        <div className="md:col-span-2 bg-white rounded-xl border border-[#E8E6F4] p-5">
          <h2 className="font-semibold text-zinc-900 text-sm mb-4">Monthly Contacts & Observations</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className={cn("rounded-xl border p-4", m.contacts >= reqContacts ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100")}>
              <div className="flex items-center gap-2 mb-1">
                <Users className={cn("w-4 h-4", m.contacts >= reqContacts ? "text-emerald-600" : "text-amber-600")} />
                <span className="text-xs font-semibold text-zinc-700">Contacts</span>
              </div>
              <p className="text-2xl font-bold text-zinc-900">{m.contacts}<span className="text-sm font-medium text-zinc-400"> / {reqContacts}</span></p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{m.individualMeetings} individual + {m.groupMeetings} group + {m.obsCount} observation</p>
            </div>
            <div className={cn("rounded-xl border p-4", obsMet ? "bg-emerald-50 border-emerald-100" : "bg-amber-50 border-amber-100")}>
              <div className="flex items-center gap-2 mb-1">
                <Eye className={cn("w-4 h-4", obsMet ? "text-emerald-600" : "text-amber-600")} />
                <span className="text-xs font-semibold text-zinc-700">Observations</span>
              </div>
              <p className="text-2xl font-bold text-zinc-900">
                {m.obsCount}<span className="text-sm font-medium text-zinc-400"> {m.obsCount === 1 ? "contact" : "contacts"}</span>
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {m.obsMinutes} min logged · {reqObs.kind === "count" ? `${reqObs.value} required` : `${reqObs.value} min required`}
              </p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Restricted", value: `${m.restrictedH}h`, note: `${m.restrictedPct}% (not capped monthly)` },
              { label: "Unrestricted", value: `${m.unrestrictedH}h`, note: "coordination etc." },
              { label: "Supervision", value: `${m.supervisionH}h`, note: `${m.supervisionPct}% of total` },
            ].map((b) => (
              <div key={b.label} className="bg-zinc-50 rounded-lg py-3">
                <p className="text-lg font-bold text-zinc-900">{b.value}</p>
                <p className="text-[10px] text-zinc-400">{b.label}</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">{b.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
