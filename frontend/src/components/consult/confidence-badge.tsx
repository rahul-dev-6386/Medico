"use client"

import { motion } from "framer-motion"

const CONFIDENCE_CONFIG: Record<string, { label: string; dot: string; bar: string; bg: string; text: string }> = {
  high: { label: "High", dot: "bg-emerald-400", bar: "bg-emerald-400", bg: "bg-emerald-500/10", text: "text-emerald-400" },
  moderate: { label: "Moderate", dot: "bg-amber-400", bar: "bg-amber-400", bg: "bg-amber-500/10", text: "text-amber-400" },
  low: { label: "Limited", dot: "bg-red-400", bar: "bg-red-400", bg: "bg-red-500/10", text: "text-red-400" },
}

export function ConfidenceBadge({ level }: { level: string }) {
  const c = CONFIDENCE_CONFIG[level] || CONFIDENCE_CONFIG.moderate
  return (
    <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border", c.bg, `border-${c.dot.replace("bg-", "")}/20`)}>
      <span className={cn("w-2 h-2 rounded-full", c.dot)} />
      <span className={cn("text-xs font-medium", c.text)}>Evidence Quality: {c.label}</span>
    </div>
  )
}

export function ConfidenceMeter({ level }: { level: string }) {
  const c = CONFIDENCE_CONFIG[level] || CONFIDENCE_CONFIG.moderate
  const pct = level === "high" ? 90 : level === "moderate" ? 55 : 25
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={cn("h-full rounded-full", c.bar)}
        />
      </div>
      <span className={cn("text-[11px] font-medium whitespace-nowrap", c.text)}>{c.label}</span>
    </div>
  )
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ")
}
