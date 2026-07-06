"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { AlertCircle, ShieldAlert, HeartPulse, Mail, Lock, Smartphone } from "lucide-react"

import { API_URL } from "@/lib/utils"
import { useAuth, type AuthTokens } from "@/store/auth-context"
import { AuthBrandingPanel } from "@/components/auth/auth-branding-panel"
import { AuthInput } from "@/components/auth/auth-input"
import { AuthButton } from "@/components/auth/auth-button"
import { OTPInput } from "@/components/auth/otp-input"

const fadeSlideUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

const fadeSlideLeft = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

const fadeSlideRight = {
  initial: { opacity: 0, x: -24 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [verificationRequired, setVerificationRequired] = useState(false)
  const [lastEmail, setLastEmail] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const [useOTP, setUseOTP] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otpLoading, setOtpLoading] = useState(false)
  const [otpEmail, setOtpEmail] = useState("")

  const handlePasswordLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setServerError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    try {
      setVerificationRequired(false)
      setLastEmail(email)
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const result = await res.json()
      if (!res.ok) {
        if (res.status === 403 && result.detail?.toLowerCase().includes("verification")) {
          setVerificationRequired(true)
          setLoading(false)
          return
        }
        setServerError(result.detail || "Login failed")
        setLoading(false)
        return
      }
      const tokens: AuthTokens = {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      }
      login(tokens, result.user)
      router.replace("/dashboard")
    } catch (e: any) {
      setServerError(e.message || "Connection error")
      setLoading(false)
    }
  }

  const handleSendOTP = async () => {
    if (!otpEmail) return
    setServerError(null)
    setOtpLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/send-login-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: otpEmail }),
      })
      const result = await res.json()
      if (!res.ok) {
        setServerError(result.detail || "Failed to send OTP")
        setOtpLoading(false)
        return
      }
      setOtpSent(true)
      setLastEmail(otpEmail)
      setOtpLoading(false)
    } catch (e: any) {
      setServerError(e.message || "Connection error")
      setOtpLoading(false)
    }
  }

  const handleOTPComplete = async (otp: string) => {
    setServerError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/auth/login-with-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: lastEmail, otp }),
      })
      const result = await res.json()
      if (!res.ok) {
        setServerError(result.detail || "Invalid OTP")
        setLoading(false)
        return
      }
      const tokens: AuthTokens = {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      }
      login(tokens, result.user)
      router.replace("/dashboard")
    } catch (e: any) {
      setServerError(e.message || "Connection error")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#040810] flex">
      <AuthBrandingPanel />

      {/* Right side */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative">
        {/* Ambient glow */}
        <div className="absolute top-[-20%] right-[-5%] w-[55%] h-[55%] bg-teal-500/3 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-[-15%] left-[-5%] w-[45%] h-[45%] bg-emerald-500/2 rounded-full blur-[120px] pointer-events-none" />

        {/* Grid */}
        <div
          className="absolute inset-0 opacity-[0.015] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />

        <motion.div
          {...fadeSlideUp}
          className="w-full max-w-[440px]"
        >
          <div className="relative rounded-[28px] border border-white/[0.06] bg-white/[0.025] backdrop-blur-2xl p-9 sm:p-11 shadow-2xl shadow-black/30 isolate overflow-hidden">
            {/* Card gradient edge */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-400/15 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-400/5 to-transparent pointer-events-none" />

            {/* Card glow */}
            <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-teal-500/4 rounded-full blur-[120px] pointer-events-none" />

            {/* Logo */}
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-center mb-8"
            >
              <div className="relative inline-flex mb-6">
                <div className="absolute -inset-3 bg-teal-500/10 blur-2xl rounded-full scale-150" />
                <div className="relative w-[68px] h-[68px] rounded-[20px] bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-2xl shadow-teal-500/20">
                  <HeartPulse className="h-[34px] w-[34px] text-white" />
                </div>
              </div>

              <motion.h1
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12, duration: 0.4 }}
                className="text-[30px] font-bold text-white tracking-tight"
              >
                {useOTP ? "Sign in with OTP" : "Welcome back"}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.4 }}
                className="text-sm text-white/40 mt-1.5"
              >
                {useOTP
                  ? "Enter your email to receive a one-time code"
                  : "Sign in to continue to Sanjeevni AI"}
              </motion.p>
            </motion.div>

            {/* Alerts */}
            {verificationRequired && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-500/8 border border-amber-500/12 text-amber-400/90 text-sm mb-6"
              >
                <ShieldAlert className="h-[18px] w-[18px] shrink-0" />
                <span>
                  Email verification required.{" "}
                  <Link
                    href={`/verify-email?email=${encodeURIComponent(lastEmail)}`}
                    className="text-teal-400 hover:text-emerald-300 underline underline-offset-2 transition-colors"
                  >
                    Verify now
                  </Link>
                </span>
              </motion.div>
            )}

            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-red-500/8 border border-red-500/12 text-red-400/90 text-sm mb-6"
              >
                <AlertCircle className="h-[18px] w-[18px] shrink-0" />
                {serverError}
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {useOTP ? (
                <motion.div key="otp" {...fadeSlideLeft}>
                  {!otpSent ? (
                    <div className="space-y-4">
                      <AuthInput
                        label="Email"
                        type="email"
                        placeholder="you@example.com"
                        icon={<Mail className="h-[18px] w-[18px]" />}
                        autoComplete="email"
                        name="otp_email"
                        value={otpEmail}
                        onChange={(e: any) => setOtpEmail(e.target.value || (e as React.ChangeEvent<HTMLInputElement>).target.value)}
                        required
                      />
                      <div className="pt-1">
                        <AuthButton loading={otpLoading} disabled={otpLoading || !otpEmail} onClick={handleSendOTP}>
                          Send OTP
                        </AuthButton>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <p className="text-sm text-white/50 text-center">
                        Code sent to{" "}
                        <span className="text-white/80 font-medium">{lastEmail}</span>
                      </p>
                      <OTPInput length={6} onComplete={handleOTPComplete} error={serverError} disabled={loading} />
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div key="password" {...fadeSlideRight}>
                  <form onSubmit={handlePasswordLogin} noValidate className="space-y-[18px]">
                    <AuthInput
                      label="Email"
                      type="email"
                      placeholder="you@example.com"
                      icon={<Mail className="h-[18px] w-[18px]" />}
                      autoComplete="email"
                      name="email"
                      required
                    />

                    <AuthInput
                      label="Password"
                      type="password"
                      placeholder="Enter your password"
                      icon={<Lock className="h-[18px] w-[18px]" />}
                      autoComplete="current-password"
                      name="password"
                      required
                      showPasswordToggle
                      showPassword={showPassword}
                      onTogglePassword={() => setShowPassword(!showPassword)}
                    />

                    <div className="flex items-center justify-between pt-0.5">
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="peer sr-only"
                          />
                          <div className="w-[20px] h-[20px] rounded-[6px] border border-white/[0.1] bg-white/[0.03] transition-all duration-300 peer-checked:bg-teal-500 peer-checked:border-teal-500 group-hover:border-white/[0.2] flex items-center justify-center">
                            <svg
                              viewBox="0 0 20 20"
                              fill="none"
                              className="w-full h-full opacity-0 peer-checked:opacity-100 transition-opacity duration-200"
                            >
                              <path
                                d="M5 10l3.5 3.5L15 7"
                                stroke="white"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        </div>
                        <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors select-none">
                          Remember me
                        </span>
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-xs text-teal-400/80 hover:text-emerald-300 transition-colors font-medium"
                      >
                        Forgot password?
                      </Link>
                    </div>

                    <div className="pt-0.5">
                      <AuthButton loading={loading} disabled={loading}>
                        Sign in
                      </AuthButton>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* OTP toggle + create account */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="mt-6 space-y-4"
            >
              <AuthButton
                variant="secondary"
                type="button"
                onClick={() => {
                  setUseOTP(!useOTP)
                  setOtpSent(false)
                  setServerError(null)
                }}
              >
                <Smartphone className="h-[16px] w-[16px]" />
                {useOTP ? "Sign in with password" : "Sign in with OTP"}
              </AuthButton>

              <div className="text-center pt-1">
                <p className="text-sm text-white/35">
                  Don&apos;t have an account?{" "}
                  <Link
                    href="/register"
                    className="text-teal-400 hover:text-emerald-300 transition-colors font-semibold"
                  >
                    Create account
                  </Link>
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
