"use client"

import { useState } from "react"
import { useAuth } from "@/store/auth-context"
import { Bell, BellOff, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export function TopHeader() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState(true)

  return (
    <header className="h-16 glass border-b border-white/5 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">AI Health Assistant</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setNotifications(!notifications)}
          className="relative p-2 rounded-xl hover:bg-muted/50 transition-colors"
          title={notifications ? "Mute notifications" : "Enable notifications"}
        >
          {notifications ? (
            <Bell className="h-5 w-5 text-muted-foreground" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          {notifications && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
          )}
        </button>

        <div className="flex items-center gap-3 pl-3 border-l border-white/5">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">{user?.full_name || "User"}</p>
            <p className="text-xs text-muted-foreground">{user?.email || ""}</p>
          </div>
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold",
            "gradient-primary text-white"
          )}>
            {(user?.full_name || "U").charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  )
}
