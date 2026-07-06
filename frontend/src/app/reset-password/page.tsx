"use client"

import { useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { AlertCircle, HeartPulse, Lock, CheckCircle2, Loader2 } from "lucide-react"

import { API_URL } from "@/lib/utils"
import { AuthBrandingPanel } from "@/components/auth/auth-branding-panel"
import { AuthInput } from "@/components/auth/auth-input"
import { AuthButton } from "@/components/auth/auth-button"

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [reset, setReset] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setServerError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const password = formData.get("password") as string
    const confirm = formData.get("confirm_password") as string

    if (password !== confirm) {
      setServerError("Passwords do not match")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setServerError("Password must be at least 6 characters")
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })
      const result = await res.json()
      if (!res.ok) {
        setServerError(result.detail || "Reset failed")
        setLoading(false)
        return
      }
      setReset(true)
      setLoading(false)
    } catch (e: any) {
      setServerError(e.message || "Connection error")
      setLoading(false)
    }
  }

  if (reset) {
    return (
      <div className="min-h-screen bg-[#090B10] flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-[#0EA5A9] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/25"
          >
            <CheckCircle2 className="h-10 w-10 text-white" />
          </motion.div>
          <h1 className="text-2xl font-bold text-[#F1F5F9] mb-2">Password reset!</h1>
          <p className="text-[#64748B] mb-6">Your password has been updated successfully.</p>
          <button
            onClick={() => router.push("/login")}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-[#0EA5A9] text-white font-medium text-sm hover:from-emerald-400 hover:to-[#0EA5A9] transition-all duration-300 shadow-lg shadow-emerald-500/20"
          >
            Sign in
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#090B10] flex">
      <AuthBrandingPanel />
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-[480px]"
        >
          <div className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-2xl p-8 sm:p-10 shadow-2xl shadow-black/20">
            <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#0EA5A9]/5 rounded-full blur-3xl pointer-events-none" />

            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-[#0EA5A9] flex items-center justify-center mx-auto mb-5 shadow-xl shadow-emerald-500/20"
              >
                <Lock className="h-7 w-7 text-white" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="text-2xl font-bold text-[#F1F5F9] tracking-tight"
              >
                Reset password
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="text-sm text-[#64748B] mt-1.5"
              >
                Enter your new password
              </motion.p>
            </div>

            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-500/8 border border-red-500/15 text-red-400 text-sm mb-6"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {serverError}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <AuthInput
                label="New password"
                type="password"
                placeholder="••••••••"
                icon={<Lock className="h-4 w-4" />}
                autoComplete="new-password"
                name="password"
                required
                showPasswordToggle
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
              />
              <AuthInput
                label="Confirm password"
                type="password"
                placeholder="••••••••"
                icon={<Lock className="h-4 w-4" />}
                autoComplete="new-password"
                name="confirm_password"
                required
              />

              <div className="pt-2">
                <AuthButton loading={loading} disabled={loading}>
                  Reset password
                </AuthButton>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#090B10] flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-[#64748B]" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
