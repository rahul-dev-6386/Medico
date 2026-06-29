"use client"

import { motion } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { ArrowUp, ArrowDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ComparisonItem } from "./types"

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  improved: { icon: ArrowDown, color: "text-emerald-400", bg: "bg-emerald-500/10", label: "Improved" },
  stable: { icon: Minus, color: "text-muted-foreground", bg: "bg-muted/30", label: "Stable" },
  worsened: { icon: ArrowUp, color: "text-red-400", bg: "bg-red-500/10", label: "Worsened" },
}

export function HistoricalComparison({ comparisons }: { comparisons: ComparisonItem[] }) {
  if (comparisons.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        vs Previous Report
      </h3>
      {comparisons.map((comp, i) => {
        const cfg = statusConfig[comp.status]
        return (
          <motion.div
            key={comp.biomarker}
            initial={{ opacity: 0, x: -5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
          >
            <GlassCard hover={false} className="p-3">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{comp.biomarker}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <span>{comp.previous} {comp.unit}</span>
                    <span>→</span>
                    <span className="font-medium text-foreground">{comp.current} {comp.unit}</span>
                  </div>
                </div>
                <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium", cfg.bg, cfg.color)}>
                  <cfg.icon className="h-3.5 w-3.5" />
                  {cfg.label}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )
      })}
    </div>
  )
}
