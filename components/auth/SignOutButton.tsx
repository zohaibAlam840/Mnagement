"use client"

import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

interface SignOutButtonProps {
  className?: string
  children: React.ReactNode
}

export function SignOutButton({ className, children }: SignOutButtonProps) {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <button onClick={handleSignOut} className={className}>
      {children}
    </button>
  )
}
