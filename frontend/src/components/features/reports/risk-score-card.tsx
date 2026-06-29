"use client"

import { motion } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { ProgressRing } from "@/components/ui/progress-ring"
import { cn } from "@/lib/utils"
import type { RiskScore } from "./types"

const levelConfig = {
  low: { label: "Low Risk", color: "text-emerald-400", ring: "#22c55e", bg: "bg-emerald-500/10" },
  moderate: { label: "Moderate Risk", color: "text-yellow-400", ring: "#eab308", bg: "bg-yellow-500/10" },
  high: { label: "High Risk", color: "text-red-400", ring: "#ef4444", bg: "bg-red-500/10" },
}

const categories = [
  { key: "diabetes" as const, label: "Diabetes Risk" },
  { key: "heart" as const, label: "Heart Health" },
  { key: "kidney" as const, label: "Kidney Health" },
  { key: "inflammation" as const, label: "Inflammation" },
  { key: "nutrition" as const, label: "Nutrition Status" },
]

export function RiskScoreCard({ risk }: { risk: RiskScore }) {
  const level = risk.risk_level ?? risk.overall ?? "moderate"
  const overall = levelConfig[level]
  const scorePercent = risk.score

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <GlassCard hover={false} className="flex flex-col items-center justify-center p-5">
        <ProgressRing value={scorePercent} size={100} strokeWidth={8} color={overall.ring} />
        <p className="text-sm font-medium mt-3">{overall.label}</p>
        <span className={cn("text-xs px-2 py-0.5 rounded-full mt-1", overall.bg, overall.color)}>
          Score: {risk.score}
        </span>
      </GlassCard>

      {risk.reasons?.slice(0, 4).map((reason, i) => {
        const isBad = reason.flag === "HIGH" || reason.flag === "LOW"
        return (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <GlassCard hover={false} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{reason.test}</span>
                <span className={cn("text-xs font-medium", isBad ? "text-red-400" : "text-emerald-400")}>
                  Penalty: -{reason.penalty}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted/50 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0, 100 - reason.penalty * 10)}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                  className={cn("h-full rounded-full", isBad ? "bg-red-500" : "bg-emerald-500")}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2">{reason.message}</p>
            </GlassCard>
          </motion.div>
        )
      })}
    </div>
  )
}
