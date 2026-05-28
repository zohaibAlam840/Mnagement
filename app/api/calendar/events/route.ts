import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function getValidAccessToken(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  profile: { google_refresh_token: string; google_access_token: string; google_token_expires_at: string }
): Promise<string | null> {
  // Return existing token if still valid (with 1-min buffer)
  if (new Date(profile.google_token_expires_at) > new Date(Date.now() + 60_000)) {
    return profile.google_access_token
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: profile.google_refresh_token,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  })

  const data = await res.json()
  if (!data.access_token) return null

  await (supabase.from("profiles") as any)
    .update({
      google_access_token: data.access_token,
      google_token_expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
    })
    .eq("id", userId)

  return data.access_token
}

export async function GET(req: NextRequest) {
  const timeMin = req.nextUrl.searchParams.get("timeMin")
  const timeMax = req.nextUrl.searchParams.get("timeMax")

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await (supabase.from("profiles") as any)
    .select("google_refresh_token, google_access_token, google_token_expires_at")
    .eq("id", user.id)
    .single()

  if (!profile?.google_refresh_token) {
    return NextResponse.json({ error: "not_connected" }, { status: 400 })
  }

  const accessToken = await getValidAccessToken(supabase, user.id, profile)
  if (!accessToken) {
    return NextResponse.json({ error: "token_refresh_failed" }, { status: 401 })
  }

  const params = new URLSearchParams({
    timeMin: timeMin || new Date().toISOString(),
    timeMax: timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "100",
  })

  const calRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  const data = await calRes.json()
  if (data.error) {
    return NextResponse.json({ error: data.error.message }, { status: 400 })
  }

  // Filter out all-day events and cancelled events
  const events = (data.items || []).filter(
    (e: any) => e.start?.dateTime && e.status !== "cancelled"
  )

  return NextResponse.json(events)
}
