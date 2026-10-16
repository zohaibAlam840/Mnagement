// BACB 2027 Monthly Fieldwork Verification Form (MVF) — values and PDF field map.
// Client-confirmed mapping (Oct 2026):
//   Independent Hours  = Unsupervised hours in-app (Restricted + Unrestricted)
//   Supervised Hours   = Supervision activities (individual, group, observation)
//   Observation        = observation minutes logged with clients
//   Total / Percent    = in-app monthly total and supervision %

import { minutesToHM } from "./period"
import type { MvfFormType } from "./supabase/types"

export type MvfActivity = {
  duration_minutes: number
  category: string
  observation_with_client?: boolean | null
  observation_duration_minutes?: number | null
}

export type MvfFieldKey =
  | "traineeName" | "traineeBacbId" | "monthYear" | "state" | "country"
  | "supervisorName" | "supervisorBacbId"
  | "independentHours" | "independentMinutes"
  | "supervisedHours" | "supervisedMinutes"
  | "observationHours" | "observationMinutes"
  | "totalHours" | "totalMinutes" | "percentSupervised"

export type MvfValues = Record<MvfFieldKey, string>

export const MVF_FIELD_GROUPS: { title: string; fields: { key: MvfFieldKey; label: string; numeric?: boolean }[] }[] = [
  {
    title: "Trainee",
    fields: [
      { key: "traineeName", label: "Trainee name" },
      { key: "traineeBacbId", label: "BACB ID #" },
      { key: "monthYear", label: "Month / Year" },
      { key: "state", label: "State where fieldwork occurred" },
      { key: "country", label: "Country where fieldwork occurred" },
    ],
  },
  {
    title: "Responsible supervisor",
    fields: [
      { key: "supervisorName", label: "Supervisor name" },
      { key: "supervisorBacbId", label: "Certification # or BACB ID #" },
    ],
  },
  {
    title: "Fieldwork hours (this month only)",
    fields: [
      { key: "independentHours", label: "Independent hh", numeric: true },
      { key: "independentMinutes", label: "Independent mm", numeric: true },
      { key: "supervisedHours", label: "Supervised hh", numeric: true },
      { key: "supervisedMinutes", label: "Supervised mm", numeric: true },
      { key: "observationHours", label: "Observation hh", numeric: true },
      { key: "observationMinutes", label: "Observation mm", numeric: true },
      { key: "totalHours", label: "Total hh", numeric: true },
      { key: "totalMinutes", label: "Total mm", numeric: true },
      { key: "percentSupervised", label: "% supervised", numeric: true },
    ],
  },
]

export const MVF_FORM_LABEL: Record<MvfFormType, string> = {
  organization: "Multiple Supervisors at One Organization",
  individual: "Individual Supervisor",
}

export const MVF_TEMPLATE_FILE: Record<MvfFormType, string> = {
  organization: "2027-mvf-organization.pdf",
  individual: "2027-mvf-individual.pdf",
}

// App field -> AcroForm field name in the BACB PDF. The two monthly forms are
// identical except for the observation-minutes field name.
export function pdfFieldName(key: MvfFieldKey, formType: MvfFormType): string {
  const map: Record<MvfFieldKey, string> = {
    traineeName: "TRAINEE_NAME",
    traineeBacbId: "TRAINEE_BACB_ID",
    monthYear: "TRAINEE_CERTIFICATE_MONTH/YEAR",
    state: "TRAINEE_FIELDWORK_STATE",
    country: "TRAINEE_FIELDWORK_COUNTRY",
    supervisorName: "RESPONSIBLE_SUPERVISOR_NAME",
    supervisorBacbId: "RESPONSIBLE_SUPERVISOR_BACB_ID",
    independentHours: "Independent_Hours",
    independentMinutes: "Independent_Minutes",
    supervisedHours: "Supervised_Hours",
    supervisedMinutes: "Supervised_Minutes",
    observationHours: "Observation_Hours",
    observationMinutes: formType === "individual" ? "Independent_Minutes 3" : "Independent_Minutes 2",
    totalHours: "Total_Fieldwork_Hours",
    totalMinutes: "Total_Fieldwork_Minutes",
    percentSupervised: "PERCENT_HOURS_SUPERVISED",
  }
  return map[key]
}

export type MvfMinutes = { independent: number; supervised: number; observation: number; total: number }

export function computeMvfMinutes(acts: MvfActivity[]): MvfMinutes {
  let supervised = 0
  let independent = 0
  let observation = 0
  for (const a of acts) {
    const mins = a.duration_minutes ?? 0
    if (a.category === "Supervision") supervised += mins
    else independent += mins
    if (a.observation_with_client) observation += a.observation_duration_minutes ?? 0
  }
  return { independent, supervised, observation, total: independent + supervised }
}

export function percentSupervised(m: MvfMinutes): string {
  if (m.total <= 0) return "0"
  return (Math.round((m.supervised / m.total) * 1000) / 10).toFixed(1)
}

export function buildMvfValues(input: {
  minutes: MvfMinutes
  traineeName: string
  traineeBacbId: string
  monthLabel: string
  state: string
  country: string
  supervisorName: string
  supervisorBacbId: string
}): MvfValues {
  const ind = minutesToHM(input.minutes.independent)
  const sup = minutesToHM(input.minutes.supervised)
  const obs = minutesToHM(input.minutes.observation)
  const tot = minutesToHM(input.minutes.total)
  return {
    traineeName: input.traineeName,
    traineeBacbId: input.traineeBacbId,
    monthYear: input.monthLabel,
    state: input.state,
    country: input.country,
    supervisorName: input.supervisorName,
    supervisorBacbId: input.supervisorBacbId,
    independentHours: String(ind.h),
    independentMinutes: String(ind.m),
    supervisedHours: String(sup.h),
    supervisedMinutes: String(sup.m),
    observationHours: String(obs.h),
    observationMinutes: String(obs.m),
    totalHours: String(tot.h),
    totalMinutes: String(tot.m),
    percentSupervised: percentSupervised(input.minutes),
  }
}

export const MVF_FIELD_KEYS: MvfFieldKey[] = MVF_FIELD_GROUPS.flatMap(g => g.fields.map(f => f.key))

// Keep only known keys with string values (untrusted input from the browser)
export function sanitizeMvfValues(raw: unknown): Partial<MvfValues> {
  const out: Partial<MvfValues> = {}
  if (!raw || typeof raw !== "object") return out
  for (const k of MVF_FIELD_KEYS) {
    const v = (raw as Record<string, unknown>)[k]
    if (typeof v === "string" || typeof v === "number") out[k] = String(v).slice(0, 120)
  }
  return out
}
