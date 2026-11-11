// Activity classification — single source of truth (client request, Nov 2026).
//
// Every entry has two attributes:
//   activity_type: FIELDWORK_TASK | INDIVIDUAL_SUPERVISION | GROUP_SUPERVISION | OBSERVATION
//   category:      Restricted | Unrestricted   (required; null only on legacy
//                  supervision/observation rows that still need review)
//
// The dropdown keeps its five choices. "Restricted"/"Unrestricted" are fieldwork
// tasks with that category; the three supervision choices also need an explicit
// Restricted/Unrestricted pick (no default).
//
// Counting: each entry counts once toward total hours, once toward its category
// (Restricted/Unrestricted) and, for supervision types, once toward supervision.
// Example: 1.0h unrestricted group supervision → +1 total, +1 unrestricted, +1 group.
//
// Rows written before the migration have no activity_type; activityTypeOf()
// derives it from the legacy columns so every screen works either way.

export type ActivityType = "FIELDWORK_TASK" | "INDIVIDUAL_SUPERVISION" | "GROUP_SUPERVISION" | "OBSERVATION"
export type FieldworkCategory = "Restricted" | "Unrestricted"

export type ActivityKind =
  | "Restricted"
  | "Unrestricted"
  | "Individual Supervision"
  | "Group Supervision"
  | "Observation"

export const ACTIVITY_KINDS: ActivityKind[] = [
  "Restricted",
  "Unrestricted",
  "Individual Supervision",
  "Group Supervision",
  "Observation",
]

export const FIELDWORK_CATEGORIES: FieldworkCategory[] = ["Restricted", "Unrestricted"]

export const TYPE_LABEL: Record<ActivityType, string> = {
  FIELDWORK_TASK: "Fieldwork task",
  INDIVIDUAL_SUPERVISION: "Individual supervision",
  GROUP_SUPERVISION: "Group supervision",
  OBSERVATION: "Observation",
}

const KIND_TYPE: Record<ActivityKind, ActivityType> = {
  Restricted: "FIELDWORK_TASK",
  Unrestricted: "FIELDWORK_TASK",
  "Individual Supervision": "INDIVIDUAL_SUPERVISION",
  "Group Supervision": "GROUP_SUPERVISION",
  Observation: "OBSERVATION",
}

export type ClassifiableRow = {
  category?: string | null
  activity_type?: string | null
  session_type?: string | null
  observation_with_client?: boolean | null
  subcategory?: string | null
}

const TYPES = new Set<string>(["FIELDWORK_TASK", "INDIVIDUAL_SUPERVISION", "GROUP_SUPERVISION", "OBSERVATION"])

export function activityTypeOf(a: ClassifiableRow): ActivityType {
  if (a.activity_type && TYPES.has(a.activity_type)) return a.activity_type as ActivityType
  if (a.category !== "Supervision") return "FIELDWORK_TASK"
  // Legacy supervision row
  if (a.observation_with_client) return "OBSERVATION"
  if (a.session_type === "group") return "GROUP_SUPERVISION"
  if (a.session_type === "individual") return "INDIVIDUAL_SUPERVISION"
  const sub = (a.subcategory ?? "").toLowerCase()
  if (sub.startsWith("group")) return "GROUP_SUPERVISION"
  if (sub.startsWith("observation")) return "OBSERVATION"
  return "INDIVIDUAL_SUPERVISION"
}

export function categoryOf(a: ClassifiableRow): FieldworkCategory | null {
  return a.category === "Restricted" || a.category === "Unrestricted" ? a.category : null
}

export function isSupervisionType(t: ActivityType): boolean {
  return t !== "FIELDWORK_TASK"
}

export function isSupervision(a: ClassifiableRow): boolean {
  return isSupervisionType(activityTypeOf(a))
}

// A row is missing its Restricted/Unrestricted attribute (legacy supervision/observation)
export function needsCategory(a: ClassifiableRow): boolean {
  return categoryOf(a) === null
}

export function kindNeedsCategory(kind: ActivityKind): boolean {
  return KIND_TYPE[kind] !== "FIELDWORK_TASK"
}

export function kindToType(kind: ActivityKind): ActivityType {
  return KIND_TYPE[kind]
}

// Category for a dropdown choice: fixed for fieldwork tasks, the toggle otherwise.
export function resolveCategory(kind: ActivityKind, toggle: FieldworkCategory | null): FieldworkCategory | null {
  if (kind === "Restricted" || kind === "Unrestricted") return kind
  return toggle
}

export function kindToFields(kind: ActivityKind, toggle: FieldworkCategory | null, observationDurationMinutes: number) {
  const activity_type = KIND_TYPE[kind]
  const category = resolveCategory(kind, toggle)
  switch (activity_type) {
    case "FIELDWORK_TASK":
      return { activity_type, category, session_type: null, supervision_present: false, observation_with_client: false, observation_type: null, observation_duration_minutes: 0 }
    case "GROUP_SUPERVISION":
      return { activity_type, category, session_type: "group" as const, supervision_present: true, observation_with_client: false, observation_type: null, observation_duration_minutes: 0 }
    case "INDIVIDUAL_SUPERVISION":
      return { activity_type, category, session_type: "individual" as const, supervision_present: true, observation_with_client: false, observation_type: null, observation_duration_minutes: 0 }
    case "OBSERVATION":
      return { activity_type, category, session_type: null, supervision_present: true, observation_with_client: true, observation_type: "direct" as const, observation_duration_minutes: observationDurationMinutes }
  }
}

// Reverse mapping — preselect the dropdown and toggle when editing.
export function rowToKind(a: ClassifiableRow): ActivityKind {
  const t = activityTypeOf(a)
  if (t === "FIELDWORK_TASK") return categoryOf(a) ?? "Restricted"
  if (t === "GROUP_SUPERVISION") return "Group Supervision"
  if (t === "OBSERVATION") return "Observation"
  return "Individual Supervision"
}

// --- Display -----------------------------------------------------------------

export type Tone = "restricted" | "unrestricted" | "supervision" | "needs"

export function toneOf(a: ClassifiableRow): Tone {
  if (needsCategory(a)) return "needs"
  if (isSupervision(a)) return "supervision"
  return categoryOf(a) === "Restricted" ? "restricted" : "unrestricted"
}

// Short label: "Restricted", "Unrestricted", "Group supervision · Unrestricted",
// or "Observation · Needs category"
export function activityLabel(a: ClassifiableRow): string {
  const t = activityTypeOf(a)
  const c = categoryOf(a)
  if (t === "FIELDWORK_TASK") return c ?? "Needs category"
  return `${TYPE_LABEL[t]} · ${c ?? "Needs category"}`
}

export const TONE_BADGE: Record<Tone, string> = {
  restricted: "bg-violet-50 text-violet-700 border-violet-100",
  unrestricted: "bg-blue-50 text-blue-700 border-blue-100",
  supervision: "bg-emerald-50 text-emerald-700 border-emerald-100",
  needs: "bg-amber-50 text-amber-800 border-amber-200",
}
export const TONE_TILE: Record<Tone, string> = {
  restricted: "bg-violet-100 text-violet-700",
  unrestricted: "bg-blue-100 text-blue-700",
  supervision: "bg-emerald-100 text-emerald-700",
  needs: "bg-amber-100 text-amber-800",
}
export const TONE_SOLID: Record<Tone, string> = {
  restricted: "bg-violet-600 text-white border-violet-600",
  unrestricted: "bg-blue-600 text-white border-blue-600",
  supervision: "bg-emerald-600 text-white border-emerald-600",
  needs: "bg-amber-500 text-white border-amber-500",
}
export const TONE_DOT: Record<Tone, string> = {
  restricted: "bg-violet-500",
  unrestricted: "bg-blue-500",
  supervision: "bg-emerald-500",
  needs: "bg-amber-500",
}
export const TONE_TEXT: Record<Tone, string> = {
  restricted: "text-violet-600",
  unrestricted: "text-blue-600",
  supervision: "text-emerald-600",
  needs: "text-amber-600",
}

// --- Totals ------------------------------------------------------------------

export type MinuteTotals = {
  total: number
  restricted: number
  unrestricted: number
  uncategorized: number
  supervision: number
  individual: number
  group: number
  observation: number // OBSERVATION-type entries
  fieldwork: number // FIELDWORK_TASK entries
}

export function sumMinutes(acts: (ClassifiableRow & { duration_minutes: number })[]): MinuteTotals {
  const t: MinuteTotals = { total: 0, restricted: 0, unrestricted: 0, uncategorized: 0, supervision: 0, individual: 0, group: 0, observation: 0, fieldwork: 0 }
  for (const a of acts) {
    const m = a.duration_minutes ?? 0
    t.total += m
    const c = categoryOf(a)
    if (c === "Restricted") t.restricted += m
    else if (c === "Unrestricted") t.unrestricted += m
    else t.uncategorized += m
    const type = activityTypeOf(a)
    if (type === "FIELDWORK_TASK") t.fieldwork += m
    else {
      t.supervision += m
      if (type === "GROUP_SUPERVISION") t.group += m
      else if (type === "OBSERVATION") t.observation += m
      else t.individual += m
    }
  }
  return t
}

export function sumHours(acts: (ClassifiableRow & { duration_minutes: number })[]): MinuteTotals {
  const m = sumMinutes(acts)
  const out = {} as MinuteTotals
  for (const k of Object.keys(m) as (keyof MinuteTotals)[]) out[k] = m[k] / 60
  return out
}

// Filter chips on activity lists
export type ActivityFilter = "All" | "Restricted" | "Unrestricted" | "Supervision" | "Needs category"
export const ACTIVITY_FILTERS: ActivityFilter[] = ["All", "Restricted", "Unrestricted", "Supervision", "Needs category"]
export function matchesFilter(a: ClassifiableRow, f: ActivityFilter): boolean {
  switch (f) {
    case "All": return true
    case "Restricted": return categoryOf(a) === "Restricted"
    case "Unrestricted": return categoryOf(a) === "Unrestricted"
    case "Supervision": return isSupervision(a)
    case "Needs category": return needsCategory(a)
  }
}
