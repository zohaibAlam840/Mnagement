// Server-only helpers for API routes: who is calling, and what they may do.
// Privileged writes (unlocks, MVF, admin) run with the service-role client
// after these checks, so they don't depend on table RLS.

import { NextResponse } from "next/server"
import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import type { AdminLevel, UserRole } from "@/lib/supabase/types"

export type Db = SupabaseClient

export type Caller = {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  adminLevel: AdminLevel | null
  isAdmin: boolean
  db: Db
}

export async function getCaller(): Promise<Caller | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const db = createAdminClient() as unknown as Db
  const { data: profile } = await db
    .from("profiles")
    .select("id, email, first_name, last_name, role, admin_level")
    .eq("id", user.id)
    .single()
  if (!profile) return null

  return {
    id: profile.id,
    email: profile.email,
    firstName: profile.first_name,
    lastName: profile.last_name,
    role: profile.role,
    adminLevel: profile.admin_level ?? null,
    isAdmin: !!profile.admin_level,
    db,
  }
}

export function ok(data: unknown = { ok: true }) {
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } })
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } })
}

export async function activeSupervisors(db: Db, traineeId: string): Promise<{ supervisor_id: string; is_primary: boolean }[]> {
  const { data } = await db
    .from("supervisor_relationships")
    .select("supervisor_id, is_primary")
    .eq("trainee_id", traineeId)
    .eq("status", "active")
  return data ?? []
}

export async function isActiveSupervisor(db: Db, supervisorId: string, traineeId: string): Promise<boolean> {
  const { data } = await db
    .from("supervisor_relationships")
    .select("id")
    .eq("trainee_id", traineeId)
    .eq("supervisor_id", supervisorId)
    .eq("status", "active")
    .limit(1)
  return (data ?? []).length > 0
}

// How the caller relates to a candidate's records
export async function accessTo(caller: Caller, traineeId: string): Promise<"self" | "supervisor" | "admin" | null> {
  if (caller.id === traineeId) return "self"
  if (await isActiveSupervisor(caller.db, caller.id, traineeId)) return "supervisor"
  if (caller.isAdmin) return "admin"
  return null
}

export async function notify(
  db: Db,
  userIds: string[],
  n: { type: string; title: string; body: string; related_id?: string | null },
) {
  const rows = [...new Set(userIds)].map(user_id => ({
    user_id, type: n.type, title: n.title, body: n.body, read: false, related_id: n.related_id ?? null,
  }))
  if (rows.length > 0) await db.from("notifications").insert(rows)
}

export function fullName(p: { first_name?: string | null; last_name?: string | null } | null | undefined): string {
  if (!p) return ""
  return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim()
}

export function callerName(c: Caller): string {
  return `${c.firstName} ${c.lastName}`.trim()
}
