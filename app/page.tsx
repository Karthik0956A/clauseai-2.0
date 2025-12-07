"use client"

import { useState, useEffect } from "react"
import Dashboard from "@/components/dashboard"
import { Loader2 } from "lucide-react"

export default function Home() {
  const [user, setUser] = useState<{ email: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch the current user session
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/auth/me")
        if (res.ok) {
          const data = await res.json()
          setUser(data.user)
        } else {
          // If api/auth/me fails even though middleware let us through (edge case),
          // typically this won't happen, but good to handle.
          setUser(null)
        }
      } catch (e) {
        console.error("Failed to fetch user", e)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-black flex items-center justify-center text-white">
        <Loader2 className="animate-spin text-cyan-500" size={32} />
      </div>
    )
  }

  // If for some reason we aren't logged in (should be handled by middleware)
  if (!user) {
    return null; // or redirect, but middleware handles this.
  }

  return (
    <main className="w-full min-h-screen bg-black">
      <Dashboard user={user} onLogout={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/auth";
      }} />
    </main>
  )
}
