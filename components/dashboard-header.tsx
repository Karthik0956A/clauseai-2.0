"use client"

import { Button } from "@/components/ui/button"

interface DashboardHeaderProps {
  user: { email: string; name: string }
  onLogout: () => void
}

export default function DashboardHeader({ user, onLogout }: DashboardHeaderProps) {
  return (
    <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/60 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/50">
            <span className="text-white font-bold text-lg">⚖️</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">ClauseAI</h1>
            <p className="text-xs text-neutral-400 font-medium">Legal Navigator</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-white">{user.name}</p>
            <p className="text-xs text-neutral-400">{user.email}</p>
          </div>

          <Button
            onClick={onLogout}
            className="border-neutral-700 text-neutral-300 hover:text-white hover:border-cyan-500/50 transition-all bg-transparent font-medium"
          >
            Logout
          </Button>
        </div>
      </div>
    </header>
  )
}
