import Link from "next/link"
import { ChevronLeft, Download, CheckCircle2, AlertTriangle, Clock, FileSignature } from "lucide-react"
import { monthlyReports } from "@/lib/mock-data"
import { cn } from "@/lib/utils"

export default async function MonthlyReportDetail({ params }: { params: Promise<{ month: string }> }) {
  const { month } = await params
  const report = monthlyReports.find((r) => r.slug === month) ?? monthlyReports[0]

  return (
    <div className="p-4 md:p-7 max-w-3xl mx-auto">
      {/* Back + header */}
      <Link href="/trainee/reports" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Reports
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-900">{report.month}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Monthly BACB Fieldwork Verification</p>
        </div>
        <div className="flex items-center gap-2">
          {report.complianceStatus === "compliant"
            ? <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100"><CheckCircle2 className="w-3.5 h-3.5" /> Compliant</span>
            : <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-lg border border-amber-100"><AlertTriangle className="w-3.5 h-3.5" /> Warning</span>
          }
        </div>
      </div>

      {/* Hours breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Hours", value: report.totalHours, color: "text-zinc-900" },
          { label: "Restricted", value: report.restrictedHours, color: "text-violet-600" },
          { label: "Unrestricted", value: report.unrestrictedHours, color: "text-blue-600" },
          { label: "Supervision", value: report.supervisionHours, color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-[#E8E6F4] p-4">
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}h</p>
            <p className="text-xs text-zinc-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Stacked bar */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-5">
        <h3 className="text-sm font-semibold text-zinc-900 mb-3">Hours Breakdown</h3>
        <div className="flex h-8 rounded-lg overflow-hidden gap-0.5 mb-3">
          <div className="bg-violet-500 flex items-center justify-center" style={{ width: `${(report.restrictedHours / report.totalHours) * 100}%` }}>
            <span className="text-[10px] font-bold text-white">{report.restrictedHours}h</span>
          </div>
          <div className="bg-blue-400 flex items-center justify-center" style={{ width: `${(report.unrestrictedHours / report.totalHours) * 100}%` }}>
            <span className="text-[10px] font-bold text-white">{report.unrestrictedHours}h</span>
          </div>
          <div className="bg-emerald-400 flex items-center justify-center" style={{ width: `${(report.supervisionHours / report.totalHours) * 100}%` }}>
            <span className="text-[10px] font-bold text-white">{report.supervisionHours}h</span>
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

      {/* Compliance checks */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-5">
        <h3 className="text-sm font-semibold text-zinc-900 mb-3">Compliance Checks</h3>
        <div className="space-y-3">
          {[
            {
              label: "Restricted hours ≤ 50%",
              value: `${report.restrictedPercent}%`,
              pass: report.restrictedPercent <= 50,
              detail: report.restrictedPercent <= 50 ? "Within limit" : "Exceeds limit",
            },
            {
              label: "Supervision ≥ 5% of total",
              value: `${report.supervisionPercent}%`,
              pass: report.supervisionPercent >= 5,
              detail: report.supervisionPercent >= 5 ? "Above minimum" : "Below minimum",
            },
            {
              label: "Minimum 4 hours this month",
              value: `${report.totalHours}h`,
              pass: report.totalHours >= 4,
              detail: "Minimum met",
            },
          ].map((check) => (
            <div key={check.label} className={cn(
              "flex items-center justify-between p-3 rounded-lg",
              check.pass ? "bg-emerald-50 border border-emerald-100" : "bg-red-50 border border-red-100"
            )}>
              <div className="flex items-center gap-2.5">
                {check.pass
                  ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  : <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                }
                <div>
                  <p className={cn("text-sm font-medium", check.pass ? "text-emerald-800" : "text-red-800")}>{check.label}</p>
                  <p className={cn("text-xs", check.pass ? "text-emerald-600" : "text-red-600")}>{check.detail}</p>
                </div>
              </div>
              <span className={cn("text-sm font-bold", check.pass ? "text-emerald-700" : "text-red-600")}>{check.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Supervisor sign-off */}
      <div className={cn(
        "rounded-xl border p-5 mb-5",
        report.supervisorSigned ? "bg-emerald-50 border-emerald-100" : "bg-white border-[#E8E6F4]"
      )}>
        <div className="flex items-center gap-3">
          <FileSignature className={cn("w-5 h-5 flex-shrink-0", report.supervisorSigned ? "text-emerald-600" : "text-zinc-400")} />
          <div className="flex-1">
            <p className="text-sm font-semibold text-zinc-900">Supervisor Verification</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {report.supervisorSigned
                ? "Dr. Emily Rodriguez has reviewed and signed this report."
                : "Awaiting review and signature from Dr. Emily Rodriguez."}
            </p>
          </div>
          {report.supervisorSigned
            ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            : <Clock className="w-5 h-5 text-zinc-300" />
          }
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button className="flex-1 flex items-center justify-center gap-2 border border-[#E8E6F4] bg-white text-zinc-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-zinc-50 transition-colors">
          <Download className="w-4 h-4" />
          Download PDF
        </button>
        {!report.supervisorSigned && (
          <button className="flex-1 bg-violet-600 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-violet-700 transition-colors">
            Request Signature
          </button>
        )}
      </div>
    </div>
  )
}
