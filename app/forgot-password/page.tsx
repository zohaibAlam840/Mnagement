"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, Mail, ClipboardList, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSent(true)
    }, 900)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--background, #F7F6FF)" }}>
      {/* Top bar */}
      <div className="px-6 py-5 flex items-center justify-between">
        <Link href="/login" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to login
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
            <ClipboardList className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-zinc-900 text-sm">FieldLog</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 mb-2">Check your email</h1>
              <p className="text-sm text-zinc-500 mb-1">
                We sent a password reset link to
              </p>
              <p className="text-sm font-semibold text-zinc-800 mb-6">{email}</p>
              <p className="text-xs text-zinc-400 mb-8">
                Didn&apos;t get it? Check your spam folder or{" "}
                <button onClick={() => setSent(false)} className="text-violet-600 hover:text-violet-700 font-medium">
                  try again
                </button>
              </p>
              <Link
                href="/login"
                className="block w-full py-3 text-sm font-semibold rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-center transition-colors"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center mb-4">
                  <Mail className="w-5 h-5 text-violet-600" />
                </div>
                <h1 className="text-2xl font-bold text-zinc-900 mb-2">Forgot your password?</h1>
                <p className="text-sm text-zinc-500">
                  Enter the email address on your FieldLog account and we&apos;ll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-3 text-sm rounded-xl border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!email || loading}
                  className={cn(
                    "w-full py-3 text-sm font-semibold rounded-xl transition-colors",
                    email && !loading
                      ? "bg-violet-600 text-white hover:bg-violet-700"
                      : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                  )}
                >
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>

              <p className="text-center text-xs text-zinc-400 mt-6">
                Remembered it?{" "}
                <Link href="/login" className="text-violet-600 hover:text-violet-700 font-medium">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
