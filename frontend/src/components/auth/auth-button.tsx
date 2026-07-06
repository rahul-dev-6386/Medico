"use client"

import { Loader2, ArrowRight } from "lucide-react"

interface AuthButtonProps {
  children: React.ReactNode
  loading?: boolean
  disabled?: boolean
  type?: "submit" | "button"
  onClick?: () => void
  variant?: "primary" | "secondary" | "social"
  className?: string
}

export function AuthButton({
  children,
  loading,
  disabled,
  type = "submit",
  onClick,
  variant = "primary",
  className,
}: AuthButtonProps) {
  const base =
    "relative flex items-center justify-center gap-2.5 w-full font-semibold rounded-[16px] transition-all duration-300"

  if (variant === "secondary") {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled || loading}
        className={cn(
          base,
          "h-[54px] text-sm",
          "border border-white/[0.1] bg-white/[0.03] text-white/70",
          "hover:bg-white/[0.07] hover:border-white/[0.18] hover:text-white/90 hover:shadow-[0_0_20px_-8px_rgba(255,255,255,0.04)]",
          "active:scale-[0.98]",
          "disabled:opacity-25 disabled:cursor-not-allowed disabled:active:scale-100",
          className,
        )}
      >
        {loading ? (
          <Loader2 className="h-[18px] w-[18px] animate-spin" />
        ) : (
          children
        )}
      </button>
    )
  }

  if (variant === "social") {
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          base,
          "h-[52px] text-sm font-medium",
          "border border-white/[0.07] bg-white/[0.03] text-white/45",
          "hover:bg-white/[0.06] hover:border-white/[0.13] hover:text-white/70",
          "active:scale-[0.97]",
          "disabled:opacity-25 disabled:cursor-not-allowed disabled:active:scale-100",
          className,
        )}
      >
        {children}
      </button>
    )
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        base,
        "h-[54px] text-[15px] text-white overflow-hidden",
        "bg-gradient-to-r from-emerald-500 to-teal-500",
        "hover:from-emerald-400 hover:to-teal-400",
        "hover:shadow-[0_0_32px_-8px_rgba(14,165,169,0.4)] hover:-translate-y-px",
        "active:translate-y-0 active:scale-[0.98]",
        "disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none",
        "before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/0 before:via-white/10 before:to-white/0 before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-[600ms]",
        className,
      )}
    >
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-r from-emerald-500 to-teal-500 z-10">
          <Loader2 className="h-[20px] w-[20px] animate-spin" />
        </div>
      )}
      <span className={cn("flex items-center gap-2.5", loading && "opacity-0")}>
        {children}
        <ArrowRight className="h-[18px] w-[18px] transition-all duration-300 group-hover:translate-x-0.5" />
      </span>
    </button>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ")
}
