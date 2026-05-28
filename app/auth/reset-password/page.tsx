"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ClipboardList, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { setError("Passwords don't match"); return }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return }
    setError("")
    setLoading(true)

    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    setLoading(false)
    if (updateError) { setError(updateError.message); return }

    setDone(true)
    setTimeout(() => router.push("/login"), 2500)
  }

  return (
    <div className="min-h-screen bg-[#F7F6FF] flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-2.5 mb-10">
        <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        <span className="font-bold text-zinc-900 text-lg tracking-tight">ABA Fieldwork Pro</span>
      </div>

      <div className="w-full max-w-[360px] bg-white rounded-2xl border border-[#E8E6F4] p-8 shadow-sm">
        {done ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 mb-1">Password updated</h2>
            <p className="text-sm text-zinc-500">Redirecting you to sign in…</p>
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold text-zinc-900 mb-1">Set new password</h1>
            <p className="text-sm text-zinc-500 mb-7">Choose a strong password for your account.</p>

            <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">New password</label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat new password"
                  required
                  className={cn(
                    "w-full px-3.5 py-2.5 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-violet-500/30 transition-all",
                    confirm && confirm !== password ? "border-red-300 focus:border-red-400" : "border-zinc-200 focus:border-violet-400"
                  )}
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
                disabled={loading || !password || !confirm}
                className={cn(
                  "w-full py-2.5 text-sm font-semibold rounded-lg transition-colors",
                  !loading && password && confirm
                    ? "bg-violet-600 text-white hover:bg-violet-700"
                    : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                )}
              >
                {loading ? "Updating…" : "Update password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
