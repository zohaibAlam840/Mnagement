import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(req: NextRequest) {
  try {
    const { email, password, firstName, lastName, role, timezone, traineeData } = await req.json()

    const admin = createAdminClient()

    const { data, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { first_name: firstName, last_name: lastName, role },
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 400 })
    }

    const uid = data.user?.id
    if (!uid) {
      return NextResponse.json({ error: "User creation returned no ID" }, { status: 500 })
    }

    await (admin as any).from("profiles").upsert({
      id: uid, email,
      first_name: firstName, last_name: lastName,
      role, timezone: timezone ?? "America/Chicago",
    })

    if (role === "trainee" && traineeData) {
      await (admin as any).from("trainee_profiles").upsert({
        id: uid,
        certification_target: traineeData.certTarget,
        fieldwork_type: traineeData.fieldworkType,
        requirements_year: "both",
        fieldwork_start_date: traineeData.startDate || null,
        target_hours: traineeData.targetHours,
      })

      if (traineeData.supervisorEmail) {
        const { data: supervisorProfile } = await (admin as any)
          .from("profiles")
          .select("id, role")
          .eq("email", traineeData.supervisorEmail.trim().toLowerCase())
          .eq("role", "supervisor")
          .maybeSingle()

        if (supervisorProfile) {
          const { data: existing } = await (admin as any)
            .from("supervisor_relationships")
            .select("id")
            .eq("supervisor_id", supervisorProfile.id)
            .eq("trainee_id", uid)
            .maybeSingle()

          if (!existing) {
            await (admin as any).from("supervisor_relationships").insert({
              supervisor_id: supervisorProfile.id,
              trainee_id: uid,
              is_primary: true,
              status: "pending",
              start_date: null,
              end_date: null,
            })

            await (admin as any).from("notifications").insert({
              user_id: supervisorProfile.id,
              type: "supervisor_invite",
              title: "New trainee connection request",
              body: `${firstName} ${lastName} has requested you as their supervisor. Go to Supervisees to accept.`,
              read: false,
              related_id: uid,
            })
          }
        }
      }
    } else if (role === "supervisor") {
      await (admin as any).from("supervisor_profiles").upsert({
        id: uid, certification_level: "BCBA",
      })
    }

    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unexpected server error"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
