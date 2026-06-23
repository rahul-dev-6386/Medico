"use client"

import { useAuth } from "@/store/auth-context"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Sun, Moon, Bell, LogOut } from "lucide-react"
import { useTheme } from "@/store/theme-context"

export default function SettingsPage() {
  const { logout } = useAuth()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your preferences</p>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="space-y-4">
        <GlassCard hover={false}>
          <h3 className="font-semibold mb-4">Appearance</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === "dark" ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-amber-400" />}
              <div>
                <p className="text-sm font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Toggle between light and dark themes</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={toggleTheme} className="glass">
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </Button>
          </div>
        </GlassCard>

        <GlassCard hover={false}>
          <h3 className="font-semibold mb-4">Notifications</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-muted-foreground">Receive reminders for medications and health checks</p>
              </div>
            </div>
            <div className="w-11 h-6 rounded-full bg-primary cursor-pointer relative">
              <div className="absolute right-1 top-1 w-4 h-4 rounded-full bg-white" />
            </div>
          </div>
        </GlassCard>

        <GlassCard hover={false}>
          <h3 className="font-semibold mb-4">Account</h3>
          <Button onClick={logout} variant="destructive" className="gap-2 w-full">
            <LogOut className="h-4 w-4" />Sign Out
          </Button>
        </GlassCard>
      </motion.div>
    </div>
  )
}
