"use client"

import { ProgressRing } from "./progress-ring"
import { cn } from "@/lib/utils"

interface HealthScoreProps {
  score: number
  label: string
  icon?: React.ReactNode
  trend?: "up" | "down" | "stable"
  className?: string
}

export function HealthScore({ score, label, icon, trend, className }: HealthScoreProps) {
  return (
    <div className={cn("flex items-center gap-4 p-4 glass rounded-xl", className)}>
      <ProgressRing value={score} size={64} strokeWidth={5} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
          <p className="text-sm text-muted-foreground truncate">{label}</p>
        </div>
        {trend && (
          <p className={cn(
            "text-xs mt-0.5",
            trend === "up" && "text-emerald-400",
            trend === "down" && "text-red-400",
            trend === "stable" && "text-muted-foreground"
          )}>
            {trend === "up" && "↑ Improving"}
            {trend === "down" && "↓ Declining"}
            {trend === "stable" && "→ Stable"}
          </p>
        )}
      </div>
    </div>
  )
}
