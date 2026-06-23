"use client"

import { cn } from "@/lib/utils"

interface SeverityBadgeProps {
  level: "normal" | "elevated" | "high" | "critical"
  label?: string
}

const config = {
  normal: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    label: "Normal",
  },
  elevated: {
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    dot: "bg-yellow-400",
    label: "Elevated",
  },
  high: {
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    dot: "bg-orange-400",
    label: "High",
  },
  critical: {
    bg: "bg-red-500/10",
    text: "text-red-400",
    dot: "bg-red-400",
    label: "Critical",
  },
}

export function SeverityBadge({ level, label }: SeverityBadgeProps) {
  const c = config[level]
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", c.bg, c.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
      {label || c.label}
    </span>
  )
}
