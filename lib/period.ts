// Week / month helpers shared by client pages and server routes.
// All dates are local calendar dates as "YYYY-MM-DD" strings; weeks start Monday.

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function parse(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00")
}

export function addDays(dateStr: string, days: number): string {
  const d = parse(dateStr)
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

export function weekStartOf(dateStr: string): string {
  const d = parse(dateStr)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  return toDateStr(d)
}

export function weekEndOf(weekStart: string): string {
  return addDays(weekStart, 6)
}

// "YYYY-MM" -> first day of that month and first day of the next month
export function monthRange(yearMonth: string): { start: string; next: string } {
  const [y, m] = yearMonth.split("-").map(Number)
  return {
    start: `${yearMonth}-01`,
    next: `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`,
  }
}

export function monthOf(dateStr: string): string {
  return dateStr.slice(0, 7)
}

// Monday of every week that has at least one day inside the month
export function weeksOverlappingMonth(yearMonth: string): string[] {
  const { start, next } = monthRange(yearMonth)
  const weeks: string[] = []
  for (let w = weekStartOf(start); w < next; w = addDays(w, 7)) weeks.push(w)
  return weeks
}

export function formatWeekRange(weekStart: string): string {
  const start = parse(weekStart)
  const end = parse(weekEndOf(weekStart))
  const mo: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }
  return `${start.toLocaleDateString("en-US", mo)} – ${end.toLocaleDateString("en-US", { ...mo, year: "numeric" })}`
}

export function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number)
  return new Date(y, m - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

export function formatPeriod(scope: "week" | "month", periodStart: string): string {
  return scope === "week" ? `week of ${formatWeekRange(periodStart)}` : formatMonthLabel(monthOf(periodStart))
}

// 82.5h is 82 hh 30 mm — never "82 hh 5 mm"
export function minutesToHM(totalMinutes: number): { h: number; m: number } {
  const mins = Math.max(0, Math.round(totalMinutes))
  return { h: Math.floor(mins / 60), m: mins % 60 }
}

export function formatHM(totalMinutes: number): string {
  const { h, m } = minutesToHM(totalMinutes)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}
