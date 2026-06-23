"use client"

import { motion } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import { ProgressRing } from "@/components/ui/progress-ring"
import { cn } from "@/lib/utils"
import type { ReportInsight } from "./types"
import { Activity, Heart, Droplets, Flame, Leaf } from "lucide-react"

const iconMap: Record<string, any> = {
  diabetes: Activity,
  heart: Heart,
  kidney: Droplets,
  inflammation: Flame,
  nutrition: Leaf,
}

const statusColor: Record<string, string> = {
  good: "text-emerald-400",
  attention: "text-yellow-400",
  critical: "text-red-400",
}

export function InsightCards({ insights }: { insights: ReportInsight[] }) {
  if (insights.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
      {insights.map((insight, i) => {
        const Icon = iconMap[insight.domain] || Activity
        return (
          <motion.div
            key={insight.domain}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard hover={false} className="p-4 text-center">
              <div className="flex justify-center mb-2">
                <ProgressRing
                  value={insight.score}
                  size={56}
                  strokeWidth={5}
                  showValue={false}
                />
              </div>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Icon className={cn("h-3.5 w-3.5", statusColor[insight.status])} />
                <span className="text-xs font-semibold">{insight.label}</span>
              </div>
              <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                insight.status === "good" && "bg-emerald-500/10 text-emerald-400",
                insight.status === "attention" && "bg-yellow-500/10 text-yellow-400",
                insight.status === "critical" && "bg-red-500/10 text-red-400",
              )}>
                {insight.status === "good" ? "Good" : insight.status === "attention" ? "Needs Attention" : "Critical"}
              </span>
              <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
                {insight.description}
              </p>
            </GlassCard>
          </motion.div>
        )
      })}
    </div>
  )
}
