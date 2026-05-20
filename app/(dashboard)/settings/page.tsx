import Link from "next/link"
import { User, Bell, Shield, ChevronRight, Calendar } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="p-4 md:p-7 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Settings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Manage your account and preferences</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-violet-600 flex items-center justify-center">
            <span className="text-white text-lg font-bold">SM</span>
          </div>
          <div>
            <p className="font-bold text-zinc-900">Sarah Mitchell</p>
            <p className="text-sm text-zinc-500">BCBA Trainee · Concentrated Fieldwork</p>
            <p className="text-xs text-zinc-400 mt-0.5">sarah.mitchell@email.com</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">First name</label>
              <input defaultValue="Sarah" className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Last name</label>
              <input defaultValue="Mitchell" className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Email address</label>
            <input type="email" defaultValue="sarah.mitchell@email.com" className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Timezone</label>
            <select className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none bg-white">
              <option>America/Chicago (CST)</option>
              <option>America/New_York (EST)</option>
              <option>America/Los_Angeles (PST)</option>
            </select>
          </div>
          <button className="bg-violet-600 text-white font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-violet-700 transition-colors">
            Save changes
          </button>
        </div>
      </div>

      {/* BACB Info */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] p-5 mb-5">
        <h3 className="text-sm font-semibold text-zinc-900 mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4 text-violet-600" />
          BACB Certification Details
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-zinc-50">
            <span className="text-sm text-zinc-500">Certification target</span>
            <span className="text-sm font-semibold text-zinc-900">BCBA</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-zinc-50">
            <span className="text-sm text-zinc-500">Fieldwork type</span>
            <span className="text-sm font-semibold text-zinc-900">Concentrated</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-zinc-50">
            <span className="text-sm text-zinc-500">Target hours</span>
            <span className="text-sm font-semibold text-zinc-900">1,000 hours</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-zinc-500">Supervisor</span>
            <span className="text-sm font-semibold text-zinc-900">Dr. Emily Rodriguez</span>
          </div>
        </div>
        <button className="mt-4 text-xs font-semibold text-violet-600 hover:text-violet-700">
          Request supervisor change →
        </button>
      </div>

      {/* Settings list */}
      <div className="bg-white rounded-xl border border-[#E8E6F4] overflow-hidden mb-5">
        {[
          { icon: Bell, label: "Notifications", desc: "Weekly reminders, approval alerts", href: "/settings/notifications" },
          { icon: Calendar, label: "Calendar Sync", desc: "Google Calendar connection", href: "/settings/calendar" },
          { icon: User, label: "Account & Security", desc: "Password, two-factor authentication", href: "/settings/security" },
        ].map((item, i, arr) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 transition-colors ${i < arr.length - 1 ? "border-b border-zinc-50" : ""}`}
          >
            <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
              <item.icon className="w-4 h-4 text-violet-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-zinc-900">{item.label}</p>
              <p className="text-xs text-zinc-400">{item.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-300" />
          </Link>
        ))}
      </div>

      {/* Danger zone */}
      <button className="w-full py-2.5 text-sm font-semibold text-red-500 border border-red-100 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
        Sign out
      </button>
    </div>
  )
}
