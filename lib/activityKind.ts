// Shared 5-option activity category used by calendar import and activity edit.
// Maps the simplified dropdown choice onto the structured category/session_type/
// observation fields the "activities" table stores.

export type ActivityKind =
  | "Restricted"
  | "Unrestricted"
  | "Group Supervision"
  | "Individual Supervision"
  | "Observation"

export const ACTIVITY_KINDS: ActivityKind[] = [
  "Restricted",
  "Unrestricted",
  "Individual Supervision",
  "Group Supervision",
  "Observation",
]

export function kindToFields(kind: ActivityKind, observationDurationMinutes: number) {
  switch (kind) {
    case "Restricted":
      return { category: "Restricted" as const, session_type: null, supervision_present: false, observation_with_client: false, observation_type: null, observation_duration_minutes: 0 }
    case "Unrestricted":
      return { category: "Unrestricted" as const, session_type: null, supervision_present: false, observation_with_client: false, observation_type: null, observation_duration_minutes: 0 }
    case "Group Supervision":
      return { category: "Supervision" as const, session_type: "group" as const, supervision_present: true, observation_with_client: false, observation_type: null, observation_duration_minutes: 0 }
    case "Individual Supervision":
      return { category: "Supervision" as const, session_type: "individual" as const, supervision_present: true, observation_with_client: false, observation_type: null, observation_duration_minutes: 0 }
    case "Observation":
      return { category: "Supervision" as const, session_type: null, supervision_present: true, observation_with_client: true, observation_type: "direct" as const, observation_duration_minutes: observationDurationMinutes }
  }
}

// Reverse mapping — used to preselect the dropdown when editing an existing activity.
export function rowToKind(a: { category: string; session_type?: string | null; observation_with_client?: boolean | null }): ActivityKind {
  if (a.category !== "Supervision") return a.category as ActivityKind
  if (a.observation_with_client) return "Observation"
  return a.session_type === "group" ? "Group Supervision" : "Individual Supervision"
}
