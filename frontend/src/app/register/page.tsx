"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { AlertCircle, HeartPulse, Mail, Lock, User } from "lucide-react"

import { API_URL } from "@/lib/utils"
import { useAuth, type AuthTokens } from "@/store/auth-context"
import { AuthBrandingPanel } from "@/components/auth/auth-branding-panel"
import { AuthInput } from "@/components/auth/auth-input"
import { AuthButton } from "@/components/auth/auth-button"

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [agreeTerms, setAgreeTerms] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setServerError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const full_name = formData.get("full_name") as string
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const confirm_password = formData.get("confirm_password") as string

    if (password !== confirm_password) {
      setServerError("Passwords do not match")
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name, email, password }),
      })
      const result = await res.json()
      if (!res.ok) {
        setServerError(result.detail || "Registration failed")
        setLoading(false)
        return
      }
      const tokens: AuthTokens = {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      }
      login(tokens, result.user)
      router.replace(`/verify-email?email=${encodeURIComponent(email)}`)
    } catch (e: any) {
      setServerError(e.message || "Connection error")
      setLoading(false)
    }
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
                <HeartPulse className="h-7 w-7 text-white" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="text-2xl font-bold text-[#F1F5F9] tracking-tight"
              >
                Create account
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="text-sm text-[#64748B] mt-1.5"
              >
                Start your health journey with Sanjeevni AI
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
                label="Full name"
                type="text"
                placeholder="Dr. Smith"
                icon={<User className="h-4 w-4" />}
                autoComplete="name"
                name="full_name"
                required
              />

              <AuthInput
                label="Email"
                type="email"
                placeholder="you@example.com"
                icon={<Mail className="h-4 w-4" />}
                autoComplete="email"
                name="email"
                required
              />

              <AuthInput
                label="Password"
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

              <div className="pt-1">
                <label className="flex items-start gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-white/[0.15] bg-white/[0.04] text-[#0EA5A9] focus:ring-[#0EA5A9]/30 focus:ring-offset-0 cursor-pointer"
                  />
                  <span className="text-xs text-[#64748B] group-hover:text-[#94A3B8] transition-colors leading-relaxed">
                    I agree to the{" "}
                    <Link href="/terms" className="text-[#0EA5A9] hover:text-emerald-400 transition-colors">Terms of Service</Link>
                    {" "}and{" "}
                    <Link href="/privacy" className="text-[#0EA5A9] hover:text-emerald-400 transition-colors">Privacy Policy</Link>
                  </span>
                </label>
              </div>

              <div className="pt-2">
                <AuthButton loading={loading} disabled={loading || !agreeTerms}>
                  Create account
                </AuthButton>
              </div>
            </form>

            <div className="mt-8 text-center">
              <p className="text-sm text-[#64748B]">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="text-[#0EA5A9] hover:text-emerald-400 transition-colors font-medium relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-[#0EA5A9]/40 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
