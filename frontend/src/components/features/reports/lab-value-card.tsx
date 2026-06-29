"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import type { LabValue } from "./types"

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  normal: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
  elevated: { bg: "bg-yellow-500/10", text: "text-yellow-400", dot: "bg-yellow-400" },
  high: { bg: "bg-orange-500/10", text: "text-orange-400", dot: "bg-orange-400" },
  critical: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
}

const trendIcon = {
  improved: "↓",
  stable: "→",
  worsened: "↑",
}

const trendColor = {
  improved: "text-emerald-400",
  stable: "text-muted-foreground",
  worsened: "text-red-400",
}

export function LabValueCard({ lab, index }: { lab: LabValue; index: number }) {
  const cfg = statusConfig[lab.status]
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={cn("glass rounded-xl p-3 border-l-2", {
        "border-l-emerald-500": lab.status === "normal",
        "border-l-yellow-500": lab.status === "elevated",
        "border-l-orange-500": lab.status === "high",
        "border-l-red-500": lab.status === "critical",
      })}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">{lab.marker}</span>
        {lab.trend && (
          <span className={cn("text-xs font-mono", trendColor[lab.trend])}>
            {trendIcon[lab.trend]}
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-lg font-bold">{lab.value}</span>
        <span className="text-xs text-muted-foreground">{lab.unit}</span>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[11px] text-muted-foreground">Range: {lab.range}</span>
        <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium", cfg.bg, cfg.text)}>
          <span className={cn("w-1 h-1 rounded-full", cfg.dot)} />
          {lab.status}
        </span>
      </div>
    </motion.div>
  )
}
