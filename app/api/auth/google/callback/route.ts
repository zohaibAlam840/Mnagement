import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")
  const oauthError = req.nextUrl.searchParams.get("error")
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (oauthError || !code) {
    return NextResponse.redirect(`${appUrl}/settings/calendar?error=denied`)
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${appUrl}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  })

  const tokens = await tokenRes.json()

  if (!tokens.access_token) {
    return NextResponse.redirect(`${appUrl}/settings/calendar?error=token_failed`)
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(`${appUrl}/login`)

  await (supabase.from("profiles") as any)
    .update({
      google_refresh_token: tokens.refresh_token ?? null,
      google_access_token: tokens.access_token,
      google_token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    })
    .eq("id", user.id)

  return NextResponse.redirect(`${appUrl}/settings/calendar?connected=true`)
}
