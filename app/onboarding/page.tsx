"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ClipboardList, ChevronRight, Check, AlertCircle, Eye, EyeOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const steps = ["Your info", "BACB details", "Connect calendar"]

interface StepOneData {
  firstName: string
  lastName: string
  email: string
  password: string
  role: "trainee" | "supervisor"
  timezone: string
}

interface StepTwoData {
  certTarget: "BCBA" | "BCaBA" | "RBT"
  fieldworkType: "supervised" | "concentrated"
  startDate: string
  supervisorEmail: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [stepOneData, setStepOneData] = useState<StepOneData>({
    firstName: "", lastName: "", email: "", password: "",
    role: "trainee", timezone: "America/Chicago",
  })
  const [stepTwoData, setStepTwoData] = useState<StepTwoData>({
    certTarget: "BCBA", fieldworkType: "concentrated",
    startDate: "", supervisorEmail: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSignUp = async () => {
    setError("")
    setLoading(true)

    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 15000)

      let res: Response
      try {
        res = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            email: stepOneData.email,
            password: stepOneData.password,
            firstName: stepOneData.firstName,
            lastName: stepOneData.lastName,
            role: stepOneData.role,
            timezone: stepOneData.timezone,
            traineeData: stepOneData.role === "trainee" ? {
              certTarget: stepTwoData.certTarget,
              fieldworkType: stepTwoData.fieldworkType,
              startDate: stepTwoData.startDate,
              targetHours: stepTwoData.fieldworkType === "concentrated" ? 1500 : 2000,
              supervisorEmail: stepTwoData.supervisorEmail || undefined,
            } : undefined,
          }),
        })
      } finally {
        clearTimeout(timer)
      }

      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? "Failed to create account")
        setLoading(false)
        return
      }

      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: stepOneData.email,
        password: stepOneData.password,
      })

      if (signInError) {
        setError(signInError.message)
        setLoading(false)
        return
      }

      setLoading(false)
      setStep(2)
    } catch (e: unknown) {
      const msg = e instanceof Error
        ? (e.name === "AbortError" ? "Request timed out — check your connection and try again" : e.message)
        : "Unexpected error"
      setError(msg)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F7F6FF] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
          <ClipboardList className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-zinc-900 tracking-tight">ABA Fieldwork Pro</span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              "flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all",
              i < step ? "bg-violet-600 text-white" : i === step ? "bg-violet-600 text-white" : "bg-zinc-200 text-zinc-500"
            )}>
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={cn("text-xs font-medium hidden sm:block", i === step ? "text-zinc-900" : "text-zinc-400")}>{s}</span>
            {i < steps.length - 1 && <div className={cn("w-8 h-px", i < step ? "bg-violet-400" : "bg-zinc-200")} />}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-[#E8E6F4] p-8 shadow-sm">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3.5 py-2.5 mb-5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        {step === 0 && (
          <StepOne
            data={stepOneData}
            onChange={setStepOneData}
            onNext={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <StepTwo
            data={stepTwoData}
            onChange={setStepTwoData}
            role={stepOneData.role}
            loading={loading}
            onNext={handleSignUp}
            onBack={() => setStep(0)}
          />
        )}
        {step === 2 && <StepThree router={router} role={stepOneData.role} />}
      </div>

      <p className="text-xs text-zinc-400 mt-5">
        Already have an account?{" "}
        <Link href="/login" className="text-violet-600 font-medium hover:text-violet-700">Sign in</Link>
      </p>
    </div>
  )
}

function StepOne({ data, onChange, onNext }: {
  data: StepOneData
  onChange: (d: StepOneData) => void
  onNext: () => void
}) {
  const [showPw, setShowPw] = useState(false)
  const valid = data.firstName && data.lastName && data.email && data.password.length >= 8

  return (
    <div>
      <h2 className="text-lg font-bold text-zinc-900 mb-1">Tell us about yourself</h2>
      <p className="text-sm text-zinc-500 mb-6">This helps us set up your account correctly.</p>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">First name</label>
            <input
              value={data.firstName}
              onChange={(e) => onChange({ ...data, firstName: e.target.value })}
              placeholder="Sarah"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Last name</label>
            <input
              value={data.lastName}
              onChange={(e) => onChange({ ...data, lastName: e.target.value })}
              placeholder="Mitchell"
              className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Email address</label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => onChange({ ...data, email: e.target.value })}
            placeholder="you@example.com"
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={data.password}
              onChange={(e) => onChange({ ...data, password: e.target.value })}
              placeholder="At least 8 characters"
              className="w-full px-3.5 py-2.5 pr-10 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
            />
            <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">I am a</label>
          <div className="grid grid-cols-2 gap-2">
            {(["trainee", "supervisor"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onChange({ ...data, role: r })}
                className={cn(
                  "flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors",
                  data.role === r ? "border-violet-400 bg-violet-50 text-violet-800" : "border-zinc-200 text-zinc-700 hover:border-violet-200"
                )}
              >
                <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0", data.role === r ? "border-violet-600 bg-violet-600" : "border-zinc-300")}>
                  {data.role === r && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
                {r === "trainee" ? "BCBA Trainee" : "Supervisor (BCBA)"}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Timezone</label>
          <select
            value={data.timezone}
            onChange={(e) => onChange({ ...data, timezone: e.target.value })}
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
          >
            <option value="America/Chicago">America/Chicago (CST)</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
            <option value="America/Denver">America/Denver (MST)</option>
          </select>
        </div>
      </div>
      <button
        onClick={onNext}
        disabled={!valid}
        className={cn(
          "w-full mt-6 flex items-center justify-center gap-2 font-semibold py-2.5 rounded-lg text-sm transition-colors",
          valid ? "bg-violet-600 text-white hover:bg-violet-700" : "bg-zinc-200 text-zinc-400 cursor-not-allowed"
        )}
      >
        Continue <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

const fieldworkOptions = [
  { value: "concentrated" as const, label: "Concentrated", desc: "1,500 hours total · 7.5% supervision (2027)" },
  { value: "supervised" as const, label: "Supervised", desc: "2,000 hours total · 5% supervision" },
]

function StepTwo({ data, onChange, role, loading, onNext, onBack }: {
  data: StepTwoData
  onChange: (d: StepTwoData) => void
  role: string
  loading: boolean
  onNext: () => void
  onBack: () => void
}) {
  return (
    <div>
      <h2 className="text-lg font-bold text-zinc-900 mb-1">
        {role === "supervisor" ? "Your BCBA details" : "BACB details"}
      </h2>
      <p className="text-sm text-zinc-500 mb-6">Used to calculate your specific compliance requirements.</p>
      <div className="space-y-4">
        {role === "trainee" && (
          <>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Certification target</label>
              <select
                value={data.certTarget}
                onChange={(e) => onChange({ ...data, certTarget: e.target.value as "BCBA" | "BCaBA" | "RBT" })}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white"
              >
                <option value="BCBA">BCBA</option>
                <option value="BCaBA">BCaBA</option>
                <option value="RBT">RBT</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Fieldwork type</label>
              <div className="space-y-2">
                {fieldworkOptions.map((f) => (
                  <label key={f.value} className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 cursor-pointer hover:border-violet-300 transition-colors">
                    <input
                      type="radio"
                      name="fieldwork"
                      checked={data.fieldworkType === f.value}
                      onChange={() => onChange({ ...data, fieldworkType: f.value })}
                      className="mt-0.5 accent-violet-600"
                    />
                    <div>
                      <p className="text-sm font-semibold text-zinc-800">{f.label}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">{f.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Fieldwork start date</label>
              <input
                type="date"
                value={data.startDate}
                onChange={(e) => onChange({ ...data, startDate: e.target.value })}
                className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
              />
            </div>
          </>
        )}
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
            {role === "supervisor" ? "Trainee email (to invite)" : "Supervisor email"}
          </label>
          <input
            type="email"
            value={data.supervisorEmail}
            onChange={(e) => onChange({ ...data, supervisorEmail: e.target.value })}
            placeholder="supervisor@example.com"
            className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all"
          />
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition-colors">
          Back
        </button>
        <button
          onClick={onNext}
          disabled={loading}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 font-semibold py-2.5 rounded-lg text-sm transition-colors",
            loading ? "bg-violet-400 text-white cursor-not-allowed" : "bg-violet-600 text-white hover:bg-violet-700"
          )}
        >
          {loading ? "Creating account…" : <><span>Continue</span><ChevronRight className="w-4 h-4" /></>}
        </button>
      </div>
    </div>
  )
}

function StepThree({ router, role }: { router: ReturnType<typeof useRouter>; role: string }) {
  return (
    <div>
      <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
        <Check className="w-7 h-7 text-emerald-600" />
      </div>
      <h2 className="text-lg font-bold text-zinc-900 mb-1 text-center">Account created!</h2>
      <p className="text-sm text-zinc-500 mb-6 text-center">
        Connect Google Calendar to auto-pull your sessions — or skip for now.
      </p>

      <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100 mb-5 space-y-3">
        {[
          "Pull session events automatically",
          "Match events to your activity templates",
          "Sync every 15 minutes",
          "You always confirm before submitting",
        ].map((item) => (
          <div key={item} className="flex items-center gap-2.5 text-sm text-zinc-700">
            <Check className="w-4 h-4 text-violet-600 flex-shrink-0" />
            {item}
          </div>
        ))}
      </div>

      <button className="w-full flex items-center justify-center gap-2.5 bg-white border border-zinc-200 rounded-lg py-3 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 transition-colors mb-3">
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Connect Google Calendar
      </button>

      <button
        onClick={() => router.push(role === "supervisor" ? "/supervisor" : "/trainee")}
        className="block w-full text-center text-xs text-zinc-400 hover:text-violet-600 transition-colors py-2"
      >
        Skip for now, connect later →
      </button>
    </div>
  )
}
