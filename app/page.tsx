import Image from "next/image"
import Link from "next/link"
import { ArrowRight, CheckCircle2 } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 md:px-12 h-16 border-b border-zinc-100 sticky top-0 bg-white/90 backdrop-blur z-10">
        <div className="h-9 bg-violet-600 rounded-xl px-3 flex items-center">
          <Image
            src="/WhatsApp_Image_2026-05-28_at_12.32.44__2_-removebg-preview.png"
            alt="ABA Fieldwork Pro"
            width={140}
            height={28}
            className="h-7 w-auto object-contain"
          />
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors font-medium">
            Sign in
          </Link>
          <Link
            href="/onboarding"
            className="text-sm font-medium bg-violet-600 text-white px-4 py-2 rounded-lg hover:bg-violet-700 transition-colors"
          >
            Get started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 md:px-12 pt-20 pb-16 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-violet-100">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
          Built for BCBA fieldwork supervision
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-zinc-900 leading-tight tracking-tight mb-6">
          Stop tracking hours
          <br />
          <span className="text-violet-600">by hand.</span>
        </h1>
        <p className="text-lg text-zinc-500 max-w-xl mx-auto mb-10 leading-relaxed">
          Connect your Google Calendar, confirm activities weekly, and let ABA Fieldwork Pro
          calculate your BACB compliance ratios automatically.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/onboarding"
            className="flex items-center gap-2 bg-violet-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-violet-700 transition-colors text-sm"
          >
            Start tracking for free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/trainee"
            className="flex items-center gap-2 text-zinc-600 font-medium px-6 py-3 rounded-xl border border-zinc-200 hover:border-zinc-300 transition-colors text-sm"
          >
            View demo dashboard
          </Link>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-zinc-100 bg-zinc-50 py-10 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 text-center">
          {[
            { value: "80%", label: "Less manual entry" },
            { value: "Real-time", label: "Compliance monitoring" },
            { value: "Auto", label: "Monthly report generation" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-2xl md:text-3xl font-bold text-zinc-900">{s.value}</p>
              <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 md:px-12 py-20 max-w-5xl mx-auto">
        <p className="text-xs font-semibold tracking-widest uppercase text-zinc-400 text-center mb-12">
          Everything you need, nothing you don&apos;t
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: "Calendar Sync",
              desc: "Connect your Google Calendar. ABA Fieldwork Pro pulls your scheduled sessions automatically — no double entry.",
            },
            {
              title: "BACB Compliance Engine",
              desc: "Real-time restricted/unrestricted ratio tracking, supervision percentages, and proactive violation warnings.",
            },
            {
              title: "Supervisor Workflows",
              desc: "Supervisors review, approve, and sign weekly logs. Monthly verification forms generate automatically.",
            },
          ].map((f) => (
            <div key={f.title} className="p-6 rounded-2xl border border-zinc-100 hover:border-violet-100 hover:shadow-sm transition-all">
              <div className="w-2 h-2 rounded-full bg-violet-500 mb-4" />
              <h3 className="font-semibold text-zinc-900 mb-2">{f.title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-zinc-50 border-t border-zinc-100 px-6 md:px-12 py-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-zinc-900 text-center mb-12">
            Set it once. Confirm quickly.
          </h2>
          <div className="space-y-8">
            {[
              {
                step: "01",
                title: "Connect your Google Calendar",
                desc: "Sign in with Google and select which calendars contain your fieldwork sessions.",
              },
              {
                step: "02",
                title: "Tag your activity templates",
                desc: "Create recurring templates — 'Monday DTT Session', 'Parent Training' — and assign BACB categories once.",
              },
              {
                step: "03",
                title: "Confirm weekly, done",
                desc: "Every week, review what ABA Fieldwork Pro pulled from your calendar. Confirm in seconds. Your supervisor gets a notification to approve.",
              },
            ].map((s) => (
              <div key={s.step} className="flex gap-5 items-start">
                <span className="text-3xl font-black text-zinc-200 leading-none w-10 flex-shrink-0">{s.step}</span>
                <div>
                  <h3 className="font-semibold text-zinc-900 mb-1">{s.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 text-center bg-violet-600">
        <h2 className="text-2xl font-bold text-white mb-3">
          Ready to simplify your fieldwork hours?
        </h2>
        <p className="text-violet-200 text-sm mb-8 max-w-sm mx-auto">
          Join trainees and supervisors who track BACB hours without the spreadsheets.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm">
          <Link
            href="/onboarding"
            className="bg-white text-violet-700 font-semibold px-6 py-3 rounded-xl hover:bg-violet-50 transition-colors"
          >
            Create your account
          </Link>
          <div className="flex items-center gap-4 text-violet-200">
            {["Free to start", "No credit card", "BACB-aligned"].map((t) => (
              <span key={t} className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      <footer className="px-6 py-6 border-t border-zinc-100 text-center">
        <p className="text-xs text-zinc-400">© 2025 ABA Fieldwork Pro · Built for BCBA fieldwork tracking</p>
      </footer>
    </div>
  )
}
