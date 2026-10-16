// BACB 2027 Final Fieldwork Verification Form (FVF) — values and PDF field map.
// Hours are the totals of the candidate's signed Monthly forms in the date range,
// split by fieldwork type (supervised vs concentrated, without the multiplier).

import { minutesToHM } from "./period"
import type { MvfFormType } from "./supabase/types"

export type FvfFieldKey =
  | "traineeName" | "traineeBacbId" | "startDate" | "endDate" | "state" | "country"
  | "sup1Name" | "sup1Id" | "sup2Name" | "sup2Id" | "sup3Name" | "sup3Id" | "sup4Name" | "sup4Id"
  | "svIndH" | "svIndM" | "svSupH" | "svSupM" | "svTotH" | "svTotM" | "svPct"
  | "cIndH" | "cIndM" | "cSupH" | "cSupM" | "cTotH" | "cTotM" | "cPct"
  | "respName" | "respId"

export type FvfValues = Record<FvfFieldKey, string>

type FieldDef = { key: FvfFieldKey; label: string; orgOnly?: boolean }

export const FVF_FIELD_GROUPS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "Trainee",
    fields: [
      { key: "traineeName", label: "Trainee name" },
      { key: "traineeBacbId", label: "BACB ID #" },
      { key: "startDate", label: "Start date (MM/YYYY)" },
      { key: "endDate", label: "End date (MM/YYYY)" },
      { key: "state", label: "State where fieldwork occurred" },
      { key: "country", label: "Country where fieldwork occurred" },
    ],
  },
  {
    title: "Supervisors who provided supervision",
    fields: [1, 2, 3, 4].flatMap(n => [
      { key: `sup${n}Name` as FvfFieldKey, label: `Supervisor ${n} name`, orgOnly: true },
      { key: `sup${n}Id` as FvfFieldKey, label: `Supervisor ${n} cert. / BACB ID`, orgOnly: true },
    ]),
  },
  {
    title: "Supervised fieldwork hours",
    fields: [
      { key: "svIndH", label: "Independent hh" }, { key: "svIndM", label: "Independent mm" },
      { key: "svSupH", label: "Supervised hh" }, { key: "svSupM", label: "Supervised mm" },
      { key: "svTotH", label: "Total hh" }, { key: "svTotM", label: "Total mm" },
      { key: "svPct", label: "% supervised" },
    ],
  },
  {
    title: "Concentrated supervised fieldwork hours (without multiplier)",
    fields: [
      { key: "cIndH", label: "Independent hh" }, { key: "cIndM", label: "Independent mm" },
      { key: "cSupH", label: "Supervised hh" }, { key: "cSupM", label: "Supervised mm" },
      { key: "cTotH", label: "Total hh" }, { key: "cTotM", label: "Total mm" },
      { key: "cPct", label: "% supervised" },
    ],
  },
  {
    title: "Responsible supervisor",
    fields: [
      { key: "respName", label: "Supervisor name" },
      { key: "respId", label: "Certification # or BACB ID #" },
    ],
  },
]

export const FVF_FORM_LABEL: Record<MvfFormType, string> = {
  organization: "Multiple Supervisors at One Organization",
  individual: "Individual Supervisor",
}

export const FVF_TEMPLATE_FILE: Record<MvfFormType, string> = {
  organization: "2027-fvf-organization.pdf",
  individual: "2027-fvf-individual.pdf",
}

export function fvfFieldKeys(formType: MvfFormType): FvfFieldKey[] {
  return FVF_FIELD_GROUPS.flatMap(g => g.fields.filter(f => formType === "organization" || !f.orgOnly).map(f => f.key))
}

// App field -> AcroForm field name. The two final forms differ in a few names.
export function fvfPdfFieldName(key: FvfFieldKey, formType: MvfFormType): string {
  const org = formType === "organization"
  const sup = key.match(/^sup(\d)(Name|Id)$/)
  if (sup) return sup[2] === "Name" ? `SUPERVISOR_NAME_${sup[1]}` : `SUPERVISOR_BACB_ID_${sup[1]}`
  const map: Record<string, string> = {
    traineeName: "TRAINEE_NAME",
    traineeBacbId: org ? "TRAINEE_BACB_ID" : "TRAINEE_ACCOUNT_ID",
    startDate: "START_DATE",
    endDate: "END_DATE",
    state: "TRAINEE_FIELDWORK_STATE",
    country: "TRAINEE_FIELDWORK_COUNTRY",
    svIndH: "Independent_Hours", svIndM: "Independent_Minutes",
    svSupH: "Supervised_Hours", svSupM: "Supervised_Minutes",
    svTotH: "Total_Fieldwork_Hours", svTotM: "Total_Fieldwork_Minutes",
    svPct: "PERCENT_HOURS_SUPERVISED",
    cIndH: "C_Independent_Hours", cIndM: "C_Independent_Minutes",
    cSupH: "C_Supervised_Hours", cSupM: "C_Supervised_Minutes",
    cTotH: "C_Total_Fieldwork_Hours", cTotM: "C_Total_Fieldwork_Minutes",
    cPct: "C_PERCENT_HOURS_SUPERVISED",
    respName: "RESPONSIBLE_SUPERVISOR_NAME",
    respId: org ? "RESPONSIBLE_SUPERVISOR_ACCOUNT_ID" : "RESPONSIBLE_SUPERVISOR_BACB_ID",
  }
  return map[key]
}

// Minutes from a signed monthly form's (attested) values
export function mvfFormMinutes(f: Record<string, string>): { independent: number; supervised: number } {
  const n = (k: string) => Math.max(0, Number(f[k]) || 0)
  return {
    independent: n("independentHours") * 60 + n("independentMinutes"),
    supervised: n("supervisedHours") * 60 + n("supervisedMinutes"),
  }
}

function column(independent: number, supervised: number) {
  const ind = minutesToHM(independent)
  const sup = minutesToHM(supervised)
  const tot = minutesToHM(independent + supervised)
  const total = independent + supervised
  return {
    indH: String(ind.h), indM: String(ind.m),
    supH: String(sup.h), supM: String(sup.m),
    totH: String(tot.h), totM: String(tot.m),
    pct: total > 0 ? (Math.round((supervised / total) * 1000) / 10).toFixed(1) : "N/A",
  }
}

// "2026-04" -> "04/2026"
export function mmYYYY(yearMonth: string): string {
  const [y, m] = yearMonth.split("-")
  return `${m}/${y}`
}

export function buildFvfHours(totals: {
  supervised: { independent: number; supervised: number }
  concentrated: { independent: number; supervised: number }
}): Pick<FvfValues, "svIndH" | "svIndM" | "svSupH" | "svSupM" | "svTotH" | "svTotM" | "svPct" | "cIndH" | "cIndM" | "cSupH" | "cSupM" | "cTotH" | "cTotM" | "cPct"> {
  const sv = column(totals.supervised.independent, totals.supervised.supervised)
  const c = column(totals.concentrated.independent, totals.concentrated.supervised)
  return {
    svIndH: sv.indH, svIndM: sv.indM, svSupH: sv.supH, svSupM: sv.supM, svTotH: sv.totH, svTotM: sv.totM, svPct: sv.pct,
    cIndH: c.indH, cIndM: c.indM, cSupH: c.supH, cSupM: c.supM, cTotH: c.totH, cTotM: c.totM, cPct: c.pct,
  }
}

export function sanitizeFvfValues(raw: unknown, formType: MvfFormType): Partial<FvfValues> {
  const out: Partial<FvfValues> = {}
  if (!raw || typeof raw !== "object") return out
  for (const k of fvfFieldKeys(formType)) {
    const v = (raw as Record<string, unknown>)[k]
    if (typeof v === "string" || typeof v === "number") out[k] = String(v).slice(0, 120)
  }
  return out
}
