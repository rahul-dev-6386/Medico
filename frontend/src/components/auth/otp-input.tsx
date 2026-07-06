"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion } from "framer-motion"

interface OTPInputProps {
  length?: number
  onComplete: (otp: string) => void
  error?: string | null
  disabled?: boolean
}

export function OTPInput({
  length = 6,
  onComplete,
  error,
  disabled = false,
}: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(""))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const focusInput = useCallback((index: number) => {
    if (index >= 0 && index < length) {
      inputRefs.current[index]?.focus()
    }
  }, [length])

  useEffect(() => {
    focusInput(0)
  }, [focusInput])

  const handleChange = (index: number, value: string) => {
    if (disabled) return
    if (!/^\d*$/.test(value)) return

    const digit = value.slice(-1)
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)

    if (digit && index < length - 1) {
      focusInput(index + 1)
    }

    const fullOtp = newOtp.join("")
    if (fullOtp.length === length && !newOtp.includes("")) {
      onComplete(fullOtp)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        const newOtp = [...otp]
        newOtp[index - 1] = ""
        setOtp(newOtp)
        focusInput(index - 1)
      } else {
        const newOtp = [...otp]
        newOtp[index] = ""
        setOtp(newOtp)
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      focusInput(index - 1)
    } else if (e.key === "ArrowRight" && index < length - 1) {
      focusInput(index + 1)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return
    e.preventDefault()
    const pasted = e.clipboardData.getData("text/plain").replace(/\D/g, "").slice(0, length)
    if (!pasted) return

    const newOtp = Array(length).fill("")
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i]
    }
    setOtp(newOtp)

    const nextIndex = pasted.length < length ? pasted.length : length - 1
    focusInput(nextIndex)

    const fullOtp = newOtp.join("")
    if (fullOtp.length === length && !newOtp.includes("")) {
      onComplete(fullOtp)
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-2 sm:gap-3">
        {otp.map((digit, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.25 }}
          >
            <input
              ref={(el) => { inputRefs.current[index] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={disabled}
              className={cn(
                "w-11 h-14 sm:w-12 sm:h-[56px] text-center text-lg sm:text-xl font-bold rounded-2xl border transition-all duration-300 outline-none",
                "bg-white/[0.03] text-white",
                digit ? "border-teal-500/50 ring-[3px] ring-teal-500/10 shadow-[0_0_20px_-6px_rgba(14,165,169,0.15)]" : "border-white/[0.08]",
                error ? "border-red-500/40 ring-1 ring-red-500/10" : "",
                disabled ? "opacity-40 cursor-not-allowed" : "hover:border-white/[0.15] focus:border-teal-500/50 focus:ring-[3px] focus:ring-teal-500/10",
              )}
            />
          </motion.div>
        ))}
      </div>
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-400 text-center"
        >
          {error}
        </motion.p>
      )}
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ")
}
