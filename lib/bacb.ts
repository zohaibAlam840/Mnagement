// BACB compliance — single source of truth for thresholds and monthly metrics.
// Do NOT hardcode these numbers anywhere else; import from here.

export type FieldworkType = "supervised" | "concentrated"
export type RequirementsYear = "2022" | "2027" | "both"

export type ActivityLike = {
  duration_minutes: number
  category: string // "Restricted" | "Unrestricted" | "Supervision"
  session_type?: "individual" | "group" | null
  observation_with_client?: boolean | null
  observation_duration_minutes?: number | null
}

// --- Thresholds ---------------------------------------------------------------

// Minimum supervision as % of total hours — evaluated MONTHLY.
export function minSupervisionPct(fieldworkType: FieldworkType, reqYear: RequirementsYear): number {
  if (fieldworkType === "concentrated") return reqYear === "2027" ? 7.5 : 10
  return 5 // supervised
}

// Monthly fieldwork-hour cap.
export function monthlyCapHours(reqYear: RequirementsYear): number {
  return reqYear === "2027" ? 160 : 130
}

export const MIN_MONTHLY_HOURS = 20

// Restricted activities must stay at or below this share — over the ENTIRE
// experience, NOT month to month.
export const RESTRICTED_MAX_PCT = 50

// Group supervision must be below this share of total supervision.
export const GROUP_SUPERVISION_MAX_PCT = 50

// Required number of contacts per month (meetings + observations).
export function requiredContacts(fieldworkType: FieldworkType): number {
  return fieldworkType === "concentrated" ? 6 : 4
}

// Required observation per month. 2022 = a count; 2027 = total minutes.
export function requiredObservation(fieldworkType: FieldworkType, reqYear: RequirementsYear):
  | { kind: "count"; value: number }
  | { kind: "duration"; value: number } {
  if (reqYear === "2022") return { kind: "count", value: 1 }
  return { kind: "duration", value: fieldworkType === "concentrated" ? 90 : 60 }
}

// Concentrated fieldwork hours are weighted by this multiplier toward completion.
export const CONCENTRATED_MULTIPLIER = 1.33

// --- Supervision ratio color (monthly) ---------------------------------------
// < 5% critical/red · 5–<10% supervised/yellow · >= 10% concentrated/green
export type RatioColor = "red" | "yellow" | "green"

export function supervisionColor(pct: number): RatioColor {
  if (pct < 5) return "red"
  if (pct < 10) return "yellow"
  return "green"
}

export const RATIO_COLOR_CLASS: Record<RatioColor, { text: string; ring: string; bg: string; label: string }> = {
  red: { text: "text-red-600", ring: "#EF4444", bg: "bg-red-50 border-red-100", label: "Critical (< 5%)" },
  yellow: { text: "text-amber-600", ring: "#F59E0B", bg: "bg-amber-50 border-amber-100", label: "Supervised (≥ 5%)" },
  green: { text: "text-emerald-600", ring: "#10B981", bg: "bg-emerald-50 border-emerald-100", label: "Concentrated (≥ 10%)" },
}

// --- Metric computation -------------------------------------------------------

export type Metrics = {
  totalH: number
  restrictedH: number
  unrestrictedH: number
  supervisionH: number
  individualSupH: number
  groupSupH: number
  supervisionPct: number
  groupSupPct: number
  restrictedPct: number
  individualMeetings: number
  groupMeetings: number
  obsCount: number
  obsMinutes: number
  contacts: number // individual + group meetings + observations
}

const round1 = (n: number) => Math.round(n * 10) / 10

export function computeMetrics(acts: ActivityLike[]): Metrics {
  const mins = (xs: ActivityLike[]) => xs.reduce((s, a) => s + (a.duration_minutes ?? 0), 0)

  const supervision = acts.filter(a => a.category === "Supervision")
  // Mirror the sign-off generator: null session_type counts as individual hours.
  const individualSup = supervision.filter(a => a.session_type === "individual" || a.session_type == null)
  const groupSup = supervision.filter(a => a.session_type === "group")
  const observations = acts.filter(a => a.observation_with_client === true)

  const totalMin = mins(acts)
  const restrictedMin = mins(acts.filter(a => a.category === "Restricted"))
  const unrestrictedMin = mins(acts.filter(a => a.category === "Unrestricted"))
  const supervisionMin = mins(supervision)
  const individualMin = mins(individualSup)
  const groupMin = mins(groupSup)

  const totalH = round1(totalMin / 60)
  const supervisionH = round1(supervisionMin / 60)

  return {
    totalH,
    restrictedH: round1(restrictedMin / 60),
    unrestrictedH: round1(unrestrictedMin / 60),
    supervisionH,
    individualSupH: round1(individualMin / 60),
    groupSupH: round1(groupMin / 60),
    supervisionPct: totalMin > 0 ? round1((supervisionMin / totalMin) * 100) : 0,
    groupSupPct: supervisionMin > 0 ? round1((groupMin / supervisionMin) * 100) : 0,
    restrictedPct: totalMin > 0 ? round1((restrictedMin / totalMin) * 100) : 0,
    // Meetings counted by session_type; observations counted separately.
    individualMeetings: supervision.filter(a => a.session_type === "individual").length,
    groupMeetings: groupSup.length,
    obsCount: observations.length,
    obsMinutes: observations.reduce((s, a) => s + (a.observation_duration_minutes ?? 0), 0),
    contacts:
      supervision.filter(a => a.session_type === "individual").length +
      groupSup.length +
      observations.length,
  }
}

// Filter activities to a given YYYY-MM month.
export function inMonth<T extends { date: string }>(acts: T[], yearMonth: string): T[] {
  return acts.filter(a => a.date.startsWith(yearMonth))
}
