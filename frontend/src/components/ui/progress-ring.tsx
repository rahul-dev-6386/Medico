"use client"

import { motion } from "framer-motion"

interface ProgressRingProps {
  value: number
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
  showValue?: boolean
}

export function ProgressRing({
  value,
  size = 80,
  strokeWidth = 6,
  color = "hsl(142, 76%, 36%)",
  label,
  showValue = true,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clampedValue = Math.min(100, Math.max(0, value))
  const offset = circumference - (clampedValue / 100) * circumference

  const getColor = () => {
    if (clampedValue >= 80) return "#22c55e"
    if (clampedValue >= 60) return "#eab308"
    return "#ef4444"
  }

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-lg font-bold"
            style={{ color: getColor() }}
          >
            {Math.round(clampedValue)}
            <span className="text-xs">%</span>
          </span>
        </div>
      )}
      {label && (
        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
          {label}
        </span>
      )}
    </div>
  )
}
