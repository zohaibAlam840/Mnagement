"use client"

import { cn } from "@/lib/utils"
import {
  ACTIVITY_KINDS, FIELDWORK_CATEGORIES, activityLabel, kindNeedsCategory, toneOf, TONE_BADGE,
  type ActivityKind, type ClassifiableRow, type FieldworkCategory,
} from "@/lib/activityKind"

// Activity type dropdown + the required Restricted/Unrestricted toggle that
// appears for Individual Supervision, Group Supervision and Observation.
// Neither toggle option is selected by default.
export function KindPicker({
  kind, onKind, category, onCategory, compact = false, disabled = false, showError = false,
}: {
  kind: ActivityKind
  onKind: (k: ActivityKind) => void
  category: FieldworkCategory | null
  onCategory: (c: FieldworkCategory) => void
  compact?: boolean
  disabled?: boolean
  showError?: boolean
}) {
  const needs = kindNeedsCategory(kind)
  return (
    <div className={cn(compact ? "flex flex-col items-end gap-1.5" : "space-y-3")}>
      <select
        value={kind}
        disabled={disabled}
        onChange={e => onKind(e.target.value as ActivityKind)}
        aria-label="Activity type"
        className={cn(
          "border border-zinc-200 bg-white text-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 disabled:opacity-40",
          compact ? "text-xs font-semibold rounded-lg px-2 py-1.5" : "w-full px-3.5 py-2.5 text-sm rounded-lg",
        )}
      >
        {ACTIVITY_KINDS.map(k => <option key={k} value={k}>{k}</option>)}
      </select>
      {needs && (
        <CategoryToggle value={category} onChange={onCategory} compact={compact} disabled={disabled} showError={showError} />
      )}
    </div>
  )
}

export function CategoryToggle({
  value, onChange, compact = false, disabled = false, showError = false,
}: {
  value: FieldworkCategory | null
  onChange: (c: FieldworkCategory) => void
  compact?: boolean
  disabled?: boolean
  showError?: boolean
}) {
  return (
    <div>
      {!compact && (
        <p className="text-xs text-zinc-500 mb-1.5">
          Restricted or Unrestricted? <span className="text-red-500">*</span>
        </p>
      )}
      <div
        role="radiogroup"
        aria-label="Restricted or Unrestricted"
        className={cn("grid grid-cols-2", compact ? "gap-1" : "gap-2", showError && !value && "rounded-lg ring-2 ring-red-300 ring-offset-1")}
      >
        {FIELDWORK_CATEGORIES.map(c => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={value === c}
            disabled={disabled}
            onClick={() => onChange(c)}
            className={cn(
              "font-semibold border transition-all disabled:opacity-40",
              compact ? "text-[11px] px-2 py-1 rounded-md" : "text-xs py-2 rounded-lg",
              value === c
                ? c === "Restricted" ? "bg-violet-600 text-white border-violet-600" : "bg-blue-600 text-white border-blue-600"
                : "border-zinc-200 text-zinc-500 hover:border-zinc-300 bg-white",
            )}
          >
            {c}
          </button>
        ))}
      </div>
      {showError && !value && (
        <p className={cn("text-red-600 mt-1", compact ? "text-[10px]" : "text-xs")}>Select Restricted or Unrestricted</p>
      )}
    </div>
  )
}

export function KindBadge({ a, className }: { a: ClassifiableRow; className?: string }) {
  return (
    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap", TONE_BADGE[toneOf(a)], className)}>
      {activityLabel(a)}
    </span>
  )
}
