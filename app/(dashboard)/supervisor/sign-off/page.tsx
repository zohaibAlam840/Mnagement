"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle2, AlertTriangle, FileSignature, Download } from "lucide-react"
import { supervisees, monthlyReports } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export default function SignOffPage() {
  const [signed, setSigned] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState(supervisees[0].id)
  const selectedSupervisee = supervisees.find((s) => s.id === selected) ?? supervisees[0]
  const report = monthlyReports[0]

  return (
    <div className="p-4 md:p-7 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Monthly Sign-Off</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Review and electronically sign monthly verification forms</p>
      </div>

      <div className="grid md:grid-cols-3 gap-5">
        {/* Supervisee selector */}
        <div className="bg-white rounded-xl border border-[#E8E6F4] p-4">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">Select Trainee</p>
          <div className="space-y-2">
            {supervisees.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelected(s.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all",
                  selected === s.id ? "bg-violet-50 border border-violet-100" : "hover:bg-zinc-50"
                )}
              >
                <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-violet-700">{s.initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-semibold truncate", selected === s.id ? "text-violet-800" : "text-zinc-900")}>{s.name.split(" ")[0]}</p>
                  <p className="text-[10px] text-zinc-400">{report.month}</p>
                </div>
                {signed.has(s.id)
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  : <div className="w-4 h-4 rounded-full border-2 border-zinc-200 flex-shrink-0" />
                }
              </button>
            ))}
          </div>
        </div>

        {/* Report detail */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-[#E8E6F4] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-zinc-900">{selectedSupervisee.name}</h2>
                <p className="text-sm text-zinc-500">{report.month} · Fieldwork Verification</p>
              </div>
              <span className={cn(
                "text-xs font-semibold px-2.5 py-1 rounded-lg",
                report.complianceStatus === "compliant" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"
              )}>
                {report.complianceStatus === "compliant" ? <><CheckCircle2 className="w-3 h-3 inline mr-1" />Compliant</> : <><AlertTriangle className="w-3 h-3 inline mr-1" />Warning</>}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: "Total", value: `${report.totalHours}h` },
                { label: "Restricted", value: `${report.restrictedHours}h` },
                { label: "Unrestricted", value: `${report.unrestrictedHours}h` },
                { label: "Supervision", value: `${report.supervisionHours}h` },
              ].map((s) => (
                <div key={s.label} className="text-center bg-zinc-50 rounded-lg py-2.5">
                  <p className="text-lg font-bold text-zinc-900">{s.value}</p>
                  <p className="text-[10px] text-zinc-400">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Compliance checks */}
            <div className="space-y-2 mb-4">
              {[
                { label: `Restricted ≤ 50% (${report.restrictedPercent}%)`, pass: report.restrictedPercent <= 50 },
                { label: `Supervision ≥ 5% (${report.supervisionPercent}%)`, pass: report.supervisionPercent >= 5 },
                { label: "Monthly minimum met", pass: true },
              ].map((c) => (
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
            signed.has(selected) ? "bg-emerald-50 border-emerald-100" : "bg-white border-[#E8E6F4]"
          )}>
            <div className="flex items-start gap-3 mb-4">
              <FileSignature className={cn("w-5 h-5 flex-shrink-0 mt-0.5", signed.has(selected) ? "text-emerald-600" : "text-zinc-400")} />
              <div>
                <p className="text-sm font-semibold text-zinc-900">Supervisor Verification</p>
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                  By signing below, I confirm that I have reviewed this trainee&apos;s fieldwork hours for {report.month}, that all entries are accurate, and that this trainee met BACB supervision requirements.
                </p>
              </div>
            </div>

            {signed.has(selected) ? (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800">Signed by Dr. Emily Rodriguez</p>
                  <p className="text-xs text-emerald-600">May 19, 2025</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="h-14 border-2 border-dashed border-zinc-200 rounded-xl flex items-center justify-center text-sm text-zinc-400">
                  Signature field (tap to sign)
                </div>
                <div className="flex gap-3">
                  <button className="flex-1 flex items-center justify-center gap-2 border border-[#E8E6F4] bg-white text-zinc-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-zinc-50 transition-colors">
                    <Download className="w-4 h-4" /> Download PDF
                  </button>
                  <button
                    onClick={() => setSigned((prev) => new Set([...prev, selected]))}
                    className="flex-1 flex items-center justify-center gap-2 bg-violet-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-colors"
                  >
                    <FileSignature className="w-4 h-4" /> Sign & Approve
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
