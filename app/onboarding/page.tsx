"use client"

import { useState } from "react"
import Link from "next/link"
import { ClipboardList, ChevronRight, Check } from "lucide-react"

const steps = ["Your info", "BACB details", "Connect calendar"]

export default function OnboardingPage() {
  const [step, setStep] = useState(0)

  return (
    <div className="min-h-screen bg-[#F7F6FF] flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-8">
        <div className="w-8 h-8 rounded-xl bg-violet-600 flex items-center justify-center">
          <ClipboardList className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-zinc-900 tracking-tight">FieldLog</span>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all
              ${i < step ? "bg-violet-600 text-white" : i === step ? "bg-violet-600 text-white" : "bg-zinc-200 text-zinc-500"}`}>
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i === step ? "text-zinc-900" : "text-zinc-400"}`}>{s}</span>
            {i < steps.length - 1 && <div className={`w-8 h-px ${i < step ? "bg-violet-400" : "bg-zinc-200"}`} />}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-[420px] bg-white rounded-2xl border border-[#E8E6F4] p-8 shadow-sm">
        {step === 0 && <StepOne onNext={() => setStep(1)} />}
        {step === 1 && <StepTwo onNext={() => setStep(2)} onBack={() => setStep(0)} />}
        {step === 2 && <StepThree />}
      </div>

      <p className="text-xs text-zinc-400 mt-5">
        Already have an account?{" "}
        <Link href="/login" className="text-violet-600 font-medium hover:text-violet-700">Sign in</Link>
      </p>
    </div>
  )
}

function StepOne({ onNext }: { onNext: () => void }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-zinc-900 mb-1">Tell us about yourself</h2>
      <p className="text-sm text-zinc-500 mb-6">This helps us set up your account correctly.</p>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">First name</label>
            <input defaultValue="Sarah" className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Last name</label>
            <input defaultValue="Mitchell" className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Email address</label>
          <input type="email" defaultValue="sarah.mitchell@email.com" className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">I am a</label>
          <div className="grid grid-cols-2 gap-2">
            {["BCBA Trainee", "Supervisor (BCBA)"].map((r) => (
              <label key={r} className="flex items-center gap-2 p-3 rounded-lg border border-zinc-200 cursor-pointer hover:border-violet-300 transition-colors text-sm text-zinc-700 font-medium">
                <input type="radio" name="role" className="accent-violet-600" defaultChecked={r === "BCBA Trainee"} />
                {r}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Timezone</label>
          <select className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white">
            <option>America/Chicago (CST)</option>
            <option>America/New_York (EST)</option>
            <option>America/Los_Angeles (PST)</option>
            <option>America/Denver (MST)</option>
          </select>
        </div>
      </div>
      <button onClick={onNext} className="w-full mt-6 flex items-center justify-center gap-2 bg-violet-600 text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-violet-700 transition-colors">
        Continue <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}

function StepTwo({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-zinc-900 mb-1">BACB details</h2>
      <p className="text-sm text-zinc-500 mb-6">Used to calculate your specific compliance requirements.</p>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Certification target</label>
          <select className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all bg-white">
            <option>BCBA</option>
            <option>BCaBA</option>
            <option>RBT</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Fieldwork type</label>
          <div className="space-y-2">
            {[
              { value: "Concentrated", desc: "1,500 hours total, max 50% restricted" },
              { value: "Unrestricted", desc: "2,000 hours total, no restricted limit" },
            ].map((f) => (
              <label key={f.value} className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 cursor-pointer hover:border-violet-300 transition-colors">
                <input type="radio" name="fieldwork" className="mt-0.5 accent-violet-600" defaultChecked={f.value === "Concentrated"} />
                <div>
                  <p className="text-sm font-semibold text-zinc-800">{f.value}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{f.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Supervisor name</label>
          <input defaultValue="Dr. Emily Rodriguez" className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Supervisor email</label>
          <input type="email" placeholder="supervisor@example.com" className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 transition-all" />
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onBack} className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition-colors">
          Back
        </button>
        <button onClick={onNext} className="flex-1 flex items-center justify-center gap-2 bg-violet-600 text-white font-semibold py-2.5 rounded-lg text-sm hover:bg-violet-700 transition-colors">
          Continue <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function StepThree() {
  return (
    <div>
      <h2 className="text-lg font-bold text-zinc-900 mb-1">Connect Google Calendar</h2>
      <p className="text-sm text-zinc-500 mb-6">
        FieldLog pulls your scheduled sessions automatically. You confirm them weekly.
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

      <Link
        href="/trainee"
        className="block w-full text-center text-xs text-zinc-400 hover:text-violet-600 transition-colors py-2"
      >
        Skip for now, connect later →
      </Link>
    </div>
  )
}
