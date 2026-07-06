"use client"

import { useState } from "react"
import { useAuth } from "@/store/auth-context"
import { API_URL } from "@/lib/utils"
import { GlassCard } from "@/components/ui/glass-card"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { Sun, Moon, Bell, LogOut, Lock, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react"
import { useTheme } from "@/store/theme-context"

export default function SettingsPage() {
  const { logout, tokens } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [cpError, setCpError] = useState<string | null>(null)
  const [cpSuccess, setCpSuccess] = useState(false)
  const [cpLoading, setCpLoading] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setCpError(null)
    setCpSuccess(false)

    if (newPassword !== confirmPassword) {
      setCpError("Passwords do not match")
      return
    }
    if (newPassword.length < 6) {
      setCpError("Password must be at least 6 characters")
      return
    }

    setCpLoading(true)
    try {
      const access = tokens?.access_token
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(access ? { Authorization: `Bearer ${access}` } : {}),
        },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      const result = await res.json()
      if (!res.ok) {
        setCpError(result.detail || "Failed to change password")
        setCpLoading(false)
        return
      }
      setCpSuccess(true)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setShowChangePassword(false)
      setCpLoading(false)
    } catch (e: any) {
      setCpError(e.message || "Connection error")
      setCpLoading(false)
    }
  }

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
          <div className="space-y-3">
            <Button
              onClick={() => { setShowChangePassword(!showChangePassword); setCpError(null); setCpSuccess(false) }}
              variant="outline"
              className="gap-2 w-full glass"
            >
              <Lock className="h-4 w-4" />Change Password
            </Button>

            {showChangePassword && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleChangePassword}
                className="space-y-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]"
              >
                {cpSuccess && (
                  <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 rounded-lg p-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    Password changed successfully
                  </div>
                )}
                {cpError && (
                  <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/8 border border-red-500/15 rounded-lg p-3">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {cpError}
                  </div>
                )}

                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    placeholder="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-[#F1F5F9] placeholder:text-[#64748B]/50 outline-none focus:border-[#0EA5A9]/50 transition-colors"
                    required
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#F1F5F9]">
                    {showCurrent ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-[#F1F5F9] placeholder:text-[#64748B]/50 outline-none focus:border-[#0EA5A9]/50 transition-colors"
                    required
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#F1F5F9]">
                    {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2.5 text-sm text-[#F1F5F9] placeholder:text-[#64748B]/50 outline-none focus:border-[#0EA5A9]/50 transition-colors"
                    required
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#F1F5F9]">
                    {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <Button type="submit" disabled={cpLoading || !currentPassword || !newPassword || !confirmPassword} className="w-full gap-2">
                  {cpLoading ? "Saving..." : "Update password"}
                </Button>
              </motion.form>
            )}

            <Button onClick={logout} variant="destructive" className="gap-2 w-full">
              <LogOut className="h-4 w-4" />Sign Out
            </Button>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  )
}
