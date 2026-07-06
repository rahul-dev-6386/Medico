"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion } from "framer-motion"
import { AlertCircle, HeartPulse, Mail, CheckCircle2, ArrowLeft } from "lucide-react"

import { API_URL } from "@/lib/utils"
import { AuthBrandingPanel } from "@/components/auth/auth-branding-panel"
import { AuthInput } from "@/components/auth/auth-input"
import { AuthButton } from "@/components/auth/auth-button"

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [resetToken, setResetToken] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setServerError(null)
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const result = await res.json()
      setSent(true)
      if (result.token) setResetToken(result.token)
      setLoading(false)
    } catch (e: any) {
      setServerError(e.message || "Connection error")
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-[#090B10] flex">
        <AuthBrandingPanel />
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[480px]"
          >
            <div className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-2xl p-8 sm:p-10 shadow-2xl shadow-black/20 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
                className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-400 to-[#0EA5A9] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/25"
              >
                <CheckCircle2 className="h-8 w-8 text-white" />
              </motion.div>
              <h1 className="text-2xl font-bold text-[#F1F5F9] mb-2">Check your email</h1>
              <p className="text-sm text-[#64748B] mb-6">
                If an account exists for <span className="text-[#F1F5F9]">{email}</span>, we&apos;ve sent a password reset code.
              </p>

              {resetToken && (
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] mb-6 text-left">
                  <p className="text-xs text-[#64748B] mb-2">Your reset code (also sent via email):</p>
                  <p className="text-sm font-mono text-[#34D399] break-all bg-white/[0.03] p-3 rounded-lg border border-white/[0.06]">
                    {resetToken}
                  </p>
                  <p className="text-xs text-[#64748B] mt-2">
                    Use this on the{" "}
                    <Link href={`/reset-password?token=${encodeURIComponent(resetToken)}`} className="text-[#0EA5A9] hover:text-emerald-400">
                      reset password page
                    </Link>
                  </p>
                </div>
              )}

              <button
                onClick={() => router.push(`/reset-password?token=${resetToken ? encodeURIComponent(resetToken) : ""}`)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-[#0EA5A9] text-white font-medium text-sm hover:from-emerald-400 hover:to-[#0EA5A9] transition-all duration-300 shadow-lg shadow-emerald-500/20 mb-4"
              >
                Reset password
              </button>
              <button
                onClick={() => router.push("/login")}
                className="text-sm text-[#64748B] hover:text-[#F1F5F9] transition-colors"
              >
                Back to sign in
              </button>
            </div>
          </motion.div>
        </div>
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
                <HeartPulse className="h-7 w-7 text-white" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="text-2xl font-bold text-[#F1F5F9] tracking-tight"
              >
                Forgot password
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="text-sm text-[#64748B] mt-1.5"
              >
                Enter your email and we&apos;ll send you a reset code
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
                label="Email"
                type="email"
                placeholder="you@example.com"
                icon={<Mail className="h-4 w-4" />}
                autoComplete="email"
                name="email"
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
                required
              />

              <div className="pt-2">
                <AuthButton loading={loading} disabled={loading}>
                  Send reset code
                </AuthButton>
              </div>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#F1F5F9] transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
