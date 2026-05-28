"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronLeft, Lock, Smartphone, LogOut, CheckCircle2, Eye, EyeOff, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { SignOutButton } from "@/components/auth/SignOutButton"
import { createClient } from "@/lib/supabase/client"

export default function SecurityPage() {
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [pwSaved, setPwSaved] = useState(false)
  const [pwError, setPwError] = useState("")
  const [saving, setSaving] = useState(false)

  const strengthScore = (() => {
    if (!newPw) return 0
    let score = 0
    if (newPw.length >= 8) score++
    if (/[A-Z]/.test(newPw)) score++
    if (/[0-9]/.test(newPw)) score++
    if (/[^A-Za-z0-9]/.test(newPw)) score++
    return score
  })()

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strengthScore]
  const strengthColor = ["", "bg-red-500", "bg-amber-400", "bg-blue-500", "bg-emerald-500"][strengthScore]

  const handlePasswordSave = async () => {
    setPwError("")
    if (newPw.length < 8) return setPwError("New password must be at least 8 characters")
    if (newPw !== confirmPw) return setPwError("Passwords don't match")
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setSaving(false)
    if (error) { setPwError(error.message); return }
    setPwSaved(true)
    setNewPw("")
    setConfirmPw("")
    setTimeout(() => setPwSaved(false), 3000)
  }

  return (
    <div className="p-4 md:p-7 max-w-2xl mx-auto">
      <Link href="/settings" className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-800 mb-5 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Settings
      </Link>

      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Account & Security</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Manage your password and access controls</p>
      </div>

      {/* Change password */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-4">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
            <Lock className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">Change password</p>
            <p className="text-xs text-zinc-400">Enter a new password for your account</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">New password</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
              />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {newPw && (
              <div className="mt-2 space-y-1">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={cn("h-1 flex-1 rounded-full transition-all", i <= strengthScore ? strengthColor : "bg-zinc-100")} />
                  ))}
                </div>
                {strengthLabel && <p className={cn("text-xs font-medium", strengthScore <= 1 ? "text-red-500" : strengthScore === 2 ? "text-amber-500" : strengthScore === 3 ? "text-blue-500" : "text-emerald-600")}>{strengthLabel}</p>}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Confirm new password</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="Repeat new password"
                className={cn(
                  "w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg border focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all",
                  confirmPw && confirmPw !== newPw ? "border-red-300 focus:border-red-400" : "border-zinc-200 focus:border-violet-400"
                )}
              />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPw && confirmPw !== newPw && (
              <p className="text-xs text-red-500 mt-1.5">Passwords don&apos;t match</p>
            )}
          </div>

          {pwError && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3.5 py-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {pwError}
            </div>
          )}

          <button
            onClick={handlePasswordSave}
            disabled={saving || newPw.length < 8 || newPw !== confirmPw}
            className={cn(
              "w-full py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60",
              pwSaved ? "bg-emerald-600 text-white" : "bg-violet-600 text-white hover:bg-violet-700"
            )}
          >
            {pwSaved ? <><CheckCircle2 className="w-4 h-4" /> Password updated</> : saving ? "Updating…" : "Update password"}
          </button>
        </div>
      </div>

      {/* Two-factor auth */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-900">Two-factor authentication</p>
              <p className="text-xs text-zinc-400">{twoFAEnabled ? "Enabled via authenticator app" : "Add an extra layer of security"}</p>
            </div>
          </div>
          <button
            onClick={() => setTwoFAEnabled(!twoFAEnabled)}
            className={cn(
              "w-11 h-6 rounded-full flex items-center transition-all flex-shrink-0",
              twoFAEnabled ? "bg-violet-600 justify-end" : "bg-zinc-200 justify-start"
            )}
          >
            <div className="w-5 h-5 rounded-full bg-white shadow-sm mx-0.5" />
          </button>
        </div>
        {twoFAEnabled && (
          <div className="mt-4 pt-4 border-t border-zinc-50">
            <p className="text-xs text-zinc-500 mb-3">Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)</p>
            <div className="w-28 h-28 bg-zinc-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <div className="grid grid-cols-5 gap-0.5">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div key={i} className={cn("w-4 h-4", [0,1,5,6,7,12,18,19,23,24,3,8,16,21].includes(i) ? "bg-zinc-800" : "bg-zinc-100")} />
                ))}
              </div>
            </div>
            <p className="text-center text-xs text-zinc-400">Or enter setup key: <span className="font-mono font-semibold text-zinc-700">JBSW Y3DP EBLW 64TM</span></p>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="bg-red-50 border border-red-100 rounded-xl p-5">
        <p className="text-sm font-semibold text-red-800 mb-1">Danger zone</p>
        <p className="text-xs text-red-600 mb-4">These actions are permanent and cannot be undone.</p>
        <div className="space-y-2">
          <SignOutButton className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-red-200 bg-white hover:bg-red-50 transition-colors">
            <div className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4 text-red-500" />
              <span className="text-sm font-semibold text-red-700">Sign out all devices</span>
            </div>
          </SignOutButton>
        </div>
      </div>
    </div>
  )
}
