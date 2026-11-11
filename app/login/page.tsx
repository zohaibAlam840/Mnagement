"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message === "Invalid login credentials"
        ? "Incorrect email or password."
        : signInError.message)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
      window.location.href = profile?.role === "supervisor" ? "/supervisor" : "/trainee"
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  return (
    <div className="min-h-screen bg-[#F7F6FF] flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-10">
        <div className="h-10 bg-violet-600 rounded-xl px-3 flex items-center">
          <Image
            src="/WhatsApp_Image_2026-05-28_at_12.32.44__2_-removebg-preview.png"
            alt="ABA Fieldwork Pro"
            width={140}
            height={28}
            className="h-7 w-auto object-contain"
          />
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-[360px] bg-white rounded-2xl border border-[#E8E6F4] p-8 shadow-sm">
        <h1 className="text-xl font-bold text-zinc-900 mb-1">Welcome back</h1>
        <p className="text-sm text-zinc-500 mb-7">Sign in to your ABA Fieldwork Pro account</p>

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5" htmlFor="email">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            />
          </div>

          <div>
            {/* "Forgot password?" hidden for now: Supabase auth URLs aren't set up for the custom domain yet */}
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-zinc-700" htmlFor="password">
                Password
              </label>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={cn(
              "w-full font-semibold py-2.5 rounded-lg text-sm transition-colors mt-1",
              loading
                ? "bg-violet-400 text-white cursor-not-allowed"
                : "bg-violet-600 text-white hover:bg-violet-700"
            )}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        {/* "Continue with Google" sign-in hidden for now: the Google provider isn't enabled in Supabase.
            handleGoogle is kept so it can be restored later. Google Calendar sync is separate and unaffected. */}

        <p className="text-center text-xs text-zinc-400 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/onboarding" className="text-violet-600 font-medium hover:text-violet-700">
            Get started
          </Link>
        </p>
      </div>

      {/* Demo links */}
      <div className="mt-6 flex items-center gap-4 text-xs text-zinc-400">
        <Link href="/trainee" className="hover:text-violet-600 transition-colors">→ View trainee demo</Link>
        <Link href="/supervisor" className="hover:text-violet-600 transition-colors">→ View supervisor demo</Link>
      </div>
    </div>
  )
}
