"use client"

import { ChevronDown } from "lucide-react"

export function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

export function monthLabelFor(ym: string): string {
  const [year, month] = ym.split("-").map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

export function lastNMonths(count = 12): { value: string; label: string }[] {
  const now = new Date()
  const options: { value: string; label: string }[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    options.push({ value, label: d.toLocaleDateString("en-US", { month: "long", year: "numeric" }) })
  }
  return options
}

// Month picker (YYYY-MM) used wherever a trainee's or supervisee's MSP needs
// to be reviewed for a month other than the current one.
export default function MonthSelect({ value, onChange, count = 12 }: {
  value: string
  onChange: (value: string) => void
  count?: number
}) {
  const options = lastNMonths(count)
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none text-sm font-semibold text-zinc-900 bg-white border border-[#E8E6F4] rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
  )
}
