"use client"

import { GlassCard } from "@/components/ui/glass-card"
import { ProgressRing } from "@/components/ui/progress-ring"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { AlertTriangle, ArrowUp, ArrowDown, Minus, Activity, FlaskConical, Heart, Brain } from "lucide-react"

interface Props {
  structured: any
  labValues?: any[]
  riskScores?: any
  healthScore?: number
}

const statusColor: Record<string, string> = {
  normal: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  high: "text-red-400 bg-red-500/10 border-red-500/30",
  low: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  elevated: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
}

const trendIcon: Record<string, any> = {
  improved: { icon: ArrowDown, color: "text-emerald-400" },
  stable: { icon: Minus, color: "text-muted-foreground" },
  worsened: { icon: ArrowUp, color: "text-red-400" },
}

export function BloodReportView({ structured, labValues, riskScores, healthScore }: Props) {
  const diagnosis = structured?.diagnosis || []
  const findings = structured?.findings || []
  const recommendations = structured?.recommendations || []
  const biomarkers = structured?.biomarkers || []
  const abnormalValues = structured?.abnormal_values || []
  const followUpTests = structured?.follow_up_tests || []

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassCard className="flex flex-col items-center justify-center p-5" glow="primary">
          <ProgressRing value={healthScore || 75} size={100} strokeWidth={8} />
          <p className="text-sm font-medium mt-3">Health Score</p>
          <p className="text-2xl font-bold text-primary">{healthScore || 75}</p>
        </GlassCard>
        {riskScores && Object.entries(riskScores).slice(0, 3).map(([key, val]: any, i) => (
          <GlassCard key={key} className="p-4">
            <p className="text-sm text-muted-foreground capitalize">{key.replace(/_/g, " ")}</p>
            <p className={cn("text-2xl font-bold mt-1", val > 60 ? "text-red-400" : val > 30 ? "text-yellow-400" : "text-emerald-400")}>
              {val}%
            </p>
            <div className="w-full h-1.5 rounded-full bg-muted/50 mt-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${val}%` }}
                className={cn("h-full rounded-full", val > 60 ? "bg-red-500" : val > 30 ? "bg-yellow-500" : "bg-emerald-500")}
              />
            </div>
          </GlassCard>
        ))}
      </div>

      {abnormalValues.length > 0 && (
        <GlassCard>
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            Abnormal Values ({abnormalValues.length})
          </h3>
          <div className="space-y-2">
            {abnormalValues.map((a: any, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                <div>
                  <p className="text-sm font-medium">{a.test}</p>
                  <p className="text-xs text-muted-foreground">{a.value} {a.unit}</p>
                </div>
                <span className={cn("text-xs font-medium px-2 py-1 rounded-lg", a.severity === "critical" ? "bg-red-500/10 text-red-400" : "bg-yellow-500/10 text-yellow-400")}>
                  {a.severity || "abnormal"}
                </span>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      )}

      {biomarkers.length > 0 && (
        <GlassCard>
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-primary" />
            Biomarkers
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {biomarkers.map((b: any, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className={cn("p-3 rounded-xl border", statusColor[b.status || (b.flag === "HIGH" || b.flag === "LOW" ? "high" : "normal")] || "border-white/10")}>
                <p className="text-xs text-muted-foreground">{b.name}</p>
                <p className="text-lg font-bold">{b.value_text || b.value} <span className="text-xs font-normal text-muted-foreground">{b.unit}</span></p>
                {b.reference_range && <p className="text-[10px] text-muted-foreground">Range: {b.reference_range}</p>}
              </motion.div>
            ))}
          </div>
        </GlassCard>
      )}

      {labValues && labValues.length > 0 && (
        <GlassCard>
          <h3 className="font-semibold flex items-center gap-2 mb-3">
            <FlaskConical className="h-4 w-4 text-secondary" />
            Lab Values ({labValues.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {labValues.map((l: any, i: number) => (
              <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                className="glass rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{l.test_name || l.marker}</p>
                  <p className="text-xs text-muted-foreground">{l.reference_range || l.range}</p>
                </div>
                <div className="text-right">
                  <p className={cn("text-sm font-bold", l.is_abnormal || l.flag === "HIGH" || l.flag === "LOW" ? "text-red-400" : "text-emerald-400")}>
                    {l.value}{l.unit && <span className="text-xs font-normal text-muted-foreground ml-0.5">{l.unit}</span>}
                  </p>
                  {l.flag && <span className={cn("text-[10px]", l.flag === "NORMAL" ? "text-emerald-400" : "text-red-400")}>{l.flag}</span>}
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {diagnosis.length > 0 && (
          <GlassCard>
            <h3 className="font-semibold flex items-center gap-2 mb-3"><Heart className="h-4 w-4 text-red-400" /> Diagnosis</h3>
            <ul className="space-y-1">
              {diagnosis.map((d: string, i: number) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-red-400 mt-0.5">•</span> {d}
                </li>
              ))}
            </ul>
          </GlassCard>
        )}
        {recommendations.length > 0 && (
          <GlassCard>
            <h3 className="font-semibold flex items-center gap-2 mb-3"><Brain className="h-4 w-4 text-primary" /> Recommendations</h3>
            <ul className="space-y-1">
              {recommendations.map((r: string, i: number) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span> {r}
                </li>
              ))}
            </ul>
          </GlassCard>
        )}
      </div>

      {followUpTests.length > 0 && (
        <GlassCard>
          <h3 className="font-semibold text-sm mb-2">Follow-up Tests</h3>
          <div className="flex flex-wrap gap-2">
            {followUpTests.map((t: string, i: number) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">{t}</span>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  )
}
