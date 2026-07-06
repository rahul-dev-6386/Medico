"use client"

import { Suspense, useState, useEffect, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  HeartPulse,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
} from "lucide-react"

import { API_URL } from "@/lib/utils"
import { useAuth } from "@/store/auth-context"
import { OTPInput } from "@/components/auth/otp-input"

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, tokens, isAuthenticated, login } = useAuth()

  const email = searchParams.get("email") || user?.email || ""

  const [otpError, setOtpError] = useState<string | null>(null)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [verified, setVerified] = useState(false)
  const [countdown, setCountdown] = useState(600)
  const [resendAvailable, setResendAvailable] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const maskedEmail = email
    ? email.replace(/^(.)(.*)(@.*)$/, (_, first, middle, domain) =>
        `${first}${"*".repeat(Math.min(middle.length, 4))}${middle.length > 4 ? middle.slice(-1) : ""}${domain}`
      )
    : ""

  const startCountdown = useCallback((seconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setCountdown(seconds)
    setResendAvailable(false)

    intervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          setResendAvailable(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  useEffect(() => {
    startCountdown(600)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [startCountdown])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }

  const handleVerify = async (otp: string) => {
    if (!email) {
      setOtpError("No email found. Please sign up again.")
      return
    }

    setVerifyLoading(true)
    setOtpError(null)

    try {
      const res = await fetch(`${API_URL}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      })
      const result = await res.json()

      if (!res.ok) {
        setOtpError(result.detail || "Verification failed")
        setVerifyLoading(false)
        return
      }

      setVerified(true)
      setVerifyLoading(false)

      setTimeout(() => {
        router.replace("/dashboard")
      }, 2000)
    } catch (e: any) {
      setOtpError(e.message || "Connection error")
      setVerifyLoading(false)
    }
  }

  const handleResend = async () => {
    if (!email || resendLoading) return

    setResendLoading(true)
    setOtpError(null)
    setResendMessage(null)

    try {
      const res = await fetch(`${API_URL}/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const result = await res.json()

      if (!res.ok) {
        setOtpError(result.detail || "Failed to resend OTP")
        setResendLoading(false)
        return
      }

      setResendMessage("New OTP sent!")
      startCountdown(600)
      setResendLoading(false)
    } catch (e: any) {
      setOtpError(e.message || "Connection error")
      setResendLoading(false)
    }
  }

  if (verified) {
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
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold text-[#F1F5F9] mb-2"
          >
            Email verified!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-[#64748B]"
          >
            Redirecting to your dashboard...
          </motion.p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#090B10] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[480px]"
      >
        {/* Back button */}
        <button
          onClick={() => router.push("/login")}
          className="flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#F1F5F9] transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </button>

        <div className="relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.01] backdrop-blur-2xl p-8 sm:p-10 shadow-2xl shadow-black/20">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#0EA5A9]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-[#0EA5A9] flex items-center justify-center mx-auto mb-5 shadow-xl shadow-emerald-500/20"
            >
              <Mail className="h-7 w-7 text-white" />
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="text-2xl font-bold text-[#F1F5F9] tracking-tight"
            >
              Verify your email
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              className="text-sm text-[#64748B] mt-2"
            >
              We sent a code to{" "}
              <span className="text-[#F1F5F9] font-medium">{maskedEmail}</span>
            </motion.p>
          </div>

          <AnimatePresence mode="wait">
            {resendMessage && (
              <motion.div
                key="resend-success"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 p-3.5 rounded-xl bg-emerald-500/8 border border-emerald-500/15 text-emerald-400 text-sm mb-6"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {resendMessage}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mb-8">
            <OTPInput
              length={6}
              onComplete={handleVerify}
              error={otpError}
              disabled={verifyLoading}
            />
          </div>

          {/* Timer + Resend */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-[#64748B]">
              <Clock className="h-4 w-4" />
              <span>
                Code expires in{" "}
                <span className={cn(
                  "font-mono font-medium",
                  countdown < 60 ? "text-red-400" : "text-[#F1F5F9]"
                )}>
                  {formatTime(countdown)}
                </span>
              </span>
            </div>

            {resendLoading ? (
              <div className="flex items-center gap-2 text-sm text-[#64748B]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Sending...
              </div>
            ) : resendAvailable ? (
              <button
                onClick={handleResend}
                className="text-sm text-[#0EA5A9] hover:text-emerald-400 transition-colors font-medium relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-full after:bg-[#0EA5A9]/40 after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300"
              >
                Resend code
              </button>
            ) : (
              <p className="text-xs text-[#475569]">
                Request a new code after the timer ends
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ")
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#090B10] flex items-center justify-center p-4">
        <div className="flex items-center gap-3 text-[#64748B]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}
