import Link from "next/link"
import { ClipboardList, ArrowLeft, Home } from "lucide-react"

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center" style={{ backgroundColor: "var(--background, #F7F6FF)" }}>
      {/* Logo */}
      <div className="flex items-center gap-2.5 mb-12">
        <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center">
          <ClipboardList className="w-4.5 h-4.5 text-white" />
        </div>
        <span className="font-bold text-zinc-900 text-lg tracking-tight">ABA Fieldwork Pro</span>
      </div>

      {/* 404 illustration */}
      <div className="relative mb-8">
        <div className="text-[7rem] md:text-[10rem] font-black text-zinc-100 leading-none select-none">
          404
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white border border-[#E8E6F4] rounded-2xl shadow-lg px-6 py-4 max-w-xs">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <div className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2 bg-zinc-100 rounded-full w-full" />
              <div className="h-2 bg-violet-100 rounded-full w-3/4" />
              <div className="h-2 bg-zinc-100 rounded-full w-1/2" />
            </div>
            <p className="text-xs text-zinc-400 mt-3 font-mono">Error: Page not found</p>
          </div>
        </div>
      </div>

      <h1 className="text-2xl md:text-3xl font-bold text-zinc-900 mb-2">
        This page doesn&apos;t exist
      </h1>
      <p className="text-sm text-zinc-500 max-w-xs mb-8">
        The page you&apos;re looking for may have been moved, deleted, or you may have mistyped the URL.
      </p>

      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href="javascript:history.back()"
          className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl border border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go back
        </Link>
        <Link
          href="/trainee"
          className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors"
        >
          <Home className="w-4 h-4" />
          Go to dashboard
        </Link>
      </div>

      <p className="text-xs text-zinc-300 mt-12">
        ABA Fieldwork Pro · BACB Fieldwork Tracker
      </p>
    </div>
  )
}
