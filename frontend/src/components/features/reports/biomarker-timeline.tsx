"use client"

import { motion } from "framer-motion"
import { GlassCard } from "@/components/ui/glass-card"
import type { BiomarkerTimeline } from "./types"

export function BiomarkerTimeline({ timelines }: { timelines: BiomarkerTimeline[] }) {
  if (timelines.length === 0) return null

  return (
    <div className="space-y-4">
      {timelines.map((tl, i) => {
        const values = tl.points.map((p) => p.value)
        const min = Math.min(...values)
        const max = Math.max(...values)
        const range = max - min || 1

        return (
          <motion.div
            key={tl.marker}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard hover={false} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium">{tl.marker}</span>
                <span className="text-xs text-muted-foreground">{tl.unit}</span>
              </div>
              <div className="relative h-24">
                <div className="absolute inset-0 flex items-end">
                  {tl.points.map((point, j) => {
                    const height = ((point.value - min) / range) * 100
                    return (
                      <div key={j} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(height, 5)}%` }}
                          transition={{ duration: 0.5, delay: j * 0.05 }}
                          className="w-full mx-0.5 rounded-t-sm bg-primary/60 hover:bg-primary/90 transition-colors cursor-pointer"
                        />
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-muted-foreground/90 text-background text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                          {point.value} ({new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })})
                        </div>
                        {tl.points.length <= 7 && (
                          <span className="text-[9px] text-muted-foreground mt-0.5">
                            {new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )
      })}
    </div>
  )
}
