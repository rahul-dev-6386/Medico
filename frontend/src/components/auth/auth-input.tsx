"use client"

import { useState, useId } from "react"
import { Eye, EyeOff } from "lucide-react"

interface AuthInputProps {
  label: string
  type?: string
  placeholder?: string
  icon?: React.ReactNode
  error?: string
  autoComplete?: string
  showPasswordToggle?: boolean
  showPassword?: boolean
  onTogglePassword?: () => void
  name?: string
  value?: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
}

export function AuthInput({
  label,
  type = "text",
  placeholder,
  icon,
  error,
  autoComplete,
  showPasswordToggle,
  showPassword,
  onTogglePassword,
  name,
  value,
  onChange,
  required,
  onFocus,
  onBlur,
}: AuthInputProps) {
  const [focused, setFocused] = useState(false)
  const [hasValue, setHasValue] = useState(false)
  const id = useId()
  const isPassword = type === "password"
  const inputType = isPassword && showPassword ? "text" : type

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "relative flex items-center rounded-[16px] border transition-all duration-[400ms] ease-out",
          "h-[56px]",
          focused
            ? "border-teal-500/50 ring-[4px] ring-teal-500/8 shadow-[0_0_28px_-10px_rgba(14,165,169,0.18)]"
            : error
              ? "border-red-500/40 ring-[3px] ring-red-500/8"
              : "border-white/[0.07] hover:border-white/[0.15]",
          "bg-white/[0.04] backdrop-blur-sm",
        )}
      >
        {icon && (
          <div
            className={cn(
              "pl-[18px] transition-all duration-[400ms] ease-out",
              focused ? "text-teal-400" : error ? "text-red-400" : "text-white/35",
            )}
          >
            {icon}
          </div>
        )}

        <div className="relative flex-1 h-full">
          <input
            id={id}
            type={inputType}
            placeholder={focused ? (placeholder || label) : " "}
            autoComplete={autoComplete}
            name={name}
            value={value}
            onChange={(e) => {
              setHasValue(!!e.target.value)
              onChange?.(e)
            }}
            onFocus={(e) => {
              setFocused(true)
              onFocus?.(e)
            }}
            onBlur={(e) => {
              setFocused(false)
              setHasValue(!!e.target.value)
              onBlur?.(e)
            }}
            required={required}
            className={cn(
              "peer w-full h-full bg-transparent text-white/90 outline-none transition-all duration-[400ms] autofill-fix",
              icon ? "pl-3" : "pl-[18px]",
              showPasswordToggle ? "pr-[52px]" : "pr-[18px]",
              "pt-[6px] text-[15px] font-medium placeholder:text-white/25 placeholder:font-normal",
              focused ? "text-white" : "",
            )}
          />
          <label
            htmlFor={id}
            className={cn(
              "absolute left-0 top-1/2 transition-all duration-[400ms] ease-out pointer-events-none origin-left select-none",
              icon ? "ml-[18px]" : "ml-[18px]",
              focused || hasValue
                ? "-translate-y-[22px] scale-[0.72] text-teal-400"
                : "translate-y-[-50%] scale-100 text-white/35",
              "text-sm font-medium",
            )}
            style={{
              ...(focused || hasValue ? { transform: "translateY(-22px) scale(0.72)" } : {}),
            }}
          >
            {label}
          </label>
        </div>

        {isPassword && showPasswordToggle && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-[14px] top-1/2 -translate-y-1/2 text-white/35 hover:text-white/80 transition-all duration-300 hover:scale-110 active:scale-95"
            tabIndex={-1}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-[20px] w-[20px]" />
            ) : (
              <Eye className="h-[20px] w-[20px]" />
            )}
          </button>
        )}

        {/* Focus bottom accent */}
        {focused && (
          <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-gradient-to-r from-teal-400/0 via-teal-400/40 to-teal-400/0 rounded-full" />
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400/90 pl-1 font-medium">{error}</p>
      )}
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ")
}
